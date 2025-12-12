-- Update function to include profile avatar in elderly persons query
-- This allows displaying user profile photos on monitored individual cards

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_accessible_elderly_persons(uuid);

-- Create the new function with updated return type
CREATE OR REPLACE FUNCTION public.get_accessible_elderly_persons(_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  date_of_birth date,
  address text,
  emergency_contact text,
  medical_conditions text[],
  medications text[],
  photo_url text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    ep.id,
    ep.user_id,
    ep.full_name,
    ep.date_of_birth,
    ep.address,
    ep.emergency_contact,
    ep.medical_conditions,
    ep.medications,
    -- Use profile avatar_url if exists, otherwise use elderly_persons photo_url
    COALESCE(p.avatar_url, ep.photo_url) as photo_url,
    ep.status,
    ep.created_at,
    ep.updated_at
  FROM public.elderly_persons ep
  LEFT JOIN public.profiles p ON ep.user_id = p.id
  WHERE
    -- User is the owner of the elderly_persons record
    ep.user_id = _user_id
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'
    )
    -- OR user is a relative with access
    OR EXISTS (
      SELECT 1 FROM public.relative_assignments
      WHERE elderly_person_id = ep.id AND relative_user_id = _user_id
    )
    -- OR user is a caregiver with access
    OR EXISTS (
      SELECT 1 FROM public.caregiver_assignments
      WHERE elderly_person_id = ep.id AND caregiver_user_id = _user_id
    )
  ORDER BY ep.full_name
$$;
