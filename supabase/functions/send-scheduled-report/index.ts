import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ReportData {
  elderlyPerson: {
    id: string;
    full_name: string;
  };
  userEmail: string;
  deviceData: any[];
  alerts: any[];
  ilqScore: any;
  medicationLogs: any[];
}

function generateReportHTML(data: ReportData): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Process device data for summary
  const heartRates = data.deviceData
    .filter(d => d.data_type === 'heart_rate')
    .map(d => {
      const val = d.value;
      return typeof val === 'object' ? (val.bpm || val.value) : val;
    })
    .filter(v => v != null);

  const avgHeartRate = heartRates.length > 0 
    ? Math.round(heartRates.reduce((a, b) => a + Number(b), 0) / heartRates.length) 
    : null;

  const steps = data.deviceData
    .filter(d => d.data_type === 'steps')
    .map(d => {
      const val = d.value;
      return typeof val === 'object' ? (val.count || val.steps || val.value) : val;
    })
    .reduce((a, b) => a + Number(b || 0), 0);

  const activeAlerts = data.alerts.filter(a => a.status === 'active').length;
  const resolvedAlerts = data.alerts.filter(a => a.status === 'resolved').length;

  // Medication adherence
  const takenMeds = data.medicationLogs.filter(m => m.status === 'taken').length;
  const totalMeds = data.medicationLogs.length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Health Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Daily Health Report</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${today}</p>
    </div>

    <!-- Person Info -->
    <div style="padding: 20px; border-bottom: 1px solid #eee;">
      <h2 style="margin: 0 0 5px; color: #333; font-size: 20px;">${data.elderlyPerson.full_name}</h2>
      <p style="margin: 0; color: #666; font-size: 14px;">End of Day Summary</p>
    </div>

    <!-- ILQ Score -->
    ${data.ilqScore ? `
    <div style="padding: 20px; background-color: #f8f9fa; text-align: center;">
      <p style="margin: 0 0 5px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Independent Living Quality Score</p>
      <div style="font-size: 48px; font-weight: bold; color: ${data.ilqScore.score >= 85 ? '#10b981' : data.ilqScore.score >= 70 ? '#f59e0b' : '#ef4444'};">
        ${Math.round(data.ilqScore.score)}
      </div>
      <p style="margin: 5px 0 0; color: #666; font-size: 14px;">
        ${data.ilqScore.score >= 85 ? 'Excellent' : data.ilqScore.score >= 70 ? 'Good' : data.ilqScore.score >= 55 ? 'Fair' : 'Needs Attention'}
      </p>
    </div>
    ` : ''}

    <!-- Key Metrics -->
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">Today's Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px; border: 1px solid #eee; background-color: #f8f9fa;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Steps</div>
            <div style="font-size: 24px; font-weight: bold; color: #333;">${steps.toLocaleString()}</div>
          </td>
          <td style="padding: 12px; border: 1px solid #eee; background-color: #f8f9fa;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Avg Heart Rate</div>
            <div style="font-size: 24px; font-weight: bold; color: #333;">${avgHeartRate ? `${avgHeartRate} bpm` : 'N/A'}</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #eee; background-color: #f8f9fa;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Medication Adherence</div>
            <div style="font-size: 24px; font-weight: bold; color: ${adherenceRate && adherenceRate >= 80 ? '#10b981' : '#f59e0b'};">
              ${adherenceRate !== null ? `${adherenceRate}%` : 'N/A'}
            </div>
          </td>
          <td style="padding: 12px; border: 1px solid #eee; background-color: #f8f9fa;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Alerts</div>
            <div style="font-size: 24px; font-weight: bold; color: ${activeAlerts > 0 ? '#ef4444' : '#10b981'};">
              ${activeAlerts} active
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Alerts Section -->
    ${data.alerts.length > 0 ? `
    <div style="padding: 20px; border-top: 1px solid #eee;">
      <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">Recent Alerts</h3>
      ${data.alerts.slice(0, 5).map(alert => `
        <div style="padding: 12px; margin-bottom: 10px; border-radius: 8px; background-color: ${alert.severity === 'critical' ? '#fef2f2' : alert.severity === 'high' ? '#fff7ed' : '#f0fdf4'}; border-left: 4px solid ${alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f59e0b' : '#10b981'};">
          <div style="font-weight: 600; color: #333; font-size: 14px;">${alert.title}</div>
          <div style="color: #666; font-size: 12px; margin-top: 4px;">${alert.description || ''}</div>
          <div style="color: #999; font-size: 11px; margin-top: 4px;">
            ${new Date(alert.created_at).toLocaleString()} • ${alert.status}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="padding: 20px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px; color: #666; font-size: 12px;">
        This report was automatically generated by SymBIoT Health Monitoring.
      </p>
      <p style="margin: 0; color: #999; font-size: 11px;">
        To change your report schedule or unsubscribe, visit your account settings.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Convert local time to UTC based on timezone
function getUTCTimeFromLocal(localHour: number, localMinute: number, timezone: string): { hour: number; minute: number } {
  // Create a date object in the user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  // Get current local time in that timezone
  const parts = formatter.formatToParts(now);
  const currentLocalHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const currentLocalMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  
  // Calculate the offset
  const currentUTCHour = now.getUTCHours();
  const currentUTCMinute = now.getUTCMinutes();
  
  // Calculate offset in minutes
  const localTotalMinutes = currentLocalHour * 60 + currentLocalMinute;
  const utcTotalMinutes = currentUTCHour * 60 + currentUTCMinute;
  let offsetMinutes = localTotalMinutes - utcTotalMinutes;
  
  // Handle day boundary
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;
  
  // Convert schedule time from local to UTC
  let scheduleTotalMinutes = localHour * 60 + localMinute - offsetMinutes;
  
  // Normalize to 0-1439 range
  if (scheduleTotalMinutes < 0) scheduleTotalMinutes += 1440;
  if (scheduleTotalMinutes >= 1440) scheduleTotalMinutes -= 1440;
  
  return {
    hour: Math.floor(scheduleTotalMinutes / 60),
    minute: scheduleTotalMinutes % 60,
  };
}

async function sendReportForSubscription(supabase: any, subscription: any, forceTest: boolean = false): Promise<any> {
  const now = new Date();
  const elderlyPersonId = subscription.elderly_person_id;
  const userEmail = subscription.profiles?.email;

  if (!userEmail) {
    console.error(`No email found for subscription ${subscription.id}`);
    return { subscriptionId: subscription.id, success: false, error: 'No email found' };
  }

  console.log(`Processing report for ${userEmail}, elderly person: ${subscription.elderly_persons?.full_name}`);

  // Get today's date range
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Fetch device data for today
  const { data: deviceData, error: deviceError } = await supabase
    .from('device_data')
    .select('*')
    .eq('elderly_person_id', elderlyPersonId)
    .gte('recorded_at', startOfDay.toISOString())
    .lte('recorded_at', endOfDay.toISOString())
    .order('recorded_at', { ascending: false });

  if (deviceError) {
    console.error("Error fetching device data:", deviceError);
  }

  // Fetch alerts for today
  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .eq('elderly_person_id', elderlyPersonId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false });

  if (alertsError) {
    console.error("Error fetching alerts:", alertsError);
  }

  // Fetch latest ILQ score
  const { data: ilqScores, error: ilqError } = await supabase
    .from('ilq_scores')
    .select('*')
    .eq('elderly_person_id', elderlyPersonId)
    .order('computation_timestamp', { ascending: false })
    .limit(1);

  if (ilqError) {
    console.error("Error fetching ILQ scores:", ilqError);
  }

  // Fetch medication logs for today
  const { data: medicationLogs, error: medError } = await supabase
    .from('medication_adherence_logs')
    .select('*')
    .eq('elderly_person_id', elderlyPersonId)
    .gte('timestamp', startOfDay.toISOString())
    .lte('timestamp', endOfDay.toISOString());

  if (medError) {
    console.error("Error fetching medication logs:", medError);
  }

  // Generate HTML report
  const reportData: ReportData = {
    elderlyPerson: subscription.elderly_persons,
    userEmail,
    deviceData: deviceData || [],
    alerts: alerts || [],
    ilqScore: ilqScores?.[0] || null,
    medicationLogs: medicationLogs || [],
  };

  const html = generateReportHTML(reportData);

  // Send email using Resend
  try {
    // IMPORTANT: Use onboarding@resend.dev for testing, or configure a verified domain
    const fromEmail = "SymBIoT Health <onboarding@resend.dev>";

    console.log(`Sending email from ${fromEmail} to ${userEmail}`);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: `Daily Health Report - ${subscription.elderly_persons.full_name} - ${now.toLocaleDateString()}`,
      html,
    });

    if (emailError) {
      console.error(`Failed to send email to ${userEmail}:`, emailError);
      return {
        subscriptionId: subscription.id,
        success: false,
        error: emailError.message || JSON.stringify(emailError),
      };
    } else {
      console.log(`Successfully sent report to ${userEmail}`, emailData);
      return {
        subscriptionId: subscription.id,
        success: true,
        email: userEmail,
        emailId: emailData?.id,
      };
    }
  } catch (sendError: any) {
    console.error(`Email send error:`, sendError);
    return {
      subscriptionId: subscription.id,
      success: false,
      error: sendError.message,
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a test/manual trigger
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const isTest = body.test === true;
    const testSubscriptionId = body.subscriptionId;
    const testUserId = body.userId;

    console.log("Starting scheduled report processing...", { isTest, testSubscriptionId, testUserId });

    // Get current time
    const now = new Date();
    const currentUTCHour = now.getUTCHours();
    const currentUTCMinute = now.getUTCMinutes();
    
    console.log(`Current UTC time: ${currentUTCHour}:${String(currentUTCMinute).padStart(2, '0')}`);

    // Build query for subscriptions
    let query = supabase
      .from('report_subscriptions')
      .select(`
        *,
        elderly_persons!inner(id, full_name),
        profiles!inner(email, full_name)
      `)
      .eq('is_active', true)
      .eq('report_type', 'daily_summary');

    // If testing specific subscription or user
    if (testSubscriptionId) {
      query = query.eq('id', testSubscriptionId);
    } else if (testUserId) {
      query = query.eq('user_id', testUserId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    const results: any[] = [];

    for (const subscription of subscriptions || []) {
      // Parse the schedule time (HH:MM:SS format)
      const [scheduleHour, scheduleMinute] = subscription.schedule_time.split(':').map(Number);
      const timezone = subscription.timezone || 'UTC';

      console.log(`Subscription ${subscription.id}: scheduled for ${scheduleHour}:${String(scheduleMinute).padStart(2, '0')} ${timezone}`);

      // Skip time check if this is a test
      if (!isTest) {
        // Convert user's local schedule time to UTC
        const scheduleUTC = getUTCTimeFromLocal(scheduleHour, scheduleMinute, timezone);
        
        console.log(`Converted to UTC: ${scheduleUTC.hour}:${String(scheduleUTC.minute).padStart(2, '0')}`);

        // Check if we're within 30 minutes of the scheduled time (to account for cron running hourly)
        const scheduleTotalMinutes = scheduleUTC.hour * 60 + scheduleUTC.minute;
        const currentTotalMinutes = currentUTCHour * 60 + currentUTCMinute;
        let minuteDiff = Math.abs(currentTotalMinutes - scheduleTotalMinutes);
        
        // Handle day boundary
        if (minuteDiff > 720) minuteDiff = 1440 - minuteDiff;

        if (minuteDiff > 30) {
          console.log(`Skipping subscription ${subscription.id}: not within time window (diff: ${minuteDiff} minutes)`);
          continue;
        }

        console.log(`Time match for subscription ${subscription.id} (diff: ${minuteDiff} minutes)`);
      } else {
        console.log(`Test mode: skipping time check for subscription ${subscription.id}`);
      }

      const result = await sendReportForSubscription(supabase, subscription, isTest);
      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-scheduled-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
