import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Activity, Droplet, Thermometer, Wind, Moon, Pill, Footprints, AlertTriangle, TrendingUp, Scale } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { isHealthDevice, isHealthDataType } from '@/lib/deviceDataMapping';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import HealthMetricsCharts from './HealthMetricsCharts';

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
      oxygen_saturation: Wind,
      oxygen_level: Wind,
      temperature: Thermometer,
      steps: Footprints,
      activity: Activity,
      sleep_quality: Moon,
      sleep_stage: Moon,
      medication_taken: Pill,
      next_dose_time: Pill,
      humidity: Wind,
      fall_detected: AlertTriangle,
      impact_force: AlertTriangle,
      weight: Scale,
      bmi: Scale,
      body_fat: Droplet,
    };
    return iconMap[type] || Activity;
  };

  const getVitalColor = (type: string, value: any) => {
    switch (type) {
      case 'heart_rate':
        const hr = typeof value === 'object' ? value.value : value;
        if (hr < 60 || hr > 100) return 'text-warning';
        return 'text-success';
      
      case 'blood_pressure':
        const sys = value.systolic || value.value?.systolic;
        if (sys > 140 || sys < 90) return 'text-warning';
        return 'text-success';
      
      case 'oxygen_saturation':
      case 'oxygen_level':
        const o2 = typeof value === 'object' ? value.value : value;
        if (o2 < 95) return 'text-warning';
        return 'text-success';
      
      case 'temperature':
        const temp = typeof value === 'object' ? value.value : value;
        if (temp < 36.1 || temp > 37.2) return 'text-warning';
        return 'text-success';
      
      case 'blood_sugar':
        const bs = typeof value === 'object' ? value.value : value;
        if (bs < 70 || bs > 140) return 'text-warning';
        return 'text-success';
      
      case 'fall_detected':
        const fallen = typeof value === 'object' ? value.value : value;
        return fallen ? 'text-destructive' : 'text-success';
      
      case 'medication_taken':
        const taken = typeof value === 'object' ? value.value : value;
        return taken ? 'text-success' : 'text-warning';

      case 'bmi':
        const bmi = typeof value === 'object' ? value.value : value;
        if (bmi < 18.5 || bmi > 25) return 'text-warning';
        return 'text-success';

      case 'body_fat':
        const bodyFat = typeof value === 'object' ? value.value : value;
        if (bodyFat < 15 || bodyFat > 30) return 'text-warning';
        return 'text-success';

      default:
        return 'text-foreground';
    }
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'blood_pressure':
        if (value.systolic && value.diastolic) {
          return `${Math.round(value.systolic)}/${Math.round(value.diastolic)} mmHg`;
        }
        if (value.value?.systolic && value.value?.diastolic) {
          return `${Math.round(value.value.systolic)}/${Math.round(value.value.diastolic)} mmHg`;
        }
        return 'N/A';
      
      case 'heart_rate':
        const hr = typeof value === 'object' ? value.value : value;
        return `${Math.round(hr)} bpm`;
      
      case 'oxygen_saturation':
      case 'oxygen_level':
        const o2 = typeof value === 'object' ? value.value : value;
        return `${Math.round(o2)}%`;
      
      case 'temperature':
        const temp = typeof value === 'object' ? value.value : value;
        return `${temp.toFixed(1)}°C`;
      
      case 'blood_sugar':
        const bs = typeof value === 'object' ? value.value : value;
        return `${Math.round(bs)} mg/dL`;
      
      case 'steps':
        const steps = typeof value === 'object' ? value.value : value;
        return `${steps.toLocaleString()} steps`;
      
      case 'activity':
        const activity = typeof value === 'object' ? value.value : value;
        return activity;
      
      case 'sleep_quality':
        const quality = typeof value === 'object' ? value.value : value;
        return `${quality}%`;
      
      case 'sleep_stage':
        return typeof value === 'object' ? value.value : value;
      
      case 'medication_taken':
        const taken = typeof value === 'object' ? value.value : value;
        return taken ? 'Yes' : 'No';
      
      case 'next_dose_time':
        const time = typeof value === 'object' ? value.value : value;
        try {
          return format(new Date(time), 'HH:mm');
        } catch {
          return time;
        }
      
      case 'humidity':
        const humidity = typeof value === 'object' ? value.value : value;
        return `${Math.round(humidity)}%`;
      
      case 'fall_detected':
        const fallen = typeof value === 'object' ? value.value : value;
        return fallen ? 'Fall Detected!' : 'No Falls';
      
      case 'impact_force':
        const force = typeof value === 'object' ? value.value : value;
        return `${force.toFixed(1)} G`;

      case 'weight':
        const weight = typeof value === 'object' ? value.value : value;
        return `${weight.toFixed(1)} kg`;

      case 'bmi':
        const bmi = typeof value === 'object' ? value.value : value;
        return `${bmi.toFixed(1)}`;

      case 'body_fat':
        const bodyFat = typeof value === 'object' ? value.value : value;
        return `${bodyFat.toFixed(1)}%`;

      default:
        if (typeof value === 'object' && value.value !== undefined) {
          return value.value;
        }
        return value;
    }
  };

  const getDisplayName = (type: string) => {
    const nameMap: Record<string, string> = {
      heart_rate: 'Heart Rate',
      blood_pressure: 'Blood Pressure',
      blood_sugar: 'Blood Sugar',
      oxygen_saturation: 'Oxygen Level',
      oxygen_level: 'Oxygen Level',
      temperature: 'Body Temperature',
      steps: 'Steps Today',
      activity: 'Activity Level',
      sleep_quality: 'Sleep Quality',
      sleep_stage: 'Sleep Stage',
      medication_taken: 'Medication Taken',
      next_dose_time: 'Next Dose',
      humidity: 'Room Humidity',
      fall_detected: 'Fall Status',
      impact_force: 'Impact Force',
      weight: 'Weight',
      bmi: 'BMI',
      body_fat: 'Body Fat',
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
                    {formatValue(item.value, item.data_type)}
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