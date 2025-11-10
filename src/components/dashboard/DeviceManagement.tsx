import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Key, Copy, CheckCircle, Bed, Armchair, Droplet, Scale, Smartphone, LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { useDeviceTypes } from '@/hooks/useDeviceTypes';
import { useDeviceTypeDataConfigs } from '@/hooks/useDeviceTypeDataConfigs';
import { generateSampleDataPoints } from '@/lib/sampleDataGenerator';
import { DeviceDiscovery } from '@/components/pairing/DeviceDiscovery';

const DeviceManagement = () => {
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [location, setLocation] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [generateFakeData, setGenerateFakeData] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch device types from database
  const { data: deviceTypes = [] } = useDeviceTypes();
  
  // Fetch data configs for selected device type
  const { data: dataConfigs = [] } = useDeviceTypeDataConfigs(deviceType);

  // Fetch logged-in user's elderly person record
  const { data: userElderlyPerson } = useQuery({
    queryKey: ['user-elderly-person', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('id, full_name')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation to add device
  const addDeviceMutation = useMutation({
    mutationFn: async (deviceData: any) => {
      const { data, error } = await supabase
        .from('devices')
        .insert(deviceData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (device) => {
      // Generate sample data only if checkbox is checked
      if (generateFakeData) {
        await generateSampleData(device);
      }
      
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-data'] });
      queryClient.invalidateQueries({ queryKey: ['floor-plan'] });
      queryClient.invalidateQueries({ queryKey: ['position-data'] });
      toast({
        title: "Device registered successfully",
        description: generateFakeData 
          ? "Your IoT device has been added with sample data."
          : "Your IoT device has been added.",
      });
      // Generate API key for display
      generateApiKey();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to register device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateSampleData = async (device: any) => {
    try {
      const now = new Date();
      const sampleData = [];
      
      // Special handling for worker-wearable devices
      if (device.device_type === 'worker_wearable') {
      // Import position utilities
      const { getDefaultFloorPlan, generateIndoorMovementPath } = await import('@/lib/positionUtils');
      
      // Create floor plan if it doesn't exist
      const { data: existingFloorPlan } = await supabase
        .from('floor_plans')
        .select('id')
        .eq('elderly_person_id', device.elderly_person_id)
        .maybeSingle();
      
      let floorPlanId = existingFloorPlan?.id;
      
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
        
        floorPlanId = newFloorPlan?.id;
      }
      
      // Fetch the floor plan to generate movement
      const { data: floorPlan } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', floorPlanId)
        .single();
      
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
      
      if (error) {
        console.error('Error generating sample data:', error);
        throw error;
      }
      
      console.log(`Generated ${sampleData.length} sample data points for device ${device.device_name}`);
    }
    } catch (error) {
      console.error('Error in generateSampleData:', error);
      toast({
        title: "Sample data generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateApiKey = () => {
    // Generate a simple API key (in production, this should be more secure)
    const key = `symbiot_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
    setShowApiKey(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceName || !deviceType || !deviceId) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate input using zod schema
    const deviceSchema = z.object({
      device_name: z.string().trim().min(1, 'Device name is required').max(100, 'Device name must be less than 100 characters'),
      device_type: z.string().min(1, 'Device type is required'),
      device_id: z.string().trim().min(1, 'Device ID is required').max(50, 'Device ID must be less than 50 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Device ID can only contain letters, numbers, hyphens, and underscores'),
      location: z.string().trim().max(100, 'Location must be less than 100 characters').optional()
    });

    const validation = deviceSchema.safeParse({
      device_name: deviceName,
      device_type: deviceType,
      device_id: deviceId,
      location: location || undefined
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!userElderlyPerson?.id) {
      toast({
        title: "No profile found",
        description: "Please create an elderly person profile first",
        variant: "destructive",
      });
      return;
    }

    addDeviceMutation.mutate({
      device_name: validation.data.device_name,
      device_type: validation.data.device_type,
      device_id: validation.data.device_id,
      elderly_person_id: userElderlyPerson.id,
      location: validation.data.location || null,
      status: 'active',
    });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) {
      setDeviceName('');
      setDeviceType('');
      setDeviceId('');
      setLocation('');
      setApiKey('');
      setShowApiKey(false);
    }
  }, [open]);

  const resetForm = () => {
    setDeviceName('');
    setDeviceType('');
    setDeviceId('');
    setLocation('');
    setApiKey('');
    setShowApiKey(false);
    setGenerateFakeData(false);
    setOpen(false);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "API Key copied",
      description: "API key has been copied to clipboard",
    });
  };

  const getIconComponent = (iconName: string | null): LucideIcon | null => {
    if (!iconName) return null;
    return (Icons as any)[iconName] || null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Register New Device
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add IoT Device</DialogTitle>
          <DialogDescription>
            Register a device manually or use the pairing flow for collaborative setup.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Registration</TabsTrigger>
            <TabsTrigger value="pair">Pair Device</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">

        {!showApiKey ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name *</Label>
              <Input
                id="device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., Living Room Monitor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-type">Device Type *</Label>
              <Select value={deviceType} onValueChange={setDeviceType} required>
                <SelectTrigger id="device-type">
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map((type) => {
                    const IconComponent = getIconComponent(type.icon);
                    return (
                      <SelectItem key={type.id} value={type.code}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="w-4 h-4" />}
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-id">Device ID *</Label>
              <Input
                id="device-id"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g., DEV-12345"
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier from your IoT device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bedroom, Living Room"
              />
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="generate-fake-data"
                checked={generateFakeData}
                onCheckedChange={(checked) => setGenerateFakeData(checked === true)}
              />
              <Label
                htmlFor="generate-fake-data"
                className="text-sm font-normal cursor-pointer"
              >
                Generate sample data for testing
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Automatically create 7 days of fake data to test dashboards
            </p>

            <Button type="submit" className="w-full" disabled={addDeviceMutation.isPending}>
              {addDeviceMutation.isPending ? 'Registering...' : 'Register Device'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Device registered successfully!</span>
            </div>

            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-warning">
                  <Key className="w-4 h-4" />
                  <Label className="font-semibold">API Key (Save this securely)</Label>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button size="icon" variant="outline" onClick={copyApiKey}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Use this API key to authenticate your device when sending data.</p>
                  <p className="font-semibold text-warning">⚠️ This key will only be shown once. Save it now!</p>
                </div>
              </div>
            </Card>

            <div className="space-y-2 text-sm">
              <p className="font-medium">API Endpoint:</p>
              <code className="block p-2 bg-muted rounded text-xs break-all">
                https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-ingest
              </code>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Example Request:</p>
              <pre className="p-2 bg-muted rounded text-xs overflow-x-auto">
{`POST /device-ingest
Headers:
  Content-Type: application/json
  Authorization: Bearer ${apiKey}

Body:
{
  "device_id": "${deviceId}",
  "data_type": "heart_rate",
  "value": { "bpm": 72 },
  "unit": "bpm"
}`}
              </pre>
            </div>

            <Button onClick={resetForm} className="w-full">
              Register Another Device
            </Button>
          </div>
        )}
          </TabsContent>

          <TabsContent value="pair" className="space-y-4 mt-4">
            {userElderlyPerson ? (
              <DeviceDiscovery 
                elderlyPersonId={userElderlyPerson.id} 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['devices'] });
                  setOpen(false);
                }}
              />
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                <p>No elderly person profile found.</p>
                <p className="text-sm mt-2">Please set up a profile first to pair devices.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceManagement;
