
-- Adicionar campos faltantes na tabela vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS total_parcelas integer DEFAULT 1;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS por_indicacao boolean DEFAULT false;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cpf_cnpj text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cep text;

-- PARCELAS
CREATE TABLE IF NOT EXISTS parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL DEFAULT 'parcela',
  numero integer NOT NULL DEFAULT 1,
  valor numeric NOT NULL DEFAULT 0,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_pagamento date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on parcelas" ON parcelas FOR ALL USING (true) WITH CHECK (true);

-- NOTAS FISCAIS
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE,
  numero_nf integer,
  cpf_cnpj text,
  razao_social text,
  mes_referencia text,
  endereco text,
  cep text,
  descricao_servico text,
  valor numeric NOT NULL DEFAULT 0,
  status_nf text NOT NULL DEFAULT 'pendente',
  data_emissao date,
  data_envio date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notas_fiscais" ON notas_fiscais FOR ALL USING (true) WITH CHECK (true);

-- DESPESAS
CREATE TABLE IF NOT EXISTS despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  tipo text NOT NULL DEFAULT 'pontual',
  status text NOT NULL DEFAULT 'pendente',
  pagamento text DEFAULT 'a_vista',
  forma_pgto text,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on despesas" ON despesas FOR ALL USING (true) WITH CHECK (true);

-- METAS
CREATE TABLE IF NOT EXISTS metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL,
  mes integer NOT NULL,
  categoria text NOT NULL,
  valor_projetado numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ano, mes, categoria)
);

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on metas" ON metas FOR ALL USING (true) WITH CHECK (true);

-- REPASSES
CREATE TABLE IF NOT EXISTS repasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  indicador_nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  data_pagamento date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE repasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on repasses" ON repasses FOR ALL USING (true) WITH CHECK (true);

-- Views
CREATE OR REPLACE VIEW fluxo_caixa_mensal AS
SELECT
  to_char(data_pagamento, 'YYYY-MM') as mes,
  SUM(valor) as total_recebido,
  COUNT(*) as parcelas_pagas
FROM parcelas
WHERE status = 'pago' AND data_pagamento IS NOT NULL
GROUP BY to_char(data_pagamento, 'YYYY-MM')
ORDER BY mes;

CREATE OR REPLACE VIEW despesas_mensal AS
SELECT
  to_char(data, 'YYYY-MM') as mes,
  categoria,
  SUM(valor) as total,
  COUNT(*) as quantidade
FROM despesas
GROUP BY to_char(data, 'YYYY-MM'), categoria
ORDER BY mes, categoria;
