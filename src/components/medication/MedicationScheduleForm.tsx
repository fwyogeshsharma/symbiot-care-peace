import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const scheduleSchema = z.object({
  medication_name: z.string().min(1, 'Medication name is required'),
  dosage_mg: z.number().nullable().optional(),
  dosage_unit: z.string().default('mg'),
  frequency: z.string().min(1, 'Frequency is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  instructions: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface MedicationScheduleFormProps {
  elderlyPersonId: string;
  editData?: {
    id: string;
    medication_name: string;
    dosage_mg: number | null;
    dosage_unit: string | null;
    frequency: string;
    times: string[];
    start_date: string;
    end_date: string | null;
    instructions: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MedicationScheduleForm({ elderlyPersonId, editData, onSuccess, onCancel }: MedicationScheduleFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [times, setTimes] = useState<string[]>(editData?.times || []);
  const [newTime, setNewTime] = useState('08:00');

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      medication_name: editData?.medication_name || '',
      dosage_mg: editData?.dosage_mg || null,
      dosage_unit: editData?.dosage_unit || 'mg',
      frequency: editData?.frequency || 'daily',
      start_date: editData?.start_date || new Date().toISOString().split('T')[0],
      end_date: editData?.end_date || '',
      instructions: editData?.instructions || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const payload = {
        elderly_person_id: elderlyPersonId,
        medication_name: data.medication_name,
        dosage_mg: data.dosage_mg,
        dosage_unit: data.dosage_unit,
        frequency: data.frequency,
        times: times,
        start_date: data.start_date,
        end_date: data.end_date || null,
        instructions: data.instructions || null,
      };

      if (editData) {
        const { error } = await supabase
          .from('medication_schedules')
          .update(payload)
          .eq('id', editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('medication_schedules')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-schedules'] });
      toast({
        title: editData ? t('medication.config.updated') : t('medication.config.added'),
        description: editData ? t('medication.config.updatedDesc') : t('medication.config.addedDesc'),
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addTime = () => {
    if (newTime && !times.includes(newTime)) {
      setTimes([...times, newTime].sort());
    }
  };

  const removeTime = (time: string) => {
    setTimes(times.filter(t => t !== time));
  };

  const onSubmit = (data: ScheduleFormData) => {
    if (times.length === 0) {
      toast({
        title: t('medication.config.noTimesTitle'),
        description: t('medication.config.noTimesDesc'),
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="medication_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('medication.config.medicationName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('medication.config.medicationNamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dosage_mg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('medication.config.dosage')}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="500" 
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dosage_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('medication.config.unit')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="mcg">mcg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="IU">IU</SelectItem>
                    <SelectItem value="tablets">tablets</SelectItem>
                    <SelectItem value="capsules">capsules</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('medication.config.frequency')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">{t('medication.config.frequencies.daily')}</SelectItem>
                  <SelectItem value="twice daily">{t('medication.config.frequencies.twiceDaily')}</SelectItem>
                  <SelectItem value="three times daily">{t('medication.config.frequencies.threeTimesDaily')}</SelectItem>
                  <SelectItem value="four times daily">{t('medication.config.frequencies.fourTimesDaily')}</SelectItem>
                  <SelectItem value="weekly">{t('medication.config.frequencies.weekly')}</SelectItem>
                  <SelectItem value="as needed">{t('medication.config.frequencies.asNeeded')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Times */}
        <div className="space-y-2">
          <FormLabel>{t('medication.config.scheduledTimes')}</FormLabel>
          <div className="flex gap-2">
            <Input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="w-32"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTime}>
              <Plus className="h-4 w-4 mr-1" />
              {t('medication.config.addTime')}
            </Button>
          </div>
          {times.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {times.map(time => (
                <Badge key={time} variant="secondary" className="gap-1">
                  {time}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeTime(time)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('medication.config.startDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('medication.config.endDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('medication.config.instructions')}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t('medication.config.instructionsPlaceholder')} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('common.saving') : (editData ? t('common.update') : t('common.add'))}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
