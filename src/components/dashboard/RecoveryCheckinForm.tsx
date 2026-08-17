import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface RecoveryCheckinFormProps {
  elderlyPersonId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RecoveryCheckinForm({ elderlyPersonId, open, onOpenChange, onSaved }: RecoveryCheckinFormProps) {
  const { toast } = useToast();

  const [cravingIntensity, setCravingIntensity] = useState([3]);
  const [notes, setNotes] = useState('');
  const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);
  const [relapseNotes, setRelapseNotes] = useState('');

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ['recovery-sobriety-events', elderlyPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_sobriety_events')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!elderlyPersonId,
  });

  const hasProgram = !!events && events.length > 0;

  const reset = () => {
    setShowRelapseConfirm(false);
    setRelapseNotes('');
    setNotes('');
  };

  const startProgramMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('recovery_sobriety_events').insert({
        elderly_person_id: elderlyPersonId,
        event_type: 'program_start',
        event_date: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Recovery tracking started', description: 'The clean-day count begins today.' });
      refetchEvents();
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Could not start tracking', description: error.message, variant: 'destructive' });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('recovery_checkins').upsert(
        {
          elderly_person_id: elderlyPersonId,
          checkin_date: new Date().toISOString().split('T')[0],
          craving_intensity: cravingIntensity[0],
          notes: notes || null,
        },
        { onConflict: 'elderly_person_id,checkin_date' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Check-in saved', description: "Today's craving level has been logged." });
      reset();
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Could not save check-in', description: error.message, variant: 'destructive' });
    },
  });

  const relapseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('recovery_sobriety_events').insert({
        elderly_person_id: elderlyPersonId,
        event_type: 'relapse',
        event_date: new Date().toISOString().split('T')[0],
        notes: relapseNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Relapse logged', description: 'The clean-day count has been reset. Support resources should be offered.' });
      reset();
      refetchEvents();
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Could not log relapse', description: error.message, variant: 'destructive' });
    },
  });

  if (!hasProgram) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start tracking recovery</DialogTitle>
            <DialogDescription>
              This begins the clean-day count every future IRQ sobriety score is measured against.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => startProgramMutation.mutate()} disabled={startProgramMutation.isPending}>
              Start tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showRelapseConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Log a relapse
            </DialogTitle>
            <DialogDescription>
              This resets the clean-day count and notifies caregivers with a critical alert. Only
              log this if a relapse actually occurred today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={relapseNotes} onChange={(e) => setRelapseNotes(e.target.value)} placeholder="Context for the care team..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelapseConfirm(false)}>
              Back
            </Button>
            <Button variant="destructive" onClick={() => relapseMutation.mutate()} disabled={relapseMutation.isPending}>
              Confirm relapse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Today's check-in</DialogTitle>
          <DialogDescription>
            Craving intensity can't be measured by a wearable — log it here so it counts toward the IRQ score.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Craving intensity</Label>
              <span className="text-sm font-medium">{cravingIntensity[0]} / 10</span>
            </div>
            <Slider value={cravingIntensity} onValueChange={setCravingIntensity} min={0} max={10} step={1} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the score should not miss..." rows={3} />
          </div>
        </div>
        <DialogFooter className="flex items-center sm:justify-between">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowRelapseConfirm(true)}>
            Log a relapse
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => checkinMutation.mutate()} disabled={checkinMutation.isPending}>
              Save check-in
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecoveryCheckinForm;
