-- Gmail Integration Tables
-- Run this in your Supabase SQL Editor at https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql

-- 1. gmail_integrations: Store encrypted Gmail OAuth tokens per user
CREATE TABLE IF NOT EXISTS gmail_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted in Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Gmail account info
  gmail_address TEXT NOT NULL,
  gmail_display_name TEXT,

  -- Tracking
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active', -- 'active', 'error', 'revoked'
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id) -- One Gmail account per agntai user
);

-- 2. gmail_email_cache: Cache recent emails for fast search
-- This avoids hitting Gmail API repeatedly for the same searches
CREATE TABLE IF NOT EXISTS gmail_email_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email metadata
  gmail_message_id TEXT NOT NULL,
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  body_preview TEXT,
  body_full TEXT,
  received_at TIMESTAMP WITH TIME ZONE,

  -- Threading
  thread_id TEXT,

  -- Search tracking (what query returned this email)
  search_query TEXT, -- e.g. "from:marcus@gmail.com"

  -- Timing
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),

  UNIQUE(user_id, gmail_message_id)
);

-- 3. gmail_sync_log: Track sync operations for debugging
CREATE TABLE IF NOT EXISTS gmail_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  sync_type TEXT, -- 'search', 'full_sync', 'refresh_token'
  query TEXT, -- what was searched
  email_count INT, -- how many results
  status TEXT, -- 'success', 'error', 'rate_limited'
  error_message TEXT,

  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS gmail_integrations_user_idx ON gmail_integrations(user_id);
CREATE INDEX IF NOT EXISTS gmail_email_cache_user_idx ON gmail_email_cache(user_id);
CREATE INDEX IF NOT EXISTS gmail_email_cache_search_idx ON gmail_email_cache(user_id, search_query);
CREATE INDEX IF NOT EXISTS gmail_email_cache_expires_idx ON gmail_email_cache(expires_at);
CREATE INDEX IF NOT EXISTS gmail_sync_log_user_idx ON gmail_sync_log(user_id);

-- Row Level Security (RLS)
-- Users can only see their own Gmail integrations and email cache
ALTER TABLE gmail_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_email_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail_integrations"
  ON gmail_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail_integrations"
  ON gmail_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail_integrations"
  ON gmail_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail_integrations"
  ON gmail_integrations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own gmail_email_cache"
  ON gmail_email_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail_email_cache"
  ON gmail_email_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own gmail_sync_log"
  ON gmail_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail_sync_log"
  ON gmail_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
