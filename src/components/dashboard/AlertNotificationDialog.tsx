import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface AlertNotificationDialogProps {
  newAlert: Alert | null;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
}

export const AlertNotificationDialog = ({ newAlert, onClose, onAcknowledge }: AlertNotificationDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (newAlert) {
      setIsOpen(true);
      // Play notification sound
      playNotificationSound(newAlert.severity);
    }
  }, [newAlert]);

  const playNotificationSound = (severity: string) => {
    // You can add different sounds based on severity
    // For now, we'll use the browser's notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Alert', {
        body: newAlert?.title || 'A new alert has been generated',
        icon: '/favicon.ico',
        tag: newAlert?.id,
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const handleAcknowledge = async () => {
    if (!newAlert) return;

    onAcknowledge(newAlert.id);
    setIsOpen(false);
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-accent text-accent-foreground';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-6 w-6" />;
    }
    return <Bell className="h-6 w-6" />;
  };

  if (!newAlert) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getSeverityColor(newAlert.severity)}`}>
                {getSeverityIcon(newAlert.severity)}
              </div>
              <div>
                <DialogTitle className="text-lg">New Alert</DialogTitle>
                <DialogDescription className="text-sm">
                  {format(new Date(newAlert.created_at), 'PPp')}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge className={`${getSeverityColor(newAlert.severity)} capitalize`}>
              {newAlert.severity}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {newAlert.alert_type.replace('_', ' ')}
            </Badge>
          </div>

          <div>
            <h4 className="font-semibold text-base mb-2">{newAlert.title}</h4>
            {newAlert.description && (
              <p className="text-sm text-muted-foreground">{newAlert.description}</p>
            )}
          </div>

          {newAlert.elderly_persons?.full_name && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Person:</span> {newAlert.elderly_persons.full_name}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            View Later
          </Button>
          <Button onClick={handleAcknowledge} className="gap-2">
            Acknowledge Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
