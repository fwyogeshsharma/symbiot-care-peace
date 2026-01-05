import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Thermometer, Droplets } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // Calculate averages with NaN validation
  const heartRateData = healthData.filter(d => d.data_type === 'heart_rate');
  const avgHeartRate = heartRateData.length > 0
    ? (() => {
        const sum = heartRateData.reduce((acc, d) => {
          const val = parseFloat(d.value);
          return !isNaN(val) ? acc + val : acc;
        }, 0);
        const validCount = heartRateData.filter(d => !isNaN(parseFloat(d.value))).length;
        return validCount > 0 ? Math.round(sum / validCount) : null;
      })()
    : null;

  const temperatureData = healthData.filter(d => d.data_type === 'temperature');
  const avgTemperature = temperatureData.length > 0
    ? (() => {
        const sum = temperatureData.reduce((acc, d) => {
          const val = parseFloat(d.value);
          return !isNaN(val) ? acc + val : acc;
        }, 0);
        const validCount = temperatureData.filter(d => !isNaN(parseFloat(d.value))).length;
        return validCount > 0 ? (sum / validCount).toFixed(1) : null;
      })()
    : null;

  const oxygenData = healthData.filter(d => d.data_type === 'oxygen_saturation');
  const avgOxygen = oxygenData.length > 0
    ? (() => {
        const sum = oxygenData.reduce((acc, d) => {
          const val = parseFloat(d.value);
          return !isNaN(val) ? acc + val : acc;
        }, 0);
        const validCount = oxygenData.filter(d => !isNaN(parseFloat(d.value))).length;
        return validCount > 0 ? Math.round(sum / validCount) : null;
      })()
    : null;

  const stepsData = healthData.filter(d => d.data_type === 'steps');
  const totalSteps = stepsData.length > 0
    ? (() => {
        const sum = stepsData.reduce((acc, d) => {
          const val = parseInt(d.value);
          return !isNaN(val) ? acc + val : acc;
        }, 0);
        return sum > 0 ? sum : null;
      })()
    : null;

  // Get latest blood pressure
  const bpData = healthData.filter(d => d.data_type === 'blood_pressure');
  const latestBP = bpData.length > 0 ? bpData[0].value : null;
  const formattedBP = latestBP
    ? (typeof latestBP === 'object' && latestBP.systolic && latestBP.diastolic
        ? `${latestBP.systolic}/${latestBP.diastolic}`
        : latestBP)
    : null;

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
