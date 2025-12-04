-- Create medication_schedules table
CREATE TABLE public.medication_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage_mg NUMERIC,
  dosage_unit TEXT DEFAULT 'mg',
  frequency TEXT NOT NULL DEFAULT 'daily',
  times TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create medication_adherence_logs table
CREATE TABLE public.medication_adherence_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  scheduled_time TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  dispenser_confirmed BOOLEAN DEFAULT false,
  caregiver_alerted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_adherence_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medication_schedules
CREATE POLICY "Users can view medication schedules for accessible elderly persons"
ON public.medication_schedules
FOR SELECT
USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can insert medication schedules for accessible elderly persons"
ON public.medication_schedules
FOR INSERT
WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update medication schedules for accessible elderly persons"
ON public.medication_schedules
FOR UPDATE
USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can delete medication schedules for accessible elderly persons"
ON public.medication_schedules
FOR DELETE
USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- RLS Policies for medication_adherence_logs
CREATE POLICY "Users can view adherence logs for accessible elderly persons"
ON public.medication_adherence_logs
FOR SELECT
USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can insert adherence logs for accessible elderly persons"
ON public.medication_adherence_logs
FOR INSERT
WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update adherence logs for accessible elderly persons"
ON public.medication_adherence_logs
FOR UPDATE
USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- Create trigger for updating medication_schedules.updated_at
CREATE TRIGGER update_medication_schedules_updated_at
BEFORE UPDATE ON public.medication_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_medication_schedules_elderly_person ON public.medication_schedules(elderly_person_id);
CREATE INDEX idx_medication_schedules_active ON public.medication_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_medication_adherence_logs_schedule ON public.medication_adherence_logs(schedule_id);
CREATE INDEX idx_medication_adherence_logs_elderly_person ON public.medication_adherence_logs(elderly_person_id);
CREATE INDEX idx_medication_adherence_logs_timestamp ON public.medication_adherence_logs(timestamp DESC);