-- Feature 5: Device Pairing Tables
CREATE TABLE public.device_pairing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  device_type TEXT,
  pairing_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'paired', 'expired', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  device_metadata JSONB DEFAULT '{}'::jsonb,
  network_info JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paired_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.device_pairing_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_pairing_requests
CREATE POLICY "Users can view pairing requests for accessible elderly persons"
  ON public.device_pairing_requests
  FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can create pairing requests for accessible elderly persons"
  ON public.device_pairing_requests
  FOR INSERT
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update pairing requests for accessible elderly persons"
  ON public.device_pairing_requests
  FOR UPDATE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id))
  WITH CHECK (can_access_elderly_person(auth.uid(), elderly_person_id));

-- Device association logs
CREATE TABLE public.device_association_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  pairing_request_id UUID REFERENCES public.device_pairing_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('discovered', 'pairing_started', 'verified', 'paired', 'failed', 'expired', 'rejected')),
  user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_association_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_association_logs
CREATE POLICY "Users can view association logs for their devices"
  ON public.device_association_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = device_association_logs.device_id
      AND can_access_elderly_person(auth.uid(), d.elderly_person_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.device_pairing_requests pr
      WHERE pr.id = device_association_logs.pairing_request_id
      AND can_access_elderly_person(auth.uid(), pr.elderly_person_id)
    )
  );

-- Service role can insert logs
CREATE POLICY "Service role can insert association logs"
  ON public.device_association_logs
  FOR INSERT
  WITH CHECK (true);

-- Feature 6: Platform Metrics Tables
CREATE TABLE public.platform_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('device_health', 'data_transmission', 'alert_response', 'user_activity', 'system_health')),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_metrics
CREATE POLICY "Admins can view all platform metrics"
  ON public.platform_metrics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert platform metrics"
  ON public.platform_metrics
  FOR INSERT
  WITH CHECK (true);

-- Device health logs
CREATE TABLE public.device_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  battery_status TEXT CHECK (battery_status IN ('critical', 'low', 'normal', 'good')),
  connectivity_status TEXT CHECK (connectivity_status IN ('excellent', 'good', 'fair', 'poor', 'offline')),
  last_data_transmission TIMESTAMP WITH TIME ZONE,
  data_points_24h INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_health_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_health_logs
CREATE POLICY "Users can view health logs for accessible devices"
  ON public.device_health_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = device_health_logs.device_id
      AND can_access_elderly_person(auth.uid(), d.elderly_person_id)
    )
  );

CREATE POLICY "Admins can view all health logs"
  ON public.device_health_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert health logs"
  ON public.device_health_logs
  FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_pairing_requests_status ON public.device_pairing_requests(status);
CREATE INDEX idx_pairing_requests_elderly_person ON public.device_pairing_requests(elderly_person_id);
CREATE INDEX idx_pairing_requests_code ON public.device_pairing_requests(pairing_code);
CREATE INDEX idx_association_logs_device ON public.device_association_logs(device_id);
CREATE INDEX idx_association_logs_pairing_request ON public.device_association_logs(pairing_request_id);
CREATE INDEX idx_platform_metrics_type ON public.platform_metrics(metric_type);
CREATE INDEX idx_platform_metrics_recorded_at ON public.platform_metrics(recorded_at);
CREATE INDEX idx_device_health_logs_device ON public.device_health_logs(device_id);
CREATE INDEX idx_device_health_logs_created_at ON public.device_health_logs(created_at);

-- Enable realtime for pairing requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_pairing_requests;
ALTER TABLE public.device_pairing_requests REPLICA IDENTITY FULL;

-- Enable realtime for device health logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_health_logs;
ALTER TABLE public.device_health_logs REPLICA IDENTITY FULL;