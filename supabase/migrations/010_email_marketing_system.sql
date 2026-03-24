-- =============================================
-- EMAIL MARKETING SYSTEM
-- Templates, Campaigns, Workflows, Tracking
-- =============================================

-- 1. Email Templates (both automated and broadcast)
CREATE TABLE IF NOT EXISTS email_templates_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT NOT NULL DEFAULT 'Mariana Marques',
  from_email TEXT NOT NULL DEFAULT 'mariana@iaplicada.com',
  reply_to TEXT,
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT,
  language TEXT DEFAULT 'pt-BR',
  type TEXT NOT NULL DEFAULT 'broadcast' CHECK (type IN ('automated', 'broadcast')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  product TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Contact Lists / Segments
CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'static' CHECK (type IN ('active', 'static')),
  filters JSONB DEFAULT '{}',
  description TEXT,
  contact_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Contact List Memberships (for static lists)
CREATE TABLE IF NOT EXISTS contact_list_memberships (
  list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (list_id, contact_id)
);

-- 4. Email Campaigns (scheduled broadcasts)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates_v2(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  include_list_ids UUID[] DEFAULT '{}',
  exclude_list_ids UUID[] DEFAULT '{}',
  subscription_type TEXT DEFAULT 'marketing_information',
  total_recipients INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_bounced INT DEFAULT 0,
  total_unsubscribed INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Email Sends (individual send log + queue)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates_v2(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  workflow_id UUID,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'delivered', 'bounced', 'failed')),
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  subject_rendered TEXT,
  from_email TEXT,
  to_email TEXT,
  opened_at TIMESTAMPTZ,
  open_count INT DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INT DEFAULT 0,
  replied_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
  spam_reported_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Email Link Clicks
CREATE TABLE IF NOT EXISTS email_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- 7. Email Workflows (automation sequences)
CREATE TABLE IF NOT EXISTS email_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('form_submission', 'lifecycle_change', 'deal_stage_change', 'list_membership', 'manual')),
  trigger_config JSONB DEFAULT '{}',
  product TEXT,
  is_active BOOLEAN DEFAULT false,
  allow_reentry BOOLEAN DEFAULT false,
  total_enrolled INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Workflow Steps
CREATE TABLE IF NOT EXISTS email_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES email_workflows(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('send_email', 'delay', 'condition', 'update_contact')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

-- 9. Workflow Enrollments
CREATE TABLE IF NOT EXISTS workflow_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES email_workflows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'unenrolled', 'paused')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  UNIQUE(workflow_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_scheduled ON email_sends(scheduled_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_contact ON email_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_template ON email_sends(template_id);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_send ON email_link_clicks(email_send_id);
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_status ON workflow_enrollments(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_next ON workflow_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contact_list_memberships_contact ON contact_list_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- RLS
ALTER TABLE email_templates_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_email_templates_v2" ON email_templates_v2 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_contact_lists" ON contact_lists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_contact_list_memberships" ON contact_list_memberships FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_email_campaigns" ON email_campaigns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_email_sends" ON email_sends FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_email_link_clicks" ON email_link_clicks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_email_workflows" ON email_workflows FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_email_workflow_steps" ON email_workflow_steps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_workflow_enrollments" ON workflow_enrollments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER email_templates_v2_updated_at BEFORE UPDATE ON email_templates_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contact_lists_updated_at BEFORE UPDATE ON contact_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER email_workflows_updated_at BEFORE UPDATE ON email_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- View: campaign metrics
CREATE OR REPLACE VIEW email_campaign_metrics AS
SELECT
  ec.id,
  ec.name,
  ec.status,
  ec.scheduled_at,
  ec.sent_at,
  et.subject,
  et.from_name,
  COUNT(es.id) AS total_sends,
  COUNT(es.id) FILTER (WHERE es.status = 'delivered') AS delivered,
  COUNT(es.id) FILTER (WHERE es.opened_at IS NOT NULL) AS opened,
  COUNT(es.id) FILTER (WHERE es.clicked_at IS NOT NULL) AS clicked,
  COUNT(es.id) FILTER (WHERE es.bounced_at IS NOT NULL) AS bounced,
  COUNT(es.id) FILTER (WHERE es.unsubscribed_at IS NOT NULL) AS unsubscribed,
  CASE WHEN COUNT(es.id) FILTER (WHERE es.status = 'delivered') > 0
    THEN ROUND(COUNT(es.id) FILTER (WHERE es.opened_at IS NOT NULL)::numeric / COUNT(es.id) FILTER (WHERE es.status = 'delivered') * 100, 2)
    ELSE 0 END AS open_rate,
  CASE WHEN COUNT(es.id) FILTER (WHERE es.status = 'delivered') > 0
    THEN ROUND(COUNT(es.id) FILTER (WHERE es.clicked_at IS NOT NULL)::numeric / COUNT(es.id) FILTER (WHERE es.status = 'delivered') * 100, 2)
    ELSE 0 END AS click_rate
FROM email_campaigns ec
LEFT JOIN email_templates_v2 et ON et.id = ec.template_id
LEFT JOIN email_sends es ON es.campaign_id = ec.id
GROUP BY ec.id, ec.name, ec.status, ec.scheduled_at, ec.sent_at, et.subject, et.from_name;
