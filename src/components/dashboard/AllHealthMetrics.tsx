import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Loader2 } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  GROUP_LABELS,
  METRIC_PERMISSIONS,
  SYNCED_METRICS,
  describeMetric,
  formatMetricValue,
  metricNumber,
  type MetricDescriptor,
} from '@/lib/healthMetrics';
import { checkNativeHealthPermissions } from '@/lib/capacitor/backgroundSync';

interface AllHealthMetricsProps {
  selectedPersonId: string | null;
}

const WINDOW_OPTIONS = [
  { days: 1, label: '24h' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
];

// device_data rows are small but a wearable emits a lot of them; cap the pull so a busy
// month cannot drag the dashboard down. Newest first, so a cap trims the oldest.
//
// This cap is why the sparkline data cannot also drive the tiles: it applies across all
// types at once, so heart rate (a row a minute) can push a whole week of weight readings
// out of the result. Counts and latest values come from device_metric_summary instead,
// which is exact per metric; a sparkline is a sample by nature, so skew is fine there.
const ROW_LIMIT = 4000;

interface Reading {
  data_type: string;
  value: unknown;
  unit: string | null;
  recorded_at: string;
}

interface Device {
  id: string;
  device_name: string;
}

const ALL_DEVICES = 'all';

/** One row per data_type from the summary RPC — exact regardless of per-metric volume. */
interface MetricRollup {
  data_type: string;
  reading_count: number;
  latest_value: unknown;
  latest_unit: string | null;
  latest_recorded_at: string;
}

interface MetricSummary {
  dataType: string;
  descriptor: MetricDescriptor;
  /** Null when nothing has been recorded for this metric in the window. */
  latest: MetricRollup | null;
  count: number;
  unit: string;
  series: { t: number; v: number }[];
  /**
   * True when the metric has no data *and* Health Connect permission for it was declined.
   * Separates "you haven't allowed this" from "your watch doesn't publish it" — the two
   * look identical otherwise, since a declined type is skipped silently on read.
   */
  blocked: boolean;
}

/**
 * Every metric the sync can record for a person, grouped and charted.
 *
 * Shows the whole catalogue rather than only what is already stored: a metric that has
 * never arrived renders as "not recorded" instead of vanishing, which is what separates
 * "this watch doesn't measure it" from "the sync isn't picking it up". Anything found in
 * device_data but outside the catalogue (environment sensors, BLE peripherals) is included
 * too, so nothing stored is ever hidden.
 *
 * The 24h/7d/30d buttons only scope the sparkline and the reading-count badge. Each tile's
 * headline value is the latest reading ever recorded for that metric, from any device — a
 * metric that has not synced within the window (e.g. sleep, three days quiet) keeps showing
 * its last known value with its own age underneath, rather than going blank. It stays cached
 * like that until a newer reading for that person and metric arrives and replaces it.
 */
const AllHealthMetrics = ({ selectedPersonId }: AllHealthMetricsProps) => {
  const { t } = useTranslation();
  const [windowDays, setWindowDays] = useState(7);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(ALL_DEVICES);

  const since = useMemo(
    () => new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString(),
    [windowDays]
  );

  // Every device that could have written device_data for this person, so a device that has
  // never reported anything still shows up in the picker rather than only appearing once it
  // has readings.
  const { data: devices = [] } = useQuery({
    queryKey: ['all-health-metrics-devices', selectedPersonId],
    queryFn: async (): Promise<Device[]> => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('devices')
        .select('id, device_name')
        .eq('elderly_person_id', selectedPersonId)
        .order('device_name');

      if (error) throw error;
      return (data ?? []) as Device[];
    },
    enabled: !!selectedPersonId,
  });

  // A device picked for one person is meaningless for another; switching people without
  // resetting this would silently apply a stale device_id filter that matches nothing.
  useEffect(() => {
    setSelectedDeviceId(ALL_DEVICES);
  }, [selectedPersonId]);

  const deviceFilter = selectedDeviceId === ALL_DEVICES ? null : selectedDeviceId;

  // Null (not []) when the summary function is missing, so the card can fall back to the
  // raw rows instead of reporting "no readings" — an absent migration must never look
  // identical to an absent device.
  const { data: rollups, isLoading: isLoadingRollups } = useQuery({
    queryKey: ['all-health-metrics', selectedPersonId, windowDays, deviceFilter, 'summary'],
    queryFn: async (): Promise<MetricRollup[] | null> => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase.rpc('device_metric_summary', {
        p_person_id: selectedPersonId,
        p_since: since,
        p_device_id: deviceFilter ?? undefined,
      });

      if (error) {
        // 42883 undefined_function / PGRST202 no such RPC: the migration adding
        // device_metric_summary has not been applied to this project yet.
        if (error.code === '42883' || error.code === 'PGRST202') {
          console.warn(
            'device_metric_summary is unavailable (migration not applied); ' +
              'falling back to raw rows, so per-metric counts may be capped.',
            error
          );
          return null;
        }
        throw error;
      }
      return (data ?? []) as MetricRollup[];
    },
    enabled: !!selectedPersonId,
  });

  const { data: readings = [], isLoading: isLoadingReadings } = useQuery({
    queryKey: ['all-health-metrics', selectedPersonId, windowDays, deviceFilter],
    queryFn: async (): Promise<Reading[]> => {
      if (!selectedPersonId) return [];

      let query = supabase
        .from('device_data')
        .select('data_type, value, unit, recorded_at')
        .eq('elderly_person_id', selectedPersonId)
        .gte('recorded_at', since);

      if (deviceFilter) {
        query = query.eq('device_id', deviceFilter);
      }

      const { data, error } = await query
        .order('recorded_at', { ascending: false })
        .limit(ROW_LIMIT);

      if (error) throw error;
      return (data ?? []) as Reading[];
    },
    enabled: !!selectedPersonId,
  });

  // Null on web, where there are no Health Connect permissions to report on.
  const { data: permissions } = useQuery({
    queryKey: ['health-connect-permissions'],
    staleTime: 60 * 1000,
    queryFn: () => checkNativeHealthPermissions(),
  });

  const { grouped, recordedCount, totalCount, blockedCount } = useMemo(() => {
    const byType = new Map<string, Reading[]>();
    for (const reading of readings) {
      const list = byType.get(reading.data_type);
      if (list) list.push(reading);
      else byType.set(reading.data_type, [reading]);
    }

    // Undefined while loading, null when the RPC is missing; both mean "derive from rows".
    const haveRollups = Array.isArray(rollups);
    const byTypeRollup = new Map((rollups ?? []).map((r) => [r.data_type, r]));

    // The full catalogue first, then anything stored that is not part of it — so a metric
    // from an environment sensor or BLE peripheral still shows up rather than being
    // silently dropped for not being a Health Connect type.
    const extras = [...byTypeRollup.keys(), ...byType.keys()].filter(
      (type) => !SYNCED_METRICS.includes(type)
    );
    const allTypes = [...SYNCED_METRICS, ...new Set(extras)];

    const summaries: MetricSummary[] = allTypes.map((dataType) => {
      const descriptor = describeMetric(dataType);
      const rollup = byTypeRollup.get(dataType) ?? null;
      const rows = byType.get(dataType) ?? [];

      // rows arrive newest first; reverse for a left-to-right time axis.
      const series = rows
        .map((r) => ({ t: new Date(r.recorded_at).getTime(), v: metricNumber(dataType, r.value) }))
        .filter((p): p is { t: number; v: number } => p.v !== null)
        .reverse();

      // Prefer the rollup: the raw pull is capped across all types, so a low-volume metric
      // can be missing from it entirely while still having readings. Without the rollup,
      // rows are all there is — counts are then capped, which is far better than blank.
      const fromRows: MetricRollup | null = rows.length
        ? {
            data_type: dataType,
            reading_count: rows.length,
            latest_value: rows[0].value,
            latest_unit: rows[0].unit,
            latest_recorded_at: rows[0].recorded_at,
          }
        : null;
      const latest = haveRollups ? rollup : fromRows;

      const permission = METRIC_PERMISSIONS[dataType];

      return {
        dataType,
        descriptor,
        latest,
        count: latest?.reading_count ?? 0,
        unit: latest?.latest_unit || descriptor.unit,
        series,
        blocked:
          !latest && !!permission && !!permissions && !permissions.granted.includes(permission),
      };
    });

    // "Recorded" means a reading exists at all, not that one landed inside the selected
    // window - a metric that last synced days ago is still recorded, just stale. Keying
    // this off `count` (which is windowed) would hide or bury it right after a sync gap.
    const visible = hideEmpty ? summaries.filter((s) => s.latest) : summaries;

    const byGroup = new Map<MetricDescriptor['group'], MetricSummary[]>();
    // Recorded metrics lead within each group; an empty one is a placeholder and should
    // never push a live reading further down the card.
    const ordered = [...visible].sort((a, b) => {
      if (!!a.latest !== !!b.latest) return a.latest ? -1 : 1;
      return a.descriptor.label.localeCompare(b.descriptor.label);
    });
    for (const summary of ordered) {
      const list = byGroup.get(summary.descriptor.group);
      if (list) list.push(summary);
      else byGroup.set(summary.descriptor.group, [summary]);
    }

    const order: MetricDescriptor['group'][] = [
      'vitals',
      'activity',
      'sleep',
      'body',
      'environment',
      'other',
    ];

    return {
      grouped: order
        .filter((g) => byGroup.has(g))
        .map((g) => ({ group: g, metrics: byGroup.get(g)! })),
      recordedCount: summaries.filter((s) => s.latest).length,
      totalCount: summaries.length,
      blockedCount: summaries.filter((s) => s.blocked).length,
    };
  }, [readings, rollups, permissions, hideEmpty]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('dashboard.allMetrics.title', 'All health metrics')}
            </CardTitle>
            <CardDescription>
              {deviceFilter
                ? t('dashboard.allMetrics.descriptionByDevice', {
                    recorded: recordedCount,
                    total: totalCount,
                    device:
                      devices.find((d) => d.id === deviceFilter)?.device_name ??
                      t('dashboard.allMetrics.thisDevice', 'this device'),
                    defaultValue: '{{recorded}} of {{total}} metrics recorded by {{device}}',
                  })
                : t('dashboard.allMetrics.description', {
                    recorded: recordedCount,
                    total: totalCount,
                    defaultValue: '{{recorded}} of {{total}} metrics recorded by connected devices',
                  })}
              {blockedCount > 0 && (
                <span className="text-warning">
                  {' · '}
                  {t('dashboard.allMetrics.blockedCount', {
                    count: blockedCount,
                    defaultValue: '{{count}} blocked by permissions',
                  })}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {devices.length > 0 && (
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="h-7 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEVICES}>
                    {t('dashboard.allMetrics.allDevices', 'All devices')}
                  </SelectItem>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.device_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-1">
              {WINDOW_OPTIONS.map((option) => (
                <Button
                  key={option.days}
                  size="sm"
                  variant={windowDays === option.days ? 'default' : 'outline'}
                  className="h-7 px-2"
                  onClick={() => setWindowDays(option.days)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] text-muted-foreground"
              onClick={() => setHideEmpty((v) => !v)}
            >
              {hideEmpty
                ? t('dashboard.allMetrics.showAll', 'Show all metrics')
                : t('dashboard.allMetrics.hideEmpty', 'Hide not recorded')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoadingRollups || isLoadingReadings ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recordedCount === 0 && blockedCount === 0 ? (
          /* Nothing recorded and nothing blocked: the prompt to sync is more use than 31
             empty tiles. With blocked metrics, the grid is shown so the user can see which
             permissions are the reason — "sync a device" would be the wrong advice. */
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t(
              'dashboard.allMetrics.empty',
              'No device readings in this period. Sync a device to see its metrics here.'
            )}
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ group, metrics }) => (
              <div key={group} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABELS[group]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.map((metric) => (
                    <div
                      key={metric.dataType}
                      className={`rounded-lg border p-3 space-y-2 ${
                        metric.latest ? '' : 'border-dashed bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {metric.descriptor.label}
                          </p>
                          <p
                            className={`text-xl font-semibold leading-tight ${
                              metric.latest ? '' : 'text-muted-foreground/50'
                            }`}
                          >
                            {metric.latest
                              ? formatMetricValue(metric.dataType, metric.latest.latest_value)
                              : '—'}
                            {metric.latest && metric.unit && (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                {metric.unit}
                              </span>
                            )}
                          </p>
                        </div>
                        {metric.count > 0 && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {metric.count}
                          </Badge>
                        )}
                      </div>

                      {/* Two points is the minimum that says anything about direction. */}
                      {metric.series.length > 1 && (
                        <div className="h-10 -mx-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metric.series}>
                              <YAxis hide domain={['dataMin', 'dataMax']} />
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke="hsl(var(--primary))"
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <p
                        className={`text-[11px] ${
                          metric.blocked ? 'text-warning' : 'text-muted-foreground'
                        }`}
                      >
                        {metric.latest
                          ? formatDistanceToNow(new Date(metric.latest.latest_recorded_at), {
                              addSuffix: true,
                            })
                          : metric.blocked
                            ? t('dashboard.allMetrics.permissionNeeded', 'Permission needed')
                            : t('dashboard.allMetrics.notRecorded', 'Not recorded')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllHealthMetrics;
