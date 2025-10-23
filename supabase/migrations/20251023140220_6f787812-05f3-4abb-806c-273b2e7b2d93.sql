-- Create floor_plans table for indoor positioning
CREATE TABLE IF NOT EXISTS public.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  grid_size NUMERIC DEFAULT 1.0,
  zones JSONB,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floor_plans
CREATE POLICY "Users can view floor plans for accessible elderly persons"
  ON public.floor_plans
  FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can insert floor plans for accessible elderly persons"
  ON public.floor_plans
  FOR INSERT
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update floor plans for accessible elderly persons"
  ON public.floor_plans
  FOR UPDATE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id))
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can delete floor plans for accessible elderly persons"
  ON public.floor_plans
  FOR DELETE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- Add trigger for updated_at
CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_floor_plans_elderly_person ON public.floor_plans(elderly_person_id);