import { supabase } from '@/integrations/supabase/client';
import { ProcessedMovementData, calculateDwellTimes } from './movementUtils';

interface IdealProfile {
  baseline_data: Record<string, { min_minutes: number; max_minutes: number; ideal_minutes: number }>;
}

export const checkDwellTimeDeviations = async (
  data: ProcessedMovementData,
  idealProfile: IdealProfile | null,
  elderlyPersonId: string
): Promise<void> => {
  if (!idealProfile || !idealProfile.baseline_data) {
    return;
  }

  const dwellTimes = calculateDwellTimes(data.events);
  const alerts: Array<{
    alert_type: string;
    severity: string;
    title: string;
    description: string;
    elderly_person_id: string;
  }> = [];

  // Check each location against ideal profile
  Object.entries(dwellTimes).forEach(([location, actualMinutes]) => {
    const baseline = idealProfile.baseline_data[location];
    if (!baseline) return;

    const { min_minutes, max_minutes, ideal_minutes } = baseline;
    const deviation = ((actualMinutes - ideal_minutes) / ideal_minutes) * 100;

    // Critical deviation: outside min/max range
    if (actualMinutes < min_minutes) {
      alerts.push({
        alert_type: 'dwell_time_deviation',
        severity: 'high',
        title: `Low Dwell Time: ${location}`,
        description: `Spent only ${Math.round(actualMinutes)} minutes in ${location}, below minimum of ${min_minutes} minutes (${Math.abs(Math.round(deviation))}% below ideal).`,
        elderly_person_id: elderlyPersonId,
      });
    } else if (actualMinutes > max_minutes) {
      alerts.push({
        alert_type: 'dwell_time_deviation',
        severity: 'high',
        title: `High Dwell Time: ${location}`,
        description: `Spent ${Math.round(actualMinutes)} minutes in ${location}, exceeding maximum of ${max_minutes} minutes (${Math.abs(Math.round(deviation))}% above ideal).`,
        elderly_person_id: elderlyPersonId,
      });
    }
    // Warning: significant deviation but within range
    else if (Math.abs(deviation) > 30) {
      alerts.push({
        alert_type: 'dwell_time_deviation',
        severity: 'medium',
        title: `Dwell Time Variation: ${location}`,
        description: `Spent ${Math.round(actualMinutes)} minutes in ${location}, ${Math.abs(Math.round(deviation))}% ${deviation > 0 ? 'above' : 'below'} ideal of ${ideal_minutes} minutes.`,
        elderly_person_id: elderlyPersonId,
      });
    }
  });

  // Check for missing locations (expected but not visited)
  Object.keys(idealProfile.baseline_data).forEach((location) => {
    if (!dwellTimes[location]) {
      alerts.push({
        alert_type: 'inactivity',
        severity: 'medium',
        title: `Location Not Visited: ${location}`,
        description: `No activity detected in ${location} during this period, which differs from the expected pattern.`,
        elderly_person_id: elderlyPersonId,
      });
    }
  });

  // Insert alerts if any were generated
  if (alerts.length > 0) {
    // Check if similar alerts already exist to avoid duplicates
    const { data: existingAlerts, error: checkError } = await supabase
      .from('alerts')
      .select('id, title, created_at')
      .eq('elderly_person_id', elderlyPersonId)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (checkError) {
      console.error('Error checking existing alerts:', checkError);
      return;
    }

    // Filter out alerts that already exist (same title within 24 hours)
    const existingTitles = new Set(existingAlerts?.map(a => a.title) || []);
    const newAlerts = alerts.filter(alert => !existingTitles.has(alert.title));

    if (newAlerts.length > 0) {
      const { error } = await supabase
        .from('alerts')
        .insert(newAlerts);

      if (error) {
        console.error('Error creating dwell time alerts:', error);
      }
    }
  }
};