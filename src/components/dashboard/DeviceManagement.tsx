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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({
        title: "Device registered successfully",
        description: "Your IoT device has been added to the system.",
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
