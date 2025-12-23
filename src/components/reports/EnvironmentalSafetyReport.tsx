import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Thermometer,
  Wind,
  Activity,
  Battery,
  MapPin,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface EnvironmentalSafetyReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

interface SafetyMetrics {
  environmentScore: number;
  fallRiskScore: number;
  deviceHealthScore: number;
  emergencyResponseScore: number;
  overallScore: number;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

export const EnvironmentalSafetyReport = ({ selectedPerson, dateRange }: EnvironmentalSafetyReportProps) => {
  const { t } = useTranslation();

  // Fetch environmental data
  const { data: environmentalData = [] } = useQuery({
    queryKey: ['safety-environmental', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', [
          'temperature', 'humidity', 'co2', 'carbon_dioxide',
          'voc', 'volatile_organic_compounds', 'tvoc',
          'pm2_5', 'pm25', 'light', 'illuminance', 'light_level',
          'noise', 'sound_level'
        ])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch fall incidents
  const { data: fallAlerts = [] } = useQuery({
    queryKey: ['safety-falls', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .or('alert_type.eq.fall,title.ilike.%fall%')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all critical alerts
  const { data: criticalAlerts = [] } = useQuery({
    queryKey: ['safety-critical-alerts', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .in('severity', ['critical', 'high'])
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch device health
  const { data: devices = [] } = useQuery({
    queryKey: ['safety-devices', selectedPerson],
    queryFn: async () => {
      let query = supabase
        .from('devices')
        .select('*');

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const extractValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if ('value' in value) return Number(value.value);
    }
    return Number(value) || 0;
  };

  // Calculate environmental safety metrics
  const calculateEnvironmentalScore = (): { score: number; issues: string[]; warnings: string[] } => {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Get latest readings by type
    const latestByType = environmentalData.reduce((acc: any, item) => {
      if (!acc[item.data_type] || new Date(item.recorded_at) > new Date(acc[item.data_type].recorded_at)) {
        acc[item.data_type] = item;
      }
      return acc;
    }, {});

    // Temperature checks
    const tempData = latestByType.temperature;
    if (tempData) {
      const temp = extractValue(tempData.value);
      if (temp < 60 || temp > 85) {
        issues.push(`Critical temperature: ${temp}°F (Safe range: 68-78°F)`);
        score -= 15;
      } else if (temp < 68 || temp > 78) {
        warnings.push(`Temperature outside comfort zone: ${temp}°F`);
        score -= 5;
      }
    } else {
      warnings.push('No temperature monitoring detected');
      score -= 10;
    }

    // Humidity checks
    const humidityData = latestByType.humidity;
    if (humidityData) {
      const humidity = extractValue(humidityData.value);
      if (humidity < 20 || humidity > 70) {
        issues.push(`Critical humidity: ${humidity}% (Safe range: 30-60%)`);
        score -= 15;
      } else if (humidity < 30 || humidity > 60) {
        warnings.push(`Humidity outside comfort zone: ${humidity}%`);
        score -= 5;
      }
    } else {
      warnings.push('No humidity monitoring detected');
      score -= 10;
    }

    // CO2 checks
    const co2Data = latestByType.co2 || latestByType.carbon_dioxide;
    if (co2Data) {
      const co2 = extractValue(co2Data.value);
      if (co2 > 1500) {
        issues.push(`Dangerous CO2 levels: ${co2} ppm (Good: <800 ppm)`);
        score -= 20;
      } else if (co2 > 1000) {
        warnings.push(`Elevated CO2 levels: ${co2} ppm - Ventilation needed`);
        score -= 10;
      }
    }

    // VOC checks
    const vocData = latestByType.voc || latestByType.tvoc || latestByType.volatile_organic_compounds;
    if (vocData) {
      const voc = extractValue(vocData.value);
      if (voc > 1000) {
        issues.push(`High VOC levels: ${voc} ppb (Good: <500 ppb)`);
        score -= 15;
      } else if (voc > 500) {
        warnings.push(`Moderate VOC levels: ${voc} ppb`);
        score -= 5;
      }
    }

    // PM2.5 checks
    const pm25Data = latestByType.pm2_5 || latestByType.pm25;
    if (pm25Data) {
      const pm25 = extractValue(pm25Data.value);
      if (pm25 > 55) {
        issues.push(`Unhealthy particulate matter: ${pm25} µg/m³ (Good: <12)`);
        score -= 15;
      } else if (pm25 > 35) {
        warnings.push(`Elevated particulate matter: ${pm25} µg/m³`);
        score -= 8;
      }
    }

    // Light level checks
    const lightData = latestByType.light || latestByType.illuminance || latestByType.light_level;
    if (lightData) {
      const light = extractValue(lightData.value);
      if (light < 50) {
        warnings.push(`Low light levels detected: ${light} lux - Fall risk`);
        score -= 10;
      }
    }

    // Noise level checks
    const noiseData = latestByType.noise || latestByType.sound_level;
    if (noiseData) {
      const noise = extractValue(noiseData.value);
      if (noise > 70) {
        warnings.push(`High noise levels: ${noise} dB - May cause stress`);
        score -= 5;
      }
    }

    return { score: Math.max(0, score), issues, warnings };
  };

  // Calculate fall risk score
  const calculateFallRiskScore = (): { score: number; issues: string[]; warnings: string[] } => {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const daysPeriod = differenceInDays(dateRange.to, dateRange.from) || 1;
    const totalFalls = fallAlerts.length;
    const criticalFalls = fallAlerts.filter((a: any) => a.severity === 'critical').length;
    const unresolvedFalls = fallAlerts.filter((a: any) => a.status !== 'resolved').length;

    if (criticalFalls > 0) {
      issues.push(`${criticalFalls} critical fall incident${criticalFalls > 1 ? 's' : ''} detected`);
      score -= criticalFalls * 25;
    }

    if (totalFalls > 0) {
      const fallsPerWeek = (totalFalls / daysPeriod) * 7;
      if (fallsPerWeek > 1) {
        issues.push(`High fall frequency: ${totalFalls} falls in ${daysPeriod} days`);
        score -= 20;
      } else if (totalFalls > 0) {
        warnings.push(`${totalFalls} fall incident${totalFalls > 1 ? 's' : ''} recorded`);
        score -= totalFalls * 10;
      }
    }

    if (unresolvedFalls > 0) {
      warnings.push(`${unresolvedFalls} fall incident${unresolvedFalls > 1 ? 's' : ''} pending resolution`);
      score -= unresolvedFalls * 5;
    }

    return { score: Math.max(0, score), issues, warnings };
  };

  // Calculate device health score
  const calculateDeviceHealthScore = (): { score: number; issues: string[]; warnings: string[] } => {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    if (devices.length === 0) {
      issues.push('No monitoring devices configured');
      return { score: 0, issues, warnings };
    }

    const inactiveDevices = devices.filter((d: any) => d.status === 'inactive' || d.status === 'maintenance');
    const lowBatteryDevices = devices.filter((d: any) => d.battery_level && d.battery_level < 20);
    const staleSyncDevices = devices.filter((d: any) => {
      if (!d.last_sync) return true;
      const hoursSinceSync = (Date.now() - new Date(d.last_sync).getTime()) / (1000 * 60 * 60);
      return hoursSinceSync > 24;
    });

    if (inactiveDevices.length > 0) {
      issues.push(`${inactiveDevices.length} device${inactiveDevices.length > 1 ? 's' : ''} offline or in maintenance`);
      score -= inactiveDevices.length * 20;
    }

    if (lowBatteryDevices.length > 0) {
      warnings.push(`${lowBatteryDevices.length} device${lowBatteryDevices.length > 1 ? 's' : ''} with low battery (<20%)`);
      score -= lowBatteryDevices.length * 10;
    }

    if (staleSyncDevices.length > 0) {
      warnings.push(`${staleSyncDevices.length} device${staleSyncDevices.length > 1 ? 's' : ''} not synced in 24+ hours`);
      score -= staleSyncDevices.length * 15;
    }

    // Check device coverage
    const deviceTypes = new Set(devices.map((d: any) => d.device_type));
    const hasFallDetector = Array.from(deviceTypes).some(type =>
      type && (type.includes('fall') || type.includes('safety') || type.includes('wearable'))
    );
    const hasEnvironmentalSensor = Array.from(deviceTypes).some(type =>
      type && type.includes('environmental')
    );

    if (!hasFallDetector) {
      warnings.push('No fall detection device configured');
      score -= 10;
    }

    if (!hasEnvironmentalSensor) {
      warnings.push('No environmental sensor configured');
      score -= 10;
    }

    return { score: Math.max(0, score), issues, warnings };
  };

  // Calculate emergency response score
  const calculateEmergencyResponseScore = (): { score: number; issues: string[]; warnings: string[] } => {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const unresolvedCritical = criticalAlerts.filter((a: any) => a.status !== 'resolved').length;
    const unacknowledgedCritical = criticalAlerts.filter((a: any) => !a.acknowledged_at).length;

    if (unresolvedCritical > 0) {
      issues.push(`${unresolvedCritical} unresolved critical alert${unresolvedCritical > 1 ? 's' : ''}`);
      score -= unresolvedCritical * 30;
    }

    if (unacknowledgedCritical > 0) {
      issues.push(`${unacknowledgedCritical} unacknowledged critical alert${unacknowledgedCritical > 1 ? 's' : ''}`);
      score -= unacknowledgedCritical * 20;
    }

    // Check response times
    const resolvedAlerts = criticalAlerts.filter((a: any) => a.resolved_at && a.created_at);
    if (resolvedAlerts.length > 0) {
      const avgResponseMinutes = resolvedAlerts.reduce((sum: number, alert: any) => {
        const diff = (new Date(alert.resolved_at).getTime() - new Date(alert.created_at).getTime()) / (1000 * 60);
        return sum + diff;
      }, 0) / resolvedAlerts.length;

      if (avgResponseMinutes > 60) {
        warnings.push(`Slow response time: ${Math.round(avgResponseMinutes)} min average`);
        score -= 15;
      } else if (avgResponseMinutes > 30) {
        warnings.push(`Response time could be improved: ${Math.round(avgResponseMinutes)} min average`);
        score -= 10;
      }
    }

    return { score: Math.max(0, score), issues, warnings };
  };

  // Generate comprehensive safety metrics
  const calculateSafetyMetrics = (): SafetyMetrics => {
    const envMetrics = calculateEnvironmentalScore();
    const fallMetrics = calculateFallRiskScore();
    const deviceMetrics = calculateDeviceHealthScore();
    const emergencyMetrics = calculateEmergencyResponseScore();

    const overallScore = Math.round(
      (envMetrics.score * 0.3 +
       fallMetrics.score * 0.3 +
       deviceMetrics.score * 0.2 +
       emergencyMetrics.score * 0.2)
    );

    const criticalIssues = [
      ...envMetrics.issues,
      ...fallMetrics.issues,
      ...deviceMetrics.issues,
      ...emergencyMetrics.issues,
    ];

    const warnings = [
      ...envMetrics.warnings,
      ...fallMetrics.warnings,
      ...deviceMetrics.warnings,
      ...emergencyMetrics.warnings,
    ];

    const recommendations = generateRecommendations(criticalIssues, warnings, {
      envScore: envMetrics.score,
      fallScore: fallMetrics.score,
      deviceScore: deviceMetrics.score,
      emergencyScore: emergencyMetrics.score,
    });

    return {
      environmentScore: envMetrics.score,
      fallRiskScore: fallMetrics.score,
      deviceHealthScore: deviceMetrics.score,
      emergencyResponseScore: emergencyMetrics.score,
      overallScore,
      criticalIssues,
      warnings,
      recommendations,
    };
  };

  // Generate recommendations based on findings
  const generateRecommendations = (
    criticalIssues: string[],
    warnings: string[],
    scores: any
  ): string[] => {
    const recommendations: string[] = [];

    // Environmental recommendations
    if (scores.envScore < 70) {
      recommendations.push('Install additional environmental sensors to monitor air quality, temperature, and humidity');
      recommendations.push('Ensure proper ventilation - open windows regularly or install air purifier');
      recommendations.push('Consider using a humidifier or dehumidifier to maintain 30-60% humidity');
    }

    // Fall risk recommendations
    if (scores.fallScore < 70) {
      recommendations.push('Conduct comprehensive home safety assessment to identify fall hazards');
      recommendations.push('Install motion-activated night lights along pathways');
      recommendations.push('Remove tripping hazards: loose rugs, clutter, electrical cords');
      recommendations.push('Consider installing grab bars in bathroom and handrails on stairs');
      recommendations.push('Review medications with healthcare provider - some may increase fall risk');
    }

    // Device health recommendations
    if (scores.deviceScore < 70) {
      recommendations.push('Replace batteries in low-power devices immediately');
      recommendations.push('Check and restore connectivity for offline devices');
      recommendations.push('Consider adding redundant monitoring devices in critical areas');
      recommendations.push('Set up automated alerts for device disconnections');
    }

    // Emergency response recommendations
    if (scores.emergencyScore < 70) {
      recommendations.push('Establish clear emergency response protocols with all caregivers');
      recommendations.push('Reduce alert response time - aim for under 15 minutes for critical alerts');
      recommendations.push('Ensure all family members have the monitoring app with notifications enabled');
      recommendations.push('Consider enrolling in professional emergency response service');
    }

    // General recommendations
    if (criticalIssues.length > 0) {
      recommendations.push('Address all critical issues immediately - these pose immediate safety risks');
    }

    if (recommendations.length === 0) {
      recommendations.push('Safety environment is well-maintained - continue current monitoring practices');
      recommendations.push('Perform monthly device maintenance checks to ensure continued reliability');
      recommendations.push('Review and test emergency protocols quarterly');
    }

    return recommendations;
  };

  const safetyMetrics = calculateSafetyMetrics();

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getOverallStatusIcon = (score: number) => {
    if (score >= 80) return <ShieldCheck className="h-8 w-8 text-green-600" />;
    if (score >= 60) return <Shield className="h-8 w-8 text-yellow-600" />;
    return <ShieldAlert className="h-8 w-8 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Safety Status */}
      <Card className={`border-2 ${
        safetyMetrics.overallScore >= 80 ? 'border-green-200' :
        safetyMetrics.overallScore >= 60 ? 'border-yellow-200' :
        'border-red-200'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl">
              {getOverallStatusIcon(safetyMetrics.overallScore)}
              Environment Safety Assessment
            </CardTitle>
            <div className="text-right">
              <div className={`text-5xl font-bold ${getScoreColor(safetyMetrics.overallScore)}`}>
                {safetyMetrics.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Safety Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Progress value={safetyMetrics.overallScore} className="h-3" />
          </div>
          <p className="text-sm text-muted-foreground">
            Assessment period: {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </p>
        </CardContent>
      </Card>

      {/* Critical Issues Alert */}
      {safetyMetrics.criticalIssues.length > 0 && (
        <Card className="border-destructive border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Safety Issues ({safetyMetrics.criticalIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {safetyMetrics.criticalIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Safety Score Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Environmental Safety */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Environmental Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(safetyMetrics.environmentScore)}`}>
              {safetyMetrics.environmentScore}
            </div>
            <Progress value={safetyMetrics.environmentScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Air quality, temperature, humidity
            </p>
          </CardContent>
        </Card>

        {/* Fall Risk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Fall Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(safetyMetrics.fallRiskScore)}`}>
              {safetyMetrics.fallRiskScore}
            </div>
            <Progress value={safetyMetrics.fallRiskScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {fallAlerts.length} incident{fallAlerts.length !== 1 ? 's' : ''} recorded
            </p>
          </CardContent>
        </Card>

        {/* Device Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Battery className="h-4 w-4" />
              Device Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(safetyMetrics.deviceHealthScore)}`}>
              {safetyMetrics.deviceHealthScore}
            </div>
            <Progress value={safetyMetrics.deviceHealthScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {devices.length} device{devices.length !== 1 ? 's' : ''} monitored
            </p>
          </CardContent>
        </Card>

        {/* Emergency Response */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Emergency Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(safetyMetrics.emergencyResponseScore)}`}>
              {safetyMetrics.emergencyResponseScore}
            </div>
            <Progress value={safetyMetrics.emergencyResponseScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {safetyMetrics.warnings.length > 0 && (
        <Card className="border-yellow-200 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              Warnings & Attention Items ({safetyMetrics.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {safetyMetrics.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Device Status Details */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5" />
              Monitoring Device Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {devices.map((device: any) => {
                const isLowBattery = device.battery_level && device.battery_level < 20;
                const isOffline = device.status === 'inactive' || device.status === 'maintenance';
                const hoursSinceSync = device.last_sync
                  ? (Date.now() - new Date(device.last_sync).getTime()) / (1000 * 60 * 60)
                  : 999;
                const isStale = hoursSinceSync > 24;

                return (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        isOffline ? 'bg-red-500' : isStale ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium">{device.device_name}</p>
                        <p className="text-xs text-muted-foreground">{device.device_type}</p>
                        {device.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {device.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {device.battery_level !== null && (
                        <div className="text-right">
                          <div className={`text-sm font-medium ${isLowBattery ? 'text-red-600' : ''}`}>
                            {device.battery_level}%
                          </div>
                          <p className="text-xs text-muted-foreground">Battery</p>
                        </div>
                      )}
                      <Badge variant={isOffline ? 'destructive' : 'default'}>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="border-blue-200 border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <CheckCircle2 className="h-5 w-5" />
            Safety Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {safetyMetrics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm flex-1">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Environmental Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{environmentalData.length}</div>
                <p className="text-xs text-muted-foreground">Data points collected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alert Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{criticalAlerts.length}</div>
                <p className="text-xs text-muted-foreground">Critical/high alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Device Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {devices.filter((d: any) => d.status === 'active').length}/{devices.length}
                </div>
                <p className="text-xs text-muted-foreground">Active devices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
