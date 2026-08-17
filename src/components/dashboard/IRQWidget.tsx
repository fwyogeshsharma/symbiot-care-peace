import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IRQInfoDialog } from './IRQInfoDialog';
import { Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { IRQScoreRow } from '@/lib/irq';

interface IRQWidgetProps {
  elderlyPersonId: string;
  hideViewDetails?: boolean;
}

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

const getValue = (val: number | string | null) => {
  if (val === null) return null;
  return typeof val === 'string' ? parseFloat(val) : val;
};

export function IRQWidget({ elderlyPersonId, hideViewDetails = false }: IRQWidgetProps) {
  const [isComputing, setIsComputing] = useState(false);

  const { data: latestScore, isLoading, refetch } = useQuery({
    queryKey: ['irq-score-latest', elderlyPersonId],
    queryFn: async (): Promise<IRQScoreRow[]> => {
      const { data, error } = await supabase
        .from('irq_scores')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .order('computation_timestamp', { ascending: false })
        .limit(2);

      if (error) throw error;
      return (data ?? []) as unknown as IRQScoreRow[];
    },
    enabled: !!elderlyPersonId,
  });

  const computeIRQ = async () => {
    setIsComputing(true);
    try {
      toast.info('Computing IRQ score...');

      const { data, error } = await supabase.functions.invoke('irq-compute', {
        body: { elderly_person_id: elderlyPersonId },
      });

      if (error) throw error;

      toast.success(`IRQ score computed: ${data.irq_score}`);
      refetch();
    } catch (error) {
      console.error('Error computing IRQ:', error);
      const message = error instanceof Error ? error.message : 'Failed to compute IRQ score';
      toast.error(message);
    } finally {
      setIsComputing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            IRQ Score
            <IRQInfoDialog />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse text-muted-foreground">Loading IRQ...</div>
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
            IRQ Score
            <IRQInfoDialog />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <p>No IRQ score yet.</p>
              <p className="text-sm mt-2">Compute a score once recovery data has been logged.</p>
            </div>
            <Button onClick={computeIRQ} disabled={isComputing} className="mx-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} />
              {isComputing ? 'Computing...' : 'Compute IRQ'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = latestScore[0];
  const score = getValue(current.score) ?? 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            IRQ Score
            <IRQInfoDialog />
          </span>
          {!hideViewDetails && (
            <Link to="/irq-analytics" className="text-sm font-normal text-primary hover:underline">
              View Details
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>{score.toFixed(0)}</div>
          </div>

          <div className="text-center">
            <div className={`text-lg font-semibold ${getScoreColor(score)}`}>{getScoreLabel(score)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(current.computation_timestamp).toLocaleDateString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Sobriety</div>
              <div className="font-semibold">{getValue(current.sobriety_score)?.toFixed(0) ?? 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Craving control</div>
              <div className="font-semibold">{getValue(current.craving_control_score)?.toFixed(0) ?? 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Physiological</div>
              <div className="font-semibold">{getValue(current.physiological_stress_score)?.toFixed(0) ?? 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">Activity</div>
              <div className="font-semibold">{getValue(current.activity_routine_score)?.toFixed(0) ?? 'N/A'}</div>
            </div>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Confidence: {((getValue(current.confidence_level) ?? 0) * 100).toFixed(0)}% • {current.data_points_analyzed} data points
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IRQWidget;
