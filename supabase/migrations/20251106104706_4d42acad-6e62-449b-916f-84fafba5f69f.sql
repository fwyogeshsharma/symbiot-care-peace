-- Create ideal_profiles table for storing baseline dwell time data
CREATE TABLE public.ideal_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  baseline_data JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_ideal_profiles_elderly_person ON public.ideal_profiles(elderly_person_id);
CREATE INDEX idx_ideal_profiles_active ON public.ideal_profiles(elderly_person_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.ideal_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view/manage profiles for accessible elderly persons
CREATE POLICY "Users can view ideal profiles for accessible elderly persons"
  ON public.ideal_profiles
  FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can insert ideal profiles for accessible elderly persons"
  ON public.ideal_profiles
  FOR INSERT
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update ideal profiles for accessible elderly persons"
  ON public.ideal_profiles
  FOR UPDATE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id))
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can delete ideal profiles for accessible elderly persons"
  ON public.ideal_profiles
  FOR DELETE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- Trigger to update updated_at
CREATE TRIGGER update_ideal_profiles_updated_at
  BEFORE UPDATE ON public.ideal_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one active profile per elderly person
CREATE OR REPLACE FUNCTION public.ensure_single_active_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other profiles for this elderly person
    UPDATE public.ideal_profiles
    SET is_active = false
    WHERE elderly_person_id = NEW.elderly_person_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce single active profile
CREATE TRIGGER enforce_single_active_profile
  BEFORE INSERT OR UPDATE ON public.ideal_profiles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_profile();