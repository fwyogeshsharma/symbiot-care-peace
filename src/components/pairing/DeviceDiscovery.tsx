import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wifi, CheckCircle2, XCircle, Clock, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDeviceTypes } from "@/hooks/useDeviceTypes";
import { useDeviceCompanies } from "@/hooks/useDeviceCompanies";

interface DeviceDiscoveryProps {
  elderlyPersonId: string;
  onSuccess: () => void;
}

export const DeviceDiscovery = ({ elderlyPersonId, onSuccess }: DeviceDiscoveryProps) => {
  const { t } = useTranslation();
  const [deviceId, setDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'verified' | 'paired' | 'expired' | 'rejected'>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const { data: deviceTypes = [] } = useDeviceTypes();
  const { data: deviceCompanies = [] } = useDeviceCompanies();

  const getIconComponent = (iconName: string | null): LucideIcon | null => {
    if (!iconName) return null;
    return (Icons as any)[iconName] || null;
  };

  const startPairing = async () => {
    if (!deviceId.trim()) {
      toast.error(t('devices.discovery.pleaseEnterDeviceId'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('device-discovery', {
        method: 'POST',
        body: {
          deviceId: deviceId.trim(),
          deviceType: deviceType || undefined,
          companyId: companyId || undefined,
          elderlyPersonId,
          networkInfo: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      setPairingCode(data.pairingCode);
      setRequestId(data.pairingRequest.id);
      setStatus('pending');
      toast.success(t('devices.discovery.pairingRequestCreated'));
    } catch (error: any) {
      console.error('Error starting pairing:', error);
      toast.error(error.message || t('devices.discovery.failedToStartPairing'));
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!pairingCode) return;

    try {
      const { data, error } = await supabase.functions.invoke('device-discovery', {
        method: 'GET',
        body: null,
      });

      if (error) throw error;
      // Status will be updated via realtime subscription
    } catch (error: any) {
      console.error('Error checking status:', error);
    }
  };

  // Subscribe to realtime updates
  useState(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`pairing:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_pairing_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          setStatus(newStatus);
          
          if (newStatus === 'paired') {
            toast.success(t('devices.discovery.devicePairedSuccessfully'));
            setTimeout(() => {
              onSuccess();
            }, 2000);
          } else if (newStatus === 'rejected') {
            toast.error(t('devices.discovery.pairingRejected'));
          } else if (newStatus === 'expired') {
            toast.error(t('devices.discovery.pairingCodeExpired'));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-8 w-8 text-warning animate-pulse" />;
      case 'verified':
        return <CheckCircle2 className="h-8 w-8 text-success" />;
      case 'paired':
        return <CheckCircle2 className="h-8 w-8 text-success" />;
      case 'rejected':
        return <XCircle className="h-8 w-8 text-destructive" />;
      case 'expired':
        return <XCircle className="h-8 w-8 text-muted-foreground" />;
      default:
        return <Wifi className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return t('devices.discovery.waitingForApproval');
      case 'verified':
        return t('devices.discovery.pairingApproved');
      case 'paired':
        return t('devices.discovery.devicePairedSuccessfully');
      case 'rejected':
        return t('devices.discovery.pairingRejected');
      case 'expired':
        return t('devices.discovery.pairingCodeExpired');
      default:
        return t('devices.discovery.enterDeviceDetails');
    }
  };

  if (pairingCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {t('devices.discovery.pairingInProgress')}
          </CardTitle>
          <CardDescription>{getStatusText()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">{t('devices.discovery.pairingCode')}</Label>
              <div className="text-5xl font-bold tracking-widest mt-2 font-mono">
                {pairingCode}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Badge variant={status === 'pending' ? 'default' : status === 'paired' ? 'secondary' : 'destructive'}>
                {status.toUpperCase()}
              </Badge>
            </div>

            {status === 'pending' && (
              <p className="text-sm text-muted-foreground">
                {t('devices.discovery.shareCodeWithFamily')}
              </p>
            )}

            {(status === 'rejected' || status === 'expired') && (
              <Button onClick={() => {
                setPairingCode(null);
                setStatus('idle');
                setRequestId(null);
              }}>
                {t('devices.discovery.tryAgain')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('devices.discovery.title')}</CardTitle>
        <CardDescription>
          {t('devices.discovery.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceId">{t('devices.discovery.deviceId')}</Label>
          <Input
            id="deviceId"
            placeholder={t('devices.discovery.deviceIdPlaceholder')}
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deviceType">{t('devices.discovery.deviceType')}</Label>
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger>
              <SelectValue placeholder={t('devices.discovery.selectDeviceType')} />
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

        <div className="space-y-2">
          <Label htmlFor="company">{t('devices.discovery.company')}</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder={t('devices.discovery.selectCompany')} />
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

        <Button
          onClick={startPairing}
          disabled={loading || !deviceId.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('devices.discovery.startingPairing')}
            </>
          ) : (
            t('devices.discovery.startPairing')
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
