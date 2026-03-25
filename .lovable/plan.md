

## Fix: Spinner infinito no Painel Financeiro

### Causa raiz

As tabelas `parcelas`, `despesas`, `metas`, `notas_fiscais` e `repasses` nunca foram criadas no Supabase. O SQL existe no arquivo `supabase-migration-financeiro.sql` mas não foi executado. Queries retornam 404 e o React Query entra em retry infinito.

### Solução

**Passo 1: Migração SQL** -- Criar todas as tabelas faltantes

Executar o conteudo do `supabase-migration-financeiro.sql`:
- Adicionar campos na tabela `vendas` (telefone, total_parcelas, por_indicacao, cpf_cnpj, razao_social, endereco, cep)
- Criar tabela `parcelas` (venda_id, tipo, numero, valor, data_vencimento, status, data_pagamento)
- Criar tabela `notas_fiscais` (venda_id, numero_nf, cpf_cnpj, razao_social, valor, status_nf, etc.)
- Criar tabela `despesas` (data, descricao, categoria, tipo, status, pagamento, forma_pgto, valor)
- Criar tabela `metas` (ano, mes, categoria, valor_projetado) com UNIQUE(ano, mes, categoria)
- Criar tabela `repasses` (venda_id, indicador_nome, valor, status, data_pagamento)
- RLS com policy "allow all" em cada tabela (consistente com padrão atual)
- Views `fluxo_caixa_mensal` e `despesas_mensal`

**Passo 2: Tornar `FinanceiroPainel.tsx` resiliente**

- Adicionar `retry: 1` em todas as queries de parcelas, despesas e metas para evitar retry infinito
- Tratar estado de erro: quando as queries falham, exibir mensagem de erro em vez de spinner eterno
- Garantir que `isLoading` considera `isError` para sair do estado de loading

### Arquivos afetados
- Nova migração SQL via ferramenta de migração
- `src/pages/FinanceiroPainel.tsx` -- adicionar tratamento de erro e limitar retries

