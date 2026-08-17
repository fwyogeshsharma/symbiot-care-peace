/**
 * Types + display metadata for the rehab progress score (RPC `run_rehab_progress_analysis`,
 * tables `rehab_enrollments` / `rehab_manual_checkins` / `rehab_domain_scores` /
 * `rehab_progress_history` — see supabase/migrations/20260817130000_*.sql onward).
 *
 * These tables predate the generated src/integrations/supabase/types.ts (same situation as
 * disease_risk_flags/disease_risk_thresholds), so callers cast the RPC result rather than
 * relying on generated types — see DiseaseRiskInsights.tsx for the precedent.
 */

export type RehabDomainKey = 'mobility' | 'cardio' | 'body_comp' | 'sleep' | 'manual';

export type RehabConfidence = 'insufficient_data' | 'preliminary' | 'established';

export type RehabTrend = 'improving' | 'stable' | 'declining';

export interface RehabDomainResult {
  domain_key: RehabDomainKey;
  confidence: RehabConfidence;
  score: number | null;
  trend: RehabTrend | null;
  message: string | null;
}

export interface RehabEnrollmentInfo {
  protocol_key: string;
  program_start_date: string;
  baseline_window_days: number;
}

export interface RehabBaselineProgress {
  elapsed_days: number;
  required_days: number;
}

export interface RehabProgressResult {
  status: 'computed' | 'already_run_today' | 'no_active_enrollment';
  elderly_person_id: string;
  computed_date: string;
  enrollment: RehabEnrollmentInfo | null;
  baseline_progress: RehabBaselineProgress | null;
  overall_score: number | null;
  overall_trend: RehabTrend | null;
  domains_scored: number;
  domains: RehabDomainResult[];
}

export const DOMAIN_LABELS: Record<RehabDomainKey, string> = {
  mobility: 'Mobility',
  cardio: 'Cardiovascular',
  body_comp: 'Body composition',
  sleep: 'Sleep & recovery',
  manual: 'Pain & adherence',
};

export const PROTOCOL_LABELS: Record<string, string> = {
  general_mobility: 'General mobility',
  post_hip_replacement: 'Post hip replacement',
  post_knee_replacement: 'Post knee replacement',
  stroke_recovery: 'Stroke recovery',
  cardiac_rehab: 'Cardiac rehab',
};

/** "custom_protocol" -> "Custom protocol", for a protocol_key not in PROTOCOL_LABELS. */
export const describeProtocol = (protocolKey: string): string =>
  PROTOCOL_LABELS[protocolKey] ?? protocolKey.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Same color convention as VitalMetrics.tsx: text-success / text-warning / text-destructive. */
export const trendColorClass = (trend: RehabTrend | null): string => {
  switch (trend) {
    case 'improving':
      return 'text-success';
    case 'declining':
      return 'text-destructive';
    case 'stable':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
};

export const trendLabel = (trend: RehabTrend | null): string => {
  switch (trend) {
    case 'improving':
      return 'Improving';
    case 'declining':
      return 'Declining';
    case 'stable':
      return 'Stable';
    default:
      return 'Not yet available';
  }
};

export const confidenceLabel = (confidence: RehabConfidence): string => {
  switch (confidence) {
    case 'established':
      return 'Established';
    case 'preliminary':
      return 'Preliminary';
    default:
      return 'Insufficient data';
  }
};
