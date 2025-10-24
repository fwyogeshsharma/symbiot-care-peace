-- 1. Create a secure function for email-based user lookup that only returns user ID
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM public.profiles 
  WHERE email = _email
  LIMIT 1
$$;

-- 2. Drop the overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 3. Create restricted profiles policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Drop the permissive alerts INSERT policy
DROP POLICY IF EXISTS "System can create alerts" ON public.alerts;

-- 5. Create restricted alerts INSERT policy
CREATE POLICY "Only system roles can create alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'caregiver'::app_role)
);

-- 6. Update handle_new_user to only create elderly_persons for appropriate roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Get the role from metadata (default to 'relative')
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'relative');
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Only create elderly_persons record for non-admin/non-caregiver roles
  -- This is for users who are themselves being monitored
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
$$;