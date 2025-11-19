import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets, Wind, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { celsiusToFahrenheit } from '@/lib/unitConversions';

interface EnvironmentalSensorsProps {
  selectedPersonId: string | null;
}

const EnvironmentalSensors = ({ selectedPersonId }: EnvironmentalSensorsProps) => {
  const { data: environmentalData, isLoading } = useQuery({
    queryKey: ['environmental-data', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .in('data_type', ['temperature', 'humidity', 'aqi'])
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter to only environmental sensors (exclude medical devices)
      const environmentalOnly = data.filter((item: any) => {
        const deviceCategory = item.devices?.device_types?.category;
        const deviceType = item.devices?.device_type;

        // Air quality always comes from environmental sensors, so include it regardless
        if (item.data_type === 'aqi') {
          return true;
        }

        // For temperature and humidity, filter by device category/type to exclude medical devices
        return deviceCategory === 'environment' ||
               deviceCategory === 'ENVIRONMENTAL' ||
               deviceCategory === 'Environmental Sensor' ||
               deviceType === 'environmental' ||
               deviceType === 'temp_sensor' ||
               deviceType === 'environmental_sensor';
      });

      // Group by data_type and get latest value
      const grouped = environmentalOnly.reduce((acc, item) => {
        if (!acc[item.data_type]) {
          acc[item.data_type] = item;
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped);
    },
    enabled: !!selectedPersonId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getTemperature = () => {
    const tempData = environmentalData?.find(d => d.data_type === 'temperature');
    if (!tempData) return null;
    const value = typeof tempData.value === 'object' ? tempData.value.value : tempData.value;
    return Number(value);
  };

  const getHumidity = () => {
    const humidityData = environmentalData?.find(d => d.data_type === 'humidity');
    if (!humidityData) return null;
    const value = typeof humidityData.value === 'object' ? humidityData.value.value : humidityData.value;
    return Number(value);
  };

  const getAirQuality = () => {
    const aqData = environmentalData?.find(d => d.data_type === 'aqi');
    if (!aqData) return null;
    const value = typeof aqData.value === 'object'
      ? (aqData.value.aqi || aqData.value.value)
      : aqData.value;
    return Number(value);
  };

  const temperature = getTemperature();
  const humidity = getHumidity();
  const airQuality = getAirQuality();

  const getTempStatus = (tempCelsius: number | null) => {
    if (tempCelsius === null) return { color: 'text-muted-foreground', label: 'No data', gradient: 'from-muted to-muted' };
    const temp = celsiusToFahrenheit(tempCelsius);
    // Converted ranges: 64°F, 72°F, 79°F, 86°F
    if (temp < 64) return { color: 'text-info', label: 'Cold', gradient: 'from-info/20 to-info/5' };
    if (temp < 72) return { color: 'text-success', label: 'Cool', gradient: 'from-success/20 to-success/5' };
    if (temp < 79) return { color: 'text-success', label: 'Comfortable', gradient: 'from-success/20 to-success/5' };
    if (temp < 86) return { color: 'text-warning', label: 'Warm', gradient: 'from-warning/20 to-warning/5' };
    return { color: 'text-destructive', label: 'Hot', gradient: 'from-destructive/20 to-destructive/5' };
  };

  const getHumidityStatus = (hum: number | null) => {
    if (hum === null) return { color: 'text-muted-foreground', label: 'No data', gradient: 'from-muted to-muted' };
    if (hum < 30) return { color: 'text-warning', label: 'Dry', gradient: 'from-warning/20 to-warning/5' };
    if (hum < 60) return { color: 'text-success', label: 'Comfortable', gradient: 'from-success/20 to-success/5' };
    return { color: 'text-info', label: 'Humid', gradient: 'from-info/20 to-info/5' };
  };

  const getAirQualityStatus = (aqi: number | null) => {
    if (aqi === null) return { color: 'text-muted-foreground', label: 'No data', gradient: 'from-muted to-muted' };
    if (aqi <= 50) return { color: 'text-success', label: 'Good', gradient: 'from-success/20 to-success/5' };
    if (aqi <= 100) return { color: 'text-success', label: 'Moderate', gradient: 'from-success/20 to-success/5' };
    if (aqi <= 150) return { color: 'text-warning', label: 'Unhealthy for Sensitive', gradient: 'from-warning/20 to-warning/5' };
    if (aqi <= 200) return { color: 'text-warning', label: 'Unhealthy', gradient: 'from-warning/20 to-warning/5' };
    return { color: 'text-destructive', label: 'Hazardous', gradient: 'from-destructive/20 to-destructive/5' };
  };

  const tempStatus = getTempStatus(temperature);
  const humidityStatus = getHumidityStatus(humidity);
  const airQualityStatus = getAirQualityStatus(airQuality);

  if (!selectedPersonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Environmental Sensors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Select a person to view environmental data
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Environmental Sensors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = temperature !== null || humidity !== null || airQuality !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="w-5 h-5" />
          Environmental Sensors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No environmental data available
            </p>
          </div>
        ) : (
          <>
            {/* Temperature Card */}
            <div className={cn(
              "relative overflow-hidden rounded-lg p-5 border transition-all duration-300",
              "bg-gradient-to-br",
              tempStatus.gradient
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Thermometer className={cn("w-6 h-6", tempStatus.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Temperature</p>
                    <p className="text-xs text-muted-foreground">{tempStatus.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  {temperature !== null ? (
                    <>
                      <p className={cn("text-3xl font-bold", tempStatus.color)}>
                        {celsiusToFahrenheit(temperature).toFixed(1)}°
                      </p>
                      <p className="text-xs text-muted-foreground">Fahrenheit</p>
                    </>
                  ) : (
                    <p className="text-xl text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              
              {/* Temperature Progress Bar */}
              {temperature !== null && (
                <div className="relative h-2 bg-background/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                      "bg-gradient-to-r from-info via-success to-destructive"
                    )}
                    style={{ width: `${Math.min(Math.max((celsiusToFahrenheit(temperature) / 104) * 100, 0), 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Humidity Card */}
            <div className={cn(
              "relative overflow-hidden rounded-lg p-5 border transition-all duration-300",
              "bg-gradient-to-br",
              humidityStatus.gradient
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Droplets className={cn("w-6 h-6", humidityStatus.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Humidity</p>
                    <p className="text-xs text-muted-foreground">{humidityStatus.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  {humidity !== null ? (
                    <>
                      <p className={cn("text-3xl font-bold", humidityStatus.color)}>
                        {Math.round(humidity)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Relative</p>
                    </>
                  ) : (
                    <p className="text-xl text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              
              {/* Humidity Progress Bar */}
              {humidity !== null && (
                <div className="relative h-2 bg-background/50 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                      humidityStatus.color.replace('text-', 'bg-')
                    )}
                    style={{ width: `${Math.min(Math.max(humidity, 0), 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Air Quality Card */}
            <div className={cn(
              "relative overflow-hidden rounded-lg p-5 border transition-all duration-300",
              "bg-gradient-to-br",
              airQualityStatus.gradient
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Wind className={cn("w-6 h-6", airQualityStatus.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Air Quality</p>
                    <p className="text-xs text-muted-foreground">{airQualityStatus.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  {airQuality !== null ? (
                    <>
                      <p className={cn("text-3xl font-bold", airQualityStatus.color)}>
                        {Math.round(airQuality)}
                      </p>
                      <p className="text-xs text-muted-foreground">AQI</p>
                    </>
                  ) : (
                    <p className="text-xl text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              
              {/* Air Quality Progress Bar */}
              {airQuality !== null && (
                <div className="relative h-2 bg-background/50 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                      airQualityStatus.color.replace('text-', 'bg-')
                    )}
                    style={{ width: `${Math.min(Math.max((airQuality / 300) * 100, 0), 100)}%` }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EnvironmentalSensors;
