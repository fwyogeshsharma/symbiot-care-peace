import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

// IRQ (Individual Recovery Quotient) — same shape as supabase/functions/ilq-compute, re-pointed
// at recovery-relevant signals: physiological stress/withdrawal proxies from device_data, activity
// & routine from device_data, sobriety status from recovery_sobriety_events (an event log a
// clean-day streak is derived from), and craving control from recovery_checkins (the only two
// things here a wearable cannot measure). Wellness/progress signal only, not a clinical
// assessment or a substitute for a counselor/clinician's own evaluation.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComputeRequest {
  elderly_person_id: string;
  time_window_hours?: number;
  force_recompute?: boolean;
  custom_weights?: {
    physiological_stress?: number;
    activity_routine?: number;
    sobriety?: number;
    craving_control?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { elderly_person_id, time_window_hours = 24, custom_weights }: ComputeRequest = await req.json();

    console.log(`Computing IRQ for elderly person: ${elderly_person_id}, window: ${time_window_hours}h`);

    // 1. Fetch configuration (person-specific override, else the global default)
    const { data: config } = await supabaseClient
      .from('irq_configurations')
      .select('*')
      .or(`elderly_person_id.eq.${elderly_person_id},is_global.eq.true`)
      .order('is_global', { ascending: true })
      .limit(1)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'No configuration found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weights = {
      physiological_stress: custom_weights?.physiological_stress || parseFloat(config.physiological_stress_weight),
      activity_routine: custom_weights?.activity_routine || parseFloat(config.activity_routine_weight),
      sobriety: custom_weights?.sobriety || parseFloat(config.sobriety_weight),
      craving_control: custom_weights?.craving_control || parseFloat(config.craving_control_weight),
    };

    // 2. Fetch device data within the time window (physiological stress + activity components)
    const timeWindowStart = new Date(Date.now() - time_window_hours * 60 * 60 * 1000).toISOString();
    const { data: deviceData } = await supabaseClient
      .from('device_data')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('recorded_at', timeWindowStart);

    // 3. Fetch craving check-ins over a trailing 7 days, same pattern as ILQ's 7-day medication window
    const checkinWindowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: checkins } = await supabaseClient
      .from('recovery_checkins')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('checkin_date', checkinWindowStart);

    // 4. Fetch the full sobriety event log for this person — small per person, no windowing needed
    const { data: sobrietyEvents } = await supabaseClient
      .from('recovery_sobriety_events')
      .select('*')
      .eq('elderly_person_id', elderly_person_id);

    const hasDeviceData = deviceData && deviceData.length > 0;
    const hasCheckins = checkins && checkins.length > 0;
    const hasSobrietyEvents = sobrietyEvents && sobrietyEvents.length > 0;

    if (!hasDeviceData && !hasCheckins && !hasSobrietyEvents) {
      console.log('No device data, check-ins, or sobriety events found');
      return new Response(
        JSON.stringify({
          error: 'Insufficient data',
          message: 'No device data, check-ins, or recovery tracking has been logged for this person yet',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${deviceData?.length ?? 0} device readings, ${checkins?.length ?? 0} check-ins, ${sobrietyEvents?.length ?? 0} sobriety events`);

    // 5. Compute component scores
    const dataByType = groupDataByType(deviceData || []);
    const physiologicalScore = computePhysiologicalStress(dataByType, config.normalization_ranges);
    const activityScore = computeActivityRoutine(dataByType, config.normalization_ranges);
    const sobrietyDetail = computeSobrietyStatus(sobrietyEvents || []);
    const cravingDetail = computeCravingControl(checkins || []);

    const componentScores = {
      physiological_stress: physiologicalScore,
      activity_routine: activityScore,
      sobriety: sobrietyDetail.score,
      craving_control: cravingDetail.score,
    };

    // 6. Weighted composite
    const irqScore =
      componentScores.physiological_stress * weights.physiological_stress +
      componentScores.activity_routine * weights.activity_routine +
      componentScores.sobriety * weights.sobriety +
      componentScores.craving_control * weights.craving_control;

    // 7. Confidence — same formula as ILQ, based on device-reading density in the window
    const confidenceLevel = calculateConfidence(deviceData?.length ?? 0, time_window_hours);

    // 8. Store the result (append-only history — never upserted)
    const { data: irqScoreRecord, error: insertError } = await supabaseClient
      .from('irq_scores')
      .insert({
        elderly_person_id,
        score: Math.round(irqScore * 100) / 100,
        physiological_stress_score: Math.round(componentScores.physiological_stress * 100) / 100,
        activity_routine_score: Math.round(componentScores.activity_routine * 100) / 100,
        sobriety_score: Math.round(componentScores.sobriety * 100) / 100,
        craving_control_score: Math.round(componentScores.craving_control * 100) / 100,
        data_points_analyzed: deviceData?.length ?? 0,
        time_window_hours,
        confidence_level: Math.round(confidenceLevel * 100) / 100,
        detailed_metrics: {
          data_types: groupDataByType(deviceData || []),
          sobriety: sobrietyDetail,
          craving: cravingDetail,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting IRQ score:', insertError);
      throw insertError;
    }

    // 9. Check for alerts
    const alerts = await checkAlerts(supabaseClient, elderly_person_id, irqScore, componentScores, irqScoreRecord.id, sobrietyDetail);

    console.log(`IRQ computed successfully: ${irqScore.toFixed(2)}, alerts: ${alerts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        irq_score: Math.round(irqScore * 100) / 100,
        component_scores: componentScores,
        confidence_level: Math.round(confidenceLevel * 100) / 100,
        data_points_analyzed: deviceData?.length ?? 0,
        alerts_triggered: alerts,
        computation_timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in irq-compute:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function groupDataByType(deviceData: any[]) {
  const grouped: Record<string, any[]> = {};
  for (const data of deviceData) {
    if (!grouped[data.data_type]) {
      grouped[data.data_type] = [];
    }
    grouped[data.data_type].push(data.value);
  }
  return grouped;
}

// Withdrawal/stress proxy: elevated heart rate, low HRV, and a fast respiratory rate all score
// lower (more physiological stress); calm vitals score higher. Same normalizeValue() approach and
// metric extraction as ilq-compute's computeHealthVitals, scoped to just these four signals.
function computePhysiologicalStress(dataByType: Record<string, any[]>, ranges: any): number {
  let totalScore = 0;
  let count = 0;

  if (dataByType.heart_rate) {
    const avgHR = average(dataByType.heart_rate.map((v) => v.bpm || 0).filter((v) => v > 0));
    if (avgHR > 0) {
      totalScore += normalizeValue(avgHR, ranges.heart_rate?.min || 60, ranges.heart_rate?.max || 100, ranges.heart_rate?.optimal || 75);
      count++;
    }
  }

  if (dataByType.resting_heart_rate) {
    const avgRHR = average(dataByType.resting_heart_rate.map((v) => v.bpm || 0).filter((v) => v > 0));
    if (avgRHR > 0) {
      totalScore += normalizeValue(avgRHR, ranges.resting_heart_rate?.min || 40, ranges.resting_heart_rate?.max || 100, ranges.resting_heart_rate?.optimal || 62);
      count++;
    }
  }

  if (dataByType.heart_rate_variability) {
    const avgHRV = average(dataByType.heart_rate_variability.map((v) => v.rmssd_ms || 0).filter((v) => v > 0));
    if (avgHRV > 0) {
      totalScore += normalizeValue(avgHRV, ranges.heart_rate_variability?.min || 10, ranges.heart_rate_variability?.max || 100, ranges.heart_rate_variability?.optimal || 60);
      count++;
    }
  }

  if (dataByType.respiratory_rate) {
    const avgRR = average(dataByType.respiratory_rate.map((v) => v.breaths_per_minute || 0).filter((v) => v > 0));
    if (avgRR > 0) {
      totalScore += normalizeValue(avgRR, ranges.respiratory_rate?.min || 8, ranges.respiratory_rate?.max || 25, ranges.respiratory_rate?.optimal || 16);
      count++;
    }
  }

  return count > 0 ? totalScore / count : 50; // Default to neutral if no vitals data
}

// Based on ilq-compute's computePhysicalActivity, extended with the gait-speed and
// wheelchair-pushes signals the physical rehab progress score also uses (_rehab_score_mobility)
// — recovery from substance use and recovery from a physical condition both care about the same
// underlying functional-mobility trend, not just step counts.
function computeActivityRoutine(dataByType: Record<string, any[]>, ranges: any): number {
  let totalScore = 0;
  let count = 0;

  if (dataByType.steps) {
    const totalSteps = dataByType.steps.reduce((sum, v) => sum + (v.count || 0), 0);
    totalScore += normalizeValue(totalSteps, ranges.steps_daily?.min || 2000, ranges.steps_daily?.max || 10000, ranges.steps_daily?.optimal || 5000);
    count++;
  }

  if (dataByType.distance) {
    const totalMeters = dataByType.distance.reduce((sum, v) => sum + (v.meters || 0), 0);
    totalScore += normalizeValue(totalMeters, ranges.distance_daily?.min || 500, ranges.distance_daily?.max || 5000, ranges.distance_daily?.optimal || 3000);
    count++;
  }

  // Gait speed — a functional-mobility signal shared with the physical rehab progress score
  // (_rehab_score_mobility). Not cumulative like steps/distance, so it's averaged, not summed.
  if (dataByType.speed) {
    const avgSpeed = average(dataByType.speed.map((v) => v.meters_per_second || v.value || 0).filter((v) => v > 0));
    if (avgSpeed > 0) {
      totalScore += normalizeValue(avgSpeed, ranges.speed_avg?.min || 0.3, ranges.speed_avg?.max || 2.0, ranges.speed_avg?.optimal || 1.2);
      count++;
    }
  }

  // Wheelchair pushes — the mobility signal for wheelchair users, who won't generate steps/speed.
  // Only scored when present, same opt-in treatment _rehab_score_mobility gives it.
  if (dataByType.wheelchair_pushes) {
    const totalPushes = dataByType.wheelchair_pushes.reduce((sum, v) => sum + (v.count || 0), 0);
    totalScore += normalizeValue(totalPushes, ranges.wheelchair_pushes_daily?.min || 0, ranges.wheelchair_pushes_daily?.max || 300, ranges.wheelchair_pushes_daily?.optimal || 120);
    count++;
  }

  if (dataByType.active_calories) {
    const totalKcal = dataByType.active_calories.reduce((sum, v) => sum + (v.kcal || 0), 0);
    totalScore += normalizeValue(totalKcal, ranges.active_calories_daily?.min || 100, ranges.active_calories_daily?.max || 800, ranges.active_calories_daily?.optimal || 400);
    count++;
  }

  if (dataByType.floors_climbed) {
    const totalFloors = dataByType.floors_climbed.reduce((sum, v) => sum + (v.floors || 0), 0);
    totalScore += normalizeValue(totalFloors, ranges.floors_climbed_daily?.min || 0, ranges.floors_climbed_daily?.max || 20, ranges.floors_climbed_daily?.optimal || 8);
    count++;
  }

  if (dataByType.exercise_session) {
    const totalMinutes = dataByType.exercise_session.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
    totalScore += normalizeValue(totalMinutes, ranges.exercise_minutes_daily?.min || 0, ranges.exercise_minutes_daily?.max || 60, ranges.exercise_minutes_daily?.optimal || 30);
    count++;
  }

  if (dataByType.fall_detected) {
    const fallCount = dataByType.fall_detected.filter((v) => v.detected === true).length;
    const fallPenalty = Math.min(50, fallCount * 20);
    totalScore += Math.max(0, 100 - fallPenalty);
    count++;
  } else {
    totalScore += 100; // No falls detected
    count++;
  }

  return count > 0 ? totalScore / count : 50;
}

interface SobrietyDetail {
  score: number;
  cleanDays: number | null;
  anchorDate: string | null;
  anchorType: 'program_start' | 'relapse' | null;
  recentRelapse: boolean;
}

// Clean-day streak = days since the most recent relapse, or since program_start if there has
// been no relapse yet. Score ramps linearly from 20 (acute-risk day 0) to 100 at 90+ clean days —
// the milestone window recovery programs commonly measure against (30/60/90 days).
function computeSobrietyStatus(events: any[]): SobrietyDetail {
  if (!events || events.length === 0) {
    return { score: 50, cleanDays: null, anchorDate: null, anchorType: null, recentRelapse: false };
  }

  const relapses = events
    .filter((e) => e.event_type === 'relapse')
    .sort((a, b) => (a.event_date < b.event_date ? 1 : -1));
  const starts = events
    .filter((e) => e.event_type === 'program_start')
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1));

  const anchor = relapses[0] ?? starts[0];
  if (!anchor) {
    return { score: 50, cleanDays: null, anchorDate: null, anchorType: null, recentRelapse: false };
  }

  const anchorDate = new Date(`${anchor.event_date}T00:00:00Z`);
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(`${todayStr}T00:00:00Z`);
  const cleanDays = Math.max(0, Math.round((today.getTime() - anchorDate.getTime()) / 86400000));

  const score = Math.min(100, 20 + (cleanDays / 90) * 80);
  const recentRelapse = relapses.length > 0 && relapses[0].event_date === todayStr;

  return {
    score,
    cleanDays,
    anchorDate: anchor.event_date,
    anchorType: relapses[0] ? 'relapse' : 'program_start',
    recentRelapse,
  };
}

interface CravingDetail {
  score: number;
  avgCraving: number | null;
  checkinsAnalyzed: number;
}

// Inverse of trailing-7-day average craving intensity (0-10 scale, lower craving = higher score).
function computeCravingControl(checkins: any[]): CravingDetail {
  if (!checkins || checkins.length === 0) {
    return { score: 60, avgCraving: null, checkinsAnalyzed: 0 }; // neutral-leaning default, nothing logged yet
  }

  const avgCraving = average(checkins.map((c) => c.craving_intensity ?? 0));
  const score = Math.max(0, Math.min(100, 100 - avgCraving * 10));

  return { score, avgCraving, checkinsAnalyzed: checkins.length };
}

function normalizeValue(value: number, min: number, max: number, optimal: number): number {
  if (value <= min) return 0;
  if (value >= max) return value > optimal ? 50 : 100;

  const distanceToOptimal = Math.abs(value - optimal);
  const maxDistance = Math.max(optimal - min, max - optimal);

  return Math.max(0, 100 - (distanceToOptimal / maxDistance) * 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateConfidence(dataPointCount: number, timeWindowHours: number): number {
  const expectedDataPoints = timeWindowHours * 2; // Assume 2 data points per hour minimum
  const ratio = dataPointCount / expectedDataPoints;
  return Math.min(1.0, ratio);
}

async function checkAlerts(
  supabase: any,
  elderlyPersonId: string,
  currentScore: number,
  componentScores: Record<string, number>,
  irqScoreId: string,
  sobrietyDetail: SobrietyDetail
): Promise<string[]> {
  const alerts: string[] = [];

  const { data: previousScores } = await supabase
    .from('irq_scores')
    .select('score')
    .eq('elderly_person_id', elderlyPersonId)
    .order('computation_timestamp', { ascending: false })
    .limit(2);

  if (previousScores && previousScores.length > 1) {
    const scoreDrop = previousScores[1].score - currentScore;

    if (scoreDrop > 10) {
      await supabase.from('irq_alerts').insert({
        elderly_person_id: elderlyPersonId,
        irq_score_id: irqScoreId,
        alert_type: 'score_drop',
        severity: scoreDrop > 20 ? 'critical' : 'high',
        title: 'Sudden IRQ Score Drop',
        description: `IRQ score dropped by ${scoreDrop.toFixed(1)} points since the last computation`,
        previous_score: previousScores[1].score,
        current_score: currentScore,
        score_change: -scoreDrop,
      });
      alerts.push('score_drop');
    }
  }

  if (currentScore < 40) {
    await supabase.from('irq_alerts').insert({
      elderly_person_id: elderlyPersonId,
      irq_score_id: irqScoreId,
      alert_type: 'low_score',
      severity: 'critical',
      title: 'Critical IRQ Score',
      description: `IRQ score is ${currentScore.toFixed(1)} — this person may need additional support right now`,
      current_score: currentScore,
    });
    alerts.push('low_score');
  }

  const lowComponents = Object.entries(componentScores)
    .filter(([, score]) => score < 30)
    .map(([component]) => component);

  if (lowComponents.length > 0) {
    await supabase.from('irq_alerts').insert({
      elderly_person_id: elderlyPersonId,
      irq_score_id: irqScoreId,
      alert_type: 'component_decline',
      severity: 'medium',
      title: 'Component Scores Below Threshold',
      description: `The following components are concerning: ${lowComponents.join(', ')}`,
      current_score: currentScore,
      affected_components: lowComponents,
    });
    alerts.push('component_decline');
  }

  if (sobrietyDetail.recentRelapse) {
    await supabase.from('irq_alerts').insert({
      elderly_person_id: elderlyPersonId,
      irq_score_id: irqScoreId,
      alert_type: 'relapse_logged',
      severity: 'critical',
      title: 'Relapse Logged',
      description: 'A relapse was logged for this person today.',
      current_score: currentScore,
    });
    alerts.push('relapse_logged');
  }

  return alerts;
}
