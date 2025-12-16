-- Create trigger to sync full_name changes from profiles to elderly_persons
-- This ensures that when a user updates their name in profiles,
-- it automatically updates in elderly_persons table as well

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.sync_profile_name_to_elderly_persons()
RETURNS TRIGGER AS $$
BEGIN
  -- Update elderly_persons full_name when profiles full_name changes
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    UPDATE public.elderly_persons
    SET full_name = NEW.full_name
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS sync_profile_name_trigger ON public.profiles;
CREATE TRIGGER sync_profile_name_trigger
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_name_to_elderly_persons();

-- Also sync avatar_url to photo_url in elderly_persons for consistency
CREATE OR REPLACE FUNCTION public.sync_profile_avatar_to_elderly_persons()
RETURNS TRIGGER AS $$
BEGIN
  -- Update elderly_persons photo_url when profiles avatar_url changes
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.elderly_persons
    SET photo_url = NEW.avatar_url
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for avatar sync
DROP TRIGGER IF EXISTS sync_profile_avatar_trigger ON public.profiles;
CREATE TRIGGER sync_profile_avatar_trigger
  AFTER UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_avatar_to_elderly_persons();

-- One-time sync: Update existing elderly_persons records with current profile data
UPDATE public.elderly_persons ep
SET
  full_name = p.full_name,
  photo_url = COALESCE(p.avatar_url, ep.photo_url)
FROM public.profiles p
WHERE ep.user_id = p.id
  AND (ep.full_name != p.full_name OR ep.photo_url IS DISTINCT FROM p.avatar_url);
