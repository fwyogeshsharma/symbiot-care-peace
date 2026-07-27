import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { RefreshCw, Activity, Database, AlertCircle, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Footer } from "@/components/Footer";

export default function PlatformMetrics() {
  const [computing, setComputing] = useState(false);

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['platform-metrics-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('platform-metrics', {
        method: 'GET',
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: deviceHealth, isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ['platform-metrics-devices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('platform-metrics', {
        method: 'GET',
      });
      if (error) throw error;
      return data;
    },
  });

  const computeMetrics = async () => {
    setComputing(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-metrics', {
        method: 'POST',
      });
      if (error) throw error;
      
      toast.success(`Computed metrics for ${data.computedDevices} devices`);
      refetchOverview();
      refetchDevices();
    } catch (error: any) {
      toast.error(error.message || "Failed to compute metrics");
    } finally {
      setComputing(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return <Badge variant="secondary">Healthy</Badge>;
    if (score >= 60) return <Badge variant="default">Warning</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Platform Metrics</h1>
            <p className="text-muted-foreground">System health and performance monitoring</p>
          </div>
          <Button onClick={computeMetrics} disabled={computing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${computing ? 'animate-spin' : ''}`} />
            Compute Metrics
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="devices">Device Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.totalDevices || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.activeDevices || 0} active in last 24h
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.dataPoints24h?.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.activeAlerts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg response: {overview?.avgResponseTimeMinutes || 0}m
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.activeUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Elderly persons monitored</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.systemUptime || 0}%</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Health Status</CardTitle>
                <CardDescription>Real-time health monitoring for all devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {devicesLoading ? (
                    <p className="text-muted-foreground">Loading device health data...</p>
                  ) : deviceHealth?.devices?.length > 0 ? (
                    deviceHealth.devices.map((device: any) => (
                      <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{device.name}</p>
                            {getHealthBadge(device.healthScore)}
                          </div>
                          <p className="text-sm text-muted-foreground">{device.type}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className={`text-2xl font-bold ${getHealthColor(device.healthScore)}`}>
                            {device.healthScore}
                          </div>
                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline">{device.batteryStatus}</Badge>
                            <Badge variant="outline">{device.connectivityStatus}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {device.dataPoints24h} data points (24h)
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No device health data available. Click "Compute Metrics" to generate.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
