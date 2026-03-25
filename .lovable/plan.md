

## Plano: Separar Estruturas de Controle Fiscal e Regularização NF

### Problema Identificado

O sistema trata "Controle Fiscal" e "Regularização NF" como a mesma estrutura de dados (ambas leem de `notas_fiscais`), mas são entidades diferentes:

- **Controle Fiscal** = perfil fiscal do **cliente** (1 registro por cliente): razão social, CPF/CNPJ, endereço, inscrição municipal, email fiscal, telefone, descrição do serviço contratado, status geral da NF, nº NF, valor NF, data envio, observações
- **Regularização NF** = NF **mensal** por venda Business (N registros por cliente): número sequencial, CPF/CNPJ, razão social, mês referência, endereço+CEP, descrição detalhada do serviço (escopo contratual), valor da parcela mensal, status

### Solução

**1. Enriquecer tabela `vendas` com campos fiscais do cliente**

Adicionar colunas à tabela `vendas` (migração SQL):
- `inscricao_municipal text`
- `email_fiscal text`
- `telefone_fiscal text`
- `descricao_servico text` (descrição geral do contrato)
- `status_nf text DEFAULT 'pendente'` (status fiscal geral do cliente)
- `numero_nf integer` (número da NF geral)
- `valor_nf numeric`
- `data_envio_nf date`
- `observacoes_fiscais text`

Isso permite que a aba **Controle Fiscal** leia diretamente da tabela `vendas` (1 registro por venda/cliente), sem depender de `notas_fiscais`.

**2. Manter `notas_fiscais` exclusivamente para Regularização NF**

A tabela `notas_fiscais` já tem a estrutura correta para regularização mensal (venda_id, numero_nf, mes_referencia, descricao_servico, valor, status_nf). Será usada exclusivamente pela aba "Regularização NF".

**3. Atualizar queries e dados no GestaoVendas.tsx**

- **Aba "Fiscal"**: trocar fonte de `allNFs` → `allVendas`, exibindo colunas do perfil fiscal do cliente (nome, email, produto, valor contrato, razão social, CPF/CNPJ, status NF, nº NF, valor NF, data envio)
- **Aba "Regularização"**: manter `allNFs` (tabela `notas_fiscais`), que contém registros mensais com descrição detalhada
- Atualizar KPIs: "Fiscal" mostra totais de clientes e status NF geral; "Regularização" mostra totais de NFs mensais pendentes/emitidas

**4. Carregar dados reais dos CSVs no banco**

- Inserir dados do `fiscal_clientes_todos_mar_o_2026_1.csv` nos campos fiscais da tabela `vendas` (UPDATE por nome/email do cliente)
- Inserir dados do `regularizacao_nf_business_mar_2026_3.csv` na tabela `notas_fiscais` (INSERT ou UPDATE dos 6 registros de março/2026 com descrições de serviço detalhadas)
- O CSV fiscal tem ~47 clientes com campos como inscrição municipal, email fiscal, telefone, observações que não existiam antes

**5. Atualizar FiscalAIButton e InsightsTable**

- Na aba Fiscal: botão IA valida dados fiscais do cliente (CPF/CNPJ, razão social)
- Na aba Regularização: botão IA gera descrição de serviço para NFs sem descrição
- Insights fiscais alimentados com dados reais de perfil do cliente

### Arquivos afetados

- **Migração SQL**: adicionar ~9 colunas fiscais à tabela `vendas`
- **Script de dados**: UPDATE `vendas` com dados fiscais do CSV + INSERT/UPDATE `notas_fiscais` com regularização detalhada
- **`src/pages/GestaoVendas.tsx`**: separar fonte de dados das abas Fiscal (vendas) vs Regularização (notas_fiscais), atualizar tabelas e KPIs
- **`src/components/financeiro/FiscalAIButton.tsx`**: ajustar dados passados conforme nova estrutura

