import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
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

  // Query to get the earliest data point to determine available data range
  const { data: earliestDataPoint } = useQuery({
    queryKey: ['earliest-health-data', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return null;

      const { data, error } = await supabase
        .from('device_data')
        .select('recorded_at')
        .eq('elderly_person_id', selectedPersonId)
        .in('data_type', ['heart_rate', 'blood_pressure', 'oxygen_saturation', 'temperature', 'sleep_quality'])
        .order('recorded_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? new Date(data[0].recorded_at) : null;
    },
    enabled: !!selectedPersonId && open,
  });

  // Default to showing all available data (or last 6 months if no earliest point)
  const defaultFromDate = earliestDataPoint || subDays(new Date(), 180);

  const [dateRange, setDateRange] = useState({
    from: defaultFromDate,
    to: new Date(),
  });

  // Update dateRange when earliestDataPoint is loaded
  React.useEffect(() => {
    if (earliestDataPoint && open) {
      setDateRange({
        from: earliestDataPoint,
        to: new Date(),
      });
    }
  }, [earliestDataPoint, open]);

  // Calculate if we should use monthly aggregation based on date range
  const daysDifference = Math.floor(
    (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
  );
  const shouldUseMonthlyAggregation = daysDifference > 90; // More than 90 days = monthly view

  const { data: historicalData, isLoading } = useQuery({
    queryKey: ['health-metrics-history', selectedPersonId, dateRange],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      console.log('Fetching health metrics data from', dateRange.from.toISOString(), 'to', dateRange.to.toISOString());

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .in('data_type', [
          'heart_rate',
          'blood_pressure',
          'oxygen_saturation',
          'temperature',
          'sleep_quality',
          'button_pressed'
        ])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error('Error fetching health metrics:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} health metric data points`);
      return data || [];
    },
    enabled: !!selectedPersonId && open,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Note: earliestDataPoint is used for "All Available Data" button

  // Helper function to generate all periods from start to end date
  const generateAllPeriods = () => {
    const periods: { groupKey: string; displayLabel: string; date: Date }[] = [];
    const current = new Date(dateRange.from);
    const end = new Date(dateRange.to);

    if (shouldUseMonthlyAggregation) {
      // Generate all months
      while (current <= end) {
        const groupKey = format(current, 'yyyy-MM');
        const displayLabel = format(current, 'MMM yyyy', { locale: dateLocale });
        periods.push({ groupKey, displayLabel, date: new Date(current) });
        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Generate all days
      while (current <= end) {
        const groupKey = format(current, 'yyyy-MM-dd');
        const displayLabel = format(current, 'dMMM', { locale: dateLocale });
        periods.push({ groupKey, displayLabel, date: new Date(current) });
        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    }

    return periods;
  };

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

    // Determine grouping key format based on date range duration
    const getGroupKey = (date: Date) => {
      if (shouldUseMonthlyAggregation) {
        return format(date, 'yyyy-MM'); // Monthly grouping
      }
      return format(date, 'yyyy-MM-dd'); // Daily grouping
    };

    const getDisplayFormat = (date: Date) => {
      if (shouldUseMonthlyAggregation) {
        return format(date, 'MMM yyyy', { locale: dateLocale }); // "Jan 2025"
      }
      return format(date, 'dMMM', { locale: dateLocale }); // "1 Jan"
    };

    // Group by day or month and calculate average
    const grouped = filtered.reduce((acc: any, item: any) => {
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

      const recordedDate = new Date(item.recorded_at);
      const groupKey = getGroupKey(recordedDate);

      if (!acc[groupKey]) {
        acc[groupKey] = {
          values: [],
          date: recordedDate,
        };
      }

      acc[groupKey].values.push(numericValue);

      return acc;
    }, {});

    // Generate all periods in the date range
    const allPeriods = generateAllPeriods();

    // Map periods to chart data, filling in actual values where they exist
    return allPeriods.map(period => {
      const groupData = grouped[period.groupKey];

      if (groupData && groupData.values.length > 0) {
        const avgValue = groupData.values.reduce((sum: number, val: number) => sum + val, 0) / groupData.values.length;
        return {
          timestamp: period.displayLabel,
          value: Math.round(avgValue * 10) / 10, // Round to 1 decimal
          fullDate: period.date,
          sortKey: period.groupKey,
        };
      } else {
        // No data for this period - return null value
        return {
          timestamp: period.displayLabel,
          value: null,
          fullDate: period.date,
          sortKey: period.groupKey,
        };
      }
    });
  };

  const processBloodPressureData = () => {
    if (!historicalData) return [];

    const filtered = historicalData.filter((item: any) => item.data_type === 'blood_pressure');

    // Determine grouping key format based on date range duration
    const getGroupKey = (date: Date) => {
      if (shouldUseMonthlyAggregation) {
        return format(date, 'yyyy-MM'); // Monthly grouping
      }
      return format(date, 'yyyy-MM-dd'); // Daily grouping
    };

    const getDisplayFormat = (date: Date) => {
      if (shouldUseMonthlyAggregation) {
        return format(date, 'MMM yyyy', { locale: dateLocale }); // "Jan 2025"
      }
      return format(date, 'dMMM', { locale: dateLocale }); // "1 Jan"
    };

    // Group by day or month and calculate average
    const grouped = filtered.reduce((acc: any, item: any) => {
      const value = item.value as any;
      const recordedDate = new Date(item.recorded_at);
      const groupKey = getGroupKey(recordedDate);

      if (!acc[groupKey]) {
        acc[groupKey] = {
          systolicValues: [],
          diastolicValues: [],
          date: recordedDate,
        };
      }

      acc[groupKey].systolicValues.push(value?.systolic || value?.value?.systolic || 0);
      acc[groupKey].diastolicValues.push(value?.diastolic || value?.value?.diastolic || 0);

      return acc;
    }, {});

    // Generate all periods in the date range
    const allPeriods = generateAllPeriods();

    // Map periods to chart data, filling in actual values where they exist
    return allPeriods.map(period => {
      const groupData = grouped[period.groupKey];

      if (groupData && groupData.systolicValues.length > 0) {
        const avgSystolic = groupData.systolicValues.reduce((sum: number, val: number) => sum + val, 0) / groupData.systolicValues.length;
        const avgDiastolic = groupData.diastolicValues.reduce((sum: number, val: number) => sum + val, 0) / groupData.diastolicValues.length;
        return {
          timestamp: period.displayLabel,
          systolic: Math.round(avgSystolic),
          diastolic: Math.round(avgDiastolic),
          fullDate: period.date,
          sortKey: period.groupKey,
        };
      } else {
        // No data for this period - return null values
        return {
          timestamp: period.displayLabel,
          systolic: null,
          diastolic: null,
          fullDate: period.date,
          sortKey: period.groupKey,
        };
      }
    });
  };

  const processPanicSosData = () => {
    if (!historicalData) return [];

    const filtered = historicalData.filter((item: any) =>
      item.data_type === 'button_pressed' &&
      item.devices?.device_type === 'emergency_button'
    );

    // Determine grouping key format based on date range duration
    const getGroupKey = (date: Date) => {
      if (shouldUseMonthlyAggregation) {
        return format(date, 'yyyy-MM'); // Monthly grouping
      }
      return format(date, 'yyyy-MM-dd'); // Daily grouping
    };

    const getDisplayFormat = (date: Date) => {
      if (shouldUseMonthlyAggregation) {
        return format(date, 'MMM yyyy', { locale: dateLocale }); // "Jan 2025"
      }
      return format(date, 'dMMM', { locale: dateLocale }); // "1 Jan"
    };

    // Group by date
    const grouped = filtered.reduce((acc: any, item: any) => {
      const recordedDate = new Date(item.recorded_at);
      const groupKey = getGroupKey(recordedDate);

      if (!acc[groupKey]) {
        acc[groupKey] = { total: 0 };
      }

      acc[groupKey].total += 1;

      return acc;
    }, {});

    // Generate all periods in the date range
    const allPeriods = generateAllPeriods();

    // Map periods to chart data, filling in actual values where they exist
    return allPeriods.map(period => {
      const groupData = grouped[period.groupKey];

      return {
        date: period.displayLabel,
        total: groupData ? groupData.total : 0,
        sortKey: period.groupKey,
      };
    });
  };

  const renderChart = (dataType: string, label: string, color: string, unit?: string) => {
    const data = processChartData(dataType);

    // Check if there's any actual data (non-null values)
    const hasData = data.some(item => item.value !== null);

    if (!hasData) {
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
            fontSize={11}
            angle={-15}
            textAnchor="end"
            height={50}
            interval={data.length > 8 ? Math.floor(data.length / 8) : 0}
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
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderBloodPressureChart = () => {
    const data = processBloodPressureData();

    // Check if there's any actual data (non-null values)
    const hasData = data.some(item => item.systolic !== null || item.diastolic !== null);

    if (!hasData) {
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
            fontSize={11}
            angle={-15}
            textAnchor="end"
            height={50}
            interval={data.length > 8 ? Math.floor(data.length / 8) : 0}
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
            dot={{ fill: 'hsl(var(--destructive))', r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name={t('healthMetrics.charts.diastolic')}
            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderPanicSosChart = () => {
    const data = processPanicSosData();

    // Check if there's any actual data (non-zero values)
    const hasData = data.some(item => item.total > 0);

    if (!hasData) {
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
            fontSize={11}
            angle={-15}
            textAnchor="end"
            height={50}
            interval={data.length > 8 ? Math.floor(data.length / 8) : 0}
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
            <div>
              <DialogTitle>{t('healthMetrics.charts.historyTitle')}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {shouldUseMonthlyAggregation && (
                  <p className="text-sm text-muted-foreground">
                    {t('healthMetrics.charts.monthlyAverages')}
                  </p>
                )}
                {historicalData && historicalData.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    • {historicalData.length.toLocaleString()} {t('healthMetrics.charts.dataPoints', { defaultValue: 'data points' })}
                  </p>
                )}
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'MMM dd yyyy', { locale: dateLocale })} - {format(dateRange.to, 'MMM dd yyyy', { locale: dateLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateRange({
                        from: subDays(new Date(), 1),
                        to: new Date(),
                      });
                    }}
                  >
                    {t('healthMetrics.charts.last24Hours')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateRange({
                        from: subDays(new Date(), 7),
                        to: new Date(),
                      });
                    }}
                  >
                    {t('healthMetrics.charts.last7Days')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateRange({
                        from: subDays(new Date(), 30),
                        to: new Date(),
                      });
                    }}
                  >
                    {t('healthMetrics.charts.last30Days')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateRange({
                        from: earliestDataPoint || subDays(new Date(), 365),
                        to: new Date(),
                      });
                    }}
                  >
                    {t('healthMetrics.charts.allAvailableData')}
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
