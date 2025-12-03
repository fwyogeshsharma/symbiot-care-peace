import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';
import { de, es, fr, frCA, enUS } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { celsiusToFahrenheit } from '@/lib/unitConversions';
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

interface HealthMetricsChartsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPersonId: string | null;
}

const HealthMetricsCharts = ({ open, onOpenChange, selectedPersonId }: HealthMetricsChartsProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data: historicalData, isLoading } = useQuery({
    queryKey: ['health-metrics-history', selectedPersonId, dateRange],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId && open,
  });

  const processChartData = (dataType: string) => {
    if (!historicalData) return [];

    const filtered = historicalData.filter((item: any) => {
      if (item.data_type !== dataType) return false;

      // Special handling for temperature: exclude environmental sensors
      if (dataType === 'temperature') {
        const deviceCategory = item.devices?.device_types?.category;
        const deviceType = item.devices?.device_type;

        const isEnvironmental =
          deviceCategory === 'ENVIRONMENTAL' ||
          deviceCategory === 'Environmental Sensor' ||
          deviceType === 'environmental' ||
          deviceType === 'temp_sensor' ||
          deviceType === 'environmental_sensor';

        // Only include temperature from medical/health devices
        return !isEnvironmental;
      }

      return true;
    });

    return filtered.map((item: any) => {
      let value = item.value;

      // Extract numeric value from different formats
      if (typeof value === 'object' && value !== null) {
        if ('quality' in value && dataType === 'sleep_quality') {
          value = value.quality;
        } else if ('value' in value) {
          value = value.value;
        } else if ('bpm' in value) {
          value = value.bpm;
        } else if ('count' in value) {
          value = value.count;
        } else if ('celsius' in value) {
          value = value.celsius;
        }
      }

      let numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

      // Convert temperature from Celsius to Fahrenheit (if not already in Fahrenheit)
      if (dataType === 'temperature' && !isTemperatureFahrenheit(item.unit)) {
        numericValue = celsiusToFahrenheit(numericValue);
      }

      return {
        timestamp: format(new Date(item.recorded_at), 'MMM dd HH:mm', { locale: dateLocale }),
        value: numericValue,
        fullDate: new Date(item.recorded_at),
      };
    });
  };

  const processBloodPressureData = () => {
    if (!historicalData) return [];

    const filtered = historicalData.filter((item: any) => item.data_type === 'blood_pressure');

    return filtered.map((item: any) => {
      const value = item.value as any;
      return {
        timestamp: format(new Date(item.recorded_at), 'MMM dd HH:mm', { locale: dateLocale }),
        systolic: value?.systolic || value?.value?.systolic || 0,
        diastolic: value?.diastolic || value?.value?.diastolic || 0,
        fullDate: new Date(item.recorded_at),
      };
    });
  };

  const processPanicSosData = () => {
    if (!historicalData) return [];

    const filtered = historicalData.filter((item: any) =>
      item.data_type === 'button_pressed' &&
      item.devices?.device_type === 'emergency_button'
    );

    // Group by date
    const grouped = filtered.reduce((acc: any, item: any) => {
      const date = format(new Date(item.recorded_at), 'MMM dd', { locale: dateLocale });
      if (!acc[date]) {
        acc[date] = { date, total: 0 };
      }
      
      acc[date].total += 1;
      
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const renderChart = (dataType: string, label: string, color: string, unit?: string) => {
    const data = processChartData(dataType);

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t(`healthMetrics.charts.no${dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}Data`, { defaultValue: `No ${label.toLowerCase()} data available for this period` })}
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="timestamp" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: unit, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            name={label}
            dot={{ fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderBloodPressureChart = () => {
    const data = processBloodPressureData();

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t('healthMetrics.charts.noBloodPressureData')}
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="timestamp" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: 'mmHg', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="systolic" 
            stroke="hsl(var(--destructive))" 
            strokeWidth={2}
            name={t('healthMetrics.charts.systolic')}
            dot={{ fill: 'hsl(var(--destructive))' }}
          />
          <Line 
            type="monotone" 
            dataKey="diastolic" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name={t('healthMetrics.charts.diastolic')}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderPanicSosChart = () => {
    const data = processPanicSosData();

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t('healthMetrics.charts.noPanicData')}
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: t('healthMetrics.charts.buttonPresses'), angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Bar dataKey="total" fill="hsl(var(--destructive))" name={t('healthMetrics.charts.buttonPresses')} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t('healthMetrics.charts.historyTitle')}</DialogTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'MMM dd', { locale: dateLocale })} - {format(dateRange.to, 'MMM dd', { locale: dateLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange({
                      from: subDays(new Date(), 1),
                      to: new Date(),
                    })}
                  >
                    {t('healthMetrics.charts.last24Hours')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange({
                      from: subDays(new Date(), 7),
                      to: new Date(),
                    })}
                  >
                    {t('healthMetrics.charts.last7Days')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange({
                      from: subDays(new Date(), 30),
                      to: new Date(),
                    })}
                  >
                    {t('healthMetrics.charts.last30Days')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="heart_rate" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="heart_rate">{t('healthMetrics.charts.heartRate')}</TabsTrigger>
              <TabsTrigger value="blood_pressure">{t('healthMetrics.charts.bloodPressure')}</TabsTrigger>
              <TabsTrigger value="oxygen">{t('healthMetrics.charts.oxygen')}</TabsTrigger>
              <TabsTrigger value="temperature">{t('healthMetrics.charts.temperature')}</TabsTrigger>
              <TabsTrigger value="sleep_quality">{t('healthMetrics.charts.sleep')}</TabsTrigger>
              <TabsTrigger value="panic_sos">{t('healthMetrics.charts.panicSos')}</TabsTrigger>
            </TabsList>

            <TabsContent value="heart_rate" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">{t('healthMetrics.charts.heartRateOverTime')}</h3>
                {renderChart('heart_rate', t('healthMetrics.charts.heartRate'), 'hsl(var(--success))', 'bpm')}
              </Card>
            </TabsContent>

            <TabsContent value="blood_pressure" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">{t('healthMetrics.charts.bloodPressureOverTime')}</h3>
                {renderBloodPressureChart()}
              </Card>
            </TabsContent>

            <TabsContent value="oxygen" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">{t('healthMetrics.charts.oxygenOverTime')}</h3>
                {renderChart('oxygen_saturation', t('healthMetrics.charts.oxygenLevel'), 'hsl(var(--primary))', '%')}
              </Card>
            </TabsContent>

            <TabsContent value="temperature" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">{t('healthMetrics.charts.temperatureOverTime')}</h3>
                {renderChart('temperature', t('healthMetrics.charts.temperature'), 'hsl(var(--warning))', '°F')}
              </Card>
            </TabsContent>

            <TabsContent value="sleep_quality" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">{t('healthMetrics.charts.sleepOverTime')}</h3>
                {renderChart('sleep_quality', t('healthMetrics.charts.sleepQuality'), 'hsl(var(--info))', '%')}
              </Card>
            </TabsContent>

            <TabsContent value="panic_sos" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">{t('healthMetrics.charts.panicSosOverTime')}</h3>
                {renderPanicSosChart()}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HealthMetricsCharts;
