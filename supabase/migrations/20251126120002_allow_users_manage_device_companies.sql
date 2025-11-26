-- Migration: Allow all authenticated users to manage device companies
-- This enables users to add new companies when creating device models

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage device companies" ON public.device_companies;

-- Create a new policy that allows all authenticated users to manage device companies
CREATE POLICY "Authenticated users can manage device companies"
  ON public.device_companies FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add a comment explaining the policy
COMMENT ON POLICY "Authenticated users can manage device companies" ON public.device_companies IS
  'Allows any authenticated user to insert, update, or delete device companies';
