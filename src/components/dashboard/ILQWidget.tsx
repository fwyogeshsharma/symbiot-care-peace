import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ILQInfoDialog } from './ILQInfoDialog';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface ILQWidgetProps {
  elderlyPersonId: string;
  hideViewDetails?: boolean;
}

export function ILQWidget({ elderlyPersonId, hideViewDetails = false }: ILQWidgetProps) {
  const { t } = useTranslation();
  const [isComputing, setIsComputing] = useState(false);

  const { data: latestScore, isLoading, refetch } = useQuery({
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

  const computeILQ = async () => {
    setIsComputing(true);
    try {
      toast.info(t('ilq.analytics.computingScore', { defaultValue: 'Computing ILQ score...' }));

      const { data, error } = await supabase.functions.invoke('ilq-compute', {
        body: { elderly_person_id: elderlyPersonId },
      });

      if (error) throw error;

      toast.success(t('ilq.analytics.computedSuccess', {
        defaultValue: `ILQ Score computed successfully: ${data.ilq_score}`,
        score: data.ilq_score
      }));

      // Refetch the data to show the new score
      refetch();
    } catch (error: any) {
      console.error('Error computing ILQ:', error);
      toast.error(error.message || t('ilq.analytics.computeFailed', { defaultValue: 'Failed to compute ILQ score' }));
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
            {t('ilq.score')}
            <ILQInfoDialog />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse text-muted-foreground">{t('ilq.loadingILQ')}</div>
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
            {t('ilq.score')}
            <ILQInfoDialog />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <p>{t('ilq.noDataAvailable')}</p>
              <p className="text-sm mt-2">{t('ilq.dataWillAppear')}</p>
            </div>
            <Button
              onClick={computeILQ}
              disabled={isComputing}
              className="mx-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} />
              {isComputing ? t('ilq.computing', { defaultValue: 'Computing...' }) : t('ilq.analytics.computeILQ', { defaultValue: 'Compute ILQ' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = latestScore[0];
  const score = typeof current.score === 'string' ? parseFloat(current.score) : current.score;

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
    if (score >= 85) return t('ilq.excellent');
    if (score >= 70) return t('ilq.good');
    if (score >= 55) return t('ilq.fair');
    if (score >= 40) return t('ilq.poor');
    return t('ilq.critical');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('ilq.score')}
            <ILQInfoDialog />
          </span>
          {!hideViewDetails && (
            <Link
              to="/ilq-analytics"
              className="text-sm font-normal text-primary hover:underline"
            >
              {t('ilq.viewDetails')}
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Score Display */}
          <div className="flex items-center justify-center">
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
              {score.toFixed(0)}
            </div>
          </div>

          {/* Score Label */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('ilq.lastUpdated')}: {new Date(current.computation_timestamp).toLocaleDateString()}
            </div>
          </div>

          {/* Component Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">{t('ilq.health')}</div>
              <div className="font-semibold">{getScoreValue(current.health_vitals_score)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">{t('ilq.activity')}</div>
              <div className="font-semibold">{getScoreValue(current.physical_activity_score)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">{t('ilq.cognitive')}</div>
              <div className="font-semibold">{getScoreValue(current.cognitive_function_score)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground">{t('ilq.safety')}</div>
              <div className="font-semibold">{getScoreValue(current.environmental_safety_score)?.toFixed(0) || 'N/A'}</div>
            </div>
          </div>

          {/* Confidence */}
          <div className="text-xs text-center text-muted-foreground">
            {t('ilq.confidence')}: {((current.confidence_level || 0) * 100).toFixed(0)}% • {current.data_points_analyzed} {t('ilq.dataPoints')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
