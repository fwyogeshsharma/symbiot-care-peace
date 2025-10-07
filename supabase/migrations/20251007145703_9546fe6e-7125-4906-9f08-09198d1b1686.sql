-- Create role enum
CREATE TYPE public.app_role AS ENUM ('elderly', 'caregiver', 'relative', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create elderly_persons table
CREATE TABLE public.elderly_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  emergency_contact TEXT,
  medical_conditions TEXT[],
  medications TEXT[],
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.elderly_persons ENABLE ROW LEVEL SECURITY;

-- Create devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('wearable', 'environmental', 'medical')),
  device_name TEXT NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  last_sync TIMESTAMPTZ,
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create device_data table for health metrics
CREATE TABLE public.device_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('heart_rate', 'blood_pressure', 'oxygen_level', 'temperature', 'steps', 'sleep', 'location', 'fall_detection', 'activity')),
  value JSONB NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.device_data ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_device_data_elderly_person ON public.device_data(elderly_person_id, recorded_at DESC);
CREATE INDEX idx_device_data_type ON public.device_data(data_type, recorded_at DESC);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('fall', 'vital_abnormal', 'medication_missed', 'inactivity', 'environmental', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create caregiver_assignments table
CREATE TABLE public.caregiver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_type TEXT DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(elderly_person_id, caregiver_user_id)
);

ALTER TABLE public.caregiver_assignments ENABLE ROW LEVEL SECURITY;

-- Create relative_assignments table
CREATE TABLE public.relative_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  relative_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(elderly_person_id, relative_user_id)
);

ALTER TABLE public.relative_assignments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to check if user can access elderly person data
CREATE OR REPLACE FUNCTION public.can_access_elderly_person(_user_id UUID, _elderly_person_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin can access all
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    -- Elderly person can access their own data
    SELECT 1 FROM public.elderly_persons 
    WHERE id = _elderly_person_id AND user_id = _user_id
  ) OR EXISTS (
    -- Assigned caregiver can access
    SELECT 1 FROM public.caregiver_assignments 
    WHERE elderly_person_id = _elderly_person_id AND caregiver_user_id = _user_id
  ) OR EXISTS (
    -- Assigned relative can access
    SELECT 1 FROM public.relative_assignments 
    WHERE elderly_person_id = _elderly_person_id AND relative_user_id = _user_id
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for elderly_persons
CREATE POLICY "Users can view elderly persons they have access to"
  ON public.elderly_persons FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
    OR public.can_access_elderly_person(auth.uid(), id)
  );

CREATE POLICY "Admins and caregivers can insert elderly persons"
  ON public.elderly_persons FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'caregiver'));

CREATE POLICY "Authorized users can update elderly persons"
  ON public.elderly_persons FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), id));

-- RLS Policies for devices
CREATE POLICY "Users can view devices for accessible elderly persons"
  ON public.devices FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Authorized users can manage devices"
  ON public.devices FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.can_access_elderly_person(auth.uid(), elderly_person_id)
  );

-- RLS Policies for device_data
CREATE POLICY "Users can view device data for accessible elderly persons"
  ON public.device_data FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Devices and authorized users can insert device data"
  ON public.device_data FOR INSERT
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));

-- RLS Policies for alerts
CREATE POLICY "Users can view alerts for accessible elderly persons"
  ON public.alerts FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Authorized users can acknowledge alerts"
  ON public.alerts FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "System can create alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for caregiver_assignments
CREATE POLICY "Users can view caregiver assignments they're involved in"
  ON public.caregiver_assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR caregiver_user_id = auth.uid()
    OR public.can_access_elderly_person(auth.uid(), elderly_person_id)
  );

CREATE POLICY "Admins can manage caregiver assignments"
  ON public.caregiver_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for relative_assignments
CREATE POLICY "Users can view relative assignments they're involved in"
  ON public.relative_assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR relative_user_id = auth.uid()
    OR public.can_access_elderly_person(auth.uid(), elderly_person_id)
  );

CREATE POLICY "Admins can manage relative assignments"
  ON public.relative_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elderly_persons_updated_at
  BEFORE UPDATE ON public.elderly_persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;

-- Set replica identity for realtime updates
ALTER TABLE public.device_data REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.devices REPLICA IDENTITY FULL;