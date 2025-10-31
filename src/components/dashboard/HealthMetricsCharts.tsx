import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HealthMetricsChartsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPersonId: string | null;
}

const HealthMetricsCharts = ({ open, onOpenChange, selectedPersonId }: HealthMetricsChartsProps) => {
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

    const filtered = historicalData.filter((item: any) => item.data_type === dataType);
    
    return filtered.map((item: any) => {
      let value = item.value;
      
      // Extract numeric value from different formats
      if (typeof value === 'object' && value !== null) {
        if ('value' in value) {
          value = value.value;
        } else if ('bpm' in value) {
          value = value.bpm;
        } else if ('count' in value) {
          value = value.count;
        }
      }

      return {
        timestamp: format(new Date(item.recorded_at), 'MMM dd HH:mm'),
        value: typeof value === 'number' ? value : parseFloat(value) || 0,
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
        timestamp: format(new Date(item.recorded_at), 'MMM dd HH:mm'),
        systolic: value?.systolic || value?.value?.systolic || 0,
        diastolic: value?.diastolic || value?.value?.diastolic || 0,
        fullDate: new Date(item.recorded_at),
      };
    });
  };

  const renderChart = (dataType: string, label: string, color: string, unit?: string) => {
    const data = processChartData(dataType);

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No {label.toLowerCase()} data available for this period
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
          No blood pressure data available for this period
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
            name="Systolic"
            dot={{ fill: 'hsl(var(--destructive))' }}
          />
          <Line 
            type="monotone" 
            dataKey="diastolic" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Diastolic"
            dot={{ fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Health Metrics History</DialogTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
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
                    Last 24 Hours
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
                    Last 7 Days
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
                    Last 30 Days
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
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="heart_rate">Heart Rate</TabsTrigger>
              <TabsTrigger value="blood_pressure">Blood Pressure</TabsTrigger>
              <TabsTrigger value="oxygen">Oxygen</TabsTrigger>
              <TabsTrigger value="temperature">Temperature</TabsTrigger>
            </TabsList>

            <TabsContent value="heart_rate" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Heart Rate Over Time</h3>
                {renderChart('heart_rate', 'Heart Rate', 'hsl(var(--success))', 'bpm')}
              </Card>
            </TabsContent>

            <TabsContent value="blood_pressure" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Blood Pressure Over Time</h3>
                {renderBloodPressureChart()}
              </Card>
            </TabsContent>

            <TabsContent value="oxygen" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Oxygen Saturation Over Time</h3>
                {renderChart('oxygen_saturation', 'Oxygen Level', 'hsl(var(--primary))', '%')}
              </Card>
            </TabsContent>

            <TabsContent value="temperature" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Body Temperature Over Time</h3>
                {renderChart('temperature', 'Temperature', 'hsl(var(--warning))', '°C')}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HealthMetricsCharts;
