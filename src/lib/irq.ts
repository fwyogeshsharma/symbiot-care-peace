import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Display metadata for IRQ (Individual Recovery Quotient) — see supabase/functions/irq-compute
 * and supabase/migrations/20260817140000_create_irq_tables.sql.
 *
 * Person-first language throughout: refer to the tracked person by name or as "person in
 * recovery", never by a diagnosis or stigmatizing label.
 */

/**
 * supabase.functions.invoke() throws a FunctionsHttpError whose .message is just "Edge Function
 * returned a non-2xx status code" - the actual reason (insufficient data, missing config, a DB
 * error) is in the response body instead. This pulls that out so the UI can show it.
 */
export async function describeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.message === 'string') return body.message;
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // response body wasn't JSON — fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export type IRQComponentKey = 'physiological_stress' | 'activity_routine' | 'sobriety' | 'craving_control';

export const COMPONENT_LABELS: Record<IRQComponentKey, string> = {
  physiological_stress: 'Physiological stress',
  activity_routine: 'Activity & routine',
  sobriety: 'Sobriety status',
  craving_control: 'Craving control',
};

export const COMPONENT_WEIGHTS: Record<IRQComponentKey, number> = {
  physiological_stress: 0.25,
  activity_routine: 0.2,
  sobriety: 0.35,
  craving_control: 0.2,
};

export interface IRQScoreRow {
  id: string;
  elderly_person_id: string;
  score: number | string;
  physiological_stress_score: number | string | null;
  activity_routine_score: number | string | null;
  sobriety_score: number | string | null;
  craving_control_score: number | string | null;
  computation_timestamp: string;
  data_points_analyzed: number;
  time_window_hours: number;
  confidence_level: number | string | null;
  detailed_metrics: Record<string, unknown> | null;
  triggered_alerts: string[] | null;
}

/** Days since the last relapse (or since program_start if there's been none) — null if no program tracked yet. */
export const formatCleanDays = (cleanDays: number | null): string => {
  if (cleanDays === null) return 'No recovery tracking started yet';
  if (cleanDays === 0) return 'Day 0';
  if (cleanDays === 1) return '1 day clean';
  return `${cleanDays} days clean`;
};
