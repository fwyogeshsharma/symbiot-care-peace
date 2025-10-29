-- Add super_admin role to the enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Add blocked status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES auth.users(id);