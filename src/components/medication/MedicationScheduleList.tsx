import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, Edit2, Trash2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, es, fr, frCA, enUS, hi, Locale } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const getDateLocale = (language: string): Locale => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
    'hi': hi,
  };
  return localeMap[language] || enUS;
};

interface MedicationSchedule {
  id: string;
  medication_name: string;
  dosage_mg: number | null;
  dosage_unit: string | null;
  frequency: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
}

interface MedicationScheduleListProps {
  elderlyPersonId: string;
  onEdit?: (schedule: MedicationSchedule) => void;
}

export function MedicationScheduleList({ elderlyPersonId, onEdit }: MedicationScheduleListProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateLocale = getDateLocale(i18n.language);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['medication-schedules', elderlyPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_schedules')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicationSchedule[];
    },
    enabled: !!elderlyPersonId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('medication_schedules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-schedules'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medication_schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-schedules'] });
      toast({
        title: t('medication.config.deleted'),
        description: t('medication.config.deletedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            {t('medication.config.noSchedules')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className={!schedule.is_active ? 'opacity-60' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{schedule.medication_name}</CardTitle>
                  {schedule.dosage_mg && (
                    <p className="text-sm text-muted-foreground">
                      {schedule.dosage_mg} {schedule.dosage_unit || 'mg'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={schedule.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: schedule.id, is_active: checked })}
                />
                <Button variant="ghost" size="icon" onClick={() => onEdit?.(schedule)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('medication.config.deleteConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('medication.config.deleteConfirmDesc', { name: schedule.medication_name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate(schedule.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('common.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {t(`medication.config.frequencies.${schedule.frequency.replace(/\s+/g, '')}`, { defaultValue: schedule.frequency })}
              </Badge>
              {schedule.times.map((time) => (
                <Badge key={time} variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {time}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{t('medication.config.from')} {format(new Date(schedule.start_date), 'PPP', { locale: dateLocale })}</span>
              </div>
              {schedule.end_date && (
                <span>{t('medication.config.to')} {format(new Date(schedule.end_date), 'PPP', { locale: dateLocale })}</span>
              )}
            </div>

            {schedule.instructions && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {schedule.instructions}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
