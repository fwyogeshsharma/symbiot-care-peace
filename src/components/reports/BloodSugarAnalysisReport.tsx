import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO, startOfDay } from 'date-fns';
import { Droplets, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface BloodSugarAnalysisReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const BloodSugarAnalysisReport = ({ selectedPerson, dateRange }: BloodSugarAnalysisReportProps) => {
  const { t } = useTranslation();

  const { data: glucoseData = [], isLoading } = useQuery({
    queryKey: ['blood-sugar-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', ['blood_sugar', 'glucose', 'blood_glucose'])
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

  // Extract numeric value
  const extractValue = (value: any) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if ('value' in value) return Number(value.value);
      if ('glucose' in value) return Number(value.glucose);
    }
    return Number(value);
  };

  // Process data for chart
  const chartData = glucoseData.map(item => ({
    date: format(new Date(item.recorded_at), 'MMM dd HH:mm'),
    glucose: extractValue(item.value),
    timestamp: item.recorded_at,
  }));

  // Calculate statistics
  const values = glucoseData.map(item => extractValue(item.value)).filter(v => !isNaN(v));
  const avgGlucose = values.length > 0
    ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
    : 0;
  const minGlucose = values.length > 0 ? Math.min(...values) : 0;
  const maxGlucose = values.length > 0 ? Math.max(...values) : 0;

  // Count readings in ranges
  const hypoglycemic = values.filter(v => v < 70).length; // Low
  const normal = values.filter(v => v >= 70 && v <= 140).length;
  const prediabetic = values.filter(v => v > 140 && v <= 199).length;
  const diabetic = values.filter(v => v >= 200).length; // High

  // Calculate variability (standard deviation)
  const mean = avgGlucose;
  const variance = values.length > 0
    ? values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    : 0;
  const stdDev = Math.sqrt(variance);

  // Identify patterns
  const getTimeOfDay = (timestamp: string) => {
    const hour = new Date(timestamp).getHours();
    if (hour < 6) return 'Night';
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const timeOfDayPatterns = glucoseData.reduce((acc: any, item) => {
    const timeOfDay = getTimeOfDay(item.recorded_at);
    if (!acc[timeOfDay]) acc[timeOfDay] = [];
    acc[timeOfDay].push(extractValue(item.value));
    return acc;
  }, {});

  const timeOfDayAverages = Object.entries(timeOfDayPatterns).map(([time, vals]: [string, any]) => ({
    time,
    average: Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length),
    count: vals.length,
  }));

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (glucoseData.length === 0) {
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Level</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgGlucose} mg/dL</div>
            <p className="text-xs text-muted-foreground">
              Range: {minGlucose} - {maxGlucose}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Variability</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">±{stdDev.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Standard Deviation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Normal Readings</CardTitle>
            <Droplets className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{normal}</div>
            <p className="text-xs text-muted-foreground">
              70-140 mg/dL
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{glucoseData.length}</div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Blood Sugar Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'mg/dL', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="Low" />
              <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="3 3" label="High" />
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#3b82f6"
                name="Blood Sugar (mg/dL)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Range Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Reading Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Hypoglycemic</Badge>
                <span className="text-sm text-muted-foreground">{'<'} 70 mg/dL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-destructive">{hypoglycemic}</span>
                <span className="text-sm text-muted-foreground">
                  ({values.length > 0 ? Math.round((hypoglycemic / values.length) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-success">Normal</Badge>
                <span className="text-sm text-muted-foreground">70-140 mg/dL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-success">{normal}</span>
                <span className="text-sm text-muted-foreground">
                  ({values.length > 0 ? Math.round((normal / values.length) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="warning">Elevated</Badge>
                <span className="text-sm text-muted-foreground">141-199 mg/dL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-warning">{prediabetic}</span>
                <span className="text-sm text-muted-foreground">
                  ({values.length > 0 ? Math.round((prediabetic / values.length) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">High</Badge>
                <span className="text-sm text-muted-foreground">≥ 200 mg/dL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-destructive">{diabetic}</span>
                <span className="text-sm text-muted-foreground">
                  ({values.length > 0 ? Math.round((diabetic / values.length) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time of Day Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Patterns by Time of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {timeOfDayAverages.map(({ time, average, count }) => (
              <div key={time} className="p-4 border rounded-lg">
                <p className="text-sm font-medium mb-2">{time}</p>
                <p className="text-2xl font-bold">{average} mg/dL</p>
                <p className="text-xs text-muted-foreground">{count} readings</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {(hypoglycemic > 0 || diabetic > 0) && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              {hypoglycemic > 0 && (
                <li>Low blood sugar detected. Consult with doctor about hypoglycemia management</li>
              )}
              {diabetic > 0 && (
                <li>High blood sugar readings detected. Review diet, medications, and activity with healthcare provider</li>
              )}
              <li>Monitor blood sugar at consistent times each day</li>
              <li>Keep a food and activity log to identify patterns</li>
              <li>Ensure glucose meter is properly calibrated</li>
              <li>Report consistent abnormal readings to healthcare provider</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
