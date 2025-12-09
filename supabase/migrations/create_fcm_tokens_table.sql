-- Create FCM tokens table to store device tokens for push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);

-- Enable RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own FCM tokens"
  ON fcm_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own FCM tokens"
  ON fcm_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own FCM tokens"
  ON fcm_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FCM tokens"
  ON fcm_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fcm_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_token_timestamp();

-- Function to get all FCM tokens for users who have access to an elderly person
CREATE OR REPLACE FUNCTION get_fcm_tokens_for_elderly_person(elderly_person_id UUID)
RETURNS TABLE (
  user_id UUID,
  token TEXT,
  device_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ft.user_id,
    ft.token,
    ft.device_info
  FROM fcm_tokens ft
  INNER JOIN user_roles ur ON ft.user_id = ur.user_id
  WHERE ur.user_id IN (
    -- Get all caregivers for this elderly person
    SELECT c.user_id
    FROM caregivers c
    WHERE c.elderly_person_id = get_fcm_tokens_for_elderly_person.elderly_person_id

    UNION

    -- Get all family members for this elderly person
    SELECT fm.user_id
    FROM family_members fm
    WHERE fm.elderly_person_id = get_fcm_tokens_for_elderly_person.elderly_person_id

    UNION

    -- Get all super admins
    SELECT ur2.user_id
    FROM user_roles ur2
    WHERE ur2.role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
