import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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

export const PairingApprovalPanel = () => {
  const [selectedRequest, setSelectedRequest] = useState<PairingRequest | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: pendingRequests, refetch } = useQuery({
    queryKey: ['pending-pairing-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_pairing_requests')
        .select('*, elderly_persons(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PairingRequest[];
    },
    refetchInterval: 10000, // Poll every 10 seconds
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
          toast.info("New device pairing request received!");
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
      const { data, error } = await supabase.functions.invoke('device-discovery', {
        method: 'POST',
        body: {
          pairingCode: selectedRequest.pairing_code,
          approve: true,
          deviceName: deviceName || undefined,
          location: location || undefined,
        },
      });

      if (error) throw error;

      toast.success("Device paired successfully!");
      setSelectedRequest(null);
      setDeviceName("");
      setLocation("");
      refetch();
    } catch (error: any) {
      console.error('Error approving pairing:', error);
      toast.error(error.message || "Failed to approve pairing");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('device-discovery', {
        method: 'POST',
        body: {
          pairingCode: selectedRequest.pairing_code,
          approve: false,
        },
      });

      if (error) throw error;

      toast.success("Pairing request rejected");
      setSelectedRequest(null);
      refetch();
    } catch (error: any) {
      console.error('Error rejecting pairing:', error);
      toast.error(error.message || "Failed to reject pairing");
    } finally {
      setLoading(false);
    }
  };

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Pairing Requests</CardTitle>
          <CardDescription>No pending pairing requests</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (selectedRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approve Device Pairing</CardTitle>
          <CardDescription>
            Review and approve device for {selectedRequest.elderly_persons.full_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Device ID</Label>
              <p className="font-mono">{selectedRequest.device_id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Device Type</Label>
              <p>{selectedRequest.device_type || "Unknown"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Pairing Code</Label>
              <p className="font-mono text-lg font-bold">{selectedRequest.pairing_code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Requested</Label>
              <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name (Optional)</Label>
            <Input
              id="deviceName"
              placeholder="e.g., Living Room Sensor"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., Living Room"
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
              Approve
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>

          <Button 
            onClick={() => setSelectedRequest(null)} 
            variant="ghost"
            className="w-full"
          >
            Back to List
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Pairing Requests</CardTitle>
        <CardDescription>
          {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => setSelectedRequest(request)}
          >
            <div className="space-y-1">
              <p className="font-medium">{request.device_id}</p>
              <p className="text-sm text-muted-foreground">
                For {request.elderly_persons.full_name}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge>{request.pairing_code}</Badge>
              <p className="text-xs text-muted-foreground">
                {new Date(request.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
