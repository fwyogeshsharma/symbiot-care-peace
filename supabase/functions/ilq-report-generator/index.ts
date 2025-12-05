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

    // Fetch medication schedules
    const { data: medicationSchedules } = await supabaseClient
      .from('medication_schedules')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .eq('is_active', true);

    // Fetch medication adherence logs
    const { data: adherenceLogs } = await supabaseClient
      .from('medication_adherence_logs')
      .select(`
        *,
        medication_schedules(medication_name, dosage_mg, dosage_unit, frequency, times, instructions)
      `)
      .eq('elderly_person_id', elderly_person_id)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: false });

    // Process medication data from new tables
    const medicationStats = processMedicationAnalytics(
      medicationSchedules || [],
      adherenceLogs || [],
      period_days
    );

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
      medicationStats,
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
  const { elderlyPerson, ilqScores, alerts, medicationStats, statistics } = data;

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
          page-break-inside: avoid;
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
        .chart-container {
          margin: 20px 0;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 15px;
        }
        .medication-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .medication-stat {
          text-align: center;
          padding: 15px;
          border-radius: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        }
        .medication-stat .label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        .medication-stat .value {
          font-size: 24px;
          font-weight: bold;
        }
        .compliance-excellent { color: #10b981; }
        .compliance-good { color: #3b82f6; }
        .compliance-fair { color: #f59e0b; }
        .compliance-poor { color: #ef4444; }
        .compliance-ring {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }
        .bar-chart {
          display: flex;
          align-items: flex-end;
          height: 200px;
          gap: 4px;
          padding: 10px 0;
          border-bottom: 2px solid #e5e7eb;
        }
        .bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 30px;
        }
        .bar-stack {
          width: 100%;
          display: flex;
          flex-direction: column-reverse;
        }
        .bar-taken {
          background: #10b981;
          min-height: 2px;
        }
        .bar-missed {
          background: #ef4444;
          min-height: 2px;
        }
        .bar-label {
          font-size: 9px;
          color: #6b7280;
          margin-top: 5px;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
        .legend {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 15px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
        }
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
        .legend-taken { background: #10b981; }
        .legend-missed { background: #ef4444; }
        .dose-timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 15px 0;
        }
        .dose-item {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .dose-taken {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }
        .dose-missed {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #ef4444;
        }
        .dose-late {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }
        .dose-med {
          font-weight: 600;
          font-size: 10px;
          margin-bottom: 2px;
        }
        .dose-time {
          font-weight: 600;
        }
        .dose-date {
          font-size: 10px;
          opacity: 0.8;
        }
        .ilq-impact-note {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }
        .ilq-impact-note h4 {
          color: #1e40af;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .ilq-impact-note p {
          margin: 0;
          font-size: 13px;
          color: #374151;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          .section { page-break-inside: avoid; }
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
        <h2>ILQ Score Trend</h2>
        <div class="chart-container">
          <div class="chart-title">ILQ Score Over Time</div>
          ${generateILQLineChart(ilqScores)}
        </div>
        <div class="chart-container">
          <div class="chart-title">Component Scores Breakdown</div>
          ${generateComponentBarChart(ilqScores[ilqScores.length - 1])}
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
        <h2>Medication Management</h2>
        ${medicationStats.totalDoses > 0 ? `
          <div class="medication-grid">
            <div class="medication-stat">
              <div class="label">Total Scheduled</div>
              <div class="value">${medicationStats.totalDoses}</div>
            </div>
            <div class="medication-stat">
              <div class="label">Taken On Time</div>
              <div class="value compliance-excellent">${medicationStats.takenCount}</div>
            </div>
            <div class="medication-stat">
              <div class="label">Taken Late</div>
              <div class="value compliance-good">${medicationStats.lateCount}</div>
            </div>
            <div class="medication-stat">
              <div class="label">Missed</div>
              <div class="value compliance-poor">${medicationStats.missedCount}</div>
            </div>
          </div>

          <div class="medication-grid" style="margin-top: 15px;">
            <div class="medication-stat">
              <div class="label">Compliance Rate</div>
              <div class="value ${getComplianceClass(medicationStats.complianceRate)}">${medicationStats.complianceRate}%</div>
            </div>
            <div class="medication-stat">
              <div class="label">On-Time Rate</div>
              <div class="value ${getComplianceClass(medicationStats.onTimeRate)}">${medicationStats.onTimeRate}%</div>
            </div>
            <div class="medication-stat">
              <div class="label">Active Medications</div>
              <div class="value">${medicationStats.activeMedications}</div>
            </div>
            <div class="medication-stat">
              <div class="label">Compliance Trend</div>
              <div class="value ${medicationStats.trend === 'improving' ? 'compliance-excellent' : medicationStats.trend === 'declining' ? 'compliance-poor' : ''}">${medicationStats.trend === 'improving' ? '↑ Improving' : medicationStats.trend === 'declining' ? '↓ Declining' : '→ Stable'}</div>
            </div>
          </div>

          <div class="chart-container">
            <div class="chart-title">Medication Compliance Overview</div>
            <div class="compliance-ring">
              ${generateComplianceRing(medicationStats.complianceRate)}
            </div>
          </div>

          ${medicationStats.dailyStats.length > 0 ? `
            <div class="chart-container">
              <div class="chart-title">Daily Medication Adherence (Last 14 Days)</div>
              <div class="bar-chart">
                ${medicationStats.dailyStats.slice(-14).map((day: any) => {
                  const total = day.taken + day.missed + day.late;
                  const maxHeight = 180;
                  const takenHeight = total > 0 ? (day.taken / total) * maxHeight : 0;
                  const lateHeight = total > 0 ? (day.late / total) * maxHeight : 0;
                  const missedHeight = total > 0 ? (day.missed / total) * maxHeight : 0;
                  const dateLabel = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return `
                    <div class="bar-group">
                      <div class="bar-stack" style="height: ${maxHeight}px;">
                        <div class="bar-taken" style="height: ${takenHeight}px;" title="Taken: ${day.taken}"></div>
                        <div style="height: ${lateHeight}px; background: #f59e0b;" title="Late: ${day.late}"></div>
                        <div class="bar-missed" style="height: ${missedHeight}px;" title="Missed: ${day.missed}"></div>
                      </div>
                      <div class="bar-label">${dateLabel}</div>
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="legend">
                <div class="legend-item"><div class="legend-dot legend-taken"></div>Taken</div>
                <div class="legend-item"><div class="legend-dot" style="background: #f59e0b;"></div>Late</div>
                <div class="legend-item"><div class="legend-dot legend-missed"></div>Missed</div>
              </div>
            </div>
          ` : ''}

          ${medicationStats.medicationBreakdown.length > 0 ? `
            <div class="chart-container">
              <div class="chart-title">Per-Medication Compliance</div>
              <table style="margin: 0;">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Doses</th>
                    <th>Compliance</th>
                    <th>Current Streak</th>
                  </tr>
                </thead>
                <tbody>
                  ${medicationStats.medicationBreakdown.map((med: any) => `
                    <tr>
                      <td><strong>${med.name}</strong></td>
                      <td>${med.dosage}</td>
                      <td>${med.frequency}</td>
                      <td>${med.taken}/${med.total}</td>
                      <td class="${getComplianceClass(med.complianceRate)}">${med.complianceRate}%</td>
                      <td>${med.streak} doses</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${medicationStats.timeSlotStats.length > 0 ? `
            <div class="chart-container">
              <div class="chart-title">Compliance by Time of Day</div>
              <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                ${medicationStats.timeSlotStats.map((slot: any) => `
                  <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">${slot.timeSlot}</div>
                    <div style="font-size: 24px; font-weight: bold;" class="${getComplianceClass(slot.complianceRate)}">${slot.complianceRate}%</div>
                    <div style="font-size: 11px; color: #9ca3af;">${slot.taken}/${slot.total} doses</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="chart-container">
            <div class="chart-title">Recent Medication Activity</div>
            <div class="dose-timeline">
              ${medicationStats.recentDoses.slice(0, 15).map((dose: any) => {
                const dt = new Date(dose.timestamp);
                const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const statusClass = dose.status === 'taken' ? 'dose-taken' : dose.status === 'late' ? 'dose-late' : 'dose-missed';
                const statusLabel = dose.status === 'taken' ? 'On Time' : dose.status === 'late' ? 'Late' : 'Missed';
                return `
                  <div class="dose-item ${statusClass}">
                    <span class="dose-med">${dose.medicationName}</span>
                    <span class="dose-time">${time}</span>
                    <span class="dose-date">${date}</span>
                    <span>${statusLabel}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          ${medicationStats.insights.length > 0 ? `
            <div class="chart-container">
              <div class="chart-title">Insights & Recommendations</div>
              <ul style="margin: 0; padding-left: 20px;">
                ${medicationStats.insights.map((insight: string) => `<li style="margin-bottom: 8px; color: #374151;">${insight}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="ilq-impact-note">
            <h4>Impact on ILQ Score</h4>
            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 11px; color: #6b7280;">Cognitive Contribution</div>
                <div style="font-size: 20px; font-weight: bold; color: #1e40af;">${medicationStats.ilqImpact.cognitiveScore}</div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 11px; color: #6b7280;">Routine Score</div>
                <div style="font-size: 20px; font-weight: bold; color: #1e40af;">${medicationStats.ilqImpact.routineScore}</div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 11px; color: #6b7280;">Consistency Score</div>
                <div style="font-size: 20px; font-weight: bold; color: #1e40af;">${medicationStats.ilqImpact.consistencyScore}</div>
              </div>
            </div>
            <p>
              Medication adherence directly affects the <strong>Cognitive Function</strong> component of the ILQ score.
              ${medicationStats.complianceRate >= 90
                ? 'Excellent compliance is positively contributing to the overall ILQ score.'
                : medicationStats.complianceRate >= 70
                  ? 'Good compliance is helping maintain a healthy ILQ score.'
                  : medicationStats.complianceRate >= 50
                    ? 'Moderate compliance may be affecting the ILQ score. Consider strategies to improve adherence.'
                    : 'Low compliance is negatively impacting the ILQ score. Immediate attention to medication management is recommended.'}
            </p>
          </div>
        ` : '<p>No medication data available for this period.</p>'}
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

function getComplianceClass(rate: number): string {
  if (rate >= 90) return 'compliance-excellent';
  if (rate >= 70) return 'compliance-good';
  if (rate >= 50) return 'compliance-fair';
  return 'compliance-poor';
}

function generateILQLineChart(ilqScores: any[]): string {
  if (!ilqScores || ilqScores.length === 0) {
    return '<p style="text-align: center; color: #6b7280;">No data available for chart</p>';
  }

  const chartWidth = 700;
  const chartHeight = 300;
  const padding = { top: 20, right: 30, bottom: 60, left: 50 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const scores = ilqScores.slice(-20);
  const minScore = 0;
  const maxScore = 100;

  const points = scores.map((score, index) => {
    const x = padding.left + (index / (scores.length - 1 || 1)) * graphWidth;
    const y = padding.top + graphHeight - ((parseFloat(score.score) - minScore) / (maxScore - minScore)) * graphHeight;
    return { x, y, score: parseFloat(score.score), date: new Date(score.computation_timestamp) };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;

  const gridLines = [0, 25, 50, 75, 100].map(val => {
    const y = padding.top + graphHeight - (val / 100) * graphHeight;
    return `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4"/><text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6b7280">${val}</text>`;
  }).join('');

  const step = Math.ceil(scores.length / 6);
  const xLabels = points.filter((_, i) => i % step === 0 || i === points.length - 1).map(p =>
    `<text x="${p.x}" y="${chartHeight - 25}" text-anchor="middle" font-size="10" fill="#6b7280" transform="rotate(-45 ${p.x} ${chartHeight - 25})">${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`
  ).join('');

  const dots = points.map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#3b82f6" stroke="white" stroke-width="2"/><title>${p.date.toLocaleDateString()}: ${p.score.toFixed(1)}</title>`
  ).join('');

  return `
    <svg width="100%" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" style="max-width: 100%;">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.05" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#areaGradient)" />
      <path d="${linePath}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      ${xLabels}
      <text x="15" y="${chartHeight / 2}" text-anchor="middle" font-size="12" fill="#374151" transform="rotate(-90 15 ${chartHeight / 2})">ILQ Score</text>
    </svg>
  `;
}

function generateComponentBarChart(latestScore: any): string {
  if (!latestScore) {
    return '<p style="text-align: center; color: #6b7280;">No data available for chart</p>';
  }

  const components = [
    { name: 'Health', score: latestScore.health_vitals_score, color: '#10b981' },
    { name: 'Activity', score: latestScore.physical_activity_score, color: '#3b82f6' },
    { name: 'Cognitive', score: latestScore.cognitive_function_score, color: '#8b5cf6' },
    { name: 'Safety', score: latestScore.environmental_safety_score, color: '#f59e0b' },
    { name: 'Emergency', score: latestScore.emergency_response_score, color: '#ef4444' },
    { name: 'Social', score: latestScore.social_engagement_score, color: '#ec4899' },
  ];

  const chartWidth = 600;
  const chartHeight = 250;
  const barHeight = 30;
  const barGap = 10;
  const labelWidth = 80;
  const valueWidth = 50;
  const maxBarWidth = chartWidth - labelWidth - valueWidth - 40;

  const bars = components.map((comp, index) => {
    const scoreValue = comp.score ? parseFloat(comp.score) : 0;
    const barWidth = (scoreValue / 100) * maxBarWidth;
    const y = 20 + index * (barHeight + barGap);

    return `
      <g>
        <text x="${labelWidth - 10}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-size="12" fill="#374151">${comp.name}</text>
        <rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${comp.color}" rx="4"/>
        <rect x="${labelWidth}" y="${y}" width="${maxBarWidth}" height="${barHeight}" fill="none" stroke="#e5e7eb" rx="4"/>
        <text x="${labelWidth + maxBarWidth + 10}" y="${y + barHeight / 2 + 5}" font-size="12" font-weight="bold" fill="${comp.color}">${scoreValue.toFixed(0)}%</text>
      </g>
    `;
  }).join('');

  return `<svg width="100%" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" style="max-width: 100%;">${bars}</svg>`;
}

function generateComplianceRing(percentage: number): string {
  const radius = 70;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 90 ? '#10b981' : percentage >= 70 ? '#3b82f6' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  return `
    <svg width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="${strokeWidth}"/>
      <circle cx="100" cy="100" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 100 100)"/>
      <text x="100" y="95" text-anchor="middle" font-size="32" font-weight="bold" fill="${color}">${percentage}%</text>
      <text x="100" y="120" text-anchor="middle" font-size="12" fill="#6b7280">Compliance</text>
    </svg>
  `;
}

function processMedicationAnalytics(schedules: any[], logs: any[], periodDays: number) {
  if (!logs || logs.length === 0) {
    return {
      totalDoses: 0,
      takenCount: 0,
      lateCount: 0,
      missedCount: 0,
      complianceRate: 0,
      onTimeRate: 0,
      activeMedications: schedules?.length || 0,
      trend: 'stable' as const,
      dailyStats: [],
      recentDoses: [],
      medicationBreakdown: [],
      timeSlotStats: [],
      insights: [],
      ilqImpact: { cognitiveScore: 0, routineScore: 0, consistencyScore: 0 }
    };
  }

  const totalDoses = logs.length;
  const takenCount = logs.filter((l: any) => l.status === 'taken').length;
  const lateCount = logs.filter((l: any) => l.status === 'late').length;
  const missedCount = logs.filter((l: any) => l.status === 'missed').length;
  const complianceRate = totalDoses > 0 ? Math.round(((takenCount + lateCount) / totalDoses) * 100) : 0;
  const onTimeRate = totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0;

  // Calculate trend
  const midpoint = new Date(Date.now() - (periodDays / 2) * 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter((l: any) => new Date(l.timestamp) >= midpoint);
  const olderLogs = logs.filter((l: any) => new Date(l.timestamp) < midpoint);

  const recentCompliance = recentLogs.length > 0
    ? (recentLogs.filter((l: any) => l.status === 'taken' || l.status === 'late').length / recentLogs.length) * 100
    : 0;
  const olderCompliance = olderLogs.length > 0
    ? (olderLogs.filter((l: any) => l.status === 'taken' || l.status === 'late').length / olderLogs.length) * 100
    : 0;
  const trendChange = recentCompliance - olderCompliance;
  const trend = trendChange > 5 ? 'improving' : trendChange < -5 ? 'declining' : 'stable';

  // Daily stats
  const dailyMap: Record<string, { date: string; taken: number; missed: number; late: number }> = {};
  for (let i = 0; i < Math.min(periodDays, 30); i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap[dateStr] = { date: dateStr, taken: 0, missed: 0, late: 0 };
  }

  logs.forEach((log: any) => {
    const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
    if (dailyMap[dateStr]) {
      if (log.status === 'taken') dailyMap[dateStr].taken++;
      else if (log.status === 'late') dailyMap[dateStr].late++;
      else if (log.status === 'missed') dailyMap[dateStr].missed++;
    }
  });
  const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Recent doses with medication name
  const recentDoses = logs.slice(0, 20).map((log: any) => ({
    timestamp: log.timestamp,
    status: log.status,
    medicationName: log.medication_schedules?.medication_name || 'Unknown',
    scheduledTime: log.scheduled_time
  }));

  // Medication breakdown
  const medMap: Record<string, any> = {};
  schedules.forEach((schedule: any) => {
    medMap[schedule.id] = {
      name: schedule.medication_name,
      dosage: schedule.dosage_mg ? `${schedule.dosage_mg} ${schedule.dosage_unit || 'mg'}` : '-',
      frequency: schedule.frequency,
      total: 0,
      taken: 0,
      late: 0,
      missed: 0,
      complianceRate: 0,
      streak: 0
    };
  });

  logs.forEach((log: any) => {
    if (medMap[log.schedule_id]) {
      medMap[log.schedule_id].total++;
      if (log.status === 'taken') medMap[log.schedule_id].taken++;
      else if (log.status === 'late') medMap[log.schedule_id].late++;
      else if (log.status === 'missed') medMap[log.schedule_id].missed++;
    }
  });

  // Calculate streaks and compliance per medication
  Object.keys(medMap).forEach(scheduleId => {
    const med = medMap[scheduleId];
    if (med.total > 0) {
      med.complianceRate = Math.round(((med.taken + med.late) / med.total) * 100);
    }

    // Calculate streak
    const medLogs = logs
      .filter((l: any) => l.schedule_id === scheduleId)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let streak = 0;
    for (const log of medLogs) {
      if (log.status === 'taken' || log.status === 'late') streak++;
      else break;
    }
    med.streak = streak;
  });

  const medicationBreakdown = Object.values(medMap).filter((m: any) => m.total > 0);

  // Time slot stats
  const timeSlots: Record<string, any> = {
    'Morning': { timeSlot: 'Morning (6-12)', total: 0, taken: 0 },
    'Afternoon': { timeSlot: 'Afternoon (12-18)', total: 0, taken: 0 },
    'Evening': { timeSlot: 'Evening (18-22)', total: 0, taken: 0 },
    'Night': { timeSlot: 'Night (22-6)', total: 0, taken: 0 }
  };

  logs.forEach((log: any) => {
    const hour = parseInt(log.scheduled_time?.split(':')[0] || '12', 10);
    let slot: string;
    if (hour >= 6 && hour < 12) slot = 'Morning';
    else if (hour >= 12 && hour < 18) slot = 'Afternoon';
    else if (hour >= 18 && hour < 22) slot = 'Evening';
    else slot = 'Night';

    timeSlots[slot].total++;
    if (log.status === 'taken' || log.status === 'late') {
      timeSlots[slot].taken++;
    }
  });

  const timeSlotStats = Object.values(timeSlots)
    .filter((s: any) => s.total > 0)
    .map((s: any) => ({
      ...s,
      complianceRate: Math.round((s.taken / s.total) * 100)
    }));

  // Generate insights
  const insights: string[] = [];
  if (complianceRate >= 90) {
    insights.push('Excellent medication adherence! Keep up the great work.');
  } else if (complianceRate >= 70) {
    insights.push('Good medication adherence with room for improvement.');
  } else if (complianceRate < 50) {
    insights.push('Medication adherence needs attention. Consider additional reminders.');
  }

  if (trend === 'improving') {
    insights.push('Your medication compliance is improving over time.');
  } else if (trend === 'declining') {
    insights.push('Medication compliance has been declining recently.');
  }

  const worstTimeSlot = timeSlotStats.reduce((worst: any, current: any) =>
    current.complianceRate < worst.complianceRate ? current : worst,
    timeSlotStats[0]
  );
  if (worstTimeSlot && worstTimeSlot.complianceRate < 70 && worstTimeSlot.total >= 5) {
    insights.push(`${worstTimeSlot.timeSlot} doses tend to be missed more often.`);
  }

  // Calculate ILQ impact
  const cognitiveScore = Math.round(complianceRate * 0.6 + onTimeRate * 0.3 + (trend === 'improving' ? 10 : trend === 'declining' ? -10 : 0));
  const routineScore = onTimeRate;

  // Consistency score based on daily variance
  const dailyRates = dailyStats
    .filter(d => d.taken + d.missed + d.late > 0)
    .map(d => ((d.taken + d.late) / (d.taken + d.missed + d.late)) * 100);

  let consistencyScore = 100;
  if (dailyRates.length > 1) {
    const mean = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length;
    const variance = dailyRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyRates.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.round(Math.max(0, 100 - stdDev));
  }

  return {
    totalDoses,
    takenCount,
    lateCount,
    missedCount,
    complianceRate,
    onTimeRate,
    activeMedications: schedules?.length || 0,
    trend,
    dailyStats,
    recentDoses,
    medicationBreakdown,
    timeSlotStats,
    insights,
    ilqImpact: {
      cognitiveScore: Math.min(100, Math.max(0, cognitiveScore)),
      routineScore: Math.min(100, Math.max(0, routineScore)),
      consistencyScore: Math.min(100, Math.max(0, consistencyScore))
    }
  };
}
