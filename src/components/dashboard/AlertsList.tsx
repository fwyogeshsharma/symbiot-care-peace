import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  elderly_persons?: { full_name: string };
}

interface AlertsListProps {
  alerts: Alert[];
}

const AlertsList = ({ alerts }: AlertsListProps) => {
  const { toast } = useToast();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive';
      case 'high':
        return 'bg-warning';
      case 'medium':
        return 'bg-accent';
      case 'low':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ 
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged",
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Alerts</h3>
        <Badge variant="outline" className="animate-pulse-soft">
          {alerts.length} Active
        </Badge>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-muted-foreground">All clear! No active alerts.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <h4 className="font-semibold">{alert.title}</h4>
                </div>
                <Badge className={`${getSeverityColor(alert.severity)} capitalize text-xs`}>
                  {alert.severity}
                </Badge>
              </div>
              
              {alert.description && (
                <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {alert.elderly_persons?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                
                {alert.status === 'active' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AlertsList;