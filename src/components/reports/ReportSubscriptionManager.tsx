import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Clock, Mail, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Helper function to convert local time to UTC
const convertLocalTimeToUTC = (localTime: string, timezone: string): string => {
  try {
    // Create a date object for today with the local time
    const today = new Date();
    const [hours, minutes] = localTime.split(':').map(Number);

    // Create a date string in the format that respects the timezone
    const dateStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const localDateTime = new Date(`${dateStr}T${localTime}:00`);

    // Get the timezone offset for the user's timezone
    const localDateTimeStr = localDateTime.toLocaleString('en-US', { timeZone: timezone });
    const localDateObj = new Date(localDateTimeStr);
    const utcDateObj = new Date(localDateTime.getTime() - (localDateObj.getTime() - localDateTime.getTime()));

    // Convert to UTC
    const utcHours = utcDateObj.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = utcDateObj.getUTCMinutes().toString().padStart(2, '0');
    const utcSeconds = utcDateObj.getUTCSeconds().toString().padStart(2, '0');

    return `${utcHours}:${utcMinutes}:${utcSeconds}`;
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    // Fallback: return the original time with seconds
    return `${localTime}:00`;
  }
};

// Helper function to convert UTC time to local time
const convertUTCToLocalTime = (utcTime: string, timezone: string): string => {
  try {
    // Create a UTC date with the time
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const utcDateTime = new Date(`${dateStr}T${utcTime}Z`); // Z indicates UTC

    // Convert to user's local timezone
    const localHours = utcDateTime.getHours().toString().padStart(2, '0');
    const localMinutes = utcDateTime.getMinutes().toString().padStart(2, '0');

    return `${localHours}:${localMinutes}`;
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    // Fallback: return the time without seconds
    return utcTime.slice(0, 5);
  }
};

interface ReportSubscriptionManagerProps {
  selectedPerson: string;
}

export const ReportSubscriptionManager = ({ selectedPerson }: ReportSubscriptionManagerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scheduleTime, setScheduleTime] = useState('21:00');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch existing subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['report-subscription', user?.id, selectedPerson],
    queryFn: async () => {
      if (!user?.id || selectedPerson === 'all') return null;

      const { data, error } = await supabase
        .from('report_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('elderly_person_id', selectedPerson)
        .eq('report_type', 'daily_summary')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && selectedPerson !== 'all',
  });

  // Convert UTC time from subscription to local time for display
  useEffect(() => {
    if (subscription?.schedule_time) {
      const localTime = convertUTCToLocalTime(subscription.schedule_time, userTimezone);
      setScheduleTime(localTime);
    }
  }, [subscription, userTimezone]);

  // Create or update subscription
  const upsertMutation = useMutation({
    mutationFn: async ({ isActive, time }: { isActive: boolean; time: string }) => {
      if (!user?.id || selectedPerson === 'all') throw new Error('Invalid selection');

      // Convert local time to UTC for storage
      const utcTime = convertLocalTimeToUTC(time, userTimezone);

      const subscriptionData = {
        user_id: user.id,
        elderly_person_id: selectedPerson,
        report_type: 'daily_summary',
        schedule_time: utcTime,
        is_active: isActive,
        timezone: userTimezone, // Still store timezone for display purposes
      };

      if (subscription?.id) {
        const { error } = await supabase
          .from('report_subscriptions')
          .update({
            schedule_time: utcTime,
            is_active: isActive,
            timezone: userTimezone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_subscriptions')
          .insert(subscriptionData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-subscription'] });
      toast.success(t('reports.subscription.saved', { defaultValue: 'Subscription settings saved!' }));
    },
    onError: (error: any) => {
      toast.error(error.message || t('reports.subscription.saveFailed', { defaultValue: 'Failed to save subscription' }));
    },
  });

  // Delete subscription
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.id) return;
      
      const { error } = await supabase
        .from('report_subscriptions')
        .delete()
        .eq('id', subscription.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-subscription'] });
      toast.success(t('reports.subscription.removed', { defaultValue: 'Subscription removed' }));
    },
  });

  const handleToggle = (checked: boolean) => {
    upsertMutation.mutate({
      isActive: checked,
      time: scheduleTime, // Use the local time from state (already converted from UTC)
    });
  };

  const handleTimeChange = (time: string) => {
    setScheduleTime(time);
    if (subscription?.is_active) {
      upsertMutation.mutate({ isActive: true, time });
    }
  };

  const handleSubscribe = () => {
    upsertMutation.mutate({ isActive: true, time: scheduleTime });
  };

  const handleSendTestReport = async () => {
    if (!user?.id) return;
    
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-scheduled-report', {
        body: { test: true, userId: user.id },
      });

      if (error) throw error;

      if (data?.results?.length > 0) {
        const result = data.results[0];
        if (result.success) {
          toast.success(`Test report sent to ${result.email}!`);
        } else {
          toast.error(`Failed to send: ${result.error}`);
        }
      } else {
        toast.info('No subscriptions found to send reports for.');
      }
    } catch (error: any) {
      console.error('Error sending test report:', error);
      toast.error(error.message || 'Failed to send test report');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (selectedPerson === 'all') {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('reports.subscription.selectPerson', { defaultValue: 'Please select a specific person to manage email subscriptions' })}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5" />
          {t('reports.subscription.title', { defaultValue: 'Daily Report Email' })}
        </CardTitle>
        <CardDescription>
          {t('reports.subscription.description', { 
            defaultValue: 'Receive a daily summary report via email at your preferred time' 
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription?.is_active ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <Label>{t('reports.subscription.enabled', { defaultValue: 'Email notifications enabled' })}</Label>
              </div>
              <Switch
                checked={subscription.is_active}
                onCheckedChange={handleToggle}
                disabled={upsertMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('reports.subscription.scheduleTime', { defaultValue: 'Daily report time' })}
              </Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={upsertMutation.isPending}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('reports.subscription.timezoneNote', {
                  defaultValue: 'Times are shown in your local timezone (stored as UTC)'
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestReport}
                disabled={isSendingTest}
                className="flex-1"
              >
                {isSendingTest ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {t('reports.subscription.sendTest', { defaultValue: 'Send Test Now' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {t('reports.subscription.unsubscribe', { defaultValue: 'Unsubscribe' })}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('reports.subscription.selectTime', { defaultValue: 'Select delivery time' })}
              </Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={upsertMutation.isPending}
              className="w-full"
            >
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {t('reports.subscription.subscribe', { defaultValue: 'Subscribe to Daily Report' })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
