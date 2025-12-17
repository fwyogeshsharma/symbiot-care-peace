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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting scheduled report processing...");

    // Get current hour in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    console.log(`Current UTC time: ${currentHour}:${currentMinute}`);

    // Fetch all active subscriptions that match the current hour
    // We check for subscriptions where schedule_time hour matches current hour
    const { data: subscriptions, error: subError } = await supabase
      .from('report_subscriptions')
      .select(`
        *,
        elderly_persons!inner(id, full_name),
        profiles!inner(email, full_name)
      `)
      .eq('is_active', true)
      .eq('report_type', 'daily_summary');

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    const results: any[] = [];

    for (const subscription of subscriptions || []) {
      // Parse the schedule time (HH:MM:SS format)
      const [scheduleHour, scheduleMinute] = subscription.schedule_time.split(':').map(Number);

      // Convert user's local time to UTC for comparison
      // The schedule_time is stored in user's local time, we need to check if it's time to send
      // For now, we'll check if we're within the same hour and within 5 minutes of the scheduled time
      const minuteDiff = Math.abs(currentMinute - scheduleMinute);

      if (scheduleHour !== currentHour || minuteDiff > 5) {
        console.log(`Skipping subscription ${subscription.id}: scheduled for ${scheduleHour}:${scheduleMinute}, current time is ${currentHour}:${currentMinute} UTC`);
        continue;
      }

      console.log(`Time match for subscription ${subscription.id}: scheduled ${scheduleHour}:${scheduleMinute}, current ${currentHour}:${currentMinute} UTC`);

      console.log(`Processing report for subscription ${subscription.id}`);

      const elderlyPersonId = subscription.elderly_person_id;
      const userEmail = subscription.profiles?.email;

      if (!userEmail) {
        console.error(`No email found for subscription ${subscription.id}`);
        continue;
      }

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

      // Send email
      try {
        // Use configured sender email or fall back to default
        const fromEmail = Deno.env.get("SENDER_EMAIL") || "SymBIoT Health <noreply@yourdomain.com>";

        const { error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          subject: `Daily Health Report - ${subscription.elderly_persons.full_name} - ${now.toLocaleDateString()}`,
          html,
        });

        if (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError);
          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: emailError.message,
          });
        } else {
          console.log(`Successfully sent report to ${userEmail}`);
          results.push({
            subscriptionId: subscription.id,
            success: true,
            email: userEmail,
          });
        }
      } catch (sendError: any) {
        console.error(`Email send error:`, sendError);
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: sendError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
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
