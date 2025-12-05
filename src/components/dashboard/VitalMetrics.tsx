import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Activity, Droplet, Thermometer, Wind, Moon, Pill, Footprints, AlertTriangle, TrendingUp, Scale } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { isHealthDevice, isHealthDataType } from '@/lib/deviceDataMapping';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import HealthMetricsCharts from './HealthMetricsCharts';
import { celsiusToFahrenheit } from '@/lib/unitConversions';
import { extractNumericValue, extractBloodPressure, extractBooleanValue, extractStringValue } from '@/lib/valueExtractor';
import { useTranslation } from 'react-i18next';

// Map language codes to date-fns locales
const getDateLocale = (language: string) => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
  };
  return localeMap[language] || enUS;
};

// Check if temperature unit is Fahrenheit
const isTemperatureFahrenheit = (unit: string | null | undefined): boolean => {
  if (!unit) return false;
  const normalizedUnit = unit.toLowerCase().trim();
  return normalizedUnit === '°f' || normalizedUnit === 'f' || normalizedUnit === 'fahrenheit';
};

interface VitalMetricsProps {
  selectedPersonId?: string | null;
}

const VitalMetrics = ({ selectedPersonId }: VitalMetricsProps) => {
  const [showCharts, setShowCharts] = useState(false);
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  // Function to translate device name based on device type
  const getTranslatedDeviceName = (deviceName: string | undefined) => {
    if (!deviceName) return '';
    // Create a normalized key from device name (lowercase, replace spaces with underscores)
    const normalizedKey = deviceName.toLowerCase().replace(/\s+/g, '_');
    // Try to find a translation, fallback to original name
    const translated = t(`devices.names.${normalizedKey}`, { defaultValue: '' });
    return translated || deviceName;
  };

  const { data: recentData = [], isLoading } = useQuery({
    queryKey: ['vital-metrics', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Filter for health-related data (exclude environmental sensors for temperature)
      const healthData = data.filter((item: any) => {
        const deviceType = item.devices?.device_type;
        const deviceCategory = item.devices?.device_types?.category;
        const dataType = item.data_type;

        // Special handling for temperature: exclude environmental sensors
        if (dataType === 'temperature') {
          const isEnvironmental =
            deviceCategory === 'ENVIRONMENTAL' ||
            deviceCategory === 'Environmental Sensor' ||
            deviceType === 'environmental' ||
            deviceType === 'temp_sensor' ||
            deviceType === 'environmental_sensor';

          // Only include temperature from medical/health devices
          return !isEnvironmental && (isHealthDevice(deviceType, deviceCategory) || isHealthDataType(dataType));
        }

        return isHealthDevice(deviceType, deviceCategory) || isHealthDataType(dataType);
      });

      // Get most recent value for each data type
      const latestByType = new Map();
      healthData.forEach((item: any) => {
        if (!latestByType.has(item.data_type)) {
          latestByType.set(item.data_type, item);
        }
      });

      return Array.from(latestByType.values());
    },
    enabled: !!selectedPersonId,
    refetchInterval: 10000,
  });

  const getVitalIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      heart_rate: Heart,
      blood_pressure: Activity,
      blood_sugar: Droplet,
      glucose: Droplet,
      blood_glucose: Droplet,
      oxygen_saturation: Wind,
      oxygen_level: Wind,
      blood_oxygen: Wind,
      spo2: Wind,
      temperature: Thermometer,
      steps: Footprints,
      activity: Activity,
      sleep_quality: Moon,
      sleep_stage: Moon,
      medication_taken: Pill,
      next_dose_time: Pill,
      humidity: Droplet,
      fall_detected: AlertTriangle,
      impact_force: AlertTriangle,
      weight: Scale,
      bmi: Scale,
      body_fat: Droplet,
      pressure: Wind,
      barometric_pressure: Wind,
      pm2_5: Wind,
      pm25: Wind,
      pm1_0: Wind,
      pm1: Wind,
      pm10: Wind,
      pm10_0: Wind,
      aqi: Wind,
      air_quality_index: Wind,
      co2: Wind,
      carbon_dioxide: Wind,
      voc: Wind,
      volatile_organic_compounds: Wind,
      noise: Activity,
      sound_level: Activity,
      light: Activity,
      illuminance: Activity,
      respiratory_rate: Wind,
    };
    return iconMap[type] || Activity;
  };

  const getVitalColor = (type: string, value: any) => {
    switch (type) {
      case 'heart_rate':
        const hr = extractNumericValue(value, type);
        if (hr === null) return 'text-foreground';
        if (hr < 60 || hr > 100) return 'text-warning';
        return 'text-success';

      case 'blood_pressure':
        const bp = extractBloodPressure(value);
        if (!bp) return 'text-foreground';
        if (bp.systolic > 140 || bp.systolic < 90) return 'text-warning';
        return 'text-success';

      case 'oxygen_saturation':
      case 'oxygen_level':
      case 'blood_oxygen':
      case 'spo2':
        const o2 = extractNumericValue(value, type);
        if (o2 === null) return 'text-foreground';
        if (o2 < 95) return 'text-warning';
        return 'text-success';

      case 'temperature':
        // Note: unit is not available in this function, so we handle it in formatValue
        // This function uses Fahrenheit thresholds assuming conversion happens elsewhere
        const temp = extractNumericValue(value, type);
        if (temp === null) return 'text-foreground';
        // Assume value is in Celsius for body temp, convert to Fahrenheit for comparison
        // If unit is already Fahrenheit, the formatValue will handle it correctly
        const tempF = temp < 50 ? celsiusToFahrenheit(temp) : temp; // Heuristic: if < 50, likely Celsius
        // Normal range: 97°F - 99°F
        if (tempF < 97 || tempF > 99) return 'text-warning';
        return 'text-success';

      case 'blood_sugar':
      case 'glucose':
      case 'blood_glucose':
        const bs = extractNumericValue(value, type);
        if (bs === null) return 'text-foreground';
        if (bs < 70 || bs > 140) return 'text-warning';
        return 'text-success';

      case 'fall_detected':
        const fallen = extractBooleanValue(value, type);
        return fallen ? 'text-destructive' : 'text-success';

      case 'medication_taken':
        const taken = extractBooleanValue(value, type);
        return taken ? 'text-success' : 'text-warning';

      case 'bmi':
        const bmi = extractNumericValue(value, type);
        if (bmi === null) return 'text-foreground';
        if (bmi < 18.5 || bmi > 25) return 'text-warning';
        return 'text-success';

      case 'body_fat':
        const bodyFat = extractNumericValue(value, type);
        if (bodyFat === null) return 'text-foreground';
        if (bodyFat < 15 || bodyFat > 30) return 'text-warning';
        return 'text-success';

      case 'sleep_quality':
        const sleepQuality = extractNumericValue(value, type);
        if (sleepQuality === null) return 'text-foreground';
        if (sleepQuality >= 80) return 'text-success';
        if (sleepQuality >= 60) return 'text-warning';
        return 'text-destructive';

      case 'sleep_stage':
        const stage = extractStringValue(value, type);
        if (stage === 'deep' || stage === 'rem') return 'text-success';
        if (stage === 'light') return 'text-info';
        return 'text-muted-foreground';

      case 'aqi':
      case 'air_quality_index':
        const aqi = extractNumericValue(value, type);
        if (aqi === null) return 'text-foreground';
        if (aqi <= 50) return 'text-success';
        if (aqi <= 100) return 'text-warning';
        return 'text-destructive';

      case 'pm2_5':
      case 'pm25':
        const pm25 = extractNumericValue(value, type);
        if (pm25 === null) return 'text-foreground';
        if (pm25 <= 12) return 'text-success';
        if (pm25 <= 35) return 'text-warning';
        return 'text-destructive';

      case 'co2':
      case 'carbon_dioxide':
        const co2 = extractNumericValue(value, type);
        if (co2 === null) return 'text-foreground';
        if (co2 <= 800) return 'text-success';
        if (co2 <= 1000) return 'text-warning';
        return 'text-destructive';

      case 'humidity':
        const hum = extractNumericValue(value, type);
        if (hum === null) return 'text-foreground';
        if (hum >= 30 && hum <= 60) return 'text-success';
        return 'text-warning';

      default:
        return 'text-foreground';
    }
  };

  const formatValue = (value: any, type: string, unit?: string | null) => {
    if (value === null || value === undefined) return 'N/A';

    switch (type) {
      case 'blood_pressure':
        const bp = extractBloodPressure(value);
        if (bp) {
          return `${Math.round(bp.systolic)}/${Math.round(bp.diastolic)} mmHg`;
        }
        return 'N/A';

      case 'heart_rate':
        const hr = extractNumericValue(value, type);
        if (hr === null) return 'N/A';
        return `${Math.round(hr)} bpm`;

      case 'oxygen_saturation':
      case 'oxygen_level':
      case 'blood_oxygen':
      case 'spo2':
        const o2 = extractNumericValue(value, type);
        if (o2 === null) return 'N/A';
        return `${Math.round(o2)}%`;

      case 'temperature':
        const tempVal = extractNumericValue(value, type);
        if (tempVal === null) return 'N/A';
        // If unit is already Fahrenheit, don't convert
        const tempFinal = isTemperatureFahrenheit(unit) ? tempVal : celsiusToFahrenheit(tempVal);
        return `${tempFinal.toFixed(1)}°F`;

      case 'blood_sugar':
      case 'glucose':
      case 'blood_glucose':
        const bs = extractNumericValue(value, type);
        if (bs === null) return 'N/A';
        return `${Math.round(bs)} mg/dL`;

      case 'steps':
        const steps = extractNumericValue(value, type);
        if (steps === null) return 'N/A';
        return `${steps.toLocaleString()} steps`;

      case 'activity':
        const activity = extractStringValue(value, type);
        return activity || 'N/A';

      case 'sleep_quality':
        const quality = extractNumericValue(value, type);
        if (quality === null) return 'N/A';
        const duration = value?.duration || value?.hours || value?.duration_hours;
        if (duration) {
          return `${Math.round(quality)}% (${Number(duration).toFixed(1)}h)`;
        }
        return `${Math.round(quality)}%`;

      case 'sleep_stage':
        const stage = extractStringValue(value, type);
        if (!stage) return 'N/A';
        return String(stage).charAt(0).toUpperCase() + String(stage).slice(1);

      case 'medication_taken':
        const taken = extractBooleanValue(value, type);
        return taken ? t('common.yes') : t('common.no');

      case 'next_dose_time':
        // Value is already formatted as "HH:mm" (e.g., "14:30") from simulator
        const time = typeof value === 'object' ? value.value : value;
        if (typeof time === 'string' && time.includes(':') && !time.includes('T')) {
          // Convert AM/PM to 24-hour if needed
          const amPmMatch = String(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (amPmMatch) {
            let hours = parseInt(amPmMatch[1], 10);
            const minutes = amPmMatch[2];
            const period = amPmMatch[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            else if (period === 'AM' && hours === 12) hours = 0;
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
          }
          return time; // Already in 24-hour format
        }
        // Fallback for ISO timestamp format
        try {
          return format(new Date(time), 'HH:mm');
        } catch {
          return time;
        }

      case 'humidity':
        const humidity = extractNumericValue(value, type);
        if (humidity === null) return 'N/A';
        return `${Math.round(humidity)}%`;

      case 'fall_detected':
        const fallen = extractBooleanValue(value, type);
        return fallen ? t('healthMetrics.values.fallDetected') : t('healthMetrics.values.noFalls');

      case 'impact_force':
        const force = extractNumericValue(value, type);
        if (force === null) return 'N/A';
        return `${force.toFixed(1)} G`;

      case 'weight':
        const weight = extractNumericValue(value, type);
        if (weight === null) return 'N/A';
        return `${weight.toFixed(1)} kg`;

      case 'bmi':
        const bmiVal = extractNumericValue(value, type);
        if (bmiVal === null) return 'N/A';
        return `${bmiVal.toFixed(1)}`;

      case 'body_fat':
        const bodyFat = extractNumericValue(value, type);
        if (bodyFat === null) return 'N/A';
        return `${bodyFat.toFixed(1)}%`;

      case 'pressure':
      case 'barometric_pressure':
        const pressure = extractNumericValue(value, type);
        if (pressure === null) return 'N/A';
        return `${pressure.toFixed(1)} hPa`;

      case 'pm2_5':
      case 'pm25':
        const pm25 = extractNumericValue(value, type);
        if (pm25 === null) return 'N/A';
        return `${pm25.toFixed(1)} µg/m³`;

      case 'pm1_0':
      case 'pm1':
        const pm1 = extractNumericValue(value, type);
        if (pm1 === null) return 'N/A';
        return `${pm1.toFixed(1)} µg/m³`;

      case 'pm10':
      case 'pm10_0':
        const pm10 = extractNumericValue(value, type);
        if (pm10 === null) return 'N/A';
        return `${pm10.toFixed(1)} µg/m³`;

      case 'aqi':
      case 'air_quality_index':
        const aqi = extractNumericValue(value, type);
        const category = extractStringValue(value, type);
        if (aqi === null) return 'N/A';
        return category ? `${Math.round(aqi)} (${category})` : `${Math.round(aqi)}`;

      case 'co2':
      case 'carbon_dioxide':
        const co2 = extractNumericValue(value, type);
        if (co2 === null) return 'N/A';
        return `${Math.round(co2)} ppm`;

      case 'voc':
      case 'volatile_organic_compounds':
        const voc = extractNumericValue(value, type);
        if (voc === null) return 'N/A';
        return `${Math.round(voc)} ppb`;

      case 'noise':
      case 'sound_level':
        const noise = extractNumericValue(value, type);
        if (noise === null) return 'N/A';
        return `${noise.toFixed(1)} dB`;

      case 'light':
      case 'illuminance':
        const light = extractNumericValue(value, type);
        if (light === null) return 'N/A';
        return `${Math.round(light)} lux`;

      case 'respiratory_rate':
        const respRate = extractNumericValue(value, type);
        if (respRate === null) return 'N/A';
        return `${Math.round(respRate)} bpm`;

      default:
        // Try to extract numeric value first
        const numericVal = extractNumericValue(value, type);
        if (numericVal !== null) return numericVal;

        // Then try string value
        const strVal = extractStringValue(value, type);
        if (strVal !== null) return strVal;

        return 'N/A';
    }
  };

  const getDisplayName = (type: string) => {
    const keyMap: Record<string, string> = {
      heart_rate: 'healthMetrics.types.heart_rate',
      blood_pressure: 'healthMetrics.types.blood_pressure',
      blood_sugar: 'healthMetrics.types.blood_sugar',
      glucose: 'healthMetrics.types.blood_sugar',
      blood_glucose: 'healthMetrics.types.blood_sugar',
      oxygen_saturation: 'healthMetrics.types.oxygen_level',
      oxygen_level: 'healthMetrics.types.oxygen_level',
      blood_oxygen: 'healthMetrics.types.oxygen_level',
      spo2: 'healthMetrics.types.oxygen_level',
      temperature: 'healthMetrics.types.temperature',
      steps: 'healthMetrics.types.steps',
      activity: 'healthMetrics.types.activity',
      sleep_quality: 'healthMetrics.types.sleep_quality',
      sleep_stage: 'healthMetrics.types.sleep_stage',
      medication_taken: 'healthMetrics.types.medication_taken',
      next_dose_time: 'healthMetrics.types.next_dose_time',
      humidity: 'healthMetrics.types.humidity',
      fall_detected: 'healthMetrics.types.fall_detected',
      impact_force: 'healthMetrics.types.impact_force',
      weight: 'healthMetrics.types.weight',
      bmi: 'healthMetrics.types.bmi',
      body_fat: 'healthMetrics.types.body_fat',
      pressure: 'healthMetrics.types.barometric_pressure',
      barometric_pressure: 'healthMetrics.types.barometric_pressure',
      pm2_5: 'PM 2.5',
      pm25: 'PM 2.5',
      pm1_0: 'PM 1.0',
      pm1: 'PM 1.0',
      pm10: 'PM 10',
      pm10_0: 'PM 10',
      aqi: 'healthMetrics.types.air_quality_index',
      air_quality_index: 'healthMetrics.types.air_quality_index',
      co2: 'healthMetrics.types.co2_level',
      carbon_dioxide: 'healthMetrics.types.co2_level',
      voc: 'healthMetrics.types.voc_level',
      volatile_organic_compounds: 'healthMetrics.types.voc_level',
      noise: 'healthMetrics.types.noise_level',
      sound_level: 'healthMetrics.types.noise_level',
      light: 'healthMetrics.types.light_level',
      illuminance: 'healthMetrics.types.light_level',
      respiratory_rate: 'healthMetrics.types.respiratory_rate',
    };
    const key = keyMap[type];
    if (key && key.startsWith('healthMetrics.')) {
      return t(key);
    }
    return key || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('healthMetrics.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedPersonId || recentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('healthMetrics.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t('healthMetrics.noData')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('healthMetrics.title')}</CardTitle>
            {selectedPersonId && recentData.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCharts(true)}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {t('healthMetrics.viewCharts')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentData.map((item: any) => {
            const Icon = getVitalIcon(item.data_type);
            const color = getVitalColor(item.data_type, item.value);
            
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="font-medium">{getDisplayName(item.data_type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTranslatedDeviceName(item.devices?.device_name)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${color}`}>
                    {formatValue(item.value, item.data_type, item.unit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.recorded_at), 'MMM d, HH:mm', { locale: dateLocale })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <HealthMetricsCharts
      open={showCharts}
      onOpenChange={setShowCharts}
      selectedPersonId={selectedPersonId}
    />
  </>
  );
};

export default VitalMetrics;