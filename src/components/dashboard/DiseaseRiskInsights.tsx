import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { ShieldAlert, ShieldCheck, Star } from 'lucide-react';

interface FlaggedDisease {
  disease_key: string;
  disease_name: string;
  category: string;
  confidence_tier: 'preliminary' | 'recommended';
  confidence_stars: number;
  score: number | null;
  days_of_data: number;
  message: string | null;
}

interface DiseaseRiskAnalysisResult {
  status: 'computed' | 'already_run_today';
  elderly_person_id: string;
  computed_date: string;
  flagged_diseases: FlaggedDisease[];
}

const CATEGORY_LABELS: Record<string, string> = {
  sleep_disorder: 'Sleep',
  mental_health: 'Mental Health',
  cardiometabolic: 'Cardiometabolic',
  recovery_systemic: 'Recovery',
};

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} out of 5 confidence stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < count ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

interface DiseaseRiskInsightsProps {
  selectedPersonId: string | null;
}

export function DiseaseRiskInsights({ selectedPersonId }: DiseaseRiskInsightsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['disease-risk-analysis', selectedPersonId],
    queryFn: async (): Promise<DiseaseRiskAnalysisResult> => {
      const { data, error } = await supabase.rpc('run_disease_risk_analysis', {
        p_elderly_person_id: selectedPersonId as string,
        p_source: 'web',
      });
      if (error) throw error;
      return data as unknown as DiseaseRiskAnalysisResult;
    },
    enabled: !!selectedPersonId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const flagged = data?.flagged_diseases ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Health Risk Screening
            <HelpTooltip
              title="How this works"
              content="Runs once a day from accumulated sleep, heart rate and activity data. Confidence grows with more days of data. This is a wellness signal, not a medical diagnosis — talk to a healthcare professional about any concern."
            />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedPersonId ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Select a person to see their risk screening.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-pulse text-muted-foreground text-sm">Checking...</div>
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Couldn't load risk screening right now.
          </p>
        ) : flagged.length === 0 ? (
          <div className="text-center py-6">
            <ShieldCheck className="w-10 h-10 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No risk signals detected in the current data.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {flagged.map((d) => (
              <div key={d.disease_key} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{d.disease_name}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[d.category] ?? d.category}</p>
                  </div>
                  <Badge
                    variant={d.confidence_tier === 'recommended' ? 'secondary' : 'outline'}
                    className="shrink-0 text-xs"
                  >
                    {d.confidence_tier === 'recommended' ? 'Confirmed confidence' : 'Preliminary'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <StarRow count={d.confidence_stars} />
                  <span className="text-xs text-muted-foreground">{d.days_of_data} day(s) of data</span>
                </div>
                {d.message && <p className="text-xs text-muted-foreground mt-2">{d.message}</p>}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t">
          Wellness signals only, not a diagnosis. If something here concerns you, consult a healthcare professional.
        </p>
      </CardContent>
    </Card>
  );
}

export default DiseaseRiskInsights;
