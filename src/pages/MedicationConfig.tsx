import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Plus, ClipboardList } from 'lucide-react';
import { MedicationScheduleForm } from '@/components/medication/MedicationScheduleForm';
import { MedicationScheduleList } from '@/components/medication/MedicationScheduleList';
import { MedicationAdherenceLog } from '@/components/medication/MedicationAdherenceLog';
import { useTranslation } from 'react-i18next';

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

export default function MedicationConfig() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSchedule, setEditSchedule] = useState<MedicationSchedule | null>(null);

  const { data: elderlyPersons } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_accessible_elderly_persons', { _user_id: user.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleEdit = (schedule: MedicationSchedule) => {
    setEditSchedule(schedule);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditSchedule(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title={t('medication.config.pageTitle')} subtitle={t('medication.config.pageSubtitle')} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Person Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              {t('medication.config.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="w-full sm:w-[300px]">
                <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('medication.config.selectPerson')} />
                  </SelectTrigger>
                  <SelectContent>
                    {elderlyPersons?.map((person: any) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPersonId && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('medication.config.addMedication')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPersonId ? (
          <Tabs defaultValue="schedules" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="schedules" className="gap-2">
                <Pill className="h-4 w-4" />
                {t('medication.config.schedules')}
              </TabsTrigger>
              <TabsTrigger value="adherence" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                {t('medication.config.adherenceLog')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedules" className="mt-6">
              <MedicationScheduleList 
                elderlyPersonId={selectedPersonId} 
                onEdit={handleEdit}
              />
            </TabsContent>

            <TabsContent value="adherence" className="mt-6">
              <MedicationAdherenceLog elderlyPersonId={selectedPersonId} limit={50} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Pill className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {t('medication.config.selectPersonPrompt')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog || !!editSchedule} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editSchedule ? t('medication.config.editMedication') : t('medication.config.addMedication')}
              </DialogTitle>
            </DialogHeader>
            {selectedPersonId && (
              <MedicationScheduleForm
                elderlyPersonId={selectedPersonId}
                editData={editSchedule || undefined}
                onSuccess={handleCloseDialog}
                onCancel={handleCloseDialog}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
