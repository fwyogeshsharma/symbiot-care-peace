-- Create table for report subscriptions
CREATE TABLE public.report_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'daily_summary',
  schedule_time TIME NOT NULL DEFAULT '21:00:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, elderly_person_id, report_type)
);

-- Enable RLS
ALTER TABLE public.report_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for report_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.report_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.report_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.report_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.report_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_report_subscriptions_updated_at
BEFORE UPDATE ON public.report_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();