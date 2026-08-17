import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { RehabCheckinForm } from '@/components/dashboard/RehabCheckinForm';
import {
  DOMAIN_LABELS,
  RehabProgressResult,
  confidenceLabel,
  describeProtocol,
  trendColorClass,
  trendLabel,
} from '@/lib/rehabProgress';
import { Activity, ClipboardPlus, HeartPulse, Moon, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const DOMAIN_ICONS: Record<string, typeof Activity> = {
  mobility: Activity,
  cardio: HeartPulse,
  body_comp: Scale,
  sleep: Moon,
  manual: ClipboardPlus,
};

function TrendIcon({ trend }: { trend: 'improving' | 'stable' | 'declining' | null }) {
  const className = `h-4 w-4 ${trendColorClass(trend)}`;
  if (trend === 'improving') return <TrendingUp className={className} />;
  if (trend === 'declining') return <TrendingDown className={className} />;
  if (trend === 'stable') return <Minus className={className} />;
  return null;
}

interface RehabProgressProps {
  selectedPersonId: string | null;
}

export function RehabProgress({ selectedPersonId }: RehabProgressProps) {
  const [showCheckinForm, setShowCheckinForm] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rehab-progress-analysis', selectedPersonId],
    queryFn: async (): Promise<RehabProgressResult> => {
      const { data, error } = await supabase.rpc('run_rehab_progress_analysis', {
        p_elderly_person_id: selectedPersonId as string,
        p_source: 'web',
      });
      if (error) throw error;
      return data as unknown as RehabProgressResult;
    },
    enabled: !!selectedPersonId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleSaved = () => {
    setShowCheckinForm(false);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Rehab Progress
            <HelpTooltip
              title="How this works"
              content="Compares recent mobility, cardiovascular, body composition and sleep data against the first days of the rehab program, plus caregiver-logged pain and exercise adherence. This is a progress signal, not a clinical assessment — a PT's own evaluation always takes priority."
            />
          </span>
          {selectedPersonId && data?.status !== 'no_active_enrollment' && (
            <Button variant="outline" size="sm" onClick={() => setShowCheckinForm(true)}>
              <ClipboardPlus className="h-4 w-4 mr-1" />
              Log check-in
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedPersonId ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Select a person to see their rehab progress.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-pulse text-muted-foreground text-sm">Checking...</div>
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Couldn't load rehab progress right now.
          </p>
        ) : data?.status === 'no_active_enrollment' ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              No rehab program has been started for this person yet.
            </p>
            <Button size="sm" onClick={() => setShowCheckinForm(true)}>
              Start a rehab program
            </Button>
          </div>
        ) : data?.baseline_progress ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-medium">Establishing baseline</p>
            <p className="text-xs text-muted-foreground">
              {data.enrollment && describeProtocol(data.enrollment.protocol_key)} started{' '}
              {data.enrollment && new Date(data.enrollment.program_start_date).toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.baseline_progress.elapsed_days} of {data.baseline_progress.required_days} days needed
              before progress can be measured
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="text-4xl font-bold">
                {data?.overall_score !== null && data?.overall_score !== undefined
                  ? Math.round(data.overall_score)
                  : '—'}
              </div>
              <div className={`flex items-center justify-center gap-1 text-sm font-medium ${trendColorClass(data?.overall_trend ?? null)}`}>
                <TrendIcon trend={data?.overall_trend ?? null} />
                {trendLabel(data?.overall_trend ?? null)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {data?.domains_scored ?? 0} of {data?.domains.length ?? 5} domains
              </p>
            </div>

            <div className="space-y-2">
              {data?.domains.map((domain) => {
                const Icon = DOMAIN_ICONS[domain.domain_key] ?? Activity;
                return (
                  <div key={domain.domain_key} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium text-sm">{DOMAIN_LABELS[domain.domain_key]}</p>
                      </div>
                      <Badge
                        variant={domain.confidence === 'established' ? 'secondary' : 'outline'}
                        className="shrink-0 text-xs"
                      >
                        {confidenceLabel(domain.confidence)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`flex items-center gap-1 text-sm font-medium ${trendColorClass(domain.trend)}`}>
                        <TrendIcon trend={domain.trend} />
                        {domain.score !== null ? Math.round(domain.score) : '—'}
                      </div>
                      <span className="text-xs text-muted-foreground">{trendLabel(domain.trend)}</span>
                    </div>
                    {domain.message && <p className="text-xs text-muted-foreground mt-2">{domain.message}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t">
          Progress signal from device and check-in data, not a clinical assessment.
        </p>
      </CardContent>

      {selectedPersonId && (
        <RehabCheckinForm
          elderlyPersonId={selectedPersonId}
          enrollment={data?.enrollment ?? null}
          open={showCheckinForm}
          onOpenChange={setShowCheckinForm}
          onSaved={handleSaved}
        />
      )}
    </Card>
  );
}

export default RehabProgress;
