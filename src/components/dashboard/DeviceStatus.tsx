import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Battery, BatteryWarning, Copy, Check, History, Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { useAllDeviceTypes } from '@/hooks/useDeviceTypes';
import { useAllDeviceCompanies } from '@/hooks/useDeviceCompanies';
import { useTranslation } from 'react-i18next';

interface DeviceStatusProps {
  selectedPersonId?: string | null;
}

const DeviceStatus = ({ selectedPersonId }: DeviceStatusProps) => {
  const { t } = useTranslation();
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

  // Fetch all device companies
  const { data: deviceCompanies = [] } = useAllDeviceCompanies();
  
  const { data: devices } = useQuery({
    queryKey: ['devices', selectedPersonId],
    queryFn: async () => {
      // Only fetch if we have a selected person
      if (!selectedPersonId) {
        return [];
      }

      const { data, error } = await supabase
        .from('devices')
        .select('*, elderly_persons(full_name), device_companies(id, name, code)')
        .eq('elderly_person_id', selectedPersonId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch data counts for each device
  const { data: dataCounts = {}, isLoading: isLoadingCounts } = useQuery({
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
        title: t('devices.apiDetails.copied'),
        description: t('devices.apiDetails.copiedToClipboard'),
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
        title: t('devices.edit.updated'),
        description: t('devices.edit.updatedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('devices.edit.updateFailed'),
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
        title: t('devices.delete.deleted'),
        description: t('devices.delete.deletedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('devices.delete.deleteFailed'),
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
        company_id: editDevice.company_id || null,
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
        <h3 className="text-base sm:text-lg font-semibold">{t('devices.status')}</h3>
      </div>

      <div className="mb-4">
        <DeviceManagement selectedPersonId={selectedPersonId} />
      </div>

      {!devices || devices.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {t('devices.noDevices')}
        </p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const dataCount = dataCounts[device.id] || 0;
            const isLoading = isLoadingCounts && dataCounts[device.id] === undefined;
            const hasNoData = !isLoading && dataCount === 0;

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
                    {isLoading ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('devices.connecting', { defaultValue: 'Connecting...' })}</span>
                      </div>
                    ) : hasNoData ? (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {t('devices.notConnected', { defaultValue: "Device isn't connected" })}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex flex-shrink-0">
                        {dataCount} {t('devices.records')}
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons row */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(device.status)} text-xs`}
                    >
                      {t(`devices.${device.status}`, { defaultValue: device.status })}
                    </Badge>
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
                  <span className="truncate">{device.elderly_persons?.full_name || t('devices.unassigned')}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {getBatteryIcon(device.battery_level)}
                    {device.battery_level && <span>{device.battery_level}%</span>}
                  </div>
                </div>

                {/* Show record count or connecting status on mobile */}
                {isLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 sm:hidden">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('devices.connecting', { defaultValue: 'Connecting...' })}</span>
                  </div>
                ) : hasNoData ? (
                  <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                    {t('devices.notConnected', { defaultValue: "Device isn't connected" })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                    {dataCount} {t('devices.records')}
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
            <DialogTitle className="text-base sm:text-lg">{t('devices.apiDetails.title')}</DialogTitle>
            <DialogDescription className="text-sm">
              {t('devices.apiDetails.description')}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
                  <span>{t('devices.apiDetails.apiKey')}</span>
                  <Badge variant="outline" className="text-xs w-fit">
                    {t('devices.apiDetails.saveSecurely')}
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
                  ⚠️ {t('devices.apiDetails.useKeyAuth')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm sm:text-base">{t('devices.apiDetails.apiEndpoint')}</h4>
                <div className="bg-muted p-3 rounded-md overflow-x-auto">
                  <code className="text-xs sm:text-sm break-all">
                    https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-ingest
                  </code>
                </div>
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
                {t('devices.apiDetails.viewHistory')}
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
            <DialogTitle>{t('devices.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('devices.edit.description')}
            </DialogDescription>
          </DialogHeader>

          {editDevice && (
            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-device-name">{t('devices.edit.deviceName')}</Label>
                <Input
                  id="edit-device-name"
                  value={editDevice.device_name}
                  onChange={(e) => setEditDevice({ ...editDevice, device_name: e.target.value })}
                  placeholder={t('devices.register.deviceNamePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-device-type">{t('devices.edit.deviceType')}</Label>
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
                <Label htmlFor="edit-location">{t('devices.edit.location')}</Label>
                <Input
                  id="edit-location"
                  value={editDevice.location || ''}
                  onChange={(e) => setEditDevice({ ...editDevice, location: e.target.value })}
                  placeholder={t('devices.register.locationPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">{t('devices.edit.company')}</Label>
                <Select
                  value={editDevice.company_id || ''}
                  onValueChange={(value) => setEditDevice({ ...editDevice, company_id: value || null })}
                >
                  <SelectTrigger id="edit-company">
                    <SelectValue placeholder={t('devices.edit.selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                        {company.description && ` (${company.description})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDevice(null)}>
                  {t('devices.edit.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={updateDeviceMutation.isPending}>
                  {updateDeviceMutation.isPending ? t('devices.edit.updating') : t('devices.edit.updateDevice')}
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
            <AlertDialogTitle>{t('devices.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('devices.delete.confirmMessage', { name: deleteDevice?.device_name })}
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
              {t('devices.delete.alsoDeleteData')}
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDevice(null);
              setDeleteDeviceData(false);
            }}>
              {t('devices.delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={deleteDeviceMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDeviceMutation.isPending ? t('devices.delete.deleting') : t('devices.delete.deleteDevice')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DeviceStatus;