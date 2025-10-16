import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface DeviceHistoryProps {
  device: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeviceHistory = ({ device, open, onOpenChange }: DeviceHistoryProps) => {
  const { data: deviceData, isLoading } = useQuery({
    queryKey: ['device-history', device?.id],
    queryFn: async () => {
      if (!device?.id) return [];
      
      const { data, error } = await supabase
        .from('device_data')
        .select('*')
        .eq('device_id', device.id)
        .order('recorded_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!device?.id && open,
  });

  const formatValue = (value: any, dataType: string) => {
    if (typeof value === 'object') {
      if (dataType === 'heart_rate') return `${Number(value.bpm).toFixed(2)} bpm`;
      if (dataType === 'blood_pressure') return `${Number(value.systolic).toFixed(2)}/${Number(value.diastolic).toFixed(2)} mmHg`;
      if (dataType === 'temperature') return `${Number(value.temp).toFixed(2)} °C`;
      if (dataType === 'steps') return `${value.count} steps`;
      if (dataType === 'activity') return `${Number(value.level).toFixed(2)}% activity`;
      if (dataType === 'door_status') return value.open ? 'Open' : 'Closed';
      if (dataType === 'fall_detected') return value.detected ? 'Fall Detected!' : 'No Fall';
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getDataTypeColor = (dataType: string) => {
    const colors: Record<string, string> = {
      heart_rate: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      blood_pressure: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      temperature: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      steps: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      activity: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      door_status: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      fall_detected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[dataType] || 'bg-muted text-muted-foreground';
  };

  // Group data by date
  const groupedData = deviceData?.reduce((acc: Record<string, any[]>, item) => {
    const date = format(new Date(item.recorded_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {}) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Device History - {device?.device_name}
          </DialogTitle>
          <DialogDescription>
            Historical data readings from this device
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading history...</div>
        ) : !deviceData || deviceData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No data recorded yet</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedData).map(([date, readings]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h4>
                  <Badge variant="outline" className="ml-auto">
                    {readings.length} readings
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {readings.map((reading) => (
                    <Card key={reading.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={getDataTypeColor(reading.data_type)}>
                            {reading.data_type.replace('_', ' ')}
                          </Badge>
                          <span className="font-medium">
                            {formatValue(reading.value, reading.data_type)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reading.recorded_at), 'h:mm a')}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeviceHistory;
