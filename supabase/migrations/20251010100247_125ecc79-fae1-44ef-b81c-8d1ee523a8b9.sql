-- Update handle_new_user function to create elderly_persons record for all users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Assign role from metadata (default to 'relative')
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'relative')
  );
  
  -- Create elderly_persons record for ALL users (so they can have devices and share data)
  INSERT INTO public.elderly_persons (user_id, full_name, status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'active'
  );
  
  RETURN NEW;
END;
$$;