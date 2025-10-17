import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Key, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const DeviceManagement = () => {
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [location, setLocation] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      // Generate sample data for the new device
      await generateSampleData(device);
      
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-data'] });
      toast({
        title: "Device registered successfully",
        description: "Your IoT device has been added with sample data.",
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
    const now = new Date();
    const sampleData = [];
    
    // Generate data based on device type with comprehensive readings
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

    // Generate historical data (past 7 days, one reading every 2 hours = 84 data points)
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

    // Insert sample data
    const { error } = await supabase
      .from('device_data')
      .insert(sampleData);
    
    if (error) {
      console.error('Error generating sample data:', error);
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

    if (!userElderlyPerson?.id) {
      toast({
        title: "No profile found",
        description: "Please create an elderly person profile first",
        variant: "destructive",
      });
      return;
    }

    addDeviceMutation.mutate({
      device_name: deviceName,
      device_type: deviceType,
      device_id: deviceId,
      elderly_person_id: userElderlyPerson.id,
      location: location || null,
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
    setOpen(false);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "API Key copied",
      description: "API key has been copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Register New Device
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register IoT Device</DialogTitle>
          <DialogDescription>
            Add a new IoT device to monitor an elderly person. You'll receive an API key for device authentication.
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
};

export default DeviceManagement;
