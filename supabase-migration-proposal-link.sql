-- Add proposal_link to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS proposal_link text;
