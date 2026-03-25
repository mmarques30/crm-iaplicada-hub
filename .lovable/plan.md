

## Plano: Carga Completa de Dados Financeiros e Comerciais

### Contexto

Todas as tabelas financeiras (`vendas`, `parcelas`, `despesas`, `notas_fiscais`, `repasses`) estão vazias. Os dados existem nos 6 arquivos enviados e precisam ser inseridos no Supabase para alimentar os módulos Comercial e Financeiro.

### Fontes de Dados

| Arquivo | Destino | Registros |
|---------|---------|-----------|
| `vendas_2026-03-25.csv` | tabela `vendas` | 46 vendas |
| `financeiro_empresa_*.csv` (seção DESPESAS) | tabela `despesas` | ~162 despesas |
| `fiscal_clientes_todos_mar_o_2026.csv` | tabela `notas_fiscais` + atualiza `vendas` (cpf_cnpj, razao_social, endereco, cep) | ~47 clientes |
| `regularizacao_nf_business_mar_2026_1.csv` | tabela `notas_fiscais` (NFs de regularização Business março/2026) | 7 NFs |
| `Relatorio_Repasse_LAB_1.pdf` | tabela `repasses` | 2 repasses (Valéria Sales R$107,30 + Ariane Calados R$110,40) |

### Execução — 5 Passos

**Passo 1: Inserir 46 vendas na tabela `vendas`**
- Mapear campos: Nome→nome, Email→email, Produto→produto (lowercase), Data Venda→data_venda, Forma Pagamento→forma_pagamento, Parcelas→parcelas/total_parcelas, Valor→valor, Status→status
- Marcar vendas de Valéria Sales e Ariane Calados com `por_indicacao = true` (conforme relatório de repasses)
- Enriquecer com dados fiscais do CSV fiscal: cpf_cnpj, razao_social, endereco, cep para clientes Business que possuem esses dados

**Passo 2: Gerar parcelas para vendas parceladas**
- Para vendas com parcelas > 1: gerar N registros na tabela `parcelas`
- Tipo "entrada" para primeira parcela de vendas `entrada_boleto`/`entrada_cartao`, demais como "parcela"
- Valor da parcela = valor_contrato / total_parcelas
- Data vencimento: mensal a partir da data da venda
- Status: vendas `concluido` → todas as parcelas como `pago`; vendas `em_andamento` → parcelas com vencimento passado como `pago`, futuras como `pendente`
- Para vendas à vista (1 parcela): 1 registro, status conforme status da venda

**Passo 3: Inserir ~162 despesas na tabela `despesas`**
- Mapear: Título→descricao, Categoria→categoria (normalizar: "Folha"→"folha", "Assinaturas Fixas/Teste"→"sistemas", "software"→"sistemas", "marketing"→"publicidade", "administrativo"→"outros", "pessoal"→"outros", "infraestrutura"→"outros")
- Tipo: fixa/pontual conforme CSV
- Status: "paga"→"pago", "pendente"→"pendente"

**Passo 4: Inserir notas fiscais na tabela `notas_fiscais`**
- Inserir os 7 registros de regularização NF Business (março/2026) do CSV de regularização
- Inserir registro da Cimed (única com status "emitida" no CSV fiscal, NF valor R$777)
- Vincular cada NF ao venda_id correspondente via nome do cliente

**Passo 5: Inserir 2 repasses na tabela `repasses`**
- Valéria Sales: valor R$107,30, status "pago", indicador_nome "LAB"
- Ariane Calados: valor R$110,40, status "pago", indicador_nome "LAB"
- Vincular ao venda_id correspondente

### Implementação Técnica

- Usar script Python via `code--exec` para:
  1. Parsear todos os CSVs
  2. Normalizar e mapear dados
  3. Gerar SQL INSERT statements
  4. Executar via `psql` (que tem acesso de INSERT)
- Categorias de despesas normalizadas: folha, sistemas, publicidade, custos, outros
- Valores monetários com vírgula (ex: "1814,17") serão convertidos para ponto decimal
- Datas no formato DD/MM/YYYY serão convertidas para YYYY-MM-DD

### Resultado Esperado

Após a carga, os painéis Financeiro e Comercial exibirão:
- 46 vendas com KPIs por produto (Academy ~31, Business ~14, Ferramentas 2)
- Faturamento total ~R$217.816
- ~162 despesas categorizadas alimentando Business Plan e Painel Geral
- Parcelas geradas alimentando Fluxo de Caixa e Contas a Receber
- NFs de regularização Business para março/2026
- Repasses LAB com 2 indicações pagas

