import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subDays, startOfDay, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HeartPulse, Loader2 } from 'lucide-react';

interface ILQVitalsTrendChartProps {
  elderlyPersonId: string;
  days?: number;
}

type Band = 'good' | 'fair' | 'poor';

/**
 * device_data types this chart reads. All are Health Connect metrics the sync already
 * writes (see src/lib/healthMetrics.ts) - nothing new is required from the device side.
 */
const TRACKED_TYPES = [
  'sleep',
  'heart_rate',
  'resting_heart_rate',
  'heart_rate_variability',
  'steps',
  'active_calories',
  'distance',
  'exercise_session',
];

interface Row {
  data_type: string;
  value: unknown;
  recorded_at: string;
}

interface TrendPoint {
  dayKey: string;
  date: string;
  sleepHours: number | null;
  sleep: number | null;
  sleepBand: Band | null;
  recovery: number | null;
  recoveryBand: Band | null;
  strain: number | null;
  strainBand: Band | null;
  stress: number | null;
  stressBand: Band | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Monotonic 0->100 as value rises from floor to ceiling. For "more is better" metrics. */
const rampUp = (value: number, floor: number, ceiling: number) =>
  clamp(((value - floor) / (ceiling - floor)) * 100, 0, 100);

/** Monotonic 100->0 as value rises from floor to ceiling. For "less is better" metrics. */
const rampDown = (value: number, floor: number, ceiling: number) =>
  clamp(((ceiling - value) / (ceiling - floor)) * 100, 0, 100);

/** Peaks at `optimal`, falls off toward either edge. For metrics with a healthy middle. */
const peak = (value: number, floor: number, ceiling: number, optimal: number) => {
  if (value <= floor || value >= ceiling) return 0;
  const distance = Math.abs(value - optimal);
  const span = Math.max(optimal - floor, ceiling - optimal);
  return clamp(100 - (distance / span) * 100, 0, 100);
};

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

const bandHigherIsBetter = (score: number): Band => (score >= 70 ? 'good' : score >= 40 ? 'fair' : 'poor');
const bandLowerIsBetter = (score: number): Band => (score < 30 ? 'good' : score < 60 ? 'fair' : 'poor');

const BAND_COLOR: Record<Band, string> = {
  good: 'hsl(var(--success))',
  fair: 'hsl(var(--warning))',
  poor: 'hsl(var(--destructive))',
};

/**
 * Series identity colors. Fixed order, validated together (light + dark) for CVD-safe
 * adjacency with scripts/validate_palette.js from the dataviz skill - keep this order if a
 * fifth series is ever added rather than inserting a hue mid-sequence. Status (the per-point
 * dot color) is a separate channel from identity (the line stroke): the line says *which*
 * metric, the dot says *how it's doing that day*.
 */
const SERIES: {
  key: 'sleep' | 'recovery' | 'strain' | 'stress';
  bandKey: 'sleepBand' | 'recoveryBand' | 'strainBand' | 'stressBand';
  color: string;
}[] = [
  { key: 'sleep', bandKey: 'sleepBand', color: 'hsl(var(--chart-sleep))' },
  { key: 'recovery', bandKey: 'recoveryBand', color: 'hsl(var(--chart-recovery))' },
  { key: 'strain', bandKey: 'strainBand', color: 'hsl(var(--chart-strain))' },
  { key: 'stress', bandKey: 'stressBand', color: 'hsl(var(--chart-stress))' },
];

interface StatusDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendPoint;
}

const numbersFrom = (values: unknown[] | undefined, field: string): number[] =>
  (values ?? [])
    .map((v) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[field] : null))
    .filter((n): n is number => typeof n === 'number');

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/**
 * Sleep, Recovery, Strain and Stress for the last N days, derived from raw device_data -
 * there is no ilq_scores column for these, and no direct "stress" sensor exists in Health
 * Connect, so Recovery/Stress are estimated from resting heart rate + HRV (the standard
 * proxy: low HRV and an elevated resting-vs-active heart rate gap both signal sympathetic
 * load) and Strain from the day's activity volume. Sleep is the one directly-measured value
 * (session duration), so its color bands use plain clinical hour cutoffs rather than a score.
 *
 * A day with no readings for a metric is left as a gap (no dot, line breaks) instead of
 * being plotted as 0 - a missing sync must never look identical to "recorded and bad".
 */
export function ILQVitalsTrendChart({ elderlyPersonId, days = 7 }: ILQVitalsTrendChartProps) {
  const { t } = useTranslation();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ilq-vitals-trend', elderlyPersonId, days],
    queryFn: async (): Promise<Row[]> => {
      const since = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const { data, error } = await supabase
        .from('device_data')
        .select('data_type, value, recorded_at')
        .eq('elderly_person_id', elderlyPersonId)
        .in('data_type', TRACKED_TYPES)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: !!elderlyPersonId,
  });

  const seriesLabels: Record<(typeof SERIES)[number]['key'], string> = {
    sleep: t('ilq.analytics.vitalsTrend.sleep', 'Sleep'),
    recovery: t('ilq.analytics.vitalsTrend.recovery', 'Recovery'),
    strain: t('ilq.analytics.vitalsTrend.strain', 'Strain'),
    stress: t('ilq.analytics.vitalsTrend.stress', 'Stress'),
  };

  const bandLabels: Record<Band, string> = {
    good: t('ilq.good', 'Good'),
    fair: t('ilq.fair', 'Fair'),
    poor: t('ilq.analytics.vitalsTrend.needsAttention', 'Needs attention'),
  };

  const { chartData, hasAnyData, latestConcern } = useMemo(() => {
    const byDayType = new Map<string, Map<string, unknown[]>>();
    for (const row of rows) {
      const dayKey = format(new Date(row.recorded_at), 'yyyy-MM-dd');
      let byType = byDayType.get(dayKey);
      if (!byType) {
        byType = new Map();
        byDayType.set(dayKey, byType);
      }
      const list = byType.get(row.data_type);
      if (list) list.push(row.value);
      else byType.set(row.data_type, [row.value]);
    }

    const points: TrendPoint[] = Array.from({ length: days }, (_, i) => {
      const date = subDays(startOfDay(new Date()), days - 1 - i);
      const dayKey = format(date, 'yyyy-MM-dd');
      const byType = byDayType.get(dayKey);

      const sleepMinutes = numbersFrom(byType?.get('sleep'), 'duration_minutes');
      const heartRate = numbersFrom(byType?.get('heart_rate'), 'bpm');
      const restingHR = numbersFrom(byType?.get('resting_heart_rate'), 'bpm');
      const hrv = numbersFrom(byType?.get('heart_rate_variability'), 'rmssd_ms');
      const steps = numbersFrom(byType?.get('steps'), 'count');
      const activeCalories = numbersFrom(byType?.get('active_calories'), 'kcal');
      const distance = numbersFrom(byType?.get('distance'), 'meters');
      const exerciseMinutes = numbersFrom(byType?.get('exercise_session'), 'duration_minutes');

      // Sleep: total recorded session time, banded on plain clinical hour cutoffs.
      const sleepHours = sleepMinutes.length ? sum(sleepMinutes) / 60 : null;
      const sleepScore = sleepHours === null ? null : peak(sleepHours, 3, 11, 7.5);
      const sleepBand: Band | null =
        sleepHours === null ? null : sleepHours < 6 ? 'poor' : sleepHours < 7 ? 'fair' : 'good';

      // Recovery: higher HRV + lower resting heart rate both indicate the body bounced back.
      const hrvScore = hrv.length ? rampUp(average(hrv), 10, 90) : null;
      const rhrScore = restingHR.length ? rampDown(average(restingHR), 50, 90) : null;
      const recoveryParts = [hrvScore, rhrScore].filter((v): v is number => v !== null);
      const recoveryScore = recoveryParts.length ? average(recoveryParts) : null;
      const recoveryBand = recoveryScore === null ? null : bandHigherIsBetter(recoveryScore);

      // Strain: how much the day's activity actually loaded the body.
      const strainParts = [
        steps.length ? rampUp(sum(steps), 1000, 10000) : null,
        activeCalories.length ? rampUp(sum(activeCalories), 100, 600) : null,
        distance.length ? rampUp(sum(distance), 500, 5000) : null,
        exerciseMinutes.length ? rampUp(sum(exerciseMinutes), 0, 45) : null,
      ].filter((v): v is number => v !== null);
      const strainScore = strainParts.length ? average(strainParts) : null;
      const strainBand = strainScore === null ? null : bandHigherIsBetter(strainScore);

      // Stress: the inverse signal - low HRV and a heart rate that stays elevated over its
      // resting baseline both point to the body running "on alert" that day.
      const stressParts = [
        hrvScore === null ? null : 100 - hrvScore,
        heartRate.length && restingHR.length
          ? rampUp(average(heartRate) - average(restingHR), 5, 35)
          : null,
      ].filter((v): v is number => v !== null);
      const stressScore = stressParts.length ? average(stressParts) : null;
      const stressBand = stressScore === null ? null : bandLowerIsBetter(stressScore);

      return {
        dayKey,
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        sleepHours,
        sleep: sleepScore,
        sleepBand,
        recovery: recoveryScore,
        recoveryBand,
        strain: strainScore,
        strainBand,
        stress: stressScore,
        stressBand,
      };
    });

    const anyData = points.some(
      (p) => p.sleepBand || p.recoveryBand || p.strainBand || p.stressBand
    );

    const latest = [...points]
      .reverse()
      .find((p) => p.sleepBand || p.recoveryBand || p.strainBand || p.stressBand);

    const concern = latest
      ? {
          date: latest.date,
          series: SERIES.map((s) => ({ ...s, band: latest[s.bandKey] })).filter(
            (s) => s.band === 'poor' || s.band === 'fair'
          ),
        }
      : null;

    return { chartData: points, hasAnyData: anyData, latestConcern: concern };
  }, [rows, days]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5" />
          {t('ilq.analytics.vitalsTrend.title', { days, defaultValue: '{{days}}-Day Vitals Trend' })}
        </CardTitle>
        <CardDescription>
          {t(
            'ilq.analytics.vitalsTrend.description',
            'Sleep is measured directly; Recovery, Strain and Stress are estimated from heart rate, HRV and daily activity - a quick read on what might be going wrong.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAnyData ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {t('ilq.analytics.vitalsTrend.empty', {
              days,
              defaultValue: 'Not enough device data in the last {{days}} days to chart these trends yet.',
            })}
          </p>
        ) : (
          <div className="space-y-3">
            {latestConcern && latestConcern.series.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">
                  {t('ilq.analytics.vitalsTrend.watchOn', { date: latestConcern.date, defaultValue: 'On {{date}}:' })}
                </span>
                {latestConcern.series.map((s) => (
                  <span key={s.key} className="flex items-center gap-1 text-muted-foreground">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: BAND_COLOR[s.band as Band] }}
                    />
                    {seriesLabels[s.key]}
                  </span>
                ))}
              </div>
            )}

            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  width={32}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]?.payload as TrendPoint | undefined;
                    if (!point) return null;
                    return (
                      <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md space-y-1">
                        <p className="font-medium text-foreground">{label}</p>
                        {SERIES.map((s) => {
                          const band = point[s.bandKey];
                          if (!band) return null;
                          const display =
                            s.key === 'sleep' && point.sleepHours !== null
                              ? `${point.sleepHours.toFixed(1)}h`
                              : `${Math.round(point[s.key] ?? 0)}/100`;
                          return (
                            <div key={s.key} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span
                                  className="inline-block h-2 w-2 rounded-full shrink-0"
                                  style={{ background: BAND_COLOR[band] }}
                                />
                                {seriesLabels[s.key]}
                              </span>
                              <span className="font-medium text-foreground">
                                {display} · {bandLabels[band]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} iconType="line" />
                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={seriesLabels[s.key]}
                    stroke={s.color}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={(props: StatusDotProps) => {
                      const { cx, cy, payload, index } = props;
                      const band: Band | null = payload?.[s.bandKey] ?? null;
                      if (band == null || cx == null || cy == null) {
                        return <g key={`dot-${s.key}-${index}`} />;
                      }
                      return (
                        <circle
                          key={`dot-${s.key}-${index}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={BAND_COLOR[band]}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={(props: StatusDotProps) => {
                      const { cx, cy, payload, index } = props;
                      const band: Band | null = payload?.[s.bandKey] ?? null;
                      if (band == null || cx == null || cy == null) {
                        return <g key={`active-dot-${s.key}-${index}`} />;
                      }
                      return (
                        <circle
                          key={`active-dot-${s.key}-${index}`}
                          cx={cx}
                          cy={cy}
                          r={7}
                          fill={BAND_COLOR[band]}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('ilq.analytics.vitalsTrend.pointColorKey', 'Each point:')}
              </span>
              {(['good', 'fair', 'poor'] as Band[]).map((band) => (
                <span key={band} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: BAND_COLOR[band] }}
                  />
                  {bandLabels[band]}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
