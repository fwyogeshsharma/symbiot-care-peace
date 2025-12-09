// Supabase Edge Function to send FCM push notifications
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Firebase service account credentials (JSON string)
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Parse service account for project ID
let FIREBASE_PROJECT_ID = ''
try {
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
  FIREBASE_PROJECT_ID = serviceAccount.project_id
} catch (error) {
  console.error('Failed to parse Firebase service account:', error)
}

interface Alert {
  id: string
  elderly_person_id: string
  alert_type: string
  severity: string
  title: string
  description: string
  status: string
  created_at: string
}

interface NotificationPayload {
  title: string
  body: string
  data: Record<string, any>
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Parse the request body
    const { alert } = await req.json() as { alert: Alert }

    if (!alert) {
      return new Response('Alert data is required', { status: 400 })
    }

    console.log('Processing alert:', alert.id, alert.alert_type)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get elderly person details
    const { data: elderlyPerson, error: personError } = await supabase
      .from('elderly_persons')
      .select('full_name')
      .eq('id', alert.elderly_person_id)
      .single()

    if (personError) {
      console.error('Error fetching elderly person:', personError)
      return new Response('Failed to fetch elderly person', { status: 500 })
    }

    const elderlyPersonName = elderlyPerson?.full_name || 'Patient'

    // Get FCM tokens for all users who have access to this elderly person
    const { data: tokens, error: tokensError } = await supabase
      .rpc('get_fcm_tokens_for_elderly_person', {
        elderly_person_id: alert.elderly_person_id
      })

    if (tokensError) {
      console.error('Error fetching FCM tokens:', tokensError)
      return new Response('Failed to fetch FCM tokens', { status: 500 })
    }

    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens found for this alert')
      return new Response('No recipients', { status: 200 })
    }

    console.log(`Found ${tokens.length} FCM tokens`)

    // Generate notification content based on alert type
    const notification = getNotificationContent(alert, elderlyPersonName)

    // Send push notifications to all tokens
    const results = await Promise.allSettled(
      tokens.map((tokenData: any) => sendFCMNotification(tokenData.token, notification))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Sent ${successful} notifications, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        total: tokens.length
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/**
 * Get OAuth 2.0 access token for FCM API v1
 */
async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)

  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // Encode JWT
  const encoder = new TextEncoder()
  const headerEncoded = base64UrlEncode(JSON.stringify(jwtHeader))
  const claimSetEncoded = base64UrlEncode(JSON.stringify(jwtClaimSet))
  const signatureInput = `${headerEncoded}.${claimSetEncoded}`

  // Sign with private key
  const privateKey = await importPrivateKey(serviceAccount.private_key)
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(signatureInput)
  )
  const signatureEncoded = base64UrlEncode(signatureBuffer)
  const jwt = `${signatureInput}.${signatureEncoded}`

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Import private key from PEM format
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string

  if (typeof data === 'string') {
    base64 = btoa(data)
  } else {
    const bytes = new Uint8Array(data)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    base64 = btoa(binary)
  }

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Send FCM notification using Firebase Cloud Messaging API v1
 */
async function sendFCMNotification(token: string, notification: NotificationPayload) {
  // Get OAuth access token
  const accessToken = await getAccessToken()

  // FCM v1 endpoint
  const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`

  // FCM v1 payload structure
  // Note: FCM v1 API requires all data values to be strings
  const dataAsStrings: Record<string, string> = {}
  for (const [key, value] of Object.entries(notification.data)) {
    dataAsStrings[key] = String(value)
  }

  const payload = {
    message: {
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: dataAsStrings,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: getChannelId(notification.data.severity),
          priority: 'high',
        }
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          }
        }
      }
    }
  }

  const response = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('FCM API error:', error)
    throw new Error(`FCM API error: ${error}`)
  }

  const result = await response.json()
  console.log('FCM response:', result)
  return result
}

/**
 * Get notification channel ID based on severity
 */
function getChannelId(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'critical-alerts'
    case 'high':
      return 'high-priority'
    case 'medium':
      return 'medium-priority'
    case 'low':
      return 'low-priority'
    default:
      return 'medium-priority'
  }
}

/**
 * Generate notification content based on alert type
 */
function getNotificationContent(alert: Alert, elderlyPersonName: string): NotificationPayload {
  let title = ''
  let body = ''

  switch (alert.alert_type) {
    case 'panic_sos':
      title = '🚨 PANIC SOS Alert!'
      body = `${elderlyPersonName} has pressed the emergency button. Immediate attention required!`
      break

    case 'fall_detected':
      title = '⚠️ Fall Detected!'
      body = `${elderlyPersonName} may have fallen. Please check immediately.`
      break

    case 'vital_signs':
      title = '❤️ Vital Signs Alert'
      body = `${elderlyPersonName}: ${alert.description || 'Abnormal vital signs detected'}`
      break

    case 'geofence':
      title = '📍 Geofence Alert'
      body = `${elderlyPersonName}: ${alert.description || 'Has left the safe zone'}`
      break

    case 'device_offline':
      title = '🔌 Device Offline'
      body = `${elderlyPersonName}: ${alert.description || 'Device is offline'}`
      break

    case 'inactivity':
      title = '😴 Inactivity Alert'
      body = `${elderlyPersonName}: ${alert.description || 'No activity detected'}`
      break

    case 'medication':
      title = '💊 Medication Alert'
      body = `${elderlyPersonName}: ${alert.description || 'Medication reminder'}`
      break

    default:
      title = `⚠️ ${alert.severity.toUpperCase()} Alert`
      body = `${elderlyPersonName}: ${alert.description || alert.title}`
  }

  return {
    title,
    body,
    data: {
      alertId: alert.id,
      alertType: alert.alert_type,
      elderlyPersonId: alert.elderly_person_id,
      severity: alert.severity,
      timestamp: alert.created_at,
    }
  }
}
