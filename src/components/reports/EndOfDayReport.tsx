import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Heart, Activity, Moon, Pill, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Clock, Thermometer, Droplets, Wind, Home, Wifi, Watch, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface EndOfDayReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const EndOfDayReport = ({ selectedPerson, dateRange }: EndOfDayReportProps) => {
  const { t } = useTranslation();

  // Use the 'to' date as the day to report on
  const reportDate = dateRange.to;
  const dayStart = startOfDay(reportDate);
  const dayEnd = endOfDay(reportDate);

  // Fetch all health data for the day
  const { data: healthData = [], isLoading: loadingHealth } = useQuery({
    queryKey: ['eod-health-data', selectedPerson, reportDate],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .gte('recorded_at', dayStart.toISOString())
        .lte('recorded_at', dayEnd.toISOString())
        .order('recorded_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch alerts for the day
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['eod-alerts', selectedPerson, reportDate],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())
        .order('created_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch medication data
  const { data: medications = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['eod-medications', selectedPerson, reportDate],
    queryFn: async () => {
      let query = supabase
        .from('medication_adherence_logs')
        .select('*, medications(*)')
        .gte('scheduled_time', dayStart.toISOString())
        .lte('scheduled_time', dayEnd.toISOString())
        .order('scheduled_time', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch connected devices
  const { data: devices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ['eod-devices', selectedPerson],
    queryFn: async () => {
      let query = supabase
        .from('devices')
        .select('*')
        .eq('status', 'active');

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

  // Process health data by type
  const dataByType = healthData.reduce((acc: any, item) => {
    const type = item.data_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  // Calculate vital signs
  const heartRateData = dataByType.heart_rate || [];
  const avgHeartRate = heartRateData.length > 0
    ? Math.round(heartRateData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / heartRateData.length)
    : null;
  const latestHeartRate = heartRateData.length > 0 ? Math.round(extractValue(heartRateData[0].value)) : null;

  const o2Data = dataByType.oxygen_saturation || [];
  const avgO2 = o2Data.length > 0
    ? Math.round(o2Data.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / o2Data.length)
    : null;
  const latestO2 = o2Data.length > 0 ? Math.round(extractValue(o2Data[0].value)) : null;

  const stepsData = dataByType.steps || [];
  const totalSteps = stepsData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0);

  const sleepData = dataByType.sleep_quality || [];
  const avgSleep = sleepData.length > 0
    ? Math.round(sleepData.reduce((sum: number, d: any) => sum + extractValue(d.value, 'quality'), 0) / sleepData.length)
    : null;

  const glucoseData = dataByType.blood_sugar || dataByType.glucose || [];
  const avgGlucose = glucoseData.length > 0
    ? Math.round(glucoseData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / glucoseData.length)
    : null;

  const tempData = dataByType.temperature || [];
  const avgTemp = tempData.length > 0
    ? Math.round(tempData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / tempData.length)
    : null;

  // Blood Pressure data
  const bpData = dataByType.blood_pressure || [];
  const latestBP = bpData.length > 0 ? bpData[0].value : null;
  const avgSystolic = bpData.length > 0
    ? Math.round(bpData.reduce((sum: number, d: any) => {
        const val = d.value;
        return sum + (typeof val === 'object' && val?.systolic ? val.systolic : 0);
      }, 0) / bpData.length)
    : null;
  const avgDiastolic = bpData.length > 0
    ? Math.round(bpData.reduce((sum: number, d: any) => {
        const val = d.value;
        return sum + (typeof val === 'object' && val?.diastolic ? val.diastolic : 0);
      }, 0) / bpData.length)
    : null;

  // Environmental data
  const airQualityData = dataByType.air_quality || [];
  const avgAirQuality = airQualityData.length > 0
    ? Math.round(airQualityData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / airQualityData.length)
    : null;

  const humidityData = dataByType.humidity || [];
  const avgHumidity = humidityData.length > 0
    ? Math.round(humidityData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / humidityData.length)
    : null;

  const envTempData = dataByType.room_temperature || dataByType.environment_temperature || [];
  const avgEnvTemp = envTempData.length > 0
    ? Math.round(envTempData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0) / envTempData.length)
    : null;

  // Detailed sleep data
  const sleepDurationData = dataByType.sleep_duration || [];
  const totalSleepMinutes = sleepDurationData.reduce((sum: number, d: any) => sum + extractValue(d.value), 0);
  const sleepHours = totalSleepMinutes > 0 ? Math.floor(totalSleepMinutes / 60) : null;
  const sleepMinutes = totalSleepMinutes > 0 ? totalSleepMinutes % 60 : null;

  // Calculate medication adherence
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m: any) => m.status === 'taken' || m.status === 'completed').length;
  const missedMeds = medications.filter((m: any) => m.status === 'missed').length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : null;

  // Alert statistics
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'critical').length;
  const highAlerts = alerts.filter((a: any) => a.severity === 'high').length;
  const resolvedAlerts = alerts.filter((a: any) => a.status === 'resolved').length;

  // Overall health status
  const calculateDailyScore = () => {
    let score = 0;
    let factors = 0;

    if (avgHeartRate !== null) {
      factors++;
      if (avgHeartRate >= 60 && avgHeartRate <= 100) score += 100;
      else if (avgHeartRate >= 50 && avgHeartRate <= 110) score += 75;
      else score += 50;
    }

    if (avgO2 !== null) {
      factors++;
      if (avgO2 >= 95) score += 100;
      else if (avgO2 >= 90) score += 75;
      else score += 50;
    }

    if (totalSteps > 0) {
      factors++;
      if (totalSteps >= 5000) score += 100;
      else if (totalSteps >= 3000) score += 75;
      else if (totalSteps >= 1000) score += 50;
      else score += 25;
    }

    if (adherenceRate !== null) {
      factors++;
      score += adherenceRate;
    }

    if (criticalAlerts > 0) score -= 20;
    if (highAlerts > 0) score -= 10;

    return factors > 0 ? Math.max(0, Math.min(100, Math.round(score / factors))) : null;
  };

  const dailyScore = calculateDailyScore();
  const healthStatus = dailyScore === null ? 'Unknown' :
    dailyScore >= 80 ? 'Excellent' :
    dailyScore >= 60 ? 'Good' :
    dailyScore >= 40 ? 'Fair' : 'Needs Attention';

  const statusColor = dailyScore === null ? 'secondary' :
    dailyScore >= 80 ? 'default' :
    dailyScore >= 60 ? 'default' :
    dailyScore >= 40 ? 'warning' : 'destructive';

  // Key highlights and concerns
  const highlights = [];
  const concerns = [];

  if (adherenceRate !== null && adherenceRate >= 90) highlights.push('Excellent medication adherence');
  if (adherenceRate !== null && adherenceRate < 80) concerns.push('Low medication adherence - follow up needed');
  if (totalSteps >= 5000) highlights.push('Activity goal achieved');
  if (totalSteps < 1000) concerns.push('Low activity level today');
  if (criticalAlerts > 0) concerns.push(`${criticalAlerts} critical alert${criticalAlerts > 1 ? 's' : ''} triggered`);
  if (avgHeartRate && (avgHeartRate < 50 || avgHeartRate > 110)) concerns.push('Heart rate outside normal range');
  if (avgO2 && avgO2 < 90) concerns.push('Low oxygen saturation detected');
  if (alerts.length === 0 && healthData.length > 0) highlights.push('No alerts today');

  const isLoading = loadingHealth || loadingAlerts || loadingMeds || loadingDevices;

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Date and Overall Status */}
      <Card className={`border-${statusColor}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{t('reports.content.endOfDaySummary')}</CardTitle>
              <p className="text-muted-foreground">{format(reportDate, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div className="text-right">
              {dailyScore !== null ? (
                <>
                  <div className="text-4xl font-bold mb-2">{dailyScore}/100</div>
                  <Badge variant={statusColor as any} className="text-lg px-4 py-1">
                    {healthStatus}
                  </Badge>
                </>
              ) : (
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {t('reports.content.noData')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dailyScore !== null && (
            <Progress value={dailyScore} className="h-3 mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            {healthData.length} {t('reports.content.readings')} recorded today
          </p>
        </CardContent>
      </Card>

      {/* Connected Devices */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              {t('reports.content.connectedDevices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device: any) => {
                const deviceIcon =
                  device.device_type === 'smartwatch' || device.device_type === 'wearable' ? Watch :
                  device.device_type === 'smartphone' || device.device_type === 'mobile' ? Smartphone :
                  device.device_type === 'environmental' || device.device_type === 'sensor' ? Home :
                  Wifi;
                const Icon = deviceIcon;

                return (
                  <div key={device.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{device.device_name || device.device_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.manufacturer} {device.model}
                      </p>
                    </div>
                    <Badge variant="default" className="text-xs">{t('reports.content.active')}</Badge>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {devices.length} device{devices.length !== 1 ? 's' : ''} actively monitoring health and environment
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Highlights and Concerns */}
      {(highlights.length > 0 || concerns.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Highlights */}
          {highlights.length > 0 && (
            <Card className="border-success">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  Today's Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-success mt-1.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Concerns */}
          {concerns.length > 0 && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-5 w-5" />
                  Areas of Concern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {concerns.map((concern, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-warning mt-1.5" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vital Signs Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.content.vitalSignsSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-medium">Heart Rate</span>
              </div>
              {avgHeartRate !== null ? (
                <>
                  <div className="text-2xl font-bold">{latestHeartRate} BPM</div>
                  <p className="text-xs text-muted-foreground">Avg: {avgHeartRate} BPM</p>
                  <p className="text-xs text-muted-foreground">{heartRateData.length} {t('reports.content.readings')}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('reports.content.noData')}</p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Oxygen Sat</span>
              </div>
              {avgO2 !== null ? (
                <>
                  <div className="text-2xl font-bold">{latestO2}%</div>
                  <p className="text-xs text-muted-foreground">Avg: {avgO2}%</p>
                  <p className="text-xs text-muted-foreground">{o2Data.length} {t('reports.content.readings')}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('reports.content.noData')}</p>
              )}
            </div>

            {avgGlucose !== null && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Blood Sugar</span>
                </div>
                <div className="text-2xl font-bold">{avgGlucose} mg/dL</div>
                <p className="text-xs text-muted-foreground">{glucoseData.length} {t('reports.content.readings')}</p>
              </div>
            )}

            {avgTemp !== null && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Temperature</span>
                </div>
                <div className="text-2xl font-bold">{avgTemp}°F</div>
                <p className="text-xs text-muted-foreground">{tempData.length} {t('reports.content.readings')}</p>
              </div>
            )}

            {avgSystolic !== null && avgDiastolic !== null && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <span className="font-medium">Blood Pressure</span>
                </div>
                <div className="text-2xl font-bold">{avgSystolic}/{avgDiastolic}</div>
                <p className="text-xs text-muted-foreground">mmHg • {bpData.length} {t('reports.content.readings')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environmental Conditions */}
      {(avgAirQuality !== null || avgHumidity !== null || avgEnvTemp !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              {t('reports.content.environmentalConditions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {avgEnvTemp !== null && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Room Temp</span>
                  </div>
                  <div className="text-2xl font-bold">{avgEnvTemp}°F</div>
                  <p className="text-xs text-muted-foreground">{envTempData.length} {t('reports.content.readings')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {avgEnvTemp >= 68 && avgEnvTemp <= 76 ? `✓ ${t('reports.content.comfortable')}` : '⚠ Outside comfort zone'}
                  </p>
                </div>
              )}

              {avgHumidity !== null && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Humidity</span>
                  </div>
                  <div className="text-2xl font-bold">{avgHumidity}%</div>
                  <p className="text-xs text-muted-foreground">{humidityData.length} {t('reports.content.readings')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {avgHumidity >= 30 && avgHumidity <= 60 ? `✓ ${t('reports.content.optimal')}` : '⚠ Adjust needed'}
                  </p>
                </div>
              )}

              {avgAirQuality !== null && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Air Quality</span>
                  </div>
                  <div className="text-2xl font-bold">{avgAirQuality}</div>
                  <p className="text-xs text-muted-foreground">AQI • {airQualityData.length} {t('reports.content.readings')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {avgAirQuality <= 50 ? '✓ Good' : avgAirQuality <= 100 ? 'Moderate' : '⚠ Poor'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity & Sleep */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Physical Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{totalSteps.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mb-3">{t('reports.content.steps')} today</p>
            <Progress
              value={Math.min(100, (totalSteps / 5000) * 100)}
              className="h-2 mb-1"
            />
            <p className="text-xs text-muted-foreground">
              Goal: 5,000 steps ({Math.min(100, Math.round((totalSteps / 5000) * 100))}%)
            </p>
          </CardContent>
        </Card>

        {(avgSleep !== null || sleepHours !== null) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Sleep Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sleepHours !== null && (
                <>
                  <div className="text-3xl font-bold mb-1">
                    {sleepHours}h {sleepMinutes}m
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">total sleep duration</p>
                </>
              )}
              {avgSleep !== null && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Sleep Quality</span>
                    <span className="text-sm font-bold">{avgSleep}%</span>
                  </div>
                  <Progress value={avgSleep} className="h-2 mb-2" />
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {sleepData.length + sleepDurationData.length} sleep data points
              </p>
              {sleepHours !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {sleepHours >= 7 && sleepHours <= 9 ? '✓ Recommended sleep duration' : '⚠ Outside recommended range (7-9h)'}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Medication Adherence */}
      {totalMeds > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medication Adherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-success">{takenMeds}</div>
                <p className="text-sm text-muted-foreground">Taken</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-destructive">{missedMeds}</div>
                <p className="text-sm text-muted-foreground">Missed</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{totalMeds}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Adherence Rate</span>
                <span className="text-sm font-bold">{adherenceRate}%</span>
              </div>
              <Progress value={adherenceRate || 0} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Summary */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerts & Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="text-center p-4 border border-destructive rounded-lg">
                <div className="text-2xl font-bold text-destructive">{criticalAlerts}</div>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <div className="text-center p-4 border border-warning rounded-lg">
                <div className="text-2xl font-bold text-warning">{highAlerts}</div>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
              <div className="text-center p-4 border border-success rounded-lg">
                <div className="text-2xl font-bold text-success">{resolvedAlerts}</div>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
            {alerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Recent Alerts:</p>
                {alerts.slice(0, 5).map((alert: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'secondary' : 'default'
                      } className={alert.severity === 'high' ? 'bg-amber-100 text-amber-800' : ''}>
                        {alert.severity}
                      </Badge>
                      <span>{alert.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Combine all events and sort by time */}
            {(() => {
              const timelineEvents = [];

              // Add medication events
              medications.slice(0, 5).forEach((med: any) => {
                timelineEvents.push({
                  time: new Date(med.scheduled_time),
                  type: 'medication',
                  status: med.status,
                  description: `${med.status === 'taken' ? 'Took' : med.status === 'missed' ? 'Missed' : 'Scheduled'} ${med.medications?.name || 'medication'}`,
                  icon: Pill,
                  color: med.status === 'taken' ? 'text-success' : med.status === 'missed' ? 'text-destructive' : 'text-muted-foreground'
                });
              });

              // Add alert events
              alerts.slice(0, 3).forEach((alert: any) => {
                timelineEvents.push({
                  time: new Date(alert.created_at),
                  type: 'alert',
                  severity: alert.severity,
                  description: alert.title,
                  icon: AlertCircle,
                  color: alert.severity === 'critical' ? 'text-destructive' : alert.severity === 'high' ? 'text-warning' : 'text-info'
                });
              });

              // Add activity milestones
              if (totalSteps >= 5000) {
                timelineEvents.push({
                  time: reportDate,
                  type: 'milestone',
                  description: `Achieved daily step goal (${totalSteps.toLocaleString()} steps)`,
                  icon: Activity,
                  color: 'text-success'
                });
              }

              // Sort by time descending
              timelineEvents.sort((a, b) => b.time.getTime() - a.time.getTime());

              if (timelineEvents.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No timeline events recorded for this day
                  </p>
                );
              }

              return timelineEvents.slice(0, 8).map((event, index) => {
                const Icon = event.icon;
                return (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <Icon className={`h-4 w-4 mt-0.5 ${event.color}`} />
                    <div className="flex-1">
                      <p className="text-sm">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.time, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Report Footer */}
      <Card className="border-info">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-info mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">About This Report</p>
              <p className="text-xs text-muted-foreground">
                This End of Day summary provides a comprehensive overview of health metrics, activities,
                and incidents for {format(reportDate, 'MMMM d, yyyy')}. Family members can optionally
                receive this report via email each evening to stay informed about their loved one's daily well-being.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
