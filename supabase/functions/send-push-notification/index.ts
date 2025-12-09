import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertPayload {
  type: 'INSERT';
  table: 'alerts';
  record: {
    id: string;
    elderly_person_id: string;
    alert_type: string;
    severity: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
  };
  old_record: null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Push notification function triggered');

    // Parse the webhook payload
    const payload: AlertPayload = await req.json();
    console.log('Received payload:', JSON.stringify(payload));

    // Validate payload
    if (!payload.record || !payload.record.elderly_person_id) {
      console.error('Invalid payload - missing record or elderly_person_id');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const alert = payload.record;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get FCM tokens for users who should receive this alert
    // This includes the owner, caregivers, and relatives with access
    const { data: recipients, error: recipientsError } = await supabase
      .from('alert_recipients')
      .select('user_id')
      .eq('alert_id', alert.id);

    if (recipientsError) {
      console.error('Error fetching alert recipients:', recipientsError);
      // Fall back to elderly person owner
    }

    // Get elderly person details for notification context
    const { data: elderlyPerson, error: elderlyError } = await supabase
      .from('elderly_persons')
      .select('full_name, user_id')
      .eq('id', alert.elderly_person_id)
      .single();

    if (elderlyError) {
      console.error('Error fetching elderly person:', elderlyError);
    }

    // Collect all user IDs that should receive notification
    const userIds = new Set<string>();
    
    // Add owner
    if (elderlyPerson?.user_id) {
      userIds.add(elderlyPerson.user_id);
    }
    
    // Add alert recipients
    if (recipients) {
      recipients.forEach(r => userIds.add(r.user_id));
    }

    if (userIds.size === 0) {
      console.log('No recipients found for alert');
      return new Response(
        JSON.stringify({ message: 'No recipients to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get FCM tokens for all recipients
    const { data: fcmTokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token, user_id')
      .in('user_id', Array.from(userIds));

    if (tokensError) {
      console.error('Error fetching FCM tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch FCM tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      console.log('No FCM tokens found for recipients');
      return new Response(
        JSON.stringify({ message: 'No FCM tokens registered for recipients' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Firebase service account
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!firebaseServiceAccountJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(firebaseServiceAccountJson);
    } catch (e) {
      console.error('Failed to parse Firebase service account:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    // Prepare notification content
    const notification = {
      title: alert.title,
      body: alert.description || `Alert for ${elderlyPerson?.full_name || 'monitored person'}`,
    };

    const data = {
      alertId: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity,
      elderlyPersonId: alert.elderly_person_id,
      elderlyPersonName: elderlyPerson?.full_name || '',
      createdAt: alert.created_at,
    };

    // Send notifications to all tokens
    const results = await Promise.allSettled(
      fcmTokens.map(async ({ token }) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification,
                data,
                android: {
                  priority: alert.severity === 'critical' ? 'high' : 'normal',
                  notification: {
                    sound: 'default',
                    channel_id: alert.severity === 'critical' ? 'critical_alerts' : 'alerts',
                  },
                },
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                      badge: 1,
                    },
                  },
                },
                webpush: {
                  notification: {
                    icon: '/favicon.png',
                    badge: '/favicon.png',
                    requireInteraction: alert.severity === 'critical',
                  },
                },
              },
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error(`Failed to send to token: ${error}`);
          throw new Error(error);
        }

        return response.json();
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        successful,
        failed,
        totalTokens: fcmTokens.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing push notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get Firebase access token using service account
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT header and payload
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64url encode
  const base64url = (data: any) => {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64url(header);
  const payloadB64 = base64url(payload);
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Sign with private key
  const privateKey = serviceAccount.private_key;
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
