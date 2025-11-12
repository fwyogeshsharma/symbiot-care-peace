import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrendRequest {
  elderly_person_id: string;
  period?: 'daily' | 'weekly' | 'monthly';
  lookback_days?: number;
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

    const { elderly_person_id, period = 'weekly', lookback_days = 30 }: TrendRequest = await req.json();

    console.log(`Analyzing ILQ trends for ${elderly_person_id}, period: ${period}, lookback: ${lookback_days} days`);

    // Fetch historical ILQ scores
    const lookbackDate = new Date(Date.now() - lookback_days * 24 * 60 * 60 * 1000).toISOString();
    const { data: scores, error } = await supabaseClient
      .from('ilq_scores')
      .select('*')
      .eq('elderly_person_id', elderly_person_id)
      .gte('computation_timestamp', lookbackDate)
      .order('computation_timestamp', { ascending: true });

    if (error || !scores || scores.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient data for trend analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${scores.length} scores for analysis`);

    // Calculate statistics
    const scoreValues = scores.map(s => parseFloat(s.score));
    const averageScore = scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length;
    const variance = calculateVariance(scoreValues, averageScore);

    // Determine trend direction
    const recentScores = scoreValues.slice(-7); // Last 7 scores
    const olderScores = scoreValues.slice(0, 7); // First 7 scores
    const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;
    
    let trendDirection: 'improving' | 'stable' | 'declining';
    const change = recentAvg - olderAvg;
    
    if (change > 3) trendDirection = 'improving';
    else if (change < -3) trendDirection = 'declining';
    else trendDirection = 'stable';

    // Calculate change rate (per day)
    const timeSpan = (new Date(scores[scores.length - 1].computation_timestamp).getTime() - 
                      new Date(scores[0].computation_timestamp).getTime()) / (1000 * 60 * 60 * 24);
    const totalChange = scoreValues[scoreValues.length - 1] - scoreValues[0];
    const changeRate = timeSpan > 0 ? (totalChange / timeSpan) : 0;

    // Simple linear prediction for next 7 days
    const prediction7days = Math.min(100, Math.max(0, averageScore + (changeRate * 7)));

    // Generate insights
    const insights = generateInsights(scores, trendDirection, changeRate);

    // Generate recommendations
    const recommendations = generateRecommendations(scores, trendDirection);

    console.log(`Trend analysis complete: ${trendDirection}, avg: ${averageScore.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        trend_direction: trendDirection,
        average_score: Math.round(averageScore * 100) / 100,
        score_variance: Math.round(variance * 100) / 100,
        change_rate: Math.round(changeRate * 100) / 100,
        prediction_7days: Math.round(prediction7days * 100) / 100,
        insights,
        recommendations,
        data_points: scores.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ilq-trend-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateVariance(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

function generateInsights(scores: any[], trendDirection: string, changeRate: number): string[] {
  const insights: string[] = [];

  if (trendDirection === 'improving') {
    insights.push(`ILQ score is improving at a rate of ${Math.abs(changeRate).toFixed(2)} points per day`);
  } else if (trendDirection === 'declining') {
    insights.push(`ILQ score is declining at a rate of ${Math.abs(changeRate).toFixed(2)} points per day - attention needed`);
  } else {
    insights.push('ILQ score remains stable with minimal fluctuations');
  }

  // Analyze component trends
  const recentScores = scores.slice(-5);
  const componentTrends: Record<string, number[]> = {
    health_vitals: [],
    physical_activity: [],
    cognitive_function: [],
    environmental_safety: [],
    emergency_response: [],
    social_engagement: [],
  };

  recentScores.forEach(score => {
    if (score.health_vitals_score) componentTrends.health_vitals.push(parseFloat(score.health_vitals_score));
    if (score.physical_activity_score) componentTrends.physical_activity.push(parseFloat(score.physical_activity_score));
    if (score.cognitive_function_score) componentTrends.cognitive_function.push(parseFloat(score.cognitive_function_score));
    if (score.environmental_safety_score) componentTrends.environmental_safety.push(parseFloat(score.environmental_safety_score));
    if (score.emergency_response_score) componentTrends.emergency_response.push(parseFloat(score.emergency_response_score));
    if (score.social_engagement_score) componentTrends.social_engagement.push(parseFloat(score.social_engagement_score));
  });

  Object.entries(componentTrends).forEach(([component, values]) => {
    if (values.length >= 2) {
      const change = values[values.length - 1] - values[0];
      if (Math.abs(change) > 5) {
        const direction = change > 0 ? 'improved' : 'declined';
        insights.push(`${component.replace(/_/g, ' ')} has ${direction} by ${Math.abs(change).toFixed(1)} points`);
      }
    }
  });

  return insights;
}

function generateRecommendations(scores: any[], trendDirection: string): string[] {
  const recommendations: string[] = [];

  if (trendDirection === 'declining') {
    recommendations.push('Schedule a check-in to assess recent changes in daily routine');
    recommendations.push('Review medication adherence and health vitals');
    recommendations.push('Consider increasing activity levels and social engagement');
  } else if (trendDirection === 'stable') {
    recommendations.push('Continue current care routine');
    recommendations.push('Monitor for any sudden changes in patterns');
  } else {
    recommendations.push('Excellent progress - maintain current activities');
    recommendations.push('Consider gradually increasing independence in daily tasks');
  }

  // Component-specific recommendations
  const latestScore = scores[scores.length - 1];
  if (latestScore.physical_activity_score < 50) {
    recommendations.push('Encourage more physical activity and movement');
  }
  if (latestScore.social_engagement_score < 50) {
    recommendations.push('Increase social interaction and outdoor activities');
  }

  return recommendations;
}
