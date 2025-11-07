import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // GET /platform-metrics/overview
    if (req.method === 'GET' && action === 'overview') {
      // Get device counts
      const { count: totalDevices } = await supabaseClient
        .from('devices')
        .select('*', { count: 'exact', head: true });

      const { count: activeDevices } = await supabaseClient
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('last_sync', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get data points count (last 24h)
      const { count: dataPoints24h } = await supabaseClient
        .from('device_data')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get active alerts
      const { count: activeAlerts } = await supabaseClient
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get alert response times
      const { data: acknowledgedAlerts } = await supabaseClient
        .from('alerts')
        .select('created_at, acknowledged_at')
        .not('acknowledged_at', 'is', null)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      let avgResponseTime = 0;
      if (acknowledgedAlerts && acknowledgedAlerts.length > 0) {
        const totalResponseTime = acknowledgedAlerts.reduce((sum, alert) => {
          const created = new Date(alert.created_at).getTime();
          const acknowledged = new Date(alert.acknowledged_at).getTime();
          return sum + (acknowledged - created);
        }, 0);
        avgResponseTime = totalResponseTime / acknowledgedAlerts.length / 1000 / 60; // in minutes
      }

      // Get active users
      const { count: activeUsers } = await supabaseClient
        .from('elderly_persons')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      return new Response(
        JSON.stringify({
          totalDevices: totalDevices || 0,
          activeDevices: activeDevices || 0,
          dataPoints24h: dataPoints24h || 0,
          activeAlerts: activeAlerts || 0,
          avgResponseTimeMinutes: Math.round(avgResponseTime),
          activeUsers: activeUsers || 0,
          systemUptime: 99.9, // Placeholder
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /platform-metrics/devices
    if (req.method === 'GET' && action === 'devices') {
      // Get latest health log for each device
      const { data: devices } = await supabaseClient
        .from('devices')
        .select('*, device_health_logs(*)');

      const deviceHealth = devices?.map((device) => {
        const latestLog = device.device_health_logs?.[0];
        return {
          id: device.id,
          name: device.device_name,
          type: device.device_type,
          status: device.status,
          healthScore: latestLog?.health_score || 0,
          batteryStatus: latestLog?.battery_status || 'unknown',
          connectivityStatus: latestLog?.connectivity_status || 'unknown',
          lastSync: device.last_sync,
          dataPoints24h: latestLog?.data_points_24h || 0,
        };
      });

      return new Response(
        JSON.stringify({ devices: deviceHealth || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /platform-metrics/compute - Compute device health scores
    if (req.method === 'POST' && action === 'compute') {
      const { data: devices } = await supabaseClient
        .from('devices')
        .select('*');

      if (!devices) {
        return new Response(
          JSON.stringify({ error: 'No devices found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const healthLogs = [];

      for (const device of devices) {
        let healthScore = 100;
        let batteryStatus = 'good';
        let connectivityStatus = 'excellent';

        // Battery check
        if (device.battery_level !== null) {
          if (device.battery_level < 10) {
            healthScore -= 30;
            batteryStatus = 'critical';
          } else if (device.battery_level < 20) {
            healthScore -= 20;
            batteryStatus = 'low';
          } else if (device.battery_level < 50) {
            batteryStatus = 'normal';
          }
        }

        // Connectivity check (based on last sync)
        const hoursSinceSync = device.last_sync 
          ? (Date.now() - new Date(device.last_sync).getTime()) / (1000 * 60 * 60)
          : 999;

        if (hoursSinceSync > 24) {
          healthScore -= 40;
          connectivityStatus = 'offline';
        } else if (hoursSinceSync > 6) {
          healthScore -= 30;
          connectivityStatus = 'poor';
        } else if (hoursSinceSync > 2) {
          healthScore -= 15;
          connectivityStatus = 'fair';
        } else if (hoursSinceSync > 1) {
          connectivityStatus = 'good';
        }

        // Get data points count for last 24h
        const { count: dataPoints24h } = await supabaseClient
          .from('device_data')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', device.id)
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        healthScore = Math.max(0, Math.min(100, healthScore));

        healthLogs.push({
          device_id: device.id,
          health_score: healthScore,
          battery_status: batteryStatus,
          connectivity_status: connectivityStatus,
          last_data_transmission: device.last_sync,
          data_points_24h: dataPoints24h || 0,
          error_count: 0,
        });
      }

      // Insert health logs
      const { error } = await supabaseClient
        .from('device_health_logs')
        .insert(healthLogs);

      if (error) {
        console.error('Error inserting health logs:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Computed health scores for ${healthLogs.length} devices`);

      return new Response(
        JSON.stringify({ success: true, computedDevices: healthLogs.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in platform-metrics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
