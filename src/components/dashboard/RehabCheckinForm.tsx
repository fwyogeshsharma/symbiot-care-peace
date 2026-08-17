import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PROTOCOL_LABELS, RehabEnrollmentInfo } from '@/lib/rehabProgress';

interface RehabCheckinFormProps {
  elderlyPersonId: string;
  enrollment: RehabEnrollmentInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RehabCheckinForm({ elderlyPersonId, enrollment, open, onOpenChange, onSaved }: RehabCheckinFormProps) {
  const { toast } = useToast();

  const [protocolKey, setProtocolKey] = useState('general_mobility');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [painScore, setPainScore] = useState([3]);
  const [adherencePct, setAdherencePct] = useState([80]);
  const [notes, setNotes] = useState('');

  const startProgramMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('rehab_enrollments').insert({
        elderly_person_id: elderlyPersonId,
        protocol_key: protocolKey,
        program_start_date: startDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Rehab program started', description: 'Progress will be measurable once the baseline period completes.' });
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Could not start program', description: error.message, variant: 'destructive' });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('rehab_manual_checkins').upsert(
        {
          elderly_person_id: elderlyPersonId,
          checkin_date: new Date().toISOString().split('T')[0],
          pain_score: painScore[0],
          exercise_adherence_pct: adherencePct[0],
          notes: notes || null,
        },
        { onConflict: 'elderly_person_id,checkin_date' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Check-in saved', description: "Today's pain and adherence have been logged." });
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Could not save check-in', description: error.message, variant: 'destructive' });
    },
  });

  if (!enrollment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a rehab program</DialogTitle>
            <DialogDescription>
              This anchors the baseline every future progress score is measured against.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={protocolKey} onValueChange={setProtocolKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROTOCOL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => startProgramMutation.mutate()} disabled={startProgramMutation.isPending}>
              Start program
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
            Pain and exercise adherence can't be measured by a wearable — log them here so they count toward the rehab score.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pain level</Label>
              <span className="text-sm font-medium">{painScore[0]} / 10</span>
            </div>
            <Slider value={painScore} onValueChange={setPainScore} min={0} max={10} step={1} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exercise/home-program adherence</Label>
              <span className="text-sm font-medium">{adherencePct[0]}%</span>
            </div>
            <Slider value={adherencePct} onValueChange={setAdherencePct} min={0} max={100} step={5} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the score should not miss..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => checkinMutation.mutate()} disabled={checkinMutation.isPending}>
            Save check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RehabCheckinForm;
