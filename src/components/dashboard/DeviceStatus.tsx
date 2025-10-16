import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Battery, BatteryWarning, Copy, Check, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DeviceManagement from './DeviceManagement';
import DeviceHistory from './DeviceHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const DeviceStatus = () => {
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [historyDevice, setHistoryDevice] = useState<any>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const { toast } = useToast();
  
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

  const copyApiKey = () => {
    if (selectedDevice?.api_key) {
      navigator.clipboard.writeText(selectedDevice.api_key);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    }
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
              className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setSelectedDevice(device)}
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

      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Device API Details</DialogTitle>
            <DialogDescription>
              Use these details to send data from your IoT device
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span>API Key</span>
                  <Badge variant="outline" className="text-xs">
                    Save this securely
                  </Badge>
                </h4>
                <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                  <code className="text-sm">{selectedDevice.api_key}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyApiKey}
                  >
                    {copiedApiKey ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Use this key to authenticate your device when sending data
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">API Endpoint</h4>
                <div className="bg-muted p-3 rounded-md">
                  <code className="text-sm break-all">
                    https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-ingest
                  </code>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example Request</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
{`POST /device-ingest
Headers:
  Content-Type: application/json
  Authorization: Bearer ${selectedDevice.api_key}

Body:
{
  "device_id": "${selectedDevice.device_id}",
  "data_type": "heart_rate",
  "value": { "bpm": 72 },
  "unit": "bpm"
}`}
                  </pre>
                </div>
              </div>

              <div className="bg-info/10 border border-info/20 p-3 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Available data types:</strong> heart_rate, blood_pressure, temperature, fall_detected, steps, sleep, activity, location
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setHistoryDevice(selectedDevice);
                  setSelectedDevice(null);
                }}
              >
                <History className="w-4 h-4 mr-2" />
                View Device History
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeviceHistory
        device={historyDevice}
        open={!!historyDevice}
        onOpenChange={(open) => !open && setHistoryDevice(null)}
      />
    </Card>
  );
};

export default DeviceStatus;