-- Create session_logs table to track user login sessions
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  session_duration_minutes INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX idx_session_logs_login_at ON session_logs(login_at);
CREATE INDEX idx_session_logs_created_at ON session_logs(created_at);

-- Enable RLS
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins and admins can view all session logs
CREATE POLICY "Admins can view all session logs"
  ON session_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- Policy: Users can view their own session logs
CREATE POLICY "Users can view own session logs"
  ON session_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: System can insert session logs (using service role)
CREATE POLICY "System can insert session logs"
  ON session_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: System can update session logs (for logout)
CREATE POLICY "Users can update own session logs"
  ON session_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
