-- Create function to get elderly persons accessible to a specific user
CREATE OR REPLACE FUNCTION public.get_accessible_elderly_persons(_user_id uuid)
RETURNS SETOF elderly_persons
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ep.*
  FROM public.elderly_persons ep
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