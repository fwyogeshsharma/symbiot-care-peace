import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, PieChart, Pie } from 'recharts';
import { format } from 'date-fns';
import { Heart, Activity, Moon, Droplets, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ContributingFactorsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const ContributingFactorsReport = ({ selectedPerson, dateRange }: ContributingFactorsReportProps) => {
  const { t } = useTranslation();

  const { data: healthData = [], isLoading } = useQuery({
    queryKey: ['contributing-factors-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', [
          'heart_rate', 'blood_pressure', 'oxygen_saturation', 'steps',
          'sleep_quality', 'activity_level', 'blood_sugar', 'glucose',
          'temperature', 'humidity'
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

  // Calculate factor scores
  const calculateFactorScore = (dataType: string, optimalCheck: (val: number) => number) => {
    const factorData = healthData.filter(d => d.data_type === dataType);
    if (factorData.length === 0) return { score: 0, avg: 0, count: 0 };

    const values = factorData.map(d => extractValue(d.value));
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const scores = values.map(v => optimalCheck(v));
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return { score: Math.round(avgScore), avg: Math.round(avg), count: factorData.length };
  };

  // Heart Rate Factor
  const heartRateData = healthData.filter(d => d.data_type === 'heart_rate');
  const heartRateFactor = calculateFactorScore('heart_rate', (hr) => {
    if (hr >= 60 && hr <= 100) return 100;
    if (hr >= 50 && hr <= 110) return 75;
    if (hr >= 40 && hr <= 120) return 50;
    return 25;
  });

  // Oxygen Saturation Factor
  const o2Factor = calculateFactorScore('oxygen_saturation', (o2) => {
    if (o2 >= 95) return 100;
    if (o2 >= 90) return 75;
    if (o2 >= 85) return 50;
    return 25;
  });

  // Activity Factor
  const stepsData = healthData.filter(d => d.data_type === 'steps');
  const totalSteps = stepsData.reduce((sum, d) => sum + extractValue(d.value), 0);
  const avgDailySteps = stepsData.length > 0 ? totalSteps / stepsData.length : 0;
  const activityScore = avgDailySteps >= 5000 ? 100 : avgDailySteps >= 3000 ? 75 : avgDailySteps >= 1000 ? 50 : 25;
  const activityFactor = { score: activityScore, avg: Math.round(avgDailySteps), count: stepsData.length };

  // Sleep Quality Factor
  const sleepData = healthData.filter(d => d.data_type === 'sleep_quality');
  const sleepFactor = {
    score: sleepData.length > 0
      ? Math.round(sleepData.reduce((sum, d) => {
          const quality = extractValue(d.value, 'quality');
          return sum + (quality >= 80 ? 100 : quality >= 60 ? 75 : quality >= 40 ? 50 : 25);
        }, 0) / sleepData.length)
      : 0,
    avg: sleepData.length > 0
      ? Math.round(sleepData.reduce((sum, d) => sum + extractValue(d.value, 'quality'), 0) / sleepData.length)
      : 0,
    count: sleepData.length,
  };

  // Blood Sugar Factor
  const glucoseData = healthData.filter(d => d.data_type === 'blood_sugar' || d.data_type === 'glucose');
  const glucoseFactor = {
    score: glucoseData.length > 0
      ? Math.round(glucoseData.reduce((sum, d) => {
          const glucose = extractValue(d.value);
          return sum + (glucose >= 70 && glucose <= 140 ? 100 : glucose >= 60 && glucose <= 180 ? 75 : glucose >= 50 && glucose <= 200 ? 50 : 25);
        }, 0) / glucoseData.length)
      : 0,
    avg: glucoseData.length > 0
      ? Math.round(glucoseData.reduce((sum, d) => sum + extractValue(d.value), 0) / glucoseData.length)
      : 0,
    count: glucoseData.length,
  };

  // Prepare data for visualizations
  const factors = [
    {
      name: 'Heart Health',
      score: heartRateFactor.score,
      icon: Heart,
      color: '#ef4444',
      avg: `${heartRateFactor.avg} BPM`,
      optimal: '60-100 BPM',
      count: heartRateFactor.count,
      status: heartRateFactor.score >= 75 ? 'Good' : heartRateFactor.score >= 50 ? 'Fair' : 'Needs Attention',
    },
    {
      name: 'Oxygen Level',
      score: o2Factor.score,
      icon: Heart,
      color: '#3b82f6',
      avg: `${o2Factor.avg}%`,
      optimal: '≥95%',
      count: o2Factor.count,
      status: o2Factor.score >= 75 ? 'Good' : o2Factor.score >= 50 ? 'Fair' : 'Needs Attention',
    },
    {
      name: 'Physical Activity',
      score: activityFactor.score,
      icon: Activity,
      color: '#10b981',
      avg: `${activityFactor.avg} steps/day`,
      optimal: '≥5000 steps/day',
      count: activityFactor.count,
      status: activityFactor.score >= 75 ? 'Good' : activityFactor.score >= 50 ? 'Fair' : 'Needs Attention',
    },
    {
      name: 'Sleep Quality',
      score: sleepFactor.score,
      icon: Moon,
      color: '#8b5cf6',
      avg: `${sleepFactor.avg}%`,
      optimal: '≥80%',
      count: sleepFactor.count,
      status: sleepFactor.score >= 75 ? 'Good' : sleepFactor.score >= 50 ? 'Fair' : 'Needs Attention',
    },
    {
      name: 'Blood Sugar',
      score: glucoseFactor.score,
      icon: Droplets,
      color: '#f59e0b',
      avg: `${glucoseFactor.avg} mg/dL`,
      optimal: '70-140 mg/dL',
      count: glucoseFactor.count,
      status: glucoseFactor.score >= 75 ? 'Good' : glucoseFactor.score >= 50 ? 'Fair' : 'Needs Attention',
    },
  ].filter(f => f.count > 0);

  // Calculate overall wellness
  const overallScore = factors.length > 0
    ? Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length)
    : 0;

  // Radar chart data
  const radarData = factors.map(f => ({
    factor: f.name,
    score: f.score,
    fullMark: 100,
  }));

  // Identify areas needing improvement
  const needsImprovement = factors.filter(f => f.score < 75).sort((a, b) => a.score - b.score);

  // Identify strengths
  const strengths = factors.filter(f => f.score >= 75).sort((a, b) => b.score - a.score);

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
                No health data available to analyze contributing factors for the selected period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Wellness Impact */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Overall Wellness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="text-5xl font-bold mb-2">{overallScore}/100</div>
              <Progress value={overallScore} className="h-4 mb-2" />
              <p className="text-sm text-muted-foreground">
                Based on {factors.length} health factors
              </p>
            </div>
            <div className="text-right">
              <Badge variant={overallScore >= 75 ? 'default' : overallScore >= 50 ? 'secondary' : 'destructive'} className={overallScore >= 50 && overallScore < 75 ? 'bg-amber-100 text-amber-800' : ''}>
                {overallScore >= 75 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Needs Attention'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {healthData.length} total readings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factor Scores Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.content.healthFactorAnalysis')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Current Score"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Individual Factor Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detailed Factor Analysis</h3>
        <div className="grid gap-4">
          {factors.map((factor) => {
            const Icon = factor.icon;
            return (
              <Card key={factor.name} className={factor.score < 50 ? 'border-destructive' : factor.score < 75 ? 'border-warning' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${factor.color}20` }}>
                      <Icon className="h-6 w-6" style={{ color: factor.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{factor.name}</h4>
                        <Badge variant={factor.score >= 75 ? 'default' : factor.score >= 50 ? 'secondary' : 'destructive'} className={factor.score >= 50 && factor.score < 75 ? 'bg-amber-100 text-amber-800' : ''}>
                          {factor.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Score</span>
                          <span className="font-bold">{factor.score}/100</span>
                        </div>
                        <Progress value={factor.score} className="h-2" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Average</span>
                          <span className="font-medium">{factor.avg}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Optimal Range</span>
                          <span className="font-medium text-success">{factor.optimal}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Readings</span>
                          <span className="font-medium">{factor.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Strengths & Areas for Improvement */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        {strengths.length > 0 && (
          <Card className="border-success">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <TrendingUp className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strengths.map((factor) => (
                  <li key={factor.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="font-medium">{factor.name}</span>
                    <span className="text-muted-foreground">({factor.score}/100)</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Areas for Improvement */}
        {needsImprovement.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {needsImprovement.map((factor) => (
                  <li key={factor.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span className="font-medium">{factor.name}</span>
                    <span className="text-muted-foreground">({factor.score}/100)</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {needsImprovement.map((factor) => {
              if (factor.name === 'Heart Health') {
                return <li key={factor.name}>Focus on cardiovascular exercises and stress management to improve heart health</li>;
              }
              if (factor.name === 'Oxygen Level') {
                return <li key={factor.name}>Consider breathing exercises and ensure proper ventilation in living spaces</li>;
              }
              if (factor.name === 'Physical Activity') {
                return <li key={factor.name}>Gradually increase daily steps with short walks throughout the day</li>;
              }
              if (factor.name === 'Sleep Quality') {
                return <li key={factor.name}>Establish consistent sleep schedule and improve sleep hygiene practices</li>;
              }
              if (factor.name === 'Blood Sugar') {
                return <li key={factor.name}>Monitor diet and consult healthcare provider about glucose management</li>;
              }
              return null;
            })}
            {needsImprovement.length === 0 && (
              <li>All health factors are performing well. Continue maintaining healthy habits!</li>
            )}
            <li>Regular monitoring helps identify trends early and maintain independence</li>
            <li>Consult with healthcare providers before making significant lifestyle changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
