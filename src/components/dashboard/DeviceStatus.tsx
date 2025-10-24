import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Battery, BatteryWarning, Copy, Check, History, Pencil, Trash2, Wand2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DeviceManagement from './DeviceManagement';
import DeviceHistory from './DeviceHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const DeviceStatus = () => {
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [historyDevice, setHistoryDevice] = useState<any>(null);
  const [editDevice, setEditDevice] = useState<any>(null);
  const [deleteDevice, setDeleteDevice] = useState<any>(null);
  const [deleteDeviceData, setDeleteDeviceData] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('devices')
        .update(data.updates)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setEditDevice(null);
      toast({
        title: "Device updated",
        description: "Device information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate fake data mutation
  const generateDataMutation = useMutation({
    mutationFn: async (device: any) => {
      const now = new Date();
      const sampleData = [];
      
      // Special handling for worker-wearable devices with position data
      if (device.device_type === 'worker_wearable') {
        const { getDefaultFloorPlan, generateIndoorMovementPath } = await import('@/lib/positionUtils');
        
        // Check if floor plan exists
        const { data: existingFloorPlan } = await supabase
          .from('floor_plans')
          .select('*')
          .eq('elderly_person_id', device.elderly_person_id)
          .maybeSingle();
        
        let floorPlan = existingFloorPlan;
        
        // Create floor plan if it doesn't exist
        if (!existingFloorPlan) {
          const defaultFloorPlan = getDefaultFloorPlan(device.elderly_person_id);
          const { data: newFloorPlan } = await supabase
            .from('floor_plans')
            .insert([{
              ...defaultFloorPlan,
              zones: defaultFloorPlan.zones as any
            }])
            .select('*')
            .single();
          
          floorPlan = newFloorPlan;
        }
        
        if (floorPlan) {
          // Generate 24 hours of indoor movement data
          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const positions = generateIndoorMovementPath(
            floorPlan.zones as any,
            { width: floorPlan.width, height: floorPlan.height },
            startTime,
            24,
            30 // position every 30 seconds
          );
          
          // Create position data records
          positions.forEach((position, index) => {
            const recordedAt = new Date(startTime.getTime() + index * 30 * 1000);
            sampleData.push({
              device_id: device.id,
              elderly_person_id: device.elderly_person_id,
              data_type: 'position',
              value: position,
              unit: 'meters',
              recorded_at: recordedAt.toISOString(),
            });
          });
        }
      } else {
      
      // Generate data based on device type
      const dataTypes: Record<string, any> = {
        wearable: [
          { type: 'heart_rate', getValue: () => ({ bpm: 65 + Math.random() * 30 }), unit: 'bpm' },
          { type: 'steps', getValue: () => ({ count: Math.floor(Math.random() * 5000) }), unit: 'steps' },
          { type: 'activity', getValue: () => ({ level: Math.floor(Math.random() * 100) }), unit: '%' },
        ],
        medical: [
          { type: 'heart_rate', getValue: () => ({ bpm: 65 + Math.random() * 30 }), unit: 'bpm' },
          { type: 'blood_pressure', getValue: () => ({ systolic: 110 + Math.random() * 40, diastolic: 70 + Math.random() * 20 }), unit: 'mmHg' },
          { type: 'temperature', getValue: () => ({ temp: 36 + Math.random() * 2 }), unit: '°C' },
          { type: 'oxygen_saturation', getValue: () => ({ spo2: 95 + Math.random() * 5 }), unit: '%' },
        ],
        door_sensor: [
          { type: 'door_status', getValue: () => ({ status: Math.random() > 0.5 ? 'opened' : 'closed' }), unit: 'status' },
          { type: 'movement_detected', getValue: () => ({ detected: Math.random() > 0.7 }), unit: 'boolean' },
        ],
        bed_sensor: [
          { type: 'bed_occupancy', getValue: () => ({ status: Math.random() > 0.3 ? 'occupied' : 'vacant' }), unit: 'status' },
          { type: 'movement', getValue: () => ({ level: Math.floor(Math.random() * 100) }), unit: '%' },
          { type: 'duration', getValue: () => ({ minutes: Math.floor(Math.random() * 480) }), unit: 'minutes' },
        ],
        seat_sensor: [
          { type: 'seat_occupancy', getValue: () => ({ status: Math.random() > 0.5 ? 'occupied' : 'vacant' }), unit: 'status' },
          { type: 'duration', getValue: () => ({ minutes: Math.floor(Math.random() * 240) }), unit: 'minutes' },
        ],
        room_sensor: [
          { type: 'presence', getValue: () => ({ detected: Math.random() > 0.4 }), unit: 'boolean' },
          { type: 'movement', getValue: () => ({ level: Math.floor(Math.random() * 100) }), unit: '%' },
          { type: 'duration', getValue: () => ({ minutes: Math.floor(Math.random() * 360) }), unit: 'minutes' },
        ],
        scale_sensor: [
          { type: 'weight', getValue: () => ({ kg: 60 + Math.random() * 40 }), unit: 'kg' },
          { type: 'bmi', getValue: () => ({ value: 20 + Math.random() * 10 }), unit: 'kg/m²' },
        ],
        ambient_sensor: [
          { type: 'temperature', getValue: () => ({ temp: 18 + Math.random() * 10 }), unit: '°C' },
          { type: 'humidity', getValue: () => ({ value: 30 + Math.random() * 40 }), unit: '%' },
          { type: 'light', getValue: () => ({ lux: Math.floor(Math.random() * 1000) }), unit: 'lux' },
        ],
        electronics_monitor: [
          { type: 'power_status', getValue: () => ({ status: Math.random() > 0.3 ? 'on' : 'off' }), unit: 'status' },
          { type: 'usage', getValue: () => ({ hours: Math.floor(Math.random() * 12) }), unit: 'hours' },
        ],
        motion_sensor: [
          { type: 'motion_detected', getValue: () => ({ detected: Math.random() > 0.6 }), unit: 'boolean' },
          { type: 'activity', getValue: () => ({ level: Math.floor(Math.random() * 100) }), unit: '%' },
        ],
        fall_detector: [
          { type: 'fall_detected', getValue: () => ({ detected: false }), unit: 'boolean' },
          { type: 'activity', getValue: () => ({ level: Math.floor(Math.random() * 100) }), unit: '%' },
          { type: 'orientation', getValue: () => ({ angle: Math.floor(Math.random() * 360) }), unit: 'degrees' },
        ],
        temperature_sensor: [
          { type: 'temperature', getValue: () => ({ temp: 18 + Math.random() * 10 }), unit: '°C' },
          { type: 'alert_threshold', getValue: () => ({ exceeded: false }), unit: 'boolean' },
        ],
      };

      const deviceTypeData = dataTypes[device.device_type] || dataTypes.medical;

      // Generate historical data (past 7 days, one reading every 2 hours)
      const hoursBack = 168; // 7 days
      const intervalHours = 2;
      for (let i = hoursBack; i >= 0; i -= intervalHours) {
        const recordedAt = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        for (const dataType of deviceTypeData) {
          sampleData.push({
            device_id: device.id,
            elderly_person_id: device.elderly_person_id,
            data_type: dataType.type,
            value: dataType.getValue(),
            unit: dataType.unit,
            recorded_at: recordedAt.toISOString(),
          });
        }
      }
      }

      // Insert sample data
      if (sampleData.length > 0) {
        const { error } = await supabase
          .from('device_data')
          .insert(sampleData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-data'] });
      queryClient.invalidateQueries({ queryKey: ['movement-data'] });
      queryClient.invalidateQueries({ queryKey: ['floor-plan'] });
      queryClient.invalidateQueries({ queryKey: ['position-data'] });
      toast({
        title: "Data generated",
        description: "Sample data has been generated successfully for the device.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (data: { id: string; deleteData: boolean }) => {
      // Delete device data if requested
      if (data.deleteData) {
        const { error: dataError } = await supabase
          .from('device_data')
          .delete()
          .eq('device_id', data.id);
        
        if (dataError) throw dataError;
      }
      
      // Delete device
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-data'] });
      setDeleteDevice(null);
      setDeleteDeviceData(false);
      toast({
        title: "Device deleted",
        description: "Device has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDevice) return;

    updateDeviceMutation.mutate({
      id: editDevice.id,
      updates: {
        device_name: editDevice.device_name,
        device_type: editDevice.device_type,
        location: editDevice.location,
      },
    });
  };

  const handleDeleteDevice = () => {
    if (!deleteDevice) return;
    deleteDeviceMutation.mutate({
      id: deleteDevice.id,
      deleteData: deleteDeviceData,
    });
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
                <div 
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={() => setSelectedDevice(device)}
                >
                  {device.status === 'active' ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{device.device_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(device.status)} text-xs capitalize`}
                  >
                    {device.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateDataMutation.mutate(device);
                    }}
                    disabled={generateDataMutation.isPending}
                    title="Generate fake data"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDevice(device);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDevice(device);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              
              <div 
                className="flex items-center justify-between text-xs text-muted-foreground cursor-pointer"
                onClick={() => setSelectedDevice(device)}
              >
                <span>{device.elderly_persons?.full_name || 'Unassigned'}</span>
                <div className="flex items-center gap-1">
                  {getBatteryIcon(device.battery_level)}
                  {device.battery_level && <span>{device.battery_level}%</span>}
                </div>
              </div>
              
              {device.location && (
                <p 
                  className="text-xs text-muted-foreground mt-1 cursor-pointer"
                  onClick={() => setSelectedDevice(device)}
                >
                  📍 {device.location}
                </p>
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

      {/* Edit Device Dialog */}
      <Dialog open={!!editDevice} onOpenChange={() => setEditDevice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device information
            </DialogDescription>
          </DialogHeader>

          {editDevice && (
            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-device-name">Device Name</Label>
                <Input
                  id="edit-device-name"
                  value={editDevice.device_name}
                  onChange={(e) => setEditDevice({ ...editDevice, device_name: e.target.value })}
                  placeholder="e.g., Living Room Monitor"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-device-type">Device Type</Label>
                <Select 
                  value={editDevice.device_type} 
                  onValueChange={(value) => setEditDevice({ ...editDevice, device_type: value })}
                >
                  <SelectTrigger id="edit-device-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wearable">Wearable (Smart Watch, Activity Tracker)</SelectItem>
                    <SelectItem value="medical">Medical Device (Heart Rate, Blood Pressure, Glucose Monitor)</SelectItem>
                    <SelectItem value="door_sensor">Door Sensor</SelectItem>
                    <SelectItem value="bed_sensor">Bed Sensor</SelectItem>
                    <SelectItem value="seat_sensor">Seat Sensor</SelectItem>
                    <SelectItem value="room_sensor">Room/Presence Sensor</SelectItem>
                    <SelectItem value="scale_sensor">Scale/Weight Sensor</SelectItem>
                    <SelectItem value="ambient_sensor">Ambient Environment Sensor</SelectItem>
                    <SelectItem value="electronics_monitor">Electronics Monitor</SelectItem>
                    <SelectItem value="motion_sensor">Motion Sensor</SelectItem>
                    <SelectItem value="fall_detector">Fall Detector</SelectItem>
                    <SelectItem value="temperature_sensor">Temperature Sensor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editDevice.location || ''}
                  onChange={(e) => setEditDevice({ ...editDevice, location: e.target.value })}
                  placeholder="e.g., Bedroom, Living Room"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDevice(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={updateDeviceMutation.isPending}>
                  {updateDeviceMutation.isPending ? 'Updating...' : 'Update Device'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Device Dialog */}
      <AlertDialog open={!!deleteDevice} onOpenChange={() => setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDevice?.device_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="delete-data"
              checked={deleteDeviceData}
              onCheckedChange={(checked) => setDeleteDeviceData(checked === true)}
            />
            <Label
              htmlFor="delete-data"
              className="text-sm font-normal cursor-pointer"
            >
              Also delete all device data (health records, sensor readings, etc.)
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDevice(null);
              setDeleteDeviceData(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={deleteDeviceMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDeviceMutation.isPending ? 'Deleting...' : 'Delete Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DeviceStatus;