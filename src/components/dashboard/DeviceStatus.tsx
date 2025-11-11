import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Battery, BatteryWarning, Copy, Check, History, Pencil, Trash2, Wand2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { generateSampleDataPoints } from '@/lib/sampleDataGenerator';
import { useAllDeviceTypes } from '@/hooks/useDeviceTypes';

interface DeviceStatusProps {
  selectedPersonId?: string | null;
}

const DeviceStatus = ({ selectedPersonId }: DeviceStatusProps) => {
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [historyDevice, setHistoryDevice] = useState<any>(null);
  const [editDevice, setEditDevice] = useState<any>(null);
  const [deleteDevice, setDeleteDevice] = useState<any>(null);
  const [deleteDeviceData, setDeleteDeviceData] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch all device types for the edit dialog
  const { data: allDeviceTypes = [] } = useAllDeviceTypes();
  
  const { data: devices } = useQuery({
    queryKey: ['devices', selectedPersonId],
    queryFn: async () => {
      // Only fetch if we have a selected person
      if (!selectedPersonId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('devices')
        .select('*, elderly_persons(full_name)')
        .eq('elderly_person_id', selectedPersonId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch data counts for each device
  const { data: dataCounts = {} } = useQuery({
    queryKey: ['device-data-counts', selectedPersonId],
    queryFn: async () => {
      if (!devices || devices.length === 0) return {};
      
      const counts: Record<string, number> = {};
      
      for (const device of devices) {
        const { count, error } = await supabase
          .from('device_data')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', device.id);
        
        if (!error) {
          counts[device.id] = count || 0;
        }
      }
      
      return counts;
    },
    enabled: !!devices && devices.length > 0,
    refetchInterval: 15000,
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
              furniture: defaultFloorPlan.furniture as any,
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
      
      // Use database-driven data configs for other device types
      const { data: deviceTypeDataConfigs } = await supabase
        .from('device_type_data_configs')
        .select(`
          *,
          device_types!inner(code)
        `)
        .eq('device_types.code', device.device_type);

      // Fetch geofences for GPS devices
      const { data: geofences } = await supabase
        .from('geofence_places')
        .select('*')
        .eq('elderly_person_id', device.elderly_person_id)
        .eq('is_active', true);

      if (deviceTypeDataConfigs && deviceTypeDataConfigs.length > 0) {
        const generatedData = generateSampleDataPoints(
          deviceTypeDataConfigs as any,
          device,
          168, // 7 days
          2, // every 2 hours
          geofences || []
        );
        sampleData.push(...generatedData);
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
    <Card className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Device Status</h3>
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
          {devices.map((device) => {
            const dataCount = dataCounts[device.id] || 0;
            const hasNoData = dataCount === 0;

            return (
              <div
                key={device.id}
                className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                {/* Mobile: Stack layout / Desktop: Row layout */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                    onClick={() => setSelectedDevice(device)}
                  >
                    {device.status === 'active' ? (
                      <Wifi className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{device.device_name}</span>
                    {hasNoData ? (
                      <Badge variant="outline" className="text-xs border-warning text-warning flex-shrink-0">
                        No Data
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex flex-shrink-0">
                        {dataCount} records
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons row */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(device.status)} text-xs capitalize`}
                    >
                      {device.status}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={hasNoData ? "default" : "ghost"}
                            size="sm"
                            className="h-7 px-2 sm:px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateDataMutation.mutate(device);
                            }}
                            disabled={generateDataMutation.isPending}
                          >
                            {generateDataMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Wand2 className="w-3.5 h-3.5" />
                                {hasNoData && <span className="ml-1 hidden sm:inline">Generate Data</span>}
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate 7 days of sample data for testing</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                  <span className="truncate">{device.elderly_persons?.full_name || 'Unassigned'}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {getBatteryIcon(device.battery_level)}
                    {device.battery_level && <span>{device.battery_level}%</span>}
                  </div>
                </div>

                {/* Show record count on mobile */}
                {!hasNoData && (
                  <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                    {dataCount} records
                  </div>
                )}

                {device.location && (
                  <p
                    className="text-xs text-muted-foreground mt-1 cursor-pointer truncate"
                    onClick={() => setSelectedDevice(device)}
                  >
                    📍 {device.location}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Device API Details</DialogTitle>
            <DialogDescription className="text-sm">
              Use these details to send data from your IoT device
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
                  <span>API Key</span>
                  <Badge variant="outline" className="text-xs w-fit">
                    Save this securely
                  </Badge>
                </h4>
                <div className="bg-muted p-3 rounded-md flex items-center justify-between gap-2">
                  <code className="text-xs sm:text-sm break-all">{selectedDevice.api_key}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyApiKey}
                    className="flex-shrink-0"
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
                <h4 className="font-semibold mb-2 text-sm sm:text-base">API Endpoint</h4>
                <div className="bg-muted p-3 rounded-md overflow-x-auto">
                  <code className="text-xs sm:text-sm break-all">
                    https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-ingest
                  </code>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Example Request</h4>
                <div className="bg-muted p-3 rounded-md overflow-x-auto">
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
                    {allDeviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.code}>
                        {type.icon && `${type.icon} `}
                        {type.name}
                        {type.description && ` (${type.description})`}
                      </SelectItem>
                    ))}
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