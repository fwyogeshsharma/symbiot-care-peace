import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Heart, Activity, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VitalSignsTrendsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const VitalSignsTrendsReport = ({ selectedPerson, dateRange }: VitalSignsTrendsReportProps) => {
  const { t } = useTranslation();

  const { data: vitalData = [], isLoading } = useQuery({
    queryKey: ['vital-trends', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', ['heart_rate', 'blood_pressure', 'oxygen_saturation', 'spo2'])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Process data for charts - group by day and average values
  const chartData = vitalData.reduce((acc: any[], item) => {
    const date = format(new Date(item.recorded_at), 'dMMM'); // Format as "2Dec"
    const existingEntry = acc.find(entry => entry.date === date);

    let value = item.value;
    if (typeof value === 'object' && value !== null) {
      if ('bpm' in value) value = value.bpm;
      else if ('value' in value) value = value.value;
    }

    if (existingEntry) {
      if (item.data_type === 'heart_rate') {
        if (!existingEntry.heartRateValues) existingEntry.heartRateValues = [];
        existingEntry.heartRateValues.push(Number(value));
      }
      if (item.data_type === 'oxygen_saturation' || item.data_type === 'spo2') {
        if (!existingEntry.oxygenValues) existingEntry.oxygenValues = [];
        existingEntry.oxygenValues.push(Number(value));
      }
    } else {
      const entry: any = { date };
      if (item.data_type === 'heart_rate') {
        entry.heartRateValues = [Number(value)];
      }
      if (item.data_type === 'oxygen_saturation' || item.data_type === 'spo2') {
        entry.oxygenValues = [Number(value)];
      }
      acc.push(entry);
    }

    return acc;
  }, []).map(entry => ({
    date: entry.date,
    heartRate: entry.heartRateValues
      ? Math.round(entry.heartRateValues.reduce((a: number, b: number) => a + b, 0) / entry.heartRateValues.length)
      : undefined,
    oxygen: entry.oxygenValues
      ? Math.round(entry.oxygenValues.reduce((a: number, b: number) => a + b, 0) / entry.oxygenValues.length)
      : undefined,
  }));

  // Calculate statistics
  const heartRateData = vitalData.filter(v => v.data_type === 'heart_rate');
  const oxygenData = vitalData.filter(v => v.data_type === 'oxygen_saturation' || v.data_type === 'spo2');

  const avgHeartRate = heartRateData.length > 0
    ? Math.round(heartRateData.reduce((sum, v) => {
        let val = v.value;
        if (typeof val === 'object') val = val.bpm || val.value;
        return sum + Number(val);
      }, 0) / heartRateData.length)
    : 0;

  const avgOxygen = oxygenData.length > 0
    ? Math.round(oxygenData.reduce((sum, v) => {
        let val = v.value;
        if (typeof val === 'object') val = val.value;
        return sum + Number(val);
      }, 0) / oxygenData.length)
    : 0;

  const minHeartRate = heartRateData.length > 0
    ? Math.min(...heartRateData.map(v => {
        let val = v.value;
        if (typeof val === 'object') val = val.bpm || val.value;
        return Number(val);
      }))
    : 0;

  const maxHeartRate = heartRateData.length > 0
    ? Math.max(...heartRateData.map(v => {
        let val = v.value;
        if (typeof val === 'object') val = val.bpm || val.value;
        return Number(val);
      }))
    : 0;

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (vitalData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHeartRate} BPM</div>
            <p className="text-xs text-muted-foreground">
              Range: {minHeartRate} - {maxHeartRate} BPM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Oxygen</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOxygen}%</div>
            <p className="text-xs text-muted-foreground">
              Normal range: 95-100%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vitalData.length}</div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vital Signs Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                angle={-30}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                name="Heart Rate (BPM)"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="oxygen"
                stroke="#3b82f6"
                name="Oxygen (%)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
