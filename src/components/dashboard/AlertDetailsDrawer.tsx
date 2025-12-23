import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Check, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const getDateLocale = (language: string) => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
  };
  return localeMap[language] || enUS;
};

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

interface AlertDetailsDrawerProps {
  alert: Alert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertDetailsDrawer = ({ alert, open, onOpenChange }: AlertDetailsDrawerProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateLocale = getDateLocale(i18n.language);

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
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update alert status.',
        variant: "destructive",
      });
    }
  });

  if (!alert) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="destructive" className="text-sm">
              {alert.severity.toUpperCase()}
            </Badge>
            {alert.alert_type === 'panic_sos' && (
              <Badge variant="destructive" className="text-sm">
                EMERGENCY SOS
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl">
            {t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}
          </SheetTitle>
          <SheetDescription className="text-base">
            Full alert details and actions
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Person Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Person</p>
              <p className="font-semibold">{alert.elderly_persons?.full_name || 'Unknown'}</p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-semibold">
                {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm:ss', { locale: dateLocale })}
              </p>
            </div>
          </div>

          {/* Description */}
          {alert.description && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Details</p>
              <p className="text-base">
                {t(`alerts.messages.${alert.alert_type}.description`, { defaultValue: alert.description })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t">
            {alert.alert_type === 'panic_sos' && (
              <Button
                size="lg"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => {
                  toast({
                    title: 'Initiating Call',
                    description: `Calling ${alert.elderly_persons?.full_name}...`,
                  });
                }}
              >
                <Phone className="w-5 h-5" />
                Call Now
              </Button>
            )}

            {alert.status === 'active' && (
              <Button
                size="lg"
                variant="default"
                className="w-full gap-2"
                onClick={() => acknowledgeMutation.mutate(alert.id)}
                disabled={acknowledgeMutation.isPending}
              >
                <Check className="w-5 h-5" />
                {acknowledgeMutation.isPending ? 'Updating...' : 'Mark as Handled'}
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
