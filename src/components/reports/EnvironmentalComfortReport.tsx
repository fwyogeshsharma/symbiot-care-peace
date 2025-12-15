import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { Thermometer, Droplets, Sun, Volume2, Home, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';

interface EnvironmentalComfortReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const EnvironmentalComfortReport = ({ selectedPerson, dateRange }: EnvironmentalComfortReportProps) => {
  const { t } = useTranslation();

  const { data: environmentalData = [], isLoading } = useQuery({
    queryKey: ['comfort-analysis-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', [
          'temperature', 'humidity', 'light', 'illuminance',
          'noise', 'sound_level', 'pressure', 'barometric_pressure'
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

  const extractValue = (value: any) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if ('value' in value) return Number(value.value);
    }
    return Number(value);
  };

  // Group data by type
  const dataByType = environmentalData.reduce((acc: any, item) => {
    const type = item.data_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push({
      value: extractValue(item.value),
      timestamp: item.recorded_at,
    });
    return acc;
  }, {});

  const temperatureData = dataByType.temperature || [];
  const humidityData = dataByType.humidity || [];
  const lightData = dataByType.light || dataByType.illuminance || [];
  const noiseData = dataByType.noise || dataByType.sound_level || [];

  // Calculate statistics
  const calcStats = (data: any[]) => {
    if (data.length === 0) return { avg: 0, min: 0, max: 0, inRange: 0 };
    const values = data.map(d => d.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      count: values.length,
    };
  };

  const tempStats = calcStats(temperatureData);
  const humidityStats = calcStats(humidityData);
  const lightStats = calcStats(lightData);
  const noiseStats = calcStats(noiseData);

  // Define comfort ranges
  const comfortRanges = {
    temperature: { min: 68, max: 78, unit: '°F', optimal: '68-78°F' },
    humidity: { min: 30, max: 60, unit: '%', optimal: '30-60%' },
    light: { min: 300, max: 500, unit: 'lux', optimal: '300-500 lux' },
    noise: { min: 0, max: 50, unit: 'dB', optimal: '<50 dB' },
  };

  // Calculate comfort score
  const calculateComfortScore = () => {
    let score = 0;
    let maxScore = 0;

    if (temperatureData.length > 0) {
      maxScore += 25;
      const inRange = temperatureData.filter(d =>
        d.value >= comfortRanges.temperature.min && d.value <= comfortRanges.temperature.max
      ).length;
      score += (inRange / temperatureData.length) * 25;
    }

    if (humidityData.length > 0) {
      maxScore += 25;
      const inRange = humidityData.filter(d =>
        d.value >= comfortRanges.humidity.min && d.value <= comfortRanges.humidity.max
      ).length;
      score += (inRange / humidityData.length) * 25;
    }

    if (lightData.length > 0) {
      maxScore += 25;
      const inRange = lightData.filter(d =>
        d.value >= comfortRanges.light.min && d.value <= comfortRanges.light.max
      ).length;
      score += (inRange / lightData.length) * 25;
    }

    if (noiseData.length > 0) {
      maxScore += 25;
      const inRange = noiseData.filter(d => d.value <= comfortRanges.noise.max).length;
      score += (inRange / noiseData.length) * 25;
    }

    return maxScore > 0 ? Math.round(score) : 0;
  };

  const comfortScore = calculateComfortScore();

  // Prepare data for comparison chart
  const comparisonData = [
    {
      metric: 'Temperature',
      actual: tempStats.avg,
      optimal: (comfortRanges.temperature.min + comfortRanges.temperature.max) / 2,
      unit: '°F',
    },
    {
      metric: 'Humidity',
      actual: humidityStats.avg,
      optimal: (comfortRanges.humidity.min + comfortRanges.humidity.max) / 2,
      unit: '%',
    },
    {
      metric: 'Light',
      actual: lightStats.avg,
      optimal: (comfortRanges.light.min + comfortRanges.light.max) / 2,
      unit: 'lux',
    },
    {
      metric: 'Noise',
      actual: noiseStats.avg,
      optimal: comfortRanges.noise.max / 2,
      unit: 'dB',
    },
  ].filter(d => d.actual > 0);

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (environmentalData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Home className="w-16 h-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Environmental Data</h3>
              <p className="text-muted-foreground">
                No environmental comfort data available for the selected period.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Ensure environmental sensors are properly configured and connected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Comfort Score */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-6 w-6" />
            Overall Comfort Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-4xl font-bold mb-2">{comfortScore}%</div>
              <Progress value={comfortScore} className="h-3" />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {comfortScore >= 80 ? 'Excellent' :
                 comfortScore >= 60 ? 'Good' :
                 comfortScore >= 40 ? 'Fair' : 'Poor'}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on {environmentalData.length} readings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tempStats.avg}°F</div>
            <p className="text-xs text-muted-foreground">
              Range: {tempStats.min}-{tempStats.max}°F
            </p>
            <p className="text-xs text-success mt-1">
              Optimal: {comfortRanges.temperature.optimal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{humidityStats.avg}%</div>
            <p className="text-xs text-muted-foreground">
              Range: {humidityStats.min}-{humidityStats.max}%
            </p>
            <p className="text-xs text-success mt-1">
              Optimal: {comfortRanges.humidity.optimal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Light Level</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lightStats.avg} lux</div>
            <p className="text-xs text-muted-foreground">
              Range: {lightStats.min}-{lightStats.max} lux
            </p>
            <p className="text-xs text-success mt-1">
              Optimal: {comfortRanges.light.optimal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Noise Level</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noiseStats.avg} dB</div>
            <p className="text-xs text-muted-foreground">
              Range: {noiseStats.min}-{noiseStats.max} dB
            </p>
            <p className="text-xs text-success mt-1">
              Optimal: {comfortRanges.noise.optimal}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actual vs Optimal Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Actual vs Optimal Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual Average" />
              <Bar dataKey="optimal" fill="#10b981" name="Optimal Target" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Comfort Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {temperatureData.length > 0 && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Temperature Comfort</span>
                  </div>
                  <span className="text-sm">
                    {Math.round((temperatureData.filter(d =>
                      d.value >= comfortRanges.temperature.min &&
                      d.value <= comfortRanges.temperature.max
                    ).length / temperatureData.length) * 100)}% in optimal range
                  </span>
                </div>
                <Progress
                  value={Math.round((temperatureData.filter(d =>
                    d.value >= comfortRanges.temperature.min &&
                    d.value <= comfortRanges.temperature.max
                  ).length / temperatureData.length) * 100)}
                />
              </div>
            )}

            {humidityData.length > 0 && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Humidity Comfort</span>
                  </div>
                  <span className="text-sm">
                    {Math.round((humidityData.filter(d =>
                      d.value >= comfortRanges.humidity.min &&
                      d.value <= comfortRanges.humidity.max
                    ).length / humidityData.length) * 100)}% in optimal range
                  </span>
                </div>
                <Progress
                  value={Math.round((humidityData.filter(d =>
                    d.value >= comfortRanges.humidity.min &&
                    d.value <= comfortRanges.humidity.max
                  ).length / humidityData.length) * 100)}
                />
              </div>
            )}

            {lightData.length > 0 && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Lighting Comfort</span>
                  </div>
                  <span className="text-sm">
                    {Math.round((lightData.filter(d =>
                      d.value >= comfortRanges.light.min &&
                      d.value <= comfortRanges.light.max
                    ).length / lightData.length) * 100)}% in optimal range
                  </span>
                </div>
                <Progress
                  value={Math.round((lightData.filter(d =>
                    d.value >= comfortRanges.light.min &&
                    d.value <= comfortRanges.light.max
                  ).length / lightData.length) * 100)}
                />
              </div>
            )}

            {noiseData.length > 0 && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Noise Comfort</span>
                  </div>
                  <span className="text-sm">
                    {Math.round((noiseData.filter(d =>
                      d.value <= comfortRanges.noise.max
                    ).length / noiseData.length) * 100)}% in optimal range
                  </span>
                </div>
                <Progress
                  value={Math.round((noiseData.filter(d =>
                    d.value <= comfortRanges.noise.max
                  ).length / noiseData.length) * 100)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommendations for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {tempStats.avg < comfortRanges.temperature.min && (
              <li>Consider increasing heating - temperature is below optimal range</li>
            )}
            {tempStats.avg > comfortRanges.temperature.max && (
              <li>Consider increasing cooling - temperature is above optimal range</li>
            )}
            {humidityStats.avg < comfortRanges.humidity.min && (
              <li>Use a humidifier - humidity is too low which can cause respiratory discomfort</li>
            )}
            {humidityStats.avg > comfortRanges.humidity.max && (
              <li>Use a dehumidifier - high humidity can promote mold growth</li>
            )}
            {lightStats.avg < comfortRanges.light.min && (
              <li>Increase lighting levels for better visibility and mood</li>
            )}
            {noiseStats.avg > comfortRanges.noise.max && (
              <li>Reduce noise levels for better rest and concentration</li>
            )}
            <li>Maintain consistent environmental conditions for better comfort and health</li>
            <li>Monitor conditions regularly and adjust as seasons change</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
