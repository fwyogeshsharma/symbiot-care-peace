import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { Wind, Droplets, Thermometer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface AirQualityReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const AirQualityReport = ({ selectedPerson, dateRange }: AirQualityReportProps) => {
  const { t } = useTranslation();

  const { data: environmentalData = [], isLoading } = useQuery({
    queryKey: ['air-quality-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*, devices(device_name, device_type)')
        .in('data_type', [
          'temperature', 'humidity', 'co2', 'carbon_dioxide',
          'voc', 'volatile_organic_compounds', 'tvoc', 'pm1', 'pm2_5', 'pm25', 'pm10',
          'aqi', 'air_quality_index', 'eco2', 'air_quality'
        ])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If we have air_quality data type, extract sub-values
      const processedData = data || [];
      const expandedData: any[] = [];

      processedData.forEach(item => {
        if (item.data_type === 'air_quality' && typeof item.value === 'object') {
          // Expand air_quality object into separate data points
          const aqValue = item.value as any;
          if (aqValue.co2) expandedData.push({ ...item, data_type: 'co2', value: aqValue.co2 });
          if (aqValue.voc || aqValue.tvoc) expandedData.push({ ...item, data_type: 'voc', value: aqValue.voc || aqValue.tvoc });
          if (aqValue.pm25 || aqValue.pm2_5) expandedData.push({ ...item, data_type: 'pm2_5', value: aqValue.pm25 || aqValue.pm2_5 });
          if (aqValue.pm10) expandedData.push({ ...item, data_type: 'pm10', value: aqValue.pm10 });
          if (aqValue.aqi) expandedData.push({ ...item, data_type: 'aqi', value: aqValue.aqi });
          if (aqValue.temperature) expandedData.push({ ...item, data_type: 'temperature', value: aqValue.temperature });
          if (aqValue.humidity) expandedData.push({ ...item, data_type: 'humidity', value: aqValue.humidity });
        } else {
          expandedData.push(item);
        }
      });

      return expandedData;
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
      time: format(new Date(item.recorded_at), 'MMM dd HH:mm'),
      value: extractValue(item.value),
      timestamp: item.recorded_at,
    });
    return acc;
  }, {});

  // Calculate averages
  const calculateAverage = (data: any[]) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    return Math.round(sum / data.length);
  };

  const temperatureData = dataByType.temperature || [];
  const humidityData = dataByType.humidity || [];
  const co2Data = dataByType.co2 || dataByType.carbon_dioxide || dataByType.eco2 || [];
  const vocData = dataByType.voc || dataByType.volatile_organic_compounds || dataByType.tvoc || [];
  const pm25Data = dataByType.pm2_5 || dataByType.pm25 || [];
  const pm10Data = dataByType.pm10 || [];
  const pm1Data = dataByType.pm1 || [];
  const aqiData = dataByType.aqi || dataByType.air_quality_index || [];

  const avgTemp = calculateAverage(temperatureData);
  const avgHumidity = calculateAverage(humidityData);
  const avgCO2 = calculateAverage(co2Data);
  const avgVOC = calculateAverage(vocData);
  const avgPM25 = calculateAverage(pm25Data);
  const avgPM10 = calculateAverage(pm10Data);
  const avgPM1 = calculateAverage(pm1Data);
  const avgAQI = calculateAverage(aqiData);

  // Get unique devices providing environmental data
  const environmentalDevices = Array.from(
    new Set(environmentalData.map(item => (item as any).devices?.device_name).filter(Boolean))
  );

  // Quality assessment
  const getAirQualityStatus = () => {
    let issues = [];

    if (avgCO2 > 1000) issues.push(t('reports.airQuality.highCO2'));
    if (avgVOC > 500) issues.push(t('reports.airQuality.highVOC'));
    if (avgPM25 > 35) issues.push(t('reports.airQuality.highPM25'));
    if (avgPM10 > 50) issues.push(t('reports.airQuality.highPM10'));
    if (avgHumidity < 30 || avgHumidity > 60) issues.push(t('reports.airQuality.humidityOutOfRange'));
    if (avgTemp < 68 || avgTemp > 78) issues.push(t('reports.airQuality.temperatureOutOfRange'));
    if (avgAQI > 100) issues.push(t('reports.airQuality.unhealthyAQI'));

    if (issues.length === 0) {
      return { status: t('reports.airQuality.good'), color: 'success', issues: [] };
    } else if (issues.length <= 2) {
      return { status: t('reports.airQuality.fair'), color: 'warning', issues };
    } else {
      return { status: t('reports.airQuality.poor'), color: 'destructive', issues };
    }
  };

  const airQualityStatus = getAirQualityStatus();

  // Data availability flags
  const hasTemperature = temperatureData.length > 0;
  const hasHumidity = humidityData.length > 0;
  const hasCO2 = co2Data.length > 0;
  const hasVOC = vocData.length > 0;
  const hasPM25 = pm25Data.length > 0;
  const hasPM10 = pm10Data.length > 0;
  const hasPM1 = pm1Data.length > 0;
  const hasAQI = aqiData.length > 0;

  // Combine data for multi-line chart
  const combinedChartData = temperatureData.map((item, index) => ({
    time: item.time,
    temperature: item.value,
    humidity: humidityData[index]?.value || null,
  }));

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (environmentalData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Wind className="w-16 h-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('reports.content.noEnvironmentalData')}</h3>
              <p className="text-muted-foreground">
                {t('reports.content.noEnvironmentalDataAvailable')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('reports.content.ensureSensorsConfigured')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className={`border-${airQualityStatus.color}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {airQualityStatus.status === 'Good' ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-warning" />
              )}
              {t('reports.content.airQualityStatus')}
            </CardTitle>
            <Badge variant={airQualityStatus.color as any} className="text-lg px-4 py-2">
              {airQualityStatus.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {airQualityStatus.issues.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium">{t('reports.content.issuesDetected')}</p>
              <ul className="list-disc list-inside space-y-1">
                {airQualityStatus.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-muted-foreground">{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-success">{t('reports.content.allParametersOptimal')}</p>
          )}
        </CardContent>
      </Card>

      {/* Connected Devices */}
      {environmentalDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5" />
              {t('reports.airQuality.connectedSensors')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {environmentalDevices.map((device, index) => (
                <Badge key={index} variant="outline" className="px-3 py-1">
                  {device}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('reports.airQuality.sensorsActive', { count: environmentalDevices.length })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {hasTemperature && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.content.temperature')}</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTemp}°F</div>
              <p className="text-xs text-muted-foreground">{t('reports.content.optimal6878F')}</p>
            </CardContent>
          </Card>
        )}

        {hasHumidity && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.content.humidity')}</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgHumidity}%</div>
              <p className="text-xs text-muted-foreground">{t('reports.content.optimal3060')}</p>
            </CardContent>
          </Card>
        )}

        {hasCO2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.content.co2')}</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCO2}</div>
              <p className="text-xs text-muted-foreground">{t('reports.content.ppmGood800')}</p>
            </CardContent>
          </Card>
        )}

        {hasVOC && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.content.voc')}</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgVOC}</div>
              <p className="text-xs text-muted-foreground">{t('reports.content.ppbGood500')}</p>
            </CardContent>
          </Card>
        )}

        {hasPM25 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.content.pm25')}</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgPM25}</div>
              <p className="text-xs text-muted-foreground">{t('reports.content.ugm3Good12')}</p>
            </CardContent>
          </Card>
        )}

        {hasPM10 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">PM10</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgPM10}</div>
              <p className="text-xs text-muted-foreground">{t('reports.airQuality.pm10Good')}</p>
            </CardContent>
          </Card>
        )}

        {hasPM1 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">PM1</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgPM1}</div>
              <p className="text-xs text-muted-foreground">{t('reports.airQuality.pm1Good')}</p>
            </CardContent>
          </Card>
        )}

        {hasAQI && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.content.aqi')}</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgAQI}</div>
              <p className="text-xs text-muted-foreground">{t('reports.content.good050')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Temperature & Humidity Chart */}
      {combinedChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.content.temperatureHumidityTrends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" label={{ value: 'Temperature (°F)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine yAxisId="left" y={68} stroke="#3b82f6" strokeDasharray="3 3" label="Min Comfort" />
                <ReferenceLine yAxisId="left" y={78} stroke="#ef4444" strokeDasharray="3 3" label="Max Comfort" />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ef4444" name="Temperature (°F)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" name="Humidity (%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* CO2 Levels Chart */}
      {co2Data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.content.co2Levels')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={co2Data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'ppm', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={800} stroke="#10b981" strokeDasharray="3 3" label="Good" />
                <ReferenceLine y={1000} stroke="#f59e0b" strokeDasharray="3 3" label="Fair" />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" name="CO₂ (ppm)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle>{t('reports.content.recommendations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Maintain indoor temperature between 68-78°F for optimal comfort</li>
            <li>Keep humidity levels between 30-60% to prevent mold and respiratory issues</li>
            <li>Ventilate rooms when CO₂ levels exceed 800 ppm</li>
            <li>Use air purifiers to reduce particulate matter (PM2.5)</li>
            <li>Identify and eliminate sources of VOCs (cleaning products, paints, etc.)</li>
            <li>Regularly monitor air quality, especially for elderly with respiratory conditions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
