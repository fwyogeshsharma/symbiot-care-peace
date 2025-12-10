import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface PairingRequest {
  id: string;
  device_id: string;
  device_type: string | null;
  pairing_code: string;
  status: string;
  elderly_person_id: string;
  device_metadata: any;
  network_info: any;
  created_at: string;
  expires_at: string;
  elderly_persons: {
    full_name: string;
  };
}

interface PairingApprovalPanelProps {
  selectedPersonId?: string | null;
}

export const PairingApprovalPanel = ({ selectedPersonId }: PairingApprovalPanelProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PairingRequest | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: pendingRequests, refetch } = useQuery({
    queryKey: ['pending-pairing-requests', selectedPersonId],
    queryFn: async () => {
      let query = supabase
        .from('device_pairing_requests')
        .select('*, elderly_persons(full_name)')
        .eq('status', 'pending');

      // Filter by selected person if provided
      if (selectedPersonId) {
        query = query.eq('elderly_person_id', selectedPersonId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as PairingRequest[];
    },
    refetchInterval: 10000, // Poll every 10 seconds
    enabled: !!selectedPersonId, // Only fetch when a person is selected
  });

  // Subscribe to new pairing requests
  useEffect(() => {
    const channel = supabase
      .channel('pairing-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_pairing_requests',
        },
        (payload) => {
          toast.info(t('devices.pairing.newRequestReceived'));
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_pairing_requests',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      // Optimistically update the UI by removing the approved request
      const requestIdToRemove = selectedRequest.id;

      // Call the verify endpoint with pairing code in the URL path
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-discovery/verify/${selectedRequest.pairing_code}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            approve: true,
            deviceName: deviceName || undefined,
            location: location || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve pairing');
      }

      toast.success(t('devices.pairing.pairedSuccessfully'));

      // Optimistically update the cache to remove the approved request immediately
      queryClient.setQueryData(
        ['pending-pairing-requests', selectedPersonId],
        (oldData: PairingRequest[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(req => req.id !== requestIdToRemove);
        }
      );

      setSelectedRequest(null);
      setDeviceName("");
      setLocation("");

      // Invalidate devices query to show the newly paired device
      queryClient.invalidateQueries({ queryKey: ['devices'] });

      // Still refetch to ensure data consistency
      refetch();
    } catch (error: any) {
      console.error('Error approving pairing:', error);
      toast.error(error.message || t('devices.pairing.approveFailed'));
      // Refetch on error to restore correct state
      refetch();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      // Optimistically update the UI by removing the rejected request
      const requestIdToRemove = selectedRequest.id;

      // Call the verify endpoint with pairing code in the URL path
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `https://wiyfcvypeifbdaqnfgrr.supabase.co/functions/v1/device-discovery/verify/${selectedRequest.pairing_code}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            approve: false,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject pairing');
      }

      toast.success(t('devices.pairing.rejected'));

      // Optimistically update the cache to remove the rejected request immediately
      queryClient.setQueryData(
        ['pending-pairing-requests', selectedPersonId],
        (oldData: PairingRequest[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(req => req.id !== requestIdToRemove);
        }
      );

      setSelectedRequest(null);

      // Still refetch to ensure data consistency
      refetch();
    } catch (error: any) {
      console.error('Error rejecting pairing:', error);
      toast.error(error.message || t('devices.pairing.rejectFailed'));
      // Refetch on error to restore correct state
      refetch();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const requestIdToRemove = selectedRequest.id;

      // Delete the expired pairing request
      const { error } = await supabase
        .from('device_pairing_requests')
        .delete()
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(t('devices.pairing.deleted'));

      // Optimistically update the cache to remove the deleted request immediately
      queryClient.setQueryData(
        ['pending-pairing-requests', selectedPersonId],
        (oldData: PairingRequest[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(req => req.id !== requestIdToRemove);
        }
      );

      setSelectedRequest(null);

      // Still refetch to ensure data consistency
      refetch();
    } catch (error: any) {
      console.error('Error deleting pairing request:', error);
      toast.error(error.message || t('devices.pairing.deleteFailed'));
      // Refetch on error to restore correct state
      refetch();
    } finally {
      setLoading(false);
    }
  };

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('devices.pairing.title')}</CardTitle>
          <CardDescription>{t('devices.pairing.noPending')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (selectedRequest) {
    // Check if the pairing request is expired
    const isExpired = new Date(selectedRequest.expires_at) < new Date() || selectedRequest.status === 'expired';

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isExpired
              ? t('devices.pairing.expiredTitle')
              : t('devices.pairing.approveTitle')
            }
          </CardTitle>
          <CardDescription>
            {isExpired
              ? t('devices.pairing.expiredDescription')
              : t('devices.pairing.reviewAndApprove', { name: selectedRequest.elderly_persons.full_name })
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">{t('devices.pairing.deviceId')}</Label>
              <p className="font-mono">{selectedRequest.device_id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('devices.pairing.deviceType')}</Label>
              <p>{selectedRequest.device_type || t('devices.pairing.unknown')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('devices.pairing.pairingCode')}</Label>
              <p className="font-mono text-lg font-bold">{selectedRequest.pairing_code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('devices.pairing.requested')}</Label>
              <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
            </div>
            {isExpired && (
              <div>
                <Label className="text-muted-foreground">{t('devices.pairing.expiresAt')}</Label>
                <p className="text-destructive">{new Date(selectedRequest.expires_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {!isExpired && (
            <>
              <div className="space-y-2">
                <Label htmlFor="deviceName">{t('devices.pairing.deviceNameOptional')}</Label>
                <Input
                  id="deviceName"
                  placeholder={t('devices.pairing.deviceNamePlaceholder')}
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('devices.pairing.locationOptional')}</Label>
                <Input
                  id="location"
                  placeholder={t('devices.pairing.locationPlaceholder')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {t('devices.pairing.approve')}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('devices.pairing.reject')}
                </Button>
              </div>
            </>
          )}

          {isExpired && (
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('devices.pairing.deleteExpired')}
            </Button>
          )}

          <Button
            onClick={() => setSelectedRequest(null)}
            variant="ghost"
            className="w-full"
          >
            {t('devices.pairing.backToList')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('devices.pairing.title')}</CardTitle>
        <CardDescription>
          {t(pendingRequests.length === 1 ? 'devices.pairing.pendingRequests' : 'devices.pairing.pendingRequestsPlural', { count: pendingRequests.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingRequests.map((request) => {
          const isExpired = new Date(request.expires_at) < new Date() || request.status === 'expired';

          return (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="space-y-1">
                <p className="font-medium">{request.device_id}</p>
                <p className="text-sm text-muted-foreground">
                  {t('devices.pairing.forPerson', { name: request.elderly_persons.full_name })}
                </p>
              </div>
              <div className="text-right space-y-1 flex flex-col items-end">
                <div className="flex gap-2">
                  <Badge variant={isExpired ? "destructive" : "default"}>
                    {request.pairing_code}
                  </Badge>
                  {isExpired && (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {t('devices.pairing.expired')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(request.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
