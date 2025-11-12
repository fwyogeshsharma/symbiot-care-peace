import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  elderly_person_id: string;
  period_days?: number;
  include_charts?: boolean;
  email_to?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { elderly_person_id, period_days = 30, include_charts = true, email_to }: ReportRequest = await req.json();

    console.log(`Generating ILQ report for ${elderly_person_id}, period: ${period_days} days`);

    // Fetch elderly person details
    const { data: elderlyPerson } = await supabaseClient
      .from('elderly_persons')
      .select('*')
      .eq('id', elderly_person_id)
      .single();

    if (!elderlyPerson) {
      return new Response(
        JSON.stringify({ error: 'Elderly person not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ILQ scores for the period
    const startDate = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString();
    const { data: ilqScores } = await supabaseClient
      .from('ilq_scores')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('computation_timestamp', startDate)
      .order('computation_timestamp', { ascending: true });

    if (!ilqScores || ilqScores.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No ILQ data available for this period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch alerts
    const { data: alerts } = await supabaseClient
      .from('ilq_alerts')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    // Calculate statistics
    const scores = ilqScores.map(s => parseFloat(s.score));
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const latestScore = ilqScores[ilqScores.length - 1];
    const oldestScore = ilqScores[0];
    const totalChange = parseFloat(latestScore.score) - parseFloat(oldestScore.score);
    
    // Determine trend
    const recentScores = scores.slice(-7);
    const olderScores = scores.slice(0, 7);
    const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;
    const trendDirection = recentAvg > olderAvg + 3 ? 'improving' : recentAvg < olderAvg - 3 ? 'declining' : 'stable';

    // Generate HTML report
    const htmlReport = generateHTMLReport({
      elderlyPerson,
      ilqScores,
      alerts: alerts || [],
      statistics: {
        avgScore: avgScore.toFixed(2),
        latestScore: parseFloat(latestScore.score).toFixed(2),
        totalChange: totalChange.toFixed(2),
        trendDirection,
        periodDays: period_days,
      },
    });

    // If email requested, send it (requires RESEND_API_KEY)
    if (email_to) {
      // TODO: Implement email sending with Resend
      // For now, just return the HTML report
      console.log('Email sending not yet implemented');
    }

    // Return HTML report that can be converted to PDF on client-side
    return new Response(
      JSON.stringify({ 
        success: true,
        html: htmlReport,
        statistics: {
          avgScore: avgScore.toFixed(2),
          latestScore: parseFloat(latestScore.score).toFixed(2),
          totalChange: totalChange.toFixed(2),
          trendDirection,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ilq-report-generator:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateHTMLReport(data: any): string {
  const { elderlyPerson, ilqScores, alerts, statistics } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ILQ Report - ${elderlyPerson.full_name}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #3b82f6;
          margin: 0;
        }
        .section {
          margin: 30px 0;
        }
        .section h2 {
          color: #1e40af;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin: 20px 0;
        }
        .stat-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          background: #f9fafb;
        }
        .stat-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #6b7280;
        }
        .stat-card .value {
          font-size: 32px;
          font-weight: bold;
          color: #1e40af;
        }
        .score-excellent { color: #10b981; }
        .score-good { color: #f59e0b; }
        .score-fair { color: #f97316; }
        .score-poor { color: #ef4444; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .alert-critical { color: #dc2626; font-weight: bold; }
        .alert-high { color: #ea580c; }
        .alert-medium { color: #f59e0b; }
        .alert-low { color: #6b7280; }
        .footer {
          margin-top: 60px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Independent Living Quotient (ILQ) Report</h1>
        <p><strong>${elderlyPerson.full_name}</strong></p>
        <p>Report Period: ${statistics.periodDays} days | Generated: ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="section">
        <h2>Executive Summary</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <h3>Current ILQ Score</h3>
            <div class="value ${getScoreClass(parseFloat(statistics.latestScore))}">${statistics.latestScore}</div>
            <p>${getScoreLabel(parseFloat(statistics.latestScore))}</p>
          </div>
          <div class="stat-card">
            <h3>Period Average</h3>
            <div class="value">${statistics.avgScore}</div>
          </div>
          <div class="stat-card">
            <h3>Trend</h3>
            <div class="value">${statistics.trendDirection}</div>
            <p>Change: ${statistics.totalChange > 0 ? '+' : ''}${statistics.totalChange} points</p>
          </div>
          <div class="stat-card">
            <h3>Active Alerts</h3>
            <div class="value">${alerts.filter((a: any) => a.status === 'active').length}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Component Breakdown (Latest)</h2>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Score</th>
              <th>Weight</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${generateComponentRows(ilqScores[ilqScores.length - 1])}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Recent Alerts</h2>
        ${alerts.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Severity</th>
                <th>Title</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${alerts.slice(0, 10).map((alert: any) => `
                <tr>
                  <td>${new Date(alert.created_at).toLocaleDateString()}</td>
                  <td class="alert-${alert.severity}">${alert.severity.toUpperCase()}</td>
                  <td>${alert.title}</td>
                  <td>${alert.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No alerts during this period</p>'}
      </div>

      <div class="section">
        <h2>Score History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>ILQ Score</th>
              <th>Health</th>
              <th>Activity</th>
              <th>Cognitive</th>
              <th>Data Points</th>
            </tr>
          </thead>
          <tbody>
            ${ilqScores.slice(-10).reverse().map((score: any) => `
              <tr>
                <td>${new Date(score.computation_timestamp).toLocaleDateString()}</td>
                <td class="${getScoreClass(parseFloat(score.score))}">${parseFloat(score.score).toFixed(1)}</td>
                <td>${score.health_vitals_score ? parseFloat(score.health_vitals_score).toFixed(1) : 'N/A'}</td>
                <td>${score.physical_activity_score ? parseFloat(score.physical_activity_score).toFixed(1) : 'N/A'}</td>
                <td>${score.cognitive_function_score ? parseFloat(score.cognitive_function_score).toFixed(1) : 'N/A'}</td>
                <td>${score.data_points_analyzed}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This report was automatically generated by the IoT Monitoring System</p>
        <p>© ${new Date().getFullYear()} SymbIoT - Independent Living Assessment Platform</p>
      </div>
    </body>
    </html>
  `;
}

function generateComponentRows(score: any): string {
  const components = [
    { name: 'Health Vitals', score: score.health_vitals_score, weight: '30%' },
    { name: 'Physical Activity', score: score.physical_activity_score, weight: '25%' },
    { name: 'Cognitive Function', score: score.cognitive_function_score, weight: '15%' },
    { name: 'Environmental Safety', score: score.environmental_safety_score, weight: '15%' },
    { name: 'Emergency Response', score: score.emergency_response_score, weight: '10%' },
    { name: 'Social Engagement', score: score.social_engagement_score, weight: '5%' },
  ];

  return components.map(comp => {
    const scoreValue = comp.score ? parseFloat(comp.score) : 0;
    const status = scoreValue >= 70 ? 'Good' : scoreValue >= 50 ? 'Fair' : 'Needs Attention';
    return `
      <tr>
        <td>${comp.name}</td>
        <td class="${getScoreClass(scoreValue)}">${scoreValue.toFixed(1)}</td>
        <td>${comp.weight}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');
}

function getScoreClass(score: number): string {
  if (score >= 85) return 'score-excellent';
  if (score >= 70) return 'score-good';
  if (score >= 55) return 'score-fair';
  return 'score-poor';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent - Fully Independent';
  if (score >= 70) return 'Good - Minor Assistance';
  if (score >= 55) return 'Fair - Moderate Supervision';
  if (score >= 40) return 'Poor - Significant Assistance';
  return 'Critical - Immediate Intervention';
}
