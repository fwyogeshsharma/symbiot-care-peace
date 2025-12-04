import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  elderly_person_id: string;
  period_days?: number;
  include_daily_breakdown?: boolean;
  include_medication_breakdown?: boolean;
}

interface MedicationSchedule {
  id: string;
  medication_name: string;
  dosage_mg: number | null;
  dosage_unit: string | null;
  frequency: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
}

interface AdherenceLog {
  id: string;
  schedule_id: string;
  scheduled_time: string;
  timestamp: string;
  status: string; // taken | missed | pending | late
  dispenser_confirmed: boolean;
  caregiver_alerted: boolean;
  notes: string | null;
}

interface DailyStats {
  date: string;
  total_scheduled: number;
  taken: number;
  missed: number;
  late: number;
  pending: number;
  compliance_rate: number;
}

interface MedicationStats {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  total_doses: number;
  taken: number;
  missed: number;
  late: number;
  compliance_rate: number;
  average_delay_minutes: number | null;
  streak_current: number;
  streak_best: number;
}

interface TimeSlotStats {
  time_slot: string;
  total: number;
  taken: number;
  missed: number;
  compliance_rate: number;
}

interface AnalyticsResponse {
  success: boolean;
  period_days: number;
  summary: {
    total_scheduled_doses: number;
    total_taken: number;
    total_missed: number;
    total_late: number;
    total_pending: number;
    overall_compliance_rate: number;
    on_time_rate: number;
    dispenser_confirmation_rate: number;
    caregiver_alert_count: number;
    active_medications: number;
    compliance_trend: 'improving' | 'declining' | 'stable';
    compliance_change: number;
  };
  daily_stats: DailyStats[];
  medication_stats: MedicationStats[];
  time_slot_stats: TimeSlotStats[];
  weekly_pattern: {
    day: string;
    compliance_rate: number;
    total: number;
  }[];
  recent_activity: {
    timestamp: string;
    medication_name: string;
    dosage: string;
    scheduled_time: string;
    status: string;
    dispenser_confirmed: boolean;
  }[];
  insights: string[];
  ilq_impact: {
    cognitive_score_contribution: number;
    medication_routine_score: number;
    adherence_consistency_score: number;
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

    const {
      elderly_person_id,
      period_days = 30,
      include_daily_breakdown = true,
      include_medication_breakdown = true,
    }: AnalyticsRequest = await req.json();

    console.log(`Computing medication analytics for ${elderly_person_id}, period: ${period_days} days`);

    const startDate = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    // Fetch medication schedules
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from('medication_schedules')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .eq('is_active', true);

    if (schedulesError) throw schedulesError;

    // Fetch adherence logs
    const { data: logs, error: logsError } = await supabaseClient
      .from('medication_adherence_logs')
      .select(`
        *,
        medication_schedules(medication_name, dosage_mg, dosage_unit, frequency, times)
      `)
      .eq('elderly_person_id', elderly_person_id)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (logsError) throw logsError;

    const medicationSchedules = (schedules || []) as MedicationSchedule[];
    const adherenceLogs = (logs || []) as (AdherenceLog & { medication_schedules: any })[];

    // Compute analytics
    const analytics = computeMedicationAnalytics(
      medicationSchedules,
      adherenceLogs,
      period_days,
      include_daily_breakdown,
      include_medication_breakdown
    );

    console.log(`Medication analytics computed: ${analytics.summary.overall_compliance_rate}% compliance`);

    return new Response(
      JSON.stringify(analytics),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in medication-analytics:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function computeMedicationAnalytics(
  schedules: MedicationSchedule[],
  logs: (AdherenceLog & { medication_schedules: any })[],
  periodDays: number,
  includeDailyBreakdown: boolean,
  includeMedicationBreakdown: boolean
): AnalyticsResponse {
  // Calculate summary statistics
  const totalTaken = logs.filter(l => l.status === 'taken').length;
  const totalMissed = logs.filter(l => l.status === 'missed').length;
  const totalLate = logs.filter(l => l.status === 'late').length;
  const totalPending = logs.filter(l => l.status === 'pending').length;
  const totalScheduled = logs.length;

  const overallComplianceRate = totalScheduled > 0
    ? Math.round(((totalTaken + totalLate) / totalScheduled) * 100)
    : 0;

  const onTimeRate = totalScheduled > 0
    ? Math.round((totalTaken / totalScheduled) * 100)
    : 0;

  const dispenserConfirmedCount = logs.filter(l => l.dispenser_confirmed).length;
  const dispenserConfirmationRate = totalScheduled > 0
    ? Math.round((dispenserConfirmedCount / totalScheduled) * 100)
    : 0;

  const caregiverAlertCount = logs.filter(l => l.caregiver_alerted).length;

  // Calculate compliance trend
  const { trend, change } = calculateComplianceTrend(logs, periodDays);

  // Daily statistics
  const dailyStats = includeDailyBreakdown ? computeDailyStats(logs, periodDays) : [];

  // Medication-specific statistics
  const medicationStats = includeMedicationBreakdown
    ? computeMedicationStats(logs, schedules)
    : [];

  // Time slot statistics
  const timeSlotStats = computeTimeSlotStats(logs);

  // Weekly pattern
  const weeklyPattern = computeWeeklyPattern(logs);

  // Recent activity
  const recentActivity = logs.slice(0, 20).map(log => ({
    timestamp: log.timestamp,
    medication_name: log.medication_schedules?.medication_name || 'Unknown',
    dosage: log.medication_schedules?.dosage_mg
      ? `${log.medication_schedules.dosage_mg} ${log.medication_schedules.dosage_unit || 'mg'}`
      : '',
    scheduled_time: log.scheduled_time,
    status: log.status,
    dispenser_confirmed: log.dispenser_confirmed || false,
  }));

  // Generate insights
  const insights = generateInsights(
    overallComplianceRate,
    onTimeRate,
    trend,
    timeSlotStats,
    weeklyPattern,
    medicationStats
  );

  // Calculate ILQ impact scores
  const ilqImpact = calculateILQImpact(
    overallComplianceRate,
    onTimeRate,
    trend,
    logs
  );

  return {
    success: true,
    period_days: periodDays,
    summary: {
      total_scheduled_doses: totalScheduled,
      total_taken: totalTaken,
      total_missed: totalMissed,
      total_late: totalLate,
      total_pending: totalPending,
      overall_compliance_rate: overallComplianceRate,
      on_time_rate: onTimeRate,
      dispenser_confirmation_rate: dispenserConfirmationRate,
      caregiver_alert_count: caregiverAlertCount,
      active_medications: schedules.length,
      compliance_trend: trend,
      compliance_change: change,
    },
    daily_stats: dailyStats,
    medication_stats: medicationStats,
    time_slot_stats: timeSlotStats,
    weekly_pattern: weeklyPattern,
    recent_activity: recentActivity,
    insights,
    ilq_impact: ilqImpact,
  };
}

function calculateComplianceTrend(
  logs: AdherenceLog[],
  periodDays: number
): { trend: 'improving' | 'declining' | 'stable'; change: number } {
  if (logs.length < 10) {
    return { trend: 'stable', change: 0 };
  }

  const midpoint = new Date(Date.now() - (periodDays / 2) * 24 * 60 * 60 * 1000);

  const recentLogs = logs.filter(l => new Date(l.timestamp) >= midpoint);
  const olderLogs = logs.filter(l => new Date(l.timestamp) < midpoint);

  const recentCompliance = recentLogs.length > 0
    ? (recentLogs.filter(l => l.status === 'taken' || l.status === 'late').length / recentLogs.length) * 100
    : 0;

  const olderCompliance = olderLogs.length > 0
    ? (olderLogs.filter(l => l.status === 'taken' || l.status === 'late').length / olderLogs.length) * 100
    : 0;

  const change = Math.round(recentCompliance - olderCompliance);

  if (change > 5) return { trend: 'improving', change };
  if (change < -5) return { trend: 'declining', change };
  return { trend: 'stable', change };
}

function computeDailyStats(logs: AdherenceLog[], periodDays: number): DailyStats[] {
  const dailyMap: Record<string, DailyStats> = {};

  // Initialize all days in the period
  for (let i = 0; i < periodDays; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap[dateStr] = {
      date: dateStr,
      total_scheduled: 0,
      taken: 0,
      missed: 0,
      late: 0,
      pending: 0,
      compliance_rate: 0,
    };
  }

  // Populate with actual data
  logs.forEach(log => {
    const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].total_scheduled++;
      switch (log.status) {
        case 'taken':
          dailyMap[dateStr].taken++;
          break;
        case 'missed':
          dailyMap[dateStr].missed++;
          break;
        case 'late':
          dailyMap[dateStr].late++;
          break;
        case 'pending':
          dailyMap[dateStr].pending++;
          break;
      }
    }
  });

  // Calculate compliance rates
  Object.values(dailyMap).forEach(day => {
    if (day.total_scheduled > 0) {
      day.compliance_rate = Math.round(((day.taken + day.late) / day.total_scheduled) * 100);
    }
  });

  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
}

function computeMedicationStats(
  logs: (AdherenceLog & { medication_schedules: any })[],
  schedules: MedicationSchedule[]
): MedicationStats[] {
  const statsMap: Record<string, MedicationStats> = {};

  // Initialize from schedules
  schedules.forEach(schedule => {
    statsMap[schedule.id] = {
      medication_id: schedule.id,
      medication_name: schedule.medication_name,
      dosage: schedule.dosage_mg
        ? `${schedule.dosage_mg} ${schedule.dosage_unit || 'mg'}`
        : '',
      frequency: schedule.frequency,
      total_doses: 0,
      taken: 0,
      missed: 0,
      late: 0,
      compliance_rate: 0,
      average_delay_minutes: null,
      streak_current: 0,
      streak_best: 0,
    };
  });

  // Populate with log data
  logs.forEach(log => {
    if (statsMap[log.schedule_id]) {
      statsMap[log.schedule_id].total_doses++;
      switch (log.status) {
        case 'taken':
          statsMap[log.schedule_id].taken++;
          break;
        case 'missed':
          statsMap[log.schedule_id].missed++;
          break;
        case 'late':
          statsMap[log.schedule_id].late++;
          break;
      }
    }
  });

  // Calculate compliance rates and streaks
  Object.values(statsMap).forEach(stat => {
    if (stat.total_doses > 0) {
      stat.compliance_rate = Math.round(((stat.taken + stat.late) / stat.total_doses) * 100);
    }

    // Calculate streaks
    const medLogs = logs
      .filter(l => l.schedule_id === stat.medication_id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (const log of medLogs) {
      if (log.status === 'taken' || log.status === 'late') {
        tempStreak++;
        if (currentStreak === 0) currentStreak = tempStreak;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
        if (currentStreak === 0) currentStreak = 0;
      }
    }

    stat.streak_current = currentStreak;
    stat.streak_best = bestStreak;
  });

  return Object.values(statsMap).filter(s => s.total_doses > 0);
}

function computeTimeSlotStats(logs: AdherenceLog[]): TimeSlotStats[] {
  const timeSlots: Record<string, TimeSlotStats> = {
    'Morning (6-12)': { time_slot: 'Morning (6-12)', total: 0, taken: 0, missed: 0, compliance_rate: 0 },
    'Afternoon (12-18)': { time_slot: 'Afternoon (12-18)', total: 0, taken: 0, missed: 0, compliance_rate: 0 },
    'Evening (18-22)': { time_slot: 'Evening (18-22)', total: 0, taken: 0, missed: 0, compliance_rate: 0 },
    'Night (22-6)': { time_slot: 'Night (22-6)', total: 0, taken: 0, missed: 0, compliance_rate: 0 },
  };

  logs.forEach(log => {
    const hour = parseInt(log.scheduled_time.split(':')[0], 10);
    let slot: string;

    if (hour >= 6 && hour < 12) slot = 'Morning (6-12)';
    else if (hour >= 12 && hour < 18) slot = 'Afternoon (12-18)';
    else if (hour >= 18 && hour < 22) slot = 'Evening (18-22)';
    else slot = 'Night (22-6)';

    timeSlots[slot].total++;
    if (log.status === 'taken' || log.status === 'late') {
      timeSlots[slot].taken++;
    } else if (log.status === 'missed') {
      timeSlots[slot].missed++;
    }
  });

  Object.values(timeSlots).forEach(slot => {
    if (slot.total > 0) {
      slot.compliance_rate = Math.round((slot.taken / slot.total) * 100);
    }
  });

  return Object.values(timeSlots).filter(s => s.total > 0);
}

function computeWeeklyPattern(logs: AdherenceLog[]): { day: string; compliance_rate: number; total: number }[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyStats: { day: string; taken: number; total: number; compliance_rate: number }[] = days.map(day => ({
    day,
    taken: 0,
    total: 0,
    compliance_rate: 0,
  }));

  logs.forEach(log => {
    const dayIndex = new Date(log.timestamp).getDay();
    weeklyStats[dayIndex].total++;
    if (log.status === 'taken' || log.status === 'late') {
      weeklyStats[dayIndex].taken++;
    }
  });

  weeklyStats.forEach(stat => {
    if (stat.total > 0) {
      stat.compliance_rate = Math.round((stat.taken / stat.total) * 100);
    }
  });

  return weeklyStats.map(({ day, compliance_rate, total }) => ({ day, compliance_rate, total }));
}

function generateInsights(
  overallCompliance: number,
  onTimeRate: number,
  trend: string,
  timeSlotStats: TimeSlotStats[],
  weeklyPattern: { day: string; compliance_rate: number; total: number }[],
  medicationStats: MedicationStats[]
): string[] {
  const insights: string[] = [];

  // Overall compliance insight
  if (overallCompliance >= 90) {
    insights.push('Excellent medication adherence! Keep up the great work.');
  } else if (overallCompliance >= 70) {
    insights.push('Good medication adherence. There\'s room for minor improvement.');
  } else if (overallCompliance >= 50) {
    insights.push('Moderate medication adherence. Consider setting additional reminders.');
  } else {
    insights.push('Medication adherence needs attention. Please consult with your caregiver.');
  }

  // Trend insight
  if (trend === 'improving') {
    insights.push('Great news! Your medication compliance is improving over time.');
  } else if (trend === 'declining') {
    insights.push('Your medication compliance has been declining. Let\'s work on improving it.');
  }

  // Time slot insights
  const worstTimeSlot = timeSlotStats.reduce((worst, current) =>
    current.compliance_rate < worst.compliance_rate ? current : worst,
    timeSlotStats[0]
  );
  if (worstTimeSlot && worstTimeSlot.compliance_rate < 70 && worstTimeSlot.total >= 5) {
    insights.push(`${worstTimeSlot.time_slot} doses tend to be missed more often. Consider adjusting reminders for this time.`);
  }

  // Weekly pattern insights
  const worstDay = weeklyPattern.reduce((worst, current) =>
    current.total >= 3 && current.compliance_rate < worst.compliance_rate ? current : worst,
    weeklyPattern[0]
  );
  if (worstDay && worstDay.compliance_rate < 70 && worstDay.total >= 3) {
    insights.push(`${worstDay.day}s have lower compliance. This might be related to routine changes.`);
  }

  // Medication-specific insights
  const problematicMeds = medicationStats.filter(m => m.compliance_rate < 60 && m.total_doses >= 5);
  if (problematicMeds.length > 0) {
    const medNames = problematicMeds.map(m => m.medication_name).join(', ');
    insights.push(`Some medications need more attention: ${medNames}.`);
  }

  // Streak insights
  const bestStreak = Math.max(...medicationStats.map(m => m.streak_best), 0);
  if (bestStreak >= 7) {
    insights.push(`Impressive! You\'ve had a streak of ${bestStreak} consecutive doses taken on time.`);
  }

  return insights;
}

function calculateILQImpact(
  overallCompliance: number,
  onTimeRate: number,
  trend: string,
  logs: AdherenceLog[]
): { cognitive_score_contribution: number; medication_routine_score: number; adherence_consistency_score: number } {
  // Cognitive score contribution (based on adherence - reflects ability to follow schedule)
  const cognitiveContribution = Math.round(
    overallCompliance * 0.6 +  // 60% weight on overall compliance
    onTimeRate * 0.3 +        // 30% weight on on-time rate
    (trend === 'improving' ? 10 : trend === 'declining' ? -10 : 0) // Trend bonus/penalty
  );

  // Medication routine score (consistency of taking meds at scheduled times)
  const routineScore = Math.round(onTimeRate);

  // Adherence consistency score (standard deviation of daily compliance)
  const dailyRates: number[] = [];
  const dailyMap: Record<string, { taken: number; total: number }> = {};

  logs.forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    if (!dailyMap[date]) dailyMap[date] = { taken: 0, total: 0 };
    dailyMap[date].total++;
    if (log.status === 'taken' || log.status === 'late') {
      dailyMap[date].taken++;
    }
  });

  Object.values(dailyMap).forEach(day => {
    if (day.total > 0) {
      dailyRates.push((day.taken / day.total) * 100);
    }
  });

  let consistencyScore = 100;
  if (dailyRates.length > 1) {
    const mean = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length;
    const variance = dailyRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyRates.length;
    const stdDev = Math.sqrt(variance);
    // Lower standard deviation = higher consistency score
    consistencyScore = Math.round(Math.max(0, 100 - stdDev));
  }

  return {
    cognitive_score_contribution: Math.min(100, Math.max(0, cognitiveContribution)),
    medication_routine_score: Math.min(100, Math.max(0, routineScore)),
    adherence_consistency_score: Math.min(100, Math.max(0, consistencyScore)),
  };
}
