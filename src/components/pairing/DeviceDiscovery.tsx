import { useState } from "react";
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

interface DeviceDiscoveryProps {
  elderlyPersonId: string;
  onSuccess: () => void;
}

export const DeviceDiscovery = ({ elderlyPersonId, onSuccess }: DeviceDiscoveryProps) => {
  const [deviceId, setDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'verified' | 'paired' | 'expired' | 'rejected'>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const { data: deviceTypes = [] } = useDeviceTypes();

  const getIconComponent = (iconName: string | null): LucideIcon | null => {
    if (!iconName) return null;
    return (Icons as any)[iconName] || null;
  };

  const startPairing = async () => {
    if (!deviceId.trim()) {
      toast.error("Please enter a device ID");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('device-discovery', {
        method: 'POST',
        body: {
          deviceId: deviceId.trim(),
          deviceType: deviceType || undefined,
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
      toast.success("Pairing request created! Share the code with a family member.");
    } catch (error: any) {
      console.error('Error starting pairing:', error);
      toast.error(error.message || "Failed to start pairing");
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
            toast.success("Device paired successfully!");
            setTimeout(() => {
              onSuccess();
            }, 2000);
          } else if (newStatus === 'rejected') {
            toast.error("Pairing request was rejected");
          } else if (newStatus === 'expired') {
            toast.error("Pairing code expired");
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
        return "Waiting for approval...";
      case 'verified':
        return "Pairing approved!";
      case 'paired':
        return "Device paired successfully!";
      case 'rejected':
        return "Pairing rejected";
      case 'expired':
        return "Pairing code expired";
      default:
        return "Enter device details to start pairing";
    }
  };

  if (pairingCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Pairing in Progress
          </CardTitle>
          <CardDescription>{getStatusText()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Pairing Code</Label>
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
                Share this code with a family member to approve the device pairing remotely.
                The code will expire in 15 minutes.
              </p>
            )}

            {(status === 'rejected' || status === 'expired') && (
              <Button onClick={() => {
                setPairingCode(null);
                setStatus('idle');
                setRequestId(null);
              }}>
                Try Again
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
        <CardTitle>Discover New Device</CardTitle>
        <CardDescription>
          Enter device details to start the pairing process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceId">Device ID *</Label>
          <Input
            id="deviceId"
            placeholder="e.g., SENSOR-12345 or MAC address"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deviceType">Device Type (Optional)</Label>
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger>
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

        <Button 
          onClick={startPairing} 
          disabled={loading || !deviceId.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Pairing...
            </>
          ) : (
            "Start Pairing"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
