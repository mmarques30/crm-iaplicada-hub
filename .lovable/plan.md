

## Plano: Edição Completa de Vendas, Parcelas, Status e Estrutura Financeira

### Problema

O sistema atual é essencialmente read-only nas operações críticas:
- **Vendas**: só cria e exclui — não edita nome, valor, status, produto, dados fiscais
- **Parcelas**: não há como visualizar parcelas por venda, marcar como paga, alterar status
- **Fiscal**: tabela apenas exibe dados — sem edição de CPF/CNPJ, razão social, email fiscal, status NF
- **Regularização NF**: sem alteração de status (pendente → emitida → enviada), sem edição de campos
- **Repasses**: sem UI para gestão (ver repasses, marcar como pago)

### Implementação

#### 1. Dialog de Edição de Venda (`EditVendaDialog`)

Ao clicar em uma linha na tabela de vendas, abre dialog com todos os campos editáveis:
- Nome, email, telefone, produto, valor, data_venda, forma_pagamento, parcelas
- Status (em_andamento / concluido / cancelado)
- CPF/CNPJ, razão social, dados fiscais (inscricao_municipal, email_fiscal, telefone_fiscal, descricao_servico)
- Checkbox "por indicação"
- Mutation: `UPDATE vendas SET ... WHERE id = ?`
- Invalida queries: `gestao-vendas`, `gestao-parcelas`, `fin_vendas`

#### 2. Dialog de Parcelas por Venda (`VendaParcelasDialog`)

Botão na linha da venda abre dialog com lista de parcelas daquela venda:
- Tabela: nº parcela, valor, data vencimento, data pagamento, status
- Botão "Marcar como Paga" por parcela → `UPDATE parcelas SET status='pago', data_pagamento=now() WHERE id=?`
- Botão "Marcar como Pendente" para reverter
- Badge de status colorido (pago=verde, pendente=amarelo, vencida=vermelho)
- KPI resumo: X de Y pagas, valor restante

#### 3. Edição Inline na Aba Fiscal

Cada linha da tabela fiscal terá:
- Campos editáveis ao clicar: CPF/CNPJ, razão social, email_fiscal, inscricao_municipal, descricao_servico
- Select de status NF (pendente/emitida/enviada) editável inline
- Campos numero_nf, valor_nf, data_envio_nf editáveis
- Botão salvar por linha → `UPDATE vendas SET ... WHERE id=?`
- Campo observacoes_fiscais editável

#### 4. Edição na Aba Regularização NF

Cada linha terá:
- Select de status editável (pendente → emitida → enviada)
- Campos numero_nf, descricao_servico, cpf_cnpj, razao_social, endereco, cep editáveis
- Botão salvar → `UPDATE notas_fiscais SET ... WHERE id=?`
- Botão "Nova NF" para criar registro manual

#### 5. Aba Repasses (nova)

Nova aba no GestaoVendas com:
- Lista de vendas com `por_indicacao = true`
- Campos: nome cliente, valor contrato, valor repasse (10%), indicador_nome, status repasse
- Botão "Marcar como Pago" → `UPDATE repasses SET status='pago', data_pagamento=now()`
- KPIs: total repasses, valor pendente, valor pago
- Ao pagar repasse, cria despesa em `despesas` com categoria 'repasse_indicacao'

### Arquivos afetados

- `src/pages/GestaoVendas.tsx` — reescrita significativa: adicionar dialogs de edição, parcelas, inline editing fiscal/regularização, aba repasses
- Nenhuma migração necessária — todas as colunas já existem no banco

### Detalhes técnicos

- Mutations com `useMutation` + invalidação de queries cruzadas (gestao-vendas, gestao-parcelas, gestao-notas-fiscais, fin_vendas, fin_parcelas)
- Dialog de edição carrega dados da venda selecionada via `useState<any>(null)` 
- Parcelas dialog: query filtrada `parcelas.select('*').eq('venda_id', selectedVendaId)`
- Repasses: campo `indicador_nome` na tabela `repasses` (já existe) — dialog para preencher nome do indicador
- Toast de confirmação em todas as ações destrutivas

