import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Heart, Moon, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ILQScoreTrendsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const ILQScoreTrendsReport = ({ selectedPerson, dateRange }: ILQScoreTrendsReportProps) => {
  const { t } = useTranslation();

  // Fetch all relevant health data to calculate ILQ score
  const { data: healthData = [], isLoading } = useQuery({
    queryKey: ['ilq-score-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', [
          'heart_rate', 'blood_pressure', 'oxygen_saturation', 'steps',
          'sleep_quality', 'activity_level', 'blood_sugar', 'glucose'
        ])
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

  const extractValue = (value: any, field?: string) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if (field && field in value) return Number(value[field]);
      if ('value' in value) return Number(value.value);
    }
    return Number(value) || 0;
  };

  // Calculate ILQ score based on multiple health factors
  const calculateILQScore = (dayData: any[]) => {
    let score = 0;
    let factors = 0;

    // Heart Rate (max 20 points)
    const heartRateData = dayData.filter(d => d.data_type === 'heart_rate');
    if (heartRateData.length > 0) {
      const avgHR = heartRateData.reduce((sum, d) => sum + extractValue(d.value), 0) / heartRateData.length;
      if (avgHR >= 60 && avgHR <= 100) score += 20;
      else if (avgHR >= 50 && avgHR <= 110) score += 15;
      else if (avgHR >= 40 && avgHR <= 120) score += 10;
      else score += 5;
      factors++;
    }

    // Oxygen Saturation (max 20 points)
    const o2Data = dayData.filter(d => d.data_type === 'oxygen_saturation');
    if (o2Data.length > 0) {
      const avgO2 = o2Data.reduce((sum, d) => sum + extractValue(d.value), 0) / o2Data.length;
      if (avgO2 >= 95) score += 20;
      else if (avgO2 >= 90) score += 15;
      else if (avgO2 >= 85) score += 10;
      else score += 5;
      factors++;
    }

    // Activity Level (max 20 points)
    const stepsData = dayData.filter(d => d.data_type === 'steps');
    if (stepsData.length > 0) {
      const totalSteps = stepsData.reduce((sum, d) => sum + extractValue(d.value), 0);
      if (totalSteps >= 5000) score += 20;
      else if (totalSteps >= 3000) score += 15;
      else if (totalSteps >= 1000) score += 10;
      else score += 5;
      factors++;
    }

    // Sleep Quality (max 20 points)
    const sleepData = dayData.filter(d => d.data_type === 'sleep_quality');
    if (sleepData.length > 0) {
      const avgSleep = sleepData.reduce((sum, d) => sum + extractValue(d.value, 'quality'), 0) / sleepData.length;
      if (avgSleep >= 80) score += 20;
      else if (avgSleep >= 60) score += 15;
      else if (avgSleep >= 40) score += 10;
      else score += 5;
      factors++;
    }

    // Blood Sugar (max 20 points)
    const glucoseData = dayData.filter(d => d.data_type === 'blood_sugar' || d.data_type === 'glucose');
    if (glucoseData.length > 0) {
      const avgGlucose = glucoseData.reduce((sum, d) => sum + extractValue(d.value), 0) / glucoseData.length;
      if (avgGlucose >= 70 && avgGlucose <= 140) score += 20;
      else if (avgGlucose >= 60 && avgGlucose <= 180) score += 15;
      else if (avgGlucose >= 50 && avgGlucose <= 200) score += 10;
      else score += 5;
      factors++;
    }

    return factors > 0 ? Math.round(score / factors * 5) : 0; // Normalize to 100
  };

  // Group data by day and calculate daily ILQ scores
  const dailyScores = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
    const dayStart = new Date(day.setHours(0, 0, 0, 0));
    const dayEnd = new Date(day.setHours(23, 59, 59, 999));

    const dayData = healthData.filter(d => {
      const recordTime = new Date(d.recorded_at);
      return recordTime >= dayStart && recordTime <= dayEnd;
    });

    return {
      date: format(day, 'MMM dd'),
      score: calculateILQScore(dayData),
      fullDate: day,
    };
  });

  // Calculate statistics
  const scores = dailyScores.map(d => d.score).filter(s => s > 0);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Calculate trend
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  const firstAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length
    : 0;
  const secondAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length
    : 0;
  const trend = secondAvg - firstAvg;

  const getScoreCategory = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'success' };
    if (score >= 60) return { label: 'Good', color: 'default' };
    if (score >= 40) return { label: 'Fair', color: 'warning' };
    return { label: 'Needs Attention', color: 'destructive' };
  };

  const currentCategory = getScoreCategory(avgScore);

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (healthData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Activity className="w-16 h-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Health Data</h3>
              <p className="text-muted-foreground">
                No health data available to calculate ILQ scores for the selected period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall ILQ Score */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Independent Living Quotient (ILQ) Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-5xl font-bold mb-2">{avgScore}/100</div>
              <Badge variant={currentCategory.color as any} className="mb-4">
                {currentCategory.label}
              </Badge>
              <Progress value={avgScore} className="h-4 mb-2" />
              <p className="text-sm text-muted-foreground">
                Average score for selected period
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Trend</span>
                <div className="flex items-center gap-2">
                  {trend > 0 ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-success" />
                      <span className="text-success font-bold">+{trend.toFixed(1)}</span>
                    </>
                  ) : trend < 0 ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      <span className="text-destructive font-bold">{trend.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground font-bold">No Change</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Range</span>
                <span className="font-bold">{minScore} - {maxScore}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Days Tracked</span>
                <span className="font-bold">{scores.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>ILQ Score Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={dailyScores}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} label={{ value: 'ILQ Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label="Excellent" />
              <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="3 3" label="Good" />
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label="Fair" />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorScore)"
                name="ILQ Score"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excellent Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {scores.filter(s => s >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {scores.length > 0 ? Math.round((scores.filter(s => s >= 80).length / scores.length) * 100) : 0}% of days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Good Days</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scores.filter(s => s >= 60 && s < 80).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {scores.length > 0 ? Math.round((scores.filter(s => s >= 60 && s < 80).length / scores.length) * 100) : 0}% of days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fair Days</CardTitle>
            <Activity className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {scores.filter(s => s >= 40 && s < 60).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {scores.length > 0 ? Math.round((scores.filter(s => s >= 40 && s < 60).length / scores.length) * 100) : 0}% of days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {scores.filter(s => s < 40).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {scores.length > 0 ? Math.round((scores.filter(s => s < 40).length / scores.length) * 100) : 0}% of days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Understanding ILQ Score */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle>Understanding Your ILQ Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Independent Living Quotient (ILQ) is a comprehensive wellness score that evaluates
              overall health and ability to live independently based on multiple health factors:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Heart className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Heart Health</p>
                  <p className="text-xs text-muted-foreground">Heart rate and oxygen saturation</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Physical Activity</p>
                  <p className="text-xs text-muted-foreground">Daily steps and movement</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Moon className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Sleep Quality</p>
                  <p className="text-xs text-muted-foreground">Rest and recovery</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Home className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Metabolic Health</p>
                  <p className="text-xs text-muted-foreground">Blood sugar levels</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Score Interpretation:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><strong className="text-success">80-100:</strong> Excellent - Maintaining strong independence</li>
                <li><strong className="text-primary">60-79:</strong> Good - Generally independent with minor concerns</li>
                <li><strong className="text-warning">40-59:</strong> Fair - May need some assistance</li>
                <li><strong className="text-destructive">&lt;40:</strong> Needs Attention - Requires support and intervention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
