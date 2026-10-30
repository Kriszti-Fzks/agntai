-- Add webhook support to profiles/agents
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS webhook_secret TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT false;

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_webhook_secret ON profiles(webhook_secret);
