-- Update the place_type check constraint to include 'home' and 'work'
ALTER TABLE public.geofence_places DROP CONSTRAINT IF EXISTS geofence_places_place_type_check;

ALTER TABLE public.geofence_places ADD CONSTRAINT geofence_places_place_type_check CHECK (place_type IN ('home', 'work', 'hospital', 'mall', 'grocery', 'relative', 'doctor', 'park', 'pharmacy', 'restaurant', 'other'));