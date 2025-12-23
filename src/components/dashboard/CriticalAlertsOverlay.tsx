import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { AlertDetailsDrawer } from './AlertDetailsDrawer';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  elderly_person_id: string;
  elderly_persons?: { full_name: string };
}

interface CriticalAlertsOverlayProps {
  alerts: Alert[];
}

/**
 * SLIM CRITICAL ALERTS STRIP
 *
 * UX Principles Applied:
 * - Calm interface: Show urgency without hijacking the screen
 * - Single-line summary with clear actions
 * - Soft red background (10-15% opacity), no thick borders
 * - Height: ~48-56px per alert
 * - Full details in drawer on "View" click
 */
const CriticalAlertsOverlay = ({ alerts }: CriticalAlertsOverlayProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter for critical alerts only
  const criticalAlerts = alerts.filter(alert =>
    alert.severity === 'critical' || alert.alert_type === 'panic_sos'
  );

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate alerts query
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      // Invalidate person health status to update their indicator (🔴→🟢)
      queryClient.invalidateQueries({ queryKey: ['person-health-status'] });
      toast({
        title: 'Alert Handled',
        description: 'The alert has been marked as handled.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update alert status.',
        variant: "destructive",
      });
    }
  });

  const handleView = (alert: Alert) => {
    setSelectedAlert(alert);
    setDrawerOpen(true);
  };

  if (criticalAlerts.length === 0) return null;

  return (
    <>
      <div className="mb-4 space-y-2">
        {criticalAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between gap-4 h-14 px-4 bg-destructive/10 rounded-lg"
          >
            {/* Left: Alert summary */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-sm truncate">
                  {t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  · {alert.elderly_persons?.full_name}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => handleView(alert)}
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1"
                onClick={() => acknowledgeMutation.mutate(alert.id)}
                disabled={acknowledgeMutation.isPending}
              >
                <Check className="w-4 h-4" />
                {acknowledgeMutation.isPending ? 'Saving...' : 'Mark Handled'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Details Drawer */}
      <AlertDetailsDrawer
        alert={selectedAlert}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
};

export default CriticalAlertsOverlay;
