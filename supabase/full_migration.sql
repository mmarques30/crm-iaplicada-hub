-- ============================================================
-- CRM IAplicada - FULL MIGRATION + SEED
-- Cole este SQL inteiro no SQL Editor do Supabase Dashboard
-- (https://supabase.com/dashboard > SQL Editor > New Query)
-- ============================================================

-- ==========================================
-- 001_schema.sql - Core Schema
-- ==========================================

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

-- ==========================================
-- 002_qualification.sql - Funcoes de Qualificacao
-- ==========================================

CREATE OR REPLACE FUNCTION qualify_business(p_contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cargo TEXT;
  v_faturamento TEXT;
  v_cargos_validos TEXT[] := ARRAY[
    'CEO / Fundador / Sócio',
    'Diretor / Head',
    'Gerente',
    'Coordenador / Supervisor',
    'Analista'
  ];
BEGIN
  SELECT cargo, faixa_de_faturamento
  INTO v_cargo, v_faturamento
  FROM contacts WHERE id = p_contact_id;

  IF v_cargo = ANY(v_cargos_validos) AND v_faturamento IS NOT NULL AND v_faturamento != '' THEN
    RETURN 'mql';
  END IF;

  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION qualify_skills(p_contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cargo TEXT;
  v_liderados TEXT;
  v_faturamento TEXT;
  v_cargos_validos TEXT[] := ARRAY[
    'CEO / Fundador / Sócio',
    'Diretor / Head',
    'Gerente',
    'Coordenador / Supervisor'
  ];
  v_liderados_validos TEXT[] := ARRAY[
    'Entre 3 e 5 liderados',
    'Entre 5 e 10 liderados',
    'Mais de 10'
  ];
  v_faturamento_validos TEXT[] := ARRAY[
    'Entre 5MM e 10MM',
    'Entre 10MM e 50MM',
    'Acima de 50MM'
  ];
BEGIN
  SELECT cargo, numero_de_liderados, faixa_de_faturamento
  INTO v_cargo, v_liderados, v_faturamento
  FROM contacts WHERE id = p_contact_id;

  IF v_cargo = ANY(v_cargos_validos)
     AND v_liderados = ANY(v_liderados_validos)
     AND v_faturamento = ANY(v_faturamento_validos) THEN
    RETURN 'mql';
  END IF;

  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION qualify_academy(p_contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_renda TEXT;
  v_motivo TEXT;
  v_objetivo TEXT;
  v_renda_valida TEXT[] := ARRAY[
    'De R$ 4.001 a R$ 8.000',
    'De R$ 8.001 a R$ 12.000',
    'Acima de R$ 12.000'
  ];
  v_motivo_valido TEXT[] := ARRAY[
    'Transição de carreira',
    'Promoção/referência profissional',
    'Criar/escalar negócio'
  ];
  v_objetivo_sql TEXT[] := ARRAY[
    'Acessar um mentor para acelerar carreira',
    'Acessar treinamento com conteúdos organizados'
  ];
BEGIN
  SELECT renda_mensal, motivo_para_aprender_ia, objetivo_com_a_comunidade
  INTO v_renda, v_motivo, v_objetivo
  FROM contacts WHERE id = p_contact_id;

  IF v_renda = ANY(v_renda_valida) AND v_motivo = ANY(v_motivo_valido) THEN
    IF v_objetivo = ANY(v_objetivo_sql) THEN
      RETURN 'sql';
    END IF;
    RETURN 'mql';
  END IF;

  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION qualify_contact(p_contact_id UUID, p_product product_type)
RETURNS TEXT AS $$
BEGIN
  CASE p_product
    WHEN 'business' THEN RETURN qualify_business(p_contact_id);
    WHEN 'skills' THEN RETURN qualify_skills(p_contact_id);
    WHEN 'academy' THEN RETURN qualify_academy(p_contact_id);
  END CASE;
  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalculate_deal_qualification()
RETURNS TRIGGER AS $$
DECLARE
  v_deal RECORD;
BEGIN
  FOR v_deal IN SELECT id, product FROM deals WHERE contact_id = NEW.id AND is_won IS NULL LOOP
    UPDATE deals
    SET qualification_status = qualify_contact(NEW.id, v_deal.product)
    WHERE id = v_deal.id;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_qualification_update
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION recalculate_deal_qualification();

-- ==========================================
-- 003_views.sql - Views para dashboards
-- ==========================================

CREATE OR REPLACE VIEW deals_full AS
SELECT
  d.*,
  c.first_name AS contact_first_name,
  c.last_name AS contact_last_name,
  c.email AS contact_email,
  c.phone AS contact_phone,
  c.company AS contact_company,
  s.name AS stage_name,
  s.display_order AS stage_order,
  s.probability AS stage_probability,
  p.name AS pipeline_name,
  EXTRACT(DAY FROM now() - d.stage_entered_at)::INT AS days_in_stage
FROM deals d
LEFT JOIN contacts c ON d.contact_id = c.id
LEFT JOIN stages s ON d.stage_id = s.id
LEFT JOIN pipelines p ON d.pipeline_id = p.id;

CREATE OR REPLACE VIEW stage_conversion AS
SELECT
  p.product,
  s.name AS stage_name,
  s.display_order,
  COUNT(d.id) AS deal_count,
  COALESCE(SUM(d.amount), 0) AS total_amount
FROM stages s
JOIN pipelines p ON s.pipeline_id = p.id
LEFT JOIN deals d ON d.stage_id = s.id AND d.is_won IS NULL
GROUP BY p.product, s.name, s.display_order
ORDER BY p.product, s.display_order;

CREATE OR REPLACE VIEW avg_time_in_stage AS
WITH stage_transitions AS (
  SELECT
    a.id,
    a.deal_id,
    a.created_at,
    d.pipeline_id,
    (a.metadata->>'new_stage_id')::UUID AS stage_id,
    LEAD(a.created_at) OVER (PARTITION BY a.deal_id ORDER BY a.created_at) AS next_created_at
  FROM activities a
  JOIN deals d ON a.deal_id = d.id
  WHERE a.type = 'stage_change'
)
SELECT
  p.product,
  s.name AS stage_name,
  s.display_order,
  COUNT(st.id) AS transitions,
  AVG(
    EXTRACT(EPOCH FROM (st.next_created_at - st.created_at)) / 86400
  )::NUMERIC(10,1) AS avg_days
FROM stage_transitions st
JOIN stages s ON st.stage_id = s.id
JOIN pipelines p ON st.pipeline_id = p.id
WHERE st.next_created_at IS NOT NULL
GROUP BY p.product, s.name, s.display_order
ORDER BY p.product, s.display_order;

CREATE OR REPLACE VIEW mql_volume AS
SELECT
  d.product,
  DATE_TRUNC('week', d.created_at)::DATE AS week,
  COUNT(*) FILTER (WHERE d.qualification_status IN ('mql', 'sql')) AS mql_count,
  COUNT(*) AS total_count
FROM deals d
GROUP BY d.product, DATE_TRUNC('week', d.created_at)
ORDER BY week DESC;

CREATE OR REPLACE VIEW product_metrics AS
SELECT
  p.product,
  COUNT(d.id) FILTER (WHERE d.is_won IS NULL) AS active_deals,
  COUNT(d.id) FILTER (WHERE d.is_won = true) AS won_deals,
  COUNT(d.id) FILTER (WHERE d.is_won = false) AS lost_deals,
  COALESCE(SUM(d.amount) FILTER (WHERE d.is_won IS NULL), 0) AS pipeline_value,
  COALESCE(AVG(d.amount) FILTER (WHERE d.is_won = true), 0) AS avg_deal_size,
  CASE
    WHEN COUNT(d.id) FILTER (WHERE d.is_won IS NOT NULL) > 0
    THEN (COUNT(d.id) FILTER (WHERE d.is_won = true)::DECIMAL / COUNT(d.id) FILTER (WHERE d.is_won IS NOT NULL) * 100)
    ELSE 0
  END AS win_rate
FROM pipelines p
LEFT JOIN deals d ON d.pipeline_id = p.id
GROUP BY p.product;

-- ==========================================
-- 004_rls.sql - Row Level Security
-- ==========================================

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stale_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politicas permissivas para usuarios autenticados
CREATE POLICY "Authenticated users can read pipelines" ON pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read stages" ON stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can CRUD contacts" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can CRUD deals" ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can CRUD activities" ON activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read email_templates" ON email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read stale_alert_configs" ON stale_alert_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can CRUD notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Acesso anonimo de leitura para pipelines e stages (para o board publico)
CREATE POLICY "Anon can read pipelines" ON pipelines FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read stages" ON stages FOR SELECT TO anon USING (true);

-- ==========================================
-- SEED DATA - Pipelines, Stages, Configs, Templates
-- ==========================================

INSERT INTO pipelines (id, name, product) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Business', 'business'),
  ('a1000000-0000-0000-0000-000000000002', 'Skills', 'skills'),
  ('a1000000-0000-0000-0000-000000000003', 'Academy', 'academy');

-- Business stages
INSERT INTO stages (id, pipeline_id, name, display_order, probability, is_won, is_lost) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'MQL', 1, 5, false, false),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Contato Iniciado', 2, 10, false, false),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Conectado', 3, 20, false, false),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'SQL', 4, 30, false, false),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Reunião Agendada', 5, 40, false, false),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'Reunião Realizada', 6, 55, false, false),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'Negociação', 7, 70, false, false),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'Contrato Enviado', 8, 85, false, false),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'Negócio Fechado', 9, 100, true, false),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'Negócio Perdido', 10, 0, false, true);

-- Skills stages
INSERT INTO stages (id, pipeline_id, name, display_order, probability, is_won, is_lost) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'MQL', 1, 5, false, false),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Contato Iniciado', 2, 10, false, false),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Conectado', 3, 20, false, false),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'SQL', 4, 30, false, false),
  ('b2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Diagnóstico Agendado', 5, 40, false, false),
  ('b2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Diagnóstico Realizado', 6, 55, false, false),
  ('b2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'Proposta Enviada', 7, 70, false, false),
  ('b2000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'Negociação', 8, 80, false, false),
  ('b2000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002', 'Negócio Fechado', 9, 100, true, false),
  ('b2000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000002', 'Negócio Perdido', 10, 0, false, true);

-- Academy stages
INSERT INTO stages (id, pipeline_id, name, display_order, probability, is_won, is_lost) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Lead Capturado', 1, 5, false, false),
  ('b3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'MQL', 2, 20, false, false),
  ('b3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'SQL', 3, 40, false, false),
  ('b3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'Contato Iniciado', 4, 50, false, false),
  ('b3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'Conectado', 5, 65, false, false),
  ('b3000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Reunião Agendada', 6, 75, false, false),
  ('b3000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'Inscrito', 7, 100, true, false),
  ('b3000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'Perdido', 8, 0, false, true);

-- Stale alert configs
INSERT INTO stale_alert_configs (pipeline_id, stage_id, threshold_days) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 3),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000007', 5),
  ('a1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 2),
  ('a1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000007', 4),
  ('a1000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000004', 1);

-- Email templates - Academy
INSERT INTO email_templates (product, sequence_order, subject, body_html, delay_days) VALUES
  ('academy', 1, 'Bem-vindo ao Academy IAplicada!',
   '<h1>Bem-vindo!</h1><p>Obrigado por se inscrever no Academy IAplicada.</p>', 0),
  ('academy', 2, 'Como profissionais estão aplicando IA na prática',
   '<h1>IA na Prática</h1><p>Profissionais que dominam IA estão sendo promovidos 2x mais rápido.</p>', 2),
  ('academy', 3, 'Case: como a IA transformou a carreira de um profissional',
   '<h1>De Analista a Líder com IA</h1><p>Conheça a história de sucesso.</p>', 5),
  ('academy', 4, 'As 3 objeções mais comuns sobre aprender IA',
   '<h1>Será que IA é para mim?</h1><p>Respondemos as 3 objeções mais comuns.</p>', 8),
  ('academy', 5, 'Última chance: sua vaga está reservada',
   '<h1>Sua vaga está esperando</h1><p>Garanta sua vaga no Academy IAplicada.</p>', 12);

-- Email templates - Skills
INSERT INTO email_templates (product, sequence_order, subject, body_html, delay_days) VALUES
  ('skills', 1, 'O ROI de capacitar sua equipe em IA',
   '<h1>Investir em IA para sua equipe vale a pena?</h1><p>40% de aumento em produtividade.</p>', 0),
  ('skills', 2, 'Resultado: equipe aumentou produtividade em 40%',
   '<h1>Case Real de Sucesso</h1><p>Uma equipe de 15 pessoas alcançou resultados incríveis.</p>', 3),
  ('skills', 3, 'Vamos agendar um diagnóstico gratuito?',
   '<h1>Diagnóstico Gratuito</h1><p>Em 30 minutos mapeamos os gargalos da sua equipe.</p>', 7);
