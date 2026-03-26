-- Add soft-delete support to contacts table
-- Contacts marked as deleted won't appear in the CRM but stay in the database
-- This prevents re-import from HubSpot and preserves audit trail

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for filtering non-deleted contacts efficiently
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts (deleted_at) WHERE deleted_at IS NULL;

-- Update HubSpot import to skip deleted contacts:
-- The upsert on hubspot_id will NOT un-delete contacts because
-- deleted_at is not included in the upsert fields
