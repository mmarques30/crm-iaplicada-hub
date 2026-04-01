-- ============================================
-- MIGRAÇÃO: Sistema de Comunicação Unificado
-- Tabelas: events, communities, routine_messages,
--          launch_campaigns, launch_phases, launch_messages
-- ============================================

-- ── COMMUNITIES (Definição das comunidades com tom de voz) ──
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, -- gratuita, academy, business
  nome text NOT NULL,
  descricao text,
  tom_de_voz text,
  objetivo text,
  emoji_padrao text DEFAULT '🤓',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on communities" ON communities FOR ALL USING (true) WITH CHECK (true);

-- Seed comunidades
INSERT INTO communities (slug, nome, descricao, tom_de_voz, objetivo, emoji_padrao) VALUES
  ('gratuita', 'Comunidade Gratuita', 'Grupo aberto para iniciantes em IA. Foco em conscientização e primeiros passos.', 'Acessível, motivacional, prático. Use linguagem simples e exemplos do dia-a-dia. Evite jargões técnicos.', 'Despertar curiosidade sobre IA e gerar leads qualificados para Academy.', '🤓'),
  ('academy', 'IAplicada Academy', 'Comunidade de alunos que estão aprendendo IA na prática. Foco em implementação.', 'Educacional, direto, hands-on. Fale como mentor que está lado a lado. Referências a ferramentas específicas e resultados práticos.', 'Engajar alunos, reduzir churn, gerar cases de sucesso e upsell para Business.', '✱'),
  ('business', 'IAplicada Business', 'Empreendedores implementando IA nas empresas. Foco em resultado de negócio.', 'Consultivo, estratégico, orientado a ROI. Fale em termos de economia de tempo, redução de custo e aumento de receita.', 'Gerar resultados mensuráveis, criar cases e referral.', '🤓')
ON CONFLICT (slug) DO NOTHING;

-- ── EVENTS (Aulas, Lives, Q&As do calendário master) ──
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'aula', -- aula, live, qa
  ferramenta text,
  ferramenta_descricao text,
  data date NOT NULL,
  horario time DEFAULT '20:00',
  plataforma text DEFAULT 'youtube', -- youtube, zoom, meet, instagram
  status text NOT NULL DEFAULT 'pendente', -- pendente, concluido, cancelado
  comunidade text DEFAULT 'academy', -- gratuita, academy, business
  produto text DEFAULT 'academy',
  tags text[],
  stories_teaser text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);

-- ── ROUTINE MESSAGES (Mensagens de rotina por comunidade) ──
CREATE TABLE IF NOT EXISTS routine_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  copy_text text NOT NULL,
  comunidade text NOT NULL DEFAULT 'gratuita', -- gratuita, academy, business
  canal text NOT NULL DEFAULT 'whatsapp', -- whatsapp, email, stories
  data date NOT NULL,
  horario text DEFAULT '08:00', -- 08:00, 14:00, 19:20
  status text NOT NULL DEFAULT 'rascunho', -- rascunho, aprovado, enviado
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routine_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on routine_messages" ON routine_messages FOR ALL USING (true) WITH CHECK (true);

-- ── LAUNCH CAMPAIGNS (Campanhas de lançamento) ──
CREATE TABLE IF NOT EXISTS launch_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  big_idea text,
  inimigo_narrativo text,
  metodo text,
  oferta text,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'planejando', -- planejando, ativo, concluido
  created_at timestamptz DEFAULT now()
);

ALTER TABLE launch_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on launch_campaigns" ON launch_campaigns FOR ALL USING (true) WITH CHECK (true);

-- ── LAUNCH PHASES (Fases da campanha) ──
CREATE TABLE IF NOT EXISTS launch_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES launch_campaigns(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  emocao_chave text,
  objetivo text,
  data_inicio date,
  data_fim date,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE launch_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on launch_phases" ON launch_phases FOR ALL USING (true) WITH CHECK (true);

-- ── LAUNCH MESSAGES (Mensagens do lançamento por canal) ──
CREATE TABLE IF NOT EXISTS launch_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES launch_campaigns(id) ON DELETE CASCADE NOT NULL,
  phase_id uuid REFERENCES launch_phases(id) ON DELETE CASCADE,
  canal text NOT NULL DEFAULT 'whatsapp', -- whatsapp, email, stories
  titulo text NOT NULL,
  copy_text text,
  subject_line text, -- para email
  roteiro text, -- para stories
  story_type text, -- enquete, valor, evento, cta
  data date,
  sort_order integer DEFAULT 0,
  done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE launch_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on launch_messages" ON launch_messages FOR ALL USING (true) WITH CHECK (true);
