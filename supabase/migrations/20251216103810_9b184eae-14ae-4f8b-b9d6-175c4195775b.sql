-- Add postal_address column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_address text;