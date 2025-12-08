-- Create a secure function to get profiles for users who have been granted access to the current user's elderly persons
-- This allows viewing profile information for data sharing without exposing all profiles
CREATE OR REPLACE FUNCTION public.get_shared_user_profiles(_owner_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get profiles for users who have relative_assignments for elderly persons owned by _owner_user_id
  -- Also include the owner's profile
  SELECT DISTINCT p.id, p.email, p.full_name
  FROM profiles p
  WHERE p.id IN (
    -- Get all relative users who have access to elderly persons owned by the requester
    SELECT ra.relative_user_id
    FROM relative_assignments ra
    INNER JOIN elderly_persons ep ON ra.elderly_person_id = ep.id
    WHERE ep.user_id = _owner_user_id

    UNION

    -- Also include profiles of owners (for displaying owner names)
    SELECT ep.user_id
    FROM elderly_persons ep
    WHERE ep.user_id = _owner_user_id
  )
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_shared_user_profiles(uuid) TO authenticated;
