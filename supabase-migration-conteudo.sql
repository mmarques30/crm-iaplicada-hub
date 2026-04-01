-- ============================================
-- MIGRAÇÃO: Módulo de Conteúdo / Marketing
-- Tabelas: content_items, static_content_items, social_posts
-- ============================================

-- ── CONTENT ITEMS (Vídeos, Trilhas, Módulos, Aulas) ──
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  roteiro text,
  tipo_video text DEFAULT 'video', -- video, reel, short, live
  plataforma text DEFAULT 'youtube', -- youtube, instagram, tiktok, linkedin
  status_producao text NOT NULL DEFAULT 'backlog', -- backlog, roteiro, gravado, edicao, revisao, edicao_concluida, publicado, cancelado
  prioridade text DEFAULT 'media', -- alta, media, baixa
  data_gravacao date,
  deadline date,
  data_publicacao date,
  data_publicacao_estimada date,
  tipo_hierarquia text, -- trilha, modulo, aula, null (avulso)
  parent_content_id uuid REFERENCES content_items(id) ON DELETE SET NULL,
  trilha_modulo_id uuid,
  ordem_exibicao integer DEFAULT 0,
  tags text[],
  gancho text,
  cta text,
  duracao text,
  responsavel text,
  produto text DEFAULT 'academy', -- academy, business, skills
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on content_items" ON content_items FOR ALL USING (true) WITH CHECK (true);

-- ── STATIC CONTENT ITEMS (Criativos: carrosseis, posts, anúncios) ──
CREATE TABLE IF NOT EXISTS static_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text DEFAULT 'carrossel', -- carrossel, post_estatico, story, post_anuncio, banner
  plataformas text[] DEFAULT '{"instagram"}',
  status text NOT NULL DEFAULT 'ideia', -- ideia, backlog, roteiro, criacao, revisao, aprovado, publicado, cancelado
  prioridade text DEFAULT 'media',
  briefing text,
  data_publicacao date,
  deadline date,
  categoria_conteudo text DEFAULT 'organico', -- organico, anuncio
  investimento_ads numeric,
  impressoes integer,
  cpc numeric,
  cpm numeric,
  ctr numeric,
  conversoes integer,
  responsavel text,
  produto text DEFAULT 'academy',
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE static_content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on static_content_items" ON static_content_items FOR ALL USING (true) WITH CHECK (true);

-- ── SOCIAL POSTS (Posts manuais no calendário) ──
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  plataforma text NOT NULL DEFAULT 'instagram',
  data_agendamento date,
  horario time,
  status text DEFAULT 'agendado', -- rascunho, agendado, publicado, cancelado
  tipo text DEFAULT 'post', -- post, story, reel, carrossel, live
  tags text[],
  link_post text,
  produto text DEFAULT 'academy',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on social_posts" ON social_posts FOR ALL USING (true) WITH CHECK (true);

-- ── SOCIAL GOALS (Metas semanais por plataforma) ──
CREATE TABLE IF NOT EXISTS social_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma text NOT NULL,
  meta_semanal integer DEFAULT 3,
  tipo text DEFAULT 'post', -- post, story, reel
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on social_goals" ON social_goals FOR ALL USING (true) WITH CHECK (true);

-- ── CONTENT IDEAS (Ideias de conteúdo) ──
CREATE TABLE IF NOT EXISTS content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text DEFAULT 'video', -- video, carrossel, post, reel
  plataforma text,
  prioridade text DEFAULT 'media',
  status text DEFAULT 'nova', -- nova, aprovada, em_producao, descartada
  produto text DEFAULT 'academy',
  tags text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on content_ideas" ON content_ideas FOR ALL USING (true) WITH CHECK (true);
