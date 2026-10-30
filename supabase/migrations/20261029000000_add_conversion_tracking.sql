-- Add conversion tracking fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_value NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_notes TEXT;

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_stage_agent ON leads(agent_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_conversion_source ON leads(conversion_source) WHERE conversion_source IS NOT NULL;
