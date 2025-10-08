import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Battery, BatteryWarning } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DeviceManagement from './DeviceManagement';

const DeviceStatus = () => {
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*, elderly_persons(full_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-success text-success';
      case 'inactive':
        return 'border-muted text-muted-foreground';
      case 'maintenance':
        return 'border-warning text-warning';
      default:
        return 'border-muted text-muted-foreground';
    }
  };

  const getBatteryIcon = (level: number | null) => {
    if (!level) return <Battery className="w-4 h-4" />;
    if (level < 20) return <BatteryWarning className="w-4 h-4 text-destructive" />;
    return <Battery className="w-4 h-4" />;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Device Status</h3>
      </div>
      
      <div className="mb-4">
        <DeviceManagement />
      </div>
      
      {!devices || devices.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No devices registered yet
        </p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div 
              key={device.id}
              className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {device.status === 'active' ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{device.device_name}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(device.status)} text-xs capitalize`}
                >
                  {device.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{device.elderly_persons?.full_name || 'Unassigned'}</span>
                <div className="flex items-center gap-1">
                  {getBatteryIcon(device.battery_level)}
                  {device.battery_level && <span>{device.battery_level}%</span>}
                </div>
              </div>
              
              {device.location && (
                <p className="text-xs text-muted-foreground mt-1">📍 {device.location}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default DeviceStatus;