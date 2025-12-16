-- Update handle_new_user to include postal_address
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile with full_name, phone, year_of_birth, and postal_address
  INSERT INTO public.profiles (id, email, full_name, phone, year_of_birth, postal_address)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'year_of_birth')::INTEGER,
    NEW.raw_user_meta_data->>'postal_address'
  );

  -- Get the role from metadata (default to 'relative')
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'relative');

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  -- Only create elderly_persons record for non-admin/non-caregiver roles
  IF user_role NOT IN ('admin', 'caregiver') THEN
    INSERT INTO public.elderly_persons (user_id, full_name, status)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      'active'
    );
  END IF;

  RETURN NEW;
END;
$function$;