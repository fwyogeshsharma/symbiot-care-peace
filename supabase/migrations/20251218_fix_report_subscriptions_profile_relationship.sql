-- Fix report_subscriptions to reference public.profiles instead of auth.users
-- This allows the edge function to properly join with profiles table

-- First, drop the existing foreign key constraint
ALTER TABLE public.report_subscriptions
DROP CONSTRAINT IF EXISTS report_subscriptions_user_id_fkey;

-- Add new foreign key constraint to public.profiles
-- Note: This assumes public.profiles.id references auth.users.id (standard Supabase setup)
ALTER TABLE public.report_subscriptions
ADD CONSTRAINT report_subscriptions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_user_id
ON public.report_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_elderly_person_id
ON public.report_subscriptions(elderly_person_id);

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_active
ON public.report_subscriptions(is_active)
WHERE is_active = true;
