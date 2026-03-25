
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS inscricao_municipal text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS email_fiscal text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS telefone_fiscal text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS descricao_servico text;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS status_nf text DEFAULT 'pendente';
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS numero_nf integer;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS valor_nf numeric;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_envio_nf date;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS observacoes_fiscais text;
