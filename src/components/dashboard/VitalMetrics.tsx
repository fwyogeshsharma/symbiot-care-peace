import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Activity, Droplet, Thermometer, Wind, Moon, Pill, Footprints, AlertTriangle, TrendingUp, Scale } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { isHealthDevice, isHealthDataType } from '@/lib/deviceDataMapping';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import HealthMetricsCharts from './HealthMetricsCharts';
import { celsiusToFahrenheit } from '@/lib/unitConversions';
import { extractNumericValue, extractBloodPressure, extractBooleanValue, extractStringValue } from '@/lib/valueExtractor';

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
        return taken ? 'Yes' : 'No';

      case 'next_dose_time':
        const time = typeof value === 'object' ? value.value : value;
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
        return fallen ? 'Fall Detected!' : 'No Falls';

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
    const nameMap: Record<string, string> = {
      heart_rate: 'Heart Rate',
      blood_pressure: 'Blood Pressure',
      blood_sugar: 'Blood Sugar',
      glucose: 'Blood Sugar',
      blood_glucose: 'Blood Sugar',
      oxygen_saturation: 'Oxygen Level',
      oxygen_level: 'Oxygen Level',
      blood_oxygen: 'Oxygen Level',
      spo2: 'Oxygen Level',
      temperature: 'Body Temperature',
      steps: 'Steps Today',
      activity: 'Activity Level',
      sleep_quality: 'Sleep Quality',
      sleep_stage: 'Sleep Stage',
      medication_taken: 'Medication Taken',
      next_dose_time: 'Next Dose',
      humidity: 'Humidity',
      fall_detected: 'Fall Status',
      impact_force: 'Impact Force',
      weight: 'Weight',
      bmi: 'BMI',
      body_fat: 'Body Fat',
      pressure: 'Barometric Pressure',
      barometric_pressure: 'Barometric Pressure',
      pm2_5: 'PM 2.5',
      pm25: 'PM 2.5',
      pm1_0: 'PM 1.0',
      pm1: 'PM 1.0',
      pm10: 'PM 10',
      pm10_0: 'PM 10',
      aqi: 'Air Quality Index',
      air_quality_index: 'Air Quality Index',
      co2: 'CO₂ Level',
      carbon_dioxide: 'CO₂ Level',
      voc: 'VOC Level',
      volatile_organic_compounds: 'VOC Level',
      noise: 'Noise Level',
      sound_level: 'Noise Level',
      light: 'Light Level',
      illuminance: 'Light Level',
      respiratory_rate: 'Respiratory Rate',
    };
    return nameMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Metrics</CardTitle>
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
          <CardTitle>Health Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No health data available yet
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
            <CardTitle>Health Metrics</CardTitle>
            {selectedPersonId && recentData.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCharts(true)}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Charts
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
                      {item.devices?.device_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${color}`}>
                    {formatValue(item.value, item.data_type, item.unit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.recorded_at), 'MMM d, HH:mm')}
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