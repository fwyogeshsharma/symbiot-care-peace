-- Create elderly_persons records for existing users who don't have one
INSERT INTO public.elderly_persons (user_id, full_name, status)
SELECT 
  p.id,
  p.full_name,
  'active'
FROM public.profiles p
LEFT JOIN public.elderly_persons ep ON ep.user_id = p.id
WHERE ep.id IS NULL;