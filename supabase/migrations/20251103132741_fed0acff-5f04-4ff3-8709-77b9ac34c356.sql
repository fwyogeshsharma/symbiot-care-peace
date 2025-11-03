-- Create geofence_places table for storing GPS-based places
CREATE TABLE public.geofence_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN ('hospital', 'mall', 'grocery', 'relative', 'doctor', 'park', 'pharmacy', 'restaurant', 'other')),
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100 CHECK (radius_meters >= 50 AND radius_meters <= 1000),
  icon TEXT,
  color TEXT DEFAULT '#3b82f6',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create geofence_events table for logging entry/exit events
CREATE TABLE public.geofence_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.geofence_places(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('entry', 'exit')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_geofence_places_elderly_person ON public.geofence_places(elderly_person_id);
CREATE INDEX idx_geofence_places_active ON public.geofence_places(elderly_person_id, is_active) WHERE is_active = true;
CREATE INDEX idx_geofence_events_elderly_person ON public.geofence_events(elderly_person_id);
CREATE INDEX idx_geofence_events_place ON public.geofence_events(place_id);
CREATE INDEX idx_geofence_events_timestamp ON public.geofence_events(timestamp DESC);

-- Enable RLS
ALTER TABLE public.geofence_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for geofence_places
CREATE POLICY "Users can view places for accessible elderly persons"
  ON public.geofence_places FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can insert places for accessible elderly persons"
  ON public.geofence_places FOR INSERT
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update places for accessible elderly persons"
  ON public.geofence_places FOR UPDATE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id))
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can delete places for accessible elderly persons"
  ON public.geofence_places FOR DELETE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- RLS Policies for geofence_events
CREATE POLICY "Users can view events for accessible elderly persons"
  ON public.geofence_events FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Service role can insert geofence events"
  ON public.geofence_events FOR INSERT
  WITH CHECK (true);

-- Trigger for updating updated_at
CREATE TRIGGER update_geofence_places_updated_at
  BEFORE UPDATE ON public.geofence_places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a table to track current geofence state for efficient detection
CREATE TABLE public.geofence_state (
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.geofence_places(id) ON DELETE CASCADE,
  entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (elderly_person_id, place_id)
);

CREATE INDEX idx_geofence_state_elderly_person ON public.geofence_state(elderly_person_id);

ALTER TABLE public.geofence_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage geofence state"
  ON public.geofence_state FOR ALL
  USING (true)
  WITH CHECK (true);