

## Plano: Análise IA para Fiscal, Parcelas e Funcionalidades Avançadas

### Resumo

Expandir o sistema de insights por IA com contextos especializados para fiscal e parcelas, criar edge function dedicada para auto-gerar dados fiscais, e integrar insights nas abas que ainda não possuem.

### O que será implementado

**1. Novos contextos na edge function `generate-insights`**

Adicionar 2 prompts ao `CONTEXT_PROMPTS`:
- `fiscal`: Foco em NFs pendentes, compliance tributário, clientes sem CPF/CNPJ, regularização e riscos de multa
- `parcelas`: Foco em inadimplência, aging de recebíveis (>30, >60, >90 dias vencidos), previsão de fluxo de caixa e oportunidades de antecipação

Atualizar tipo no `useInsights` para aceitar os novos contextos.

**2. Nova edge function `fiscal-analysis`**

Recebe `{ action, data }` e usa Lovable AI (Gemini Flash) com tool calling para:
- `generate_nf_data`: Dado produto, valor e nome do cliente, gera `descricao_servico` padronizada para NF
- `validate_fiscal`: Verifica consistência CPF/CNPJ vs razão social
- `analyze_installments`: Dado array de parcelas, retorna análise de risco (atraso, sugestão de renegociação, desconto para antecipação)

**3. Novo hook `useFiscalAnalysis`**

Hook com `useMutation` que encapsula a chamada à edge function `fiscal-analysis`, tratando loading, erro e resultado.

**4. Novo componente `FiscalAIButton`**

Botão reutilizável que chama `fiscal-analysis`, exibe loading, e retorna resultado via callback. Usado na aba Regularização e no detalhe de parcelas.

**5. Integrar insights nas abas Fiscal e Regularização (GestaoVendas)**

- Na aba "Fiscal": `InsightsTable` com contexto `fiscal`, alimentado com dados de NFs
- Na aba "Regularização": `InsightsTable` + `FiscalAIButton` para gerar `descricao_servico` em lote
- Botão "Analisar Parcelas com IA" no detalhe de vendas

**6. Enriquecer insights do FinanceiroPainel**

- Adicionar dados de aging de parcelas (vencidas >30, >60, >90 dias) ao payload do contexto `parcelas`
- Usar contexto `parcelas` na aba Insights quando houver dados de recebíveis

### Arquivos afetados
- `supabase/functions/generate-insights/index.ts` -- 2 novos contextos
- `supabase/functions/fiscal-analysis/index.ts` -- nova edge function
- `src/hooks/useInsights.ts` -- aceitar novos contextos
- `src/hooks/useFiscalAnalysis.ts` -- novo hook
- `src/components/financeiro/FiscalAIButton.tsx` -- novo componente
- `src/pages/GestaoVendas.tsx` -- InsightsTable nas abas fiscais + botão IA
- `src/pages/FinanceiroPainel.tsx` -- enriquecer insights com dados de parcelas/aging

