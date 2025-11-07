import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PairingRequestBody {
  deviceId: string;
  deviceType?: string;
  elderlyPersonId: string;
  deviceMetadata?: Record<string, any>;
  networkInfo?: Record<string, any>;
}

interface VerifyRequestBody {
  pairingCode: string;
  approve: boolean;
  deviceName?: string;
  location?: string;
}

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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // POST /device-discovery - Initiate pairing
    if (req.method === 'POST' && action === 'device-discovery') {
      const body: PairingRequestBody = await req.json();
      
      // Generate 6-digit pairing code
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      
      const { data: pairingRequest, error } = await supabaseClient
        .from('device_pairing_requests')
        .insert({
          device_id: body.deviceId,
          device_type: body.deviceType,
          pairing_code: pairingCode,
          elderly_person_id: body.elderlyPersonId,
          requested_by: user.id,
          device_metadata: body.deviceMetadata || {},
          network_info: body.networkInfo || {},
          expires_at: expiresAt,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating pairing request:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the event
      await supabaseClient
        .from('device_association_logs')
        .insert({
          pairing_request_id: pairingRequest.id,
          event_type: 'pairing_started',
          user_id: user.id,
          details: { device_id: body.deviceId, device_type: body.deviceType },
        });

      console.log('Pairing request created:', pairingCode);

      return new Response(
        JSON.stringify({ pairingRequest, pairingCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /device-discovery/status/:pairingCode
    if (req.method === 'GET' && pathParts.includes('status')) {
      const pairingCode = pathParts[pathParts.length - 1];
      
      const { data: pairingRequest, error } = await supabaseClient
        .from('device_pairing_requests')
        .select('*, elderly_persons(*)')
        .eq('pairing_code', pairingCode)
        .single();

      if (error || !pairingRequest) {
        return new Response(
          JSON.stringify({ error: 'Pairing request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if expired
      if (new Date(pairingRequest.expires_at) < new Date() && pairingRequest.status === 'pending') {
        await supabaseClient
          .from('device_pairing_requests')
          .update({ status: 'expired' })
          .eq('id', pairingRequest.id);
        
        pairingRequest.status = 'expired';
      }

      return new Response(
        JSON.stringify({ pairingRequest }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /device-discovery/verify/:pairingCode
    if (req.method === 'POST' && pathParts.includes('verify')) {
      const pairingCode = pathParts[pathParts.length - 1];
      const body: VerifyRequestBody = await req.json();
      
      const { data: pairingRequest, error: fetchError } = await supabaseClient
        .from('device_pairing_requests')
        .select('*')
        .eq('pairing_code', pairingCode)
        .single();

      if (fetchError || !pairingRequest) {
        return new Response(
          JSON.stringify({ error: 'Pairing request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if expired
      if (new Date(pairingRequest.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Pairing code has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.approve) {
        // Create the device
        const deviceName = body.deviceName || `${pairingRequest.device_type || 'Device'} (${pairingRequest.device_id.substring(0, 8)})`;
        
        const { data: device, error: deviceError } = await supabaseClient
          .from('devices')
          .insert({
            device_name: deviceName,
            device_id: pairingRequest.device_id,
            device_type: pairingRequest.device_type || 'unknown',
            elderly_person_id: pairingRequest.elderly_person_id,
            location: body.location,
            status: 'active',
          })
          .select()
          .single();

        if (deviceError) {
          console.error('Error creating device:', deviceError);
          return new Response(
            JSON.stringify({ error: deviceError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update pairing request
        await supabaseClient
          .from('device_pairing_requests')
          .update({
            status: 'paired',
            approved_by: user.id,
            paired_at: new Date().toISOString(),
          })
          .eq('id', pairingRequest.id);

        // Log the events
        await supabaseClient
          .from('device_association_logs')
          .insert([
            {
              pairing_request_id: pairingRequest.id,
              device_id: device.id,
              event_type: 'verified',
              user_id: user.id,
            },
            {
              pairing_request_id: pairingRequest.id,
              device_id: device.id,
              event_type: 'paired',
              user_id: user.id,
              details: { device_name: deviceName, api_key: device.api_key },
            },
          ]);

        console.log('Device paired successfully:', device.id);

        return new Response(
          JSON.stringify({ success: true, device }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Reject pairing
        await supabaseClient
          .from('device_pairing_requests')
          .update({ status: 'rejected', approved_by: user.id })
          .eq('id', pairingRequest.id);

        await supabaseClient
          .from('device_association_logs')
          .insert({
            pairing_request_id: pairingRequest.id,
            event_type: 'rejected',
            user_id: user.id,
          });

        return new Response(
          JSON.stringify({ success: true, rejected: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in device-discovery function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
