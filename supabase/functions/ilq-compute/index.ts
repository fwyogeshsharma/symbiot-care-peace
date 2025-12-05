import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComputeRequest {
  elderly_person_id: string;
  time_window_hours?: number;
  force_recompute?: boolean;
  custom_weights?: {
    health_vitals?: number;
    physical_activity?: number;
    cognitive_function?: number;
    environmental_safety?: number;
    emergency_response?: number;
    social_engagement?: number;
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

    const { elderly_person_id, time_window_hours = 24, force_recompute = false, custom_weights }: ComputeRequest = await req.json();

    console.log(`Computing ILQ for elderly person: ${elderly_person_id}, window: ${time_window_hours}h`);

    // 1. Fetch configuration
    const { data: config } = await supabaseClient
      .from('ilq_configurations')
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

    // Apply custom weights if provided
    const weights = {
      health_vitals: custom_weights?.health_vitals || parseFloat(config.health_vitals_weight),
      physical_activity: custom_weights?.physical_activity || parseFloat(config.physical_activity_weight),
      cognitive_function: custom_weights?.cognitive_function || parseFloat(config.cognitive_function_weight),
      environmental_safety: custom_weights?.environmental_safety || parseFloat(config.environmental_safety_weight),
      emergency_response: custom_weights?.emergency_response || parseFloat(config.emergency_response_weight),
      social_engagement: custom_weights?.social_engagement || parseFloat(config.social_engagement_weight),
    };

    // 2. Fetch device data within time window
    const timeWindowStart = new Date(Date.now() - time_window_hours * 60 * 60 * 1000).toISOString();
    const { data: deviceData } = await supabaseClient
      .from('device_data')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('recorded_at', timeWindowStart);

    // 2b. Fetch medication adherence logs (for cognitive function score)
    const medicationWindowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days for medication
    const { data: adherenceLogs } = await supabaseClient
      .from('medication_adherence_logs')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('timestamp', medicationWindowStart);

    if (!deviceData || deviceData.length === 0) {
      console.log('No device data found in time window');
      return new Response(
        JSON.stringify({
          error: 'Insufficient data',
          message: `No device data found in the last ${time_window_hours} hours`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${deviceData.length} data points, ${adherenceLogs?.length || 0} medication logs`);

    // 3. Compute component scores
    const componentScores = computeComponentScores(deviceData, config, adherenceLogs || []);

    // 4. Calculate ILQ score
    const ilqScore = (
      componentScores.health_vitals * weights.health_vitals +
      componentScores.physical_activity * weights.physical_activity +
      componentScores.cognitive_function * weights.cognitive_function +
      componentScores.environmental_safety * weights.environmental_safety +
      componentScores.emergency_response * weights.emergency_response +
      componentScores.social_engagement * weights.social_engagement
    );

    // 5. Calculate confidence level
    const confidenceLevel = calculateConfidence(deviceData.length, time_window_hours);

    // 6. Store results
    const { data: ilqScoreRecord, error: insertError } = await supabaseClient
      .from('ilq_scores')
      .insert({
        elderly_person_id,
        score: Math.round(ilqScore * 100) / 100,
        health_vitals_score: Math.round(componentScores.health_vitals * 100) / 100,
        physical_activity_score: Math.round(componentScores.physical_activity * 100) / 100,
        cognitive_function_score: Math.round(componentScores.cognitive_function * 100) / 100,
        environmental_safety_score: Math.round(componentScores.environmental_safety * 100) / 100,
        emergency_response_score: Math.round(componentScores.emergency_response * 100) / 100,
        social_engagement_score: Math.round(componentScores.social_engagement * 100) / 100,
        data_points_analyzed: deviceData.length,
        time_window_hours,
        confidence_level: Math.round(confidenceLevel * 100) / 100,
        detailed_metrics: { data_types: groupDataByType(deviceData) },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting ILQ score:', insertError);
      throw insertError;
    }

    // 7. Check for alerts
    const alerts = await checkAlerts(supabaseClient, elderly_person_id, ilqScore, componentScores, ilqScoreRecord.id);

    console.log(`ILQ computed successfully: ${ilqScore.toFixed(2)}, alerts: ${alerts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        ilq_score: Math.round(ilqScore * 100) / 100,
        component_scores: componentScores,
        confidence_level: Math.round(confidenceLevel * 100) / 100,
        data_points_analyzed: deviceData.length,
        alerts_triggered: alerts,
        computation_timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ilq-compute:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function computeComponentScores(deviceData: any[], config: any, adherenceLogs: any[] = []) {
  const ranges = config.normalization_ranges;

  // Group data by type
  const dataByType = groupDataByType(deviceData);

  // Health Vitals Score (30%)
  const healthScore = computeHealthVitals(dataByType, ranges);

  // Physical Activity Score (25%)
  const activityScore = computePhysicalActivity(dataByType, ranges);

  // Cognitive Function Score (15%) - Now uses medication adherence logs
  const cognitiveScore = computeCognitiveFunction(dataByType, adherenceLogs);

  // Environmental Safety Score (15%)
  const environmentalScore = computeEnvironmentalSafety(dataByType);

  // Emergency Response Score (10%)
  const emergencyScore = computeEmergencyResponse(dataByType);

  // Social Engagement Score (5%)
  const socialScore = computeSocialEngagement(dataByType);

  return {
    health_vitals: healthScore,
    physical_activity: activityScore,
    cognitive_function: cognitiveScore,
    environmental_safety: environmentalScore,
    emergency_response: emergencyScore,
    social_engagement: socialScore,
  };
}

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

function computeHealthVitals(dataByType: Record<string, any[]>, ranges: any): number {
  let totalScore = 0;
  let count = 0;

  // Heart rate
  if (dataByType.heart_rate) {
    const avgHR = average(dataByType.heart_rate.map(v => v.bpm || 0).filter(v => v > 0));
    if (avgHR > 0) {
      totalScore += normalizeValue(avgHR, ranges.heart_rate?.min || 60, ranges.heart_rate?.max || 100, ranges.heart_rate?.optimal || 75);
      count++;
    }
  }

  // Blood pressure
  if (dataByType.blood_pressure) {
    const avgSystolic = average(dataByType.blood_pressure.map(v => v.systolic || 0).filter(v => v > 0));
    if (avgSystolic > 0) {
      totalScore += normalizeValue(avgSystolic, ranges.blood_pressure_systolic?.min || 90, ranges.blood_pressure_systolic?.max || 140, ranges.blood_pressure_systolic?.optimal || 120);
      count++;
    }
  }

  // Oxygen saturation
  if (dataByType.oxygen_saturation) {
    const avgO2 = average(dataByType.oxygen_saturation.map(v => v.percentage || 0).filter(v => v > 0));
    if (avgO2 > 0) {
      totalScore += normalizeValue(avgO2, ranges.oxygen_saturation?.min || 95, ranges.oxygen_saturation?.max || 100, ranges.oxygen_saturation?.optimal || 98);
      count++;
    }
  }

  // Temperature
  if (dataByType.temperature) {
    const avgTemp = average(dataByType.temperature.map(v => v.celsius || 0).filter(v => v > 0));
    if (avgTemp > 0) {
      totalScore += normalizeValue(avgTemp, ranges.temperature?.min || 36.1, ranges.temperature?.max || 37.2, ranges.temperature?.optimal || 36.8);
      count++;
    }
  }

  return count > 0 ? totalScore / count : 50; // Default to neutral if no data
}

function computePhysicalActivity(dataByType: Record<string, any[]>, ranges: any): number {
  let totalScore = 0;
  let count = 0;

  // Steps
  if (dataByType.steps) {
    const totalSteps = dataByType.steps.reduce((sum, v) => sum + (v.count || 0), 0);
    totalScore += normalizeValue(totalSteps, ranges.steps_daily?.min || 2000, ranges.steps_daily?.max || 10000, ranges.steps_daily?.optimal || 5000);
    count++;
  }

  // Movement/Position tracking
  if (dataByType.position) {
    const movementFrequency = dataByType.position.length;
    totalScore += Math.min(100, (movementFrequency / 20) * 100); // More frequent position updates = better
    count++;
  }

  // Falls (negative impact)
  if (dataByType.fall_detection) {
    const fallCount = dataByType.fall_detection.filter(v => v.detected === true).length;
    const fallPenalty = Math.min(50, fallCount * 20); // Each fall reduces score by 20, max 50 penalty
    totalScore += Math.max(0, 100 - fallPenalty);
    count++;
  } else {
    totalScore += 100; // No falls detected
    count++;
  }

  return count > 0 ? totalScore / count : 50;
}

function computeCognitiveFunction(dataByType: Record<string, any[]>, adherenceLogs: any[] = []): number {
  // Cognitive function score based on medication adherence and routine consistency
  // This reflects the person's ability to follow their medication schedule

  let score = 75; // Default baseline
  let hasData = false;

  // Primary: Use medication_adherence_logs if available
  if (adherenceLogs && adherenceLogs.length > 0) {
    hasData = true;
    const totalLogs = adherenceLogs.length;
    const takenCount = adherenceLogs.filter(l => l.status === 'taken').length;
    const lateCount = adherenceLogs.filter(l => l.status === 'late').length;
    const missedCount = adherenceLogs.filter(l => l.status === 'missed').length;

    // Calculate adherence rate (taken + late counts as compliant)
    const complianceRate = ((takenCount + lateCount) / totalLogs) * 100;

    // Calculate on-time rate (only taken counts as on-time)
    const onTimeRate = (takenCount / totalLogs) * 100;

    // Calculate consistency score based on daily patterns
    const dailyMap: Record<string, { taken: number; total: number }> = {};
    adherenceLogs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { taken: 0, total: 0 };
      dailyMap[date].total++;
      if (log.status === 'taken' || log.status === 'late') {
        dailyMap[date].taken++;
      }
    });

    const dailyRates = Object.values(dailyMap)
      .filter(d => d.total > 0)
      .map(d => (d.taken / d.total) * 100);

    let consistencyScore = 100;
    if (dailyRates.length > 1) {
      const mean = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length;
      const variance = dailyRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyRates.length;
      const stdDev = Math.sqrt(variance);
      // Lower standard deviation = higher consistency
      consistencyScore = Math.max(0, 100 - stdDev);
    }

    // Weighted score calculation
    // 50% compliance rate, 30% on-time rate, 20% consistency
    score = (complianceRate * 0.5) + (onTimeRate * 0.3) + (consistencyScore * 0.2);

    // Apply penalties for missed doses
    const missedPenalty = Math.min(20, missedCount * 2); // Max 20 point penalty
    score = Math.max(0, score - missedPenalty);

    console.log(`Cognitive score from adherence logs: compliance=${complianceRate.toFixed(1)}%, onTime=${onTimeRate.toFixed(1)}%, consistency=${consistencyScore.toFixed(1)}, final=${score.toFixed(1)}`);
  }

  // Fallback: Use legacy device_data medication field if no adherence logs
  if (!hasData && dataByType.medication && dataByType.medication.length > 0) {
    hasData = true;
    const adherenceRate = dataByType.medication.filter(v => v.taken === true).length / dataByType.medication.length;
    score = score * 0.5 + (adherenceRate * 100) * 0.5;
    console.log(`Cognitive score from legacy data: adherence=${(adherenceRate * 100).toFixed(1)}%, final=${score.toFixed(1)}`);
  }

  // If no medication data at all, use baseline with slight reduction
  if (!hasData) {
    score = 70; // Slightly lower baseline when no data available
    console.log('Cognitive score: No medication data available, using baseline of 70');
  }

  return Math.min(100, Math.max(0, score));
}

function computeEnvironmentalSafety(dataByType: Record<string, any[]>): number {
  let totalScore = 0;
  let count = 0;

  // Temperature
  if (dataByType.environmental_temperature) {
    const avgTemp = average(dataByType.environmental_temperature.map(v => v.celsius || 0).filter(v => v > 0));
    if (avgTemp > 0) {
      totalScore += isInRange(avgTemp, 18, 25) ? 100 : 50;
      count++;
    }
  }

  // Humidity
  if (dataByType.humidity) {
    const avgHumidity = average(dataByType.humidity.map(v => v.percentage || 0).filter(v => v > 0));
    if (avgHumidity > 0) {
      totalScore += isInRange(avgHumidity, 30, 60) ? 100 : 50;
      count++;
    }
  }

  return count > 0 ? totalScore / count : 85; // Default to good if no environmental data
}

function computeEmergencyResponse(dataByType: Record<string, any[]>): number {
  let score = 100;

  // Panic button usage (reduce score)
  if (dataByType.button_press) {
    const panicCount = dataByType.button_press.filter(v => v.type === 'panic' || v.type === 'sos').length;
    score -= Math.min(50, panicCount * 15); // Each panic reduces by 15
  }

  // Falls (already counted in activity, but affects emergency too)
  if (dataByType.fall_detection) {
    const fallCount = dataByType.fall_detection.filter(v => v.detected === true).length;
    score -= Math.min(30, fallCount * 15);
  }

  return Math.max(0, score);
}

function computeSocialEngagement(dataByType: Record<string, any[]>): number {
  // Based on location diversity and activity patterns
  let score = 70; // Default baseline

  if (dataByType.gps) {
    const uniqueLocations = new Set(dataByType.gps.map(v => `${v.latitude},${v.longitude}`)).size;
    score += Math.min(30, uniqueLocations * 5); // More location diversity = better engagement
  }

  return Math.min(100, score);
}

function normalizeValue(value: number, min: number, max: number, optimal: number): number {
  if (value <= min) return 0;
  if (value >= max) return value > optimal ? 50 : 100;
  
  const distanceToOptimal = Math.abs(value - optimal);
  const maxDistance = Math.max(optimal - min, max - optimal);
  
  return Math.max(0, 100 - (distanceToOptimal / maxDistance) * 100);
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
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

async function checkAlerts(supabase: any, elderlyPersonId: string, currentScore: number, componentScores: any, ilqScoreId: string): Promise<string[]> {
  const alerts: string[] = [];

  // Fetch previous score
  const { data: previousScore } = await supabase
    .from('ilq_scores')
    .select('score')
    .eq('elderly_person_id', elderlyPersonId)
    .order('computation_timestamp', { ascending: false })
    .limit(2);

  if (previousScore && previousScore.length > 1) {
    const scoreDrop = previousScore[1].score - currentScore;

    // Sudden drop alert
    if (scoreDrop > 10) {
      await supabase.from('ilq_alerts').insert({
        elderly_person_id: elderlyPersonId,
        ilq_score_id: ilqScoreId,
        alert_type: 'score_drop',
        severity: scoreDrop > 20 ? 'critical' : 'high',
        title: 'Sudden ILQ Score Drop',
        description: `ILQ score dropped by ${scoreDrop.toFixed(1)} points in the last computation cycle`,
        previous_score: previousScore[1].score,
        current_score: currentScore,
        score_change: -scoreDrop,
      });
      alerts.push('score_drop');
    }
  }

  // Low score alert
  if (currentScore < 40) {
    await supabase.from('ilq_alerts').insert({
      elderly_person_id: elderlyPersonId,
      ilq_score_id: ilqScoreId,
      alert_type: 'low_score',
      severity: 'critical',
      title: 'Critical ILQ Score',
      description: `ILQ score is ${currentScore.toFixed(1)}, indicating significant assistance is needed`,
      current_score: currentScore,
    });
    alerts.push('low_score');
  }

  // Component-specific concerns
  const lowComponents = Object.entries(componentScores)
    .filter(([_, score]) => (score as number) < 30)
    .map(([component, _]) => component);

  if (lowComponents.length > 0) {
    await supabase.from('ilq_alerts').insert({
      elderly_person_id: elderlyPersonId,
      ilq_score_id: ilqScoreId,
      alert_type: 'component_decline',
      severity: 'medium',
      title: 'Component Scores Below Threshold',
      description: `The following components are concerning: ${lowComponents.join(', ')}`,
      current_score: currentScore,
      affected_components: lowComponents,
    });
    alerts.push('component_decline');
  }

  return alerts;
}
