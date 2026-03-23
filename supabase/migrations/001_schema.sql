-- CRM IAplicada - Core Schema
-- Tabelas principais: pipelines, stages, contacts, deals, activities

CREATE TYPE product_type AS ENUM ('business', 'skills', 'academy');

-- Pipelines (um por produto)
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product product_type NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Estagios do pipeline
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL,
  probability DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pipeline_id, display_order)
);

-- Contatos
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_id BIGINT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  cargo TEXT,
  numero_de_liderados TEXT,
  faixa_de_faturamento TEXT,
  renda_mensal TEXT,
  motivo_para_aprender_ia TEXT,
  objetivo_com_a_comunidade TEXT,
  produto_interesse product_type[],
  manychat_id TEXT,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deals / Negocios
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  stage_id UUID NOT NULL REFERENCES stages(id),
  product product_type NOT NULL,
  amount DECIMAL(12,2),
  qualification_status TEXT NOT NULL DEFAULT 'lead'
    CHECK (qualification_status IN ('lead', 'mql', 'sql')),
  canal_origem TEXT,
  motivo_perda TEXT,
  ultimo_contato TIMESTAMPTZ,
  stage_entered_at TIMESTAMPTZ DEFAULT now(),
  owner_id UUID,
  closed_at TIMESTAMPTZ,
  is_won BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Atividades (timeline)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('email', 'whatsapp', 'call', 'meeting', 'note', 'stage_change')),
  direction TEXT
    CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email templates (sequencias de nurturing)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product product_type NOT NULL,
  sequence_order INT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  delay_days INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product, sequence_order)
);

-- Configuracao de alertas de leads parados
CREATE TABLE stale_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  threshold_days INT NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(pipeline_id, stage_id)
);

-- Notificacoes
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'warning', 'alert', 'success')),
  related_deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  related_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_product ON deals(product);
CREATE INDEX idx_deals_qualification ON deals(qualification_status);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE NOT is_read;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para registrar mudanca de estagio como atividade
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.stage_entered_at = now();
    INSERT INTO activities (deal_id, contact_id, type, subject, metadata)
    VALUES (
      NEW.id,
      NEW.contact_id,
      'stage_change',
      'Estagio alterado',
      jsonb_build_object(
        'old_stage_id', OLD.stage_id,
        'new_stage_id', NEW.stage_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_stage_change
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();
