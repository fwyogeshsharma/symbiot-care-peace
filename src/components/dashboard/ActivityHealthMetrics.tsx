import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Thermometer, Droplets } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractNumericValue, extractBloodPressure } from "@/lib/valueExtractor";

interface ActivityHealthMetricsProps {
  elderlyPersonId: string;
  dateRange: { start: string; end: string };
}

export const ActivityHealthMetrics = ({ elderlyPersonId, dateRange }: ActivityHealthMetricsProps) => {
  const { t } = useTranslation();

  // Fetch health data
  const { data: healthData = [] } = useQuery({
    queryKey: ['activity-health-metrics', elderlyPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('data_type, value, recorded_at')
        .eq('elderly_person_id', elderlyPersonId)
        .in('data_type', ['heart_rate', 'blood_pressure', 'temperature', 'oxygen_saturation', 'steps'])
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!elderlyPersonId,
  });

  // device_data.value is JSONB ({ bpm: 72 }, { count: 1234 }, ...), so it has to go
  // through the shared extractor — parseFloat on the object yields NaN for every row.
  const numericValues = (dataType: string) =>
    healthData
      .filter(d => d.data_type === dataType)
      .map(d => extractNumericValue(d.value, dataType))
      .filter((v): v is number => v !== null);

  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const heartRateAvg = average(numericValues('heart_rate'));
  const avgHeartRate = heartRateAvg !== null ? Math.round(heartRateAvg) : null;

  const temperatureAvg = average(numericValues('temperature'));
  const avgTemperature = temperatureAvg !== null ? temperatureAvg.toFixed(1) : null;

  const oxygenAvg = average(numericValues('oxygen_saturation'));
  const avgOxygen = oxygenAvg !== null ? Math.round(oxygenAvg) : null;

  // Steps arrive as per-interval deltas, so the range total is their sum.
  const stepValues = numericValues('steps');
  const stepsSum = stepValues.reduce((a, b) => a + b, 0);
  const totalSteps = stepsSum > 0 ? stepsSum : null;

  // Get latest blood pressure
  const bpData = healthData.filter(d => d.data_type === 'blood_pressure');
  const latestBP = bpData.length > 0 ? extractBloodPressure(bpData[0].value) : null;
  const formattedBP = latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('activity.health.title', 'Health Metrics')}</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {avgHeartRate && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('activity.health.heartRate', 'Heart Rate')}
              </CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgHeartRate}</div>
              <p className="text-xs text-muted-foreground">
                {t('activity.health.bpm', 'bpm average')}
              </p>
            </CardContent>
          </Card>
        )}

        {avgTemperature && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('activity.health.temperature', 'Temperature')}
              </CardTitle>
              <Thermometer className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTemperature}°F</div>
              <p className="text-xs text-muted-foreground">
                {t('activity.health.average', 'average')}
              </p>
            </CardContent>
          </Card>
        )}

        {avgOxygen && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('activity.health.oxygen', 'Blood Oxygen')}
              </CardTitle>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgOxygen}%</div>
              <p className="text-xs text-muted-foreground">
                {t('activity.health.average', 'average')}
              </p>
            </CardContent>
          </Card>
        )}

        {totalSteps !== null && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('activity.health.steps', 'Steps')}
              </CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSteps.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('activity.health.totalSteps', 'total steps')}
              </p>
            </CardContent>
          </Card>
        )}

        {formattedBP && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('activity.health.bloodPressure', 'Blood Pressure')}
              </CardTitle>
              <Heart className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formattedBP}</div>
              <p className="text-xs text-muted-foreground">
                {t('activity.health.latest', 'latest reading')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {healthData.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {t('activity.health.noData', 'No health data available for this period')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
