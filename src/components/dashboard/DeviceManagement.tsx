import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Key, Copy, CheckCircle, Bed, Armchair, Droplet, Scale, Smartphone, LucideIcon, MapPin, AlertTriangle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useDeviceTypes } from '@/hooks/useDeviceTypes';
import { useDeviceTypeDataConfigs } from '@/hooks/useDeviceTypeDataConfigs';
import { useDeviceCompaniesByDeviceType } from '@/hooks/useDeviceCompanies';
import { useDeviceModelsByCompanyAndDeviceType } from '@/hooks/useDeviceModels';
import { generateSampleDataPoints, generateSampleDataFromModelSpecs } from '@/lib/sampleDataGenerator';
import { DeviceDiscovery } from '@/components/pairing/DeviceDiscovery';
import { useTranslation } from 'react-i18next';

interface DeviceManagementProps {
  selectedPersonId?: string | null;
}

const DeviceManagement = ({ selectedPersonId }: DeviceManagementProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [location, setLocation] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [generateFakeData, setGenerateFakeData] = useState(false);
  const [showGeofenceAlert, setShowGeofenceAlert] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch device types from database
  const { data: deviceTypes = [] } = useDeviceTypes();

  // Get the device type ID from the selected device type code
  const selectedDeviceTypeId = useMemo(() => {
    if (!deviceType) return undefined;
    const foundType = deviceTypes.find(t => t.code === deviceType);
    return foundType?.id;
  }, [deviceType, deviceTypes]);

  // Fetch companies that have models for the selected device type
  const { data: deviceCompanies = [] } = useDeviceCompaniesByDeviceType(selectedDeviceTypeId);

  // Fetch device models for selected company and device type
  const { data: deviceModels = [] } = useDeviceModelsByCompanyAndDeviceType(companyId, selectedDeviceTypeId);

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
        title: t('devices.register.success'),
        description: generateFakeData
          ? t('devices.register.successWithData')
          : t('devices.register.successNoData'),
      });
      // Generate API key for display
      generateApiKey();
    },
    onError: (error: any) => {
      // Check for duplicate device_id constraint violation
      const isDuplicateDeviceId = error.message?.includes('devices_elderly_person_device_id_unique') ||
        error.code === '23505'; // PostgreSQL unique violation error code

      toast({
        title: t('devices.register.failed'),
        description: isDuplicateDeviceId
          ? t('devices.register.duplicateDeviceId')
          : error.message,
        variant: "destructive",
      });
    },
  });

  const generateSampleData = async (device: any) => {
    try {
      const now = new Date();
      const sampleData: any[] = [];

      // Fetch geofences for GPS devices
      const { data: geofences } = await supabase
        .from('geofence_places')
        .select('*')
        .eq('elderly_person_id', device.elderly_person_id)
        .eq('is_active', true);

      // Check if device has a model with specifications
      if (device.model_id) {
        const { data: deviceModel } = await supabase
          .from('device_models')
          .select('specifications, supported_data_types')
          .eq('id', device.model_id)
          .single();

        if (deviceModel?.specifications && Object.keys(deviceModel.specifications).length > 0) {
          console.log('Generating data from model specifications:', deviceModel.specifications);
          const modelData = generateSampleDataFromModelSpecs(
            deviceModel.specifications as any,
            deviceModel.supported_data_types || [],
            device,
            168, // 7 days
            2, // every 2 hours
            geofences || []
          );
          sampleData.push(...modelData);
        }
      }

      // If no model data was generated, use the default logic
      if (sampleData.length === 0) {
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
                furniture: defaultFloorPlan.furniture as any,
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
        title: t('devices.dataGeneration.sampleDataFailed'),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceName || !deviceType || !deviceId) {
      toast({
        title: t('devices.register.missingInfo'),
        description: t('devices.register.fillRequired'),
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
        title: t('devices.register.noProfile'),
        description: t('devices.register.createProfileFirst'),
        variant: "destructive",
      });
      return;
    }

    // Check if device type is GPS-related and validate geofences
    const gpsDeviceTypes = ['smart_phone', 'gps', 'gps_tracker', 'worker_wearable', 'phone', 'mobile'];
    const isGPSDevice = gpsDeviceTypes.includes(validation.data.device_type.toLowerCase());

    if (isGPSDevice) {
      // Check for existing geofences
      const { data: geofences, error: geofenceError } = await supabase
        .from('geofence_places')
        .select('id')
        .eq('elderly_person_id', userElderlyPerson.id)
        .eq('is_active', true)
        .limit(1);

      if (geofenceError) {
        console.error('Error checking geofences:', geofenceError);
      }

      if (!geofences || geofences.length === 0) {
        setShowGeofenceAlert(true);
        return;
      }
    }

    addDeviceMutation.mutate({
      device_name: validation.data.device_name,
      device_type: validation.data.device_type,
      device_id: validation.data.device_id,
      elderly_person_id: userElderlyPerson.id,
      location: validation.data.location || null,
      company_id: companyId || null,
      model_id: modelId || null,
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
      setCompanyId('');
      setModelId('');
      setApiKey('');
      setShowApiKey(false);
    }
  }, [open]);

  // Reset company and model when device type changes
  useEffect(() => {
    setCompanyId('');
    setModelId('');
  }, [deviceType]);

  // Reset model when company changes
  useEffect(() => {
    setModelId('');
  }, [companyId]);

  const resetForm = () => {
    setDeviceName('');
    setDeviceType('');
    setDeviceId('');
    setLocation('');
    setCompanyId('');
    setModelId('');
    setApiKey('');
    setShowApiKey(false);
    setGenerateFakeData(false);
    setOpen(false);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: t('devices.register.apiKeyCopied'),
      description: t('devices.register.apiKeyCopiedDesc'),
    });
  };

  const getIconComponent = (iconName: string | null): LucideIcon | null => {
    if (!iconName) return null;
    return (Icons as any)[iconName] || null;
  };

  // Only show register button if viewing own profile or no person is selected
  const isOwnProfile = !selectedPersonId || selectedPersonId === userElderlyPerson?.id;

  // Don't render if viewing another person's profile
  if (!isOwnProfile) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {t('devices.register.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('devices.register.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('devices.register.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">{t('devices.register.manualRegistration')}</TabsTrigger>
            <TabsTrigger value="pair">{t('devices.register.pairDevice')}</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">

        {!showApiKey ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">{t('devices.register.deviceName')} *</Label>
              <Input
                id="device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t('devices.register.deviceNamePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-type">{t('devices.register.deviceType')} *</Label>
              <Select value={deviceType} onValueChange={setDeviceType} required>
                <SelectTrigger id="device-type">
                  <SelectValue placeholder={t('devices.register.selectDeviceType')} />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map((type) => {
                    const IconComponent = getIconComponent(type.icon);
                    const translatedName = t(`devices.types.${type.code}`, { defaultValue: '' }) || type.name;
                    return (
                      <SelectItem key={type.id} value={type.code}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="w-4 h-4" />}
                          <span>{translatedName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {deviceType && deviceCompanies.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="device-company">{t('devices.register.company')}</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger id="device-company">
                    <SelectValue placeholder={t('devices.register.selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <span>{company.name}</span>
                        {company.description && (
                          <span className="text-muted-foreground text-xs ml-2">
                            ({company.description})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {companyId && deviceModels.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="device-model">{t('devices.register.model')}</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger id="device-model">
                    <SelectValue placeholder={t('devices.register.selectModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span>{model.name}</span>
                        {model.model_number && (
                          <span className="text-muted-foreground text-xs ml-2">
                            ({model.model_number})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('devices.register.modelDescription')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="device-id">{t('devices.register.deviceId')} *</Label>
              <Input
                id="device-id"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder={t('devices.register.deviceIdPlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('devices.register.deviceIdDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('devices.register.location')}</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('devices.register.locationPlaceholder')}
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
                {t('devices.register.generateSampleData')}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {t('devices.register.generateSampleDataDesc')}
            </p>

            <Button type="submit" className="w-full" disabled={addDeviceMutation.isPending}>
              {addDeviceMutation.isPending ? t('devices.register.registering') : t('devices.register.registerDevice')}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{t('devices.register.success')}</span>
            </div>

            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-warning">
                  <Key className="w-4 h-4" />
                  <Label className="font-semibold">{t('devices.register.apiKeyTitle')}</Label>
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
                  <p>{t('devices.register.useApiKeyAuth')}</p>
                  <p className="font-semibold text-warning">⚠️ {t('devices.register.apiKeyWarning')}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-2 text-sm">
              <p className="font-medium">{t('devices.register.apiEndpoint')}</p>
              <code className="block p-2 bg-muted rounded text-xs break-all">
                https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-ingest
              </code>
            </div>

            <Button onClick={resetForm} className="w-full">
              {t('devices.register.registerAnother')}
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
                <p>{t('devices.register.noProfileForPairing')}</p>
                <p className="text-sm mt-2">{t('devices.register.setupProfileFirst')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Geofence Requirement Alert */}
      <AlertDialog open={showGeofenceAlert} onOpenChange={setShowGeofenceAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <AlertDialogTitle className="text-xl">{t('devices.geofenceAlert.title')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="text-base">
                {t('devices.geofenceAlert.description')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('devices.geofenceAlert.explanation')}
              </p>
              <div className="bg-muted/50 p-3 rounded-lg mt-3">
                <p className="text-sm font-medium mb-1">{t('devices.geofenceAlert.howToAdd')}</p>
                <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                  <li>{t('devices.geofenceAlert.step1')}</li>
                  <li>{t('devices.geofenceAlert.step2')}</li>
                  <li>{t('devices.geofenceAlert.step3')}</li>
                  <li>{t('devices.geofenceAlert.step4')}</li>
                </ol>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('devices.geofenceAlert.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowGeofenceAlert(false);
                setOpen(false);
                navigate('/tracking');
              }}
              className="gap-2"
            >
              <MapPin className="w-4 h-4" />
              {t('devices.geofenceAlert.goToTracking')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default DeviceManagement;
