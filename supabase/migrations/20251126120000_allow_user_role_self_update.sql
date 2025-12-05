-- Migration: Allow users to update their own non-admin roles
-- This enables users to change their role between elderly, caregiver, and relative

-- Drop the existing restrictive policy for non-admin role management
-- (keeping the admin policy intact for admin-level operations)

-- Policy to allow users to delete their own non-admin roles
CREATE POLICY "Users can delete their own non-admin roles"
  ON public.user_roles FOR DELETE
  USING (
    auth.uid() = user_id
    AND role IN ('elderly', 'caregiver', 'relative')
  );

-- Policy to allow users to insert non-admin roles for themselves
CREATE POLICY "Users can insert their own non-admin roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('elderly', 'caregiver', 'relative')
  );

-- Add a comment explaining the policy
COMMENT ON POLICY "Users can delete their own non-admin roles" ON public.user_roles IS
  'Allows users to remove their own elderly, caregiver, or relative roles when changing profile type';

COMMENT ON POLICY "Users can insert their own non-admin roles" ON public.user_roles IS
  'Allows users to assign themselves elderly, caregiver, or relative roles when changing profile type';
