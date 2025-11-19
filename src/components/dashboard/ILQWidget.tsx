import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ILQWidgetProps {
  elderlyPersonId: string;
}

export function ILQWidget({ elderlyPersonId }: ILQWidgetProps) {
  const { userRole } = useAuth();
  const { data: latestScore, isLoading } = useQuery({
    queryKey: ['ilq-score-latest', elderlyPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ilq_scores')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .order('computation_timestamp', { ascending: false })
        .limit(2);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Independent Living Quotient (ILQ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse text-muted-foreground">Loading ILQ...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestScore || latestScore.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Independent Living Quotient (ILQ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No ILQ data available yet</p>
            <p className="text-sm mt-2">ILQ scores will appear here once device data is collected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = latestScore[0];
  const previous = latestScore[1];
  const score = typeof current.score === 'string' ? parseFloat(current.score) : current.score;
  const trend = previous ? (typeof current.score === 'string' ? parseFloat(current.score) : current.score) - (typeof previous.score === 'string' ? parseFloat(previous.score) : previous.score) : 0;

  const getScoreValue = (val: any) => {
    if (!val) return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 55) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const getTrendIcon = () => {
    if (trend > 1) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < -1) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ILQ Score
          </span>
          {userRole === 'super_admin' && (
            <Link
              to="/ilq-analytics"
              className="text-sm font-normal text-primary hover:underline"
            >
              View Details
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Score Display */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(0)}
              </div>
              <div className="absolute -bottom-1 -right-8">
                {getTrendIcon()}
              </div>
            </div>
          </div>

          {/* Score Label */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(current.computation_timestamp).toLocaleDateString()}
            </div>
          </div>

          {/* Component Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Health</div>
              <div className="font-semibold">{getScoreValue(current.health_vitals_score)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Activity</div>
              <div className="font-semibold">{getScoreValue(current.physical_activity_score)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Cognitive</div>
              <div className="font-semibold">{getScoreValue(current.cognitive_function_score)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Safety</div>
              <div className="font-semibold">{getScoreValue(current.environmental_safety_score)?.toFixed(0) || 'N/A'}</div>
            </div>
          </div>

          {/* Confidence */}
          <div className="text-xs text-center text-muted-foreground">
            Confidence: {((current.confidence_level || 0) * 100).toFixed(0)}% • {current.data_points_analyzed} data points
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
