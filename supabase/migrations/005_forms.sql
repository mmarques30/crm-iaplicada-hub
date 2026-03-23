-- CRM IAplicada - Sistema de Formulários Próprios
-- Substitui dependência do HubSpot Forms
-- Fluxo: LP → Form Submit → Contato + Deal + Qualificação automática

-- =============================================
-- 1. TABELAS
-- =============================================

-- Formulários cadastrados (Academy, Business, Skills)
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- "Formulário - Academy"
  slug TEXT NOT NULL UNIQUE,                 -- "academy", "business", "skills"
  product product_type NOT NULL,             -- vinculado ao produto
  redirect_url TEXT,                         -- URL de redirecionamento pós-envio
  notify_emails TEXT[] DEFAULT '{}',         -- emails que recebem notificação
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',               -- configs extras (cor, branding, etc)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campos de cada formulário
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,                  -- "email", "utm_source", "renda_mensal"
  field_type TEXT NOT NULL DEFAULT 'text'    -- "text", "email", "phone", "select", "hidden"
    CHECK (field_type IN ('text', 'email', 'phone', 'select', 'textarea', 'hidden')),
  label TEXT NOT NULL,                       -- "E-mail", "Faixa de Renda"
  placeholder TEXT,                          -- texto placeholder
  required BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,  -- campos UTM são hidden
  display_order INT NOT NULL DEFAULT 0,
  options JSONB,                             -- para selects: ["Opção 1", "Opção 2"]
  maps_to TEXT,                              -- campo do contato: "email", "phone", "renda_mensal", etc
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form_id, field_name)
);

-- Submissões / envios de formulário
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,

  -- UTMs capturadas
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,

  -- Metadados do envio
  ip_address TEXT,
  referrer TEXT,
  user_agent TEXT,
  page_url TEXT,                              -- URL da LP de onde veio

  -- Dados brutos do formulário
  raw_data JSONB NOT NULL DEFAULT '{}',

  -- Qualificação calculada no momento do envio
  qualification_result TEXT,

  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. INDEXES
-- =============================================
CREATE INDEX idx_forms_slug ON forms(slug);
CREATE INDEX idx_forms_product ON forms(product);
CREATE INDEX idx_form_fields_form ON form_fields(form_id);
CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_contact ON form_submissions(contact_id);
CREATE INDEX idx_form_submissions_deal ON form_submissions(deal_id);
CREATE INDEX idx_form_submissions_date ON form_submissions(submitted_at);
CREATE INDEX idx_form_submissions_utm ON form_submissions(utm_source, utm_medium, utm_campaign);

-- =============================================
-- 3. TRIGGERS
-- =============================================
CREATE TRIGGER forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 4. RLS (Row Level Security)
-- =============================================
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública dos forms ativos (necessário para o embed)
CREATE POLICY "Forms are publicly readable" ON forms
  FOR SELECT USING (is_active = true);

CREATE POLICY "Form fields are publicly readable" ON form_fields
  FOR SELECT USING (true);

-- Permitir inserção pública de submissões (endpoint público)
CREATE POLICY "Anyone can submit forms" ON form_submissions
  FOR INSERT WITH CHECK (true);

-- Leitura de submissões requer autenticação
CREATE POLICY "Authenticated users can read submissions" ON form_submissions
  FOR SELECT USING (true);

-- Service role pode tudo
CREATE POLICY "Service role full access forms" ON forms
  FOR ALL USING (true);

CREATE POLICY "Service role full access form_fields" ON form_fields
  FOR ALL USING (true);

CREATE POLICY "Service role full access form_submissions" ON form_submissions
  FOR ALL USING (true);

-- =============================================
-- 5. SEED: Formulários padrão (Academy, Business, Skills)
-- =============================================

-- Academy
INSERT INTO forms (id, name, slug, product, redirect_url, notify_emails) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Formulário - Academy', 'academy', 'academy',
   'https://academy.iaplicada.com/thank-you', ARRAY['vinicius@iaplicada.com']);

INSERT INTO form_fields (form_id, field_name, field_type, label, placeholder, required, is_hidden, display_order, options, maps_to) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'firstname', 'text', 'Nome Completo', 'Seu nome completo', true, false, 1, NULL, 'first_name'),
  ('a1000000-0000-0000-0000-000000000001', 'email', 'email', 'E-mail', 'seu@email.com', true, false, 2, NULL, 'email'),
  ('a1000000-0000-0000-0000-000000000001', 'phone', 'phone', 'Telefone com DDD', '(11) 99999-9999', true, false, 3, NULL, 'phone'),
  ('a1000000-0000-0000-0000-000000000001', 'renda_mensal', 'select', 'Faixa de Renda', NULL, true, false, 4,
   '["De R$ 1.000 a R$ 4.000", "De R$ 4.001 a R$ 8.000", "De R$ 8.001 a R$ 12.000", "Acima de R$ 12.000"]', 'renda_mensal'),
  ('a1000000-0000-0000-0000-000000000001', 'motivo_para_aprender_ia', 'select', 'Por qual motivo você quer aprender IA?', NULL, true, false, 5,
   '["Transição de carreira", "Promoção/referência profissional", "Criar/escalar negócio", "Curiosidade/interesse pessoal", "Outro"]', 'motivo_para_aprender_ia'),
  ('a1000000-0000-0000-0000-000000000001', 'objetivo_com_a_comunidade', 'select', 'Qual o seu objetivo ao participar da comunidade?', NULL, true, false, 6,
   '["Acessar um mentor para acelerar carreira", "Acessar treinamento com conteúdos organizados", "Fazer networking com outros profissionais", "Acompanhar tendências de IA", "Outro"]', 'objetivo_com_a_comunidade'),
  -- Hidden UTM fields
  ('a1000000-0000-0000-0000-000000000001', 'utm_source', 'hidden', 'UTM Source', NULL, false, true, 90, NULL, 'utm_source'),
  ('a1000000-0000-0000-0000-000000000001', 'utm_medium', 'hidden', 'UTM Medium', NULL, false, true, 91, NULL, 'utm_medium'),
  ('a1000000-0000-0000-0000-000000000001', 'utm_campaign', 'hidden', 'UTM Campaign', NULL, false, true, 92, NULL, 'utm_campaign'),
  ('a1000000-0000-0000-0000-000000000001', 'utm_term', 'hidden', 'UTM Term', NULL, false, true, 93, NULL, 'utm_term');

-- Business
INSERT INTO forms (id, name, slug, product, redirect_url, notify_emails) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'Formulário - Business', 'business', 'business',
   'https://business.iaplicada.com/thank-you', ARRAY['vinicius@iaplicada.com']);

INSERT INTO form_fields (form_id, field_name, field_type, label, placeholder, required, is_hidden, display_order, options, maps_to) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'firstname', 'text', 'Nome Completo', 'Seu nome completo', true, false, 1, NULL, 'first_name'),
  ('b1000000-0000-0000-0000-000000000002', 'email', 'email', 'E-mail', 'seu@email.com', true, false, 2, NULL, 'email'),
  ('b1000000-0000-0000-0000-000000000002', 'phone', 'phone', 'Telefone com DDD', '(11) 99999-9999', true, false, 3, NULL, 'phone'),
  ('b1000000-0000-0000-0000-000000000002', 'cargo', 'select', 'Cargo', NULL, true, false, 4,
   '["CEO / Fundador / Sócio", "Diretor / Head", "Gerente", "Coordenador / Supervisor", "Analista"]', 'cargo'),
  ('b1000000-0000-0000-0000-000000000002', 'faixa_de_faturamento', 'select', 'Faixa de Faturamento', NULL, true, false, 5,
   '["Menos de R$ 1 milhão", "Entre 1MM e 5MM", "Entre 5MM e 10MM", "Entre 10MM e 50MM", "Acima de 50MM"]', 'faixa_de_faturamento'),
  ('b1000000-0000-0000-0000-000000000002', 'company', 'text', 'Empresa', 'Nome da sua empresa', false, false, 6, NULL, 'company'),
  -- Hidden UTM fields
  ('b1000000-0000-0000-0000-000000000002', 'utm_source', 'hidden', 'UTM Source', NULL, false, true, 90, NULL, 'utm_source'),
  ('b1000000-0000-0000-0000-000000000002', 'utm_medium', 'hidden', 'UTM Medium', NULL, false, true, 91, NULL, 'utm_medium'),
  ('b1000000-0000-0000-0000-000000000002', 'utm_campaign', 'hidden', 'UTM Campaign', NULL, false, true, 92, NULL, 'utm_campaign'),
  ('b1000000-0000-0000-0000-000000000002', 'utm_term', 'hidden', 'UTM Term', NULL, false, true, 93, NULL, 'utm_term');

-- Skills
INSERT INTO forms (id, name, slug, product, redirect_url, notify_emails) VALUES
  ('c1000000-0000-0000-0000-000000000003', 'Formulário - Skills', 'skills', 'skills',
   'https://skills.iaplicada.com/thank-you', ARRAY['vinicius@iaplicada.com']);

INSERT INTO form_fields (form_id, field_name, field_type, label, placeholder, required, is_hidden, display_order, options, maps_to) VALUES
  ('c1000000-0000-0000-0000-000000000003', 'firstname', 'text', 'Nome Completo', 'Seu nome completo', true, false, 1, NULL, 'first_name'),
  ('c1000000-0000-0000-0000-000000000003', 'email', 'email', 'E-mail', 'seu@email.com', true, false, 2, NULL, 'email'),
  ('c1000000-0000-0000-0000-000000000003', 'phone', 'phone', 'Telefone com DDD', '(11) 99999-9999', true, false, 3, NULL, 'phone'),
  ('c1000000-0000-0000-0000-000000000003', 'cargo', 'select', 'Cargo', NULL, true, false, 4,
   '["CEO / Fundador / Sócio", "Diretor / Head", "Gerente", "Coordenador / Supervisor"]', 'cargo'),
  ('c1000000-0000-0000-0000-000000000003', 'numero_de_liderados', 'select', 'Número de Liderados', NULL, true, false, 5,
   '["Nenhum", "Entre 1 e 2 liderados", "Entre 3 e 5 liderados", "Entre 5 e 10 liderados", "Mais de 10"]', 'numero_de_liderados'),
  ('c1000000-0000-0000-0000-000000000003', 'faixa_de_faturamento', 'select', 'Faixa de Faturamento da Empresa', NULL, true, false, 6,
   '["Menos de R$ 1 milhão", "Entre 1MM e 5MM", "Entre 5MM e 10MM", "Entre 10MM e 50MM", "Acima de 50MM"]', 'faixa_de_faturamento'),
  -- Hidden UTM fields
  ('c1000000-0000-0000-0000-000000000003', 'utm_source', 'hidden', 'UTM Source', NULL, false, true, 90, NULL, 'utm_source'),
  ('c1000000-0000-0000-0000-000000000003', 'utm_medium', 'hidden', 'UTM Medium', NULL, false, true, 91, NULL, 'utm_medium'),
  ('c1000000-0000-0000-0000-000000000003', 'utm_campaign', 'hidden', 'UTM Campaign', NULL, false, true, 92, NULL, 'utm_campaign'),
  ('c1000000-0000-0000-0000-000000000003', 'utm_term', 'hidden', 'UTM Term', NULL, false, true, 93, NULL, 'utm_term');

-- =============================================
-- 6. VIEW: Métricas de formulários
-- =============================================
CREATE OR REPLACE VIEW form_metrics AS
SELECT
  f.id AS form_id,
  f.name AS form_name,
  f.slug,
  f.product,
  COUNT(fs.id) AS total_submissions,
  COUNT(CASE WHEN fs.submitted_at >= now() - interval '7 days' THEN 1 END) AS submissions_last_7d,
  COUNT(CASE WHEN fs.submitted_at >= now() - interval '30 days' THEN 1 END) AS submissions_last_30d,
  COUNT(DISTINCT fs.utm_source) AS unique_sources,
  MAX(fs.submitted_at) AS last_submission_at
FROM forms f
LEFT JOIN form_submissions fs ON fs.form_id = f.id
GROUP BY f.id, f.name, f.slug, f.product;

-- =============================================
-- 7. Atualizar constraint de activities para incluir 'form_submission'
-- =============================================
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check
  CHECK (type IN ('email', 'whatsapp', 'call', 'meeting', 'note', 'stage_change', 'instagram', 'form_submission'));
