

## Adicionar Aba "Insights" com IA em Todas as Páginas de Analytics

### Visao Geral
Criar um sistema de insights dinâmicos gerados por IA (Lovable AI / Gemini) que analisa os dados reais de cada página e retorna recomendações classificadas por tipo, prioridade e produto. Cada página de analytics receberá uma aba "Insights" como última aba.

### Arquitetura

```text
┌─────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  Frontend   │───▶│  Edge Function        │───▶│  Lovable AI     │
│  (cada pág) │    │  generate-insights    │    │  Gateway        │
│             │◀───│  recebe dados,        │◀───│  (Gemini Flash) │
│ InsightsTab │    │  envia p/ IA,         │    │                 │
│             │    │  retorna insights[]   │    │                 │
└─────────────┘    └──────────────────────┘    └─────────────────┘
```

### Componentes e Arquivos

#### 1. Componente `InsightsTable` (novo)
**Arquivo:** `src/components/dashboard/InsightsTable.tsx`

Componente reutilizável que renderiza uma tabela de insights com:
- Interface `Insight` com campos: type, title, metric, description, product, priority
- Filtros interativos por Produto, Prioridade e Tipo (com contagem)
- Badges coloridos por tipo (positivo=verde, alerta=vermelho, oportunidade=azul, ação=âmbar)
- Ordenação automática por prioridade e tipo
- Estado de loading com skeleton

#### 2. Hook `useInsights` (novo)
**Arquivo:** `src/hooks/useInsights.ts`

Hook que recebe o contexto da página (ex: "instagram", "facebook_ads", "crm", "financeiro", "painel") e os dados resumidos em JSON, chama a edge function via `supabase.functions.invoke('generate-insights', { body })`, e retorna `{ insights, isLoading, error, refetch }`.

#### 3. Edge Function `generate-insights` (novo)
**Arquivo:** `supabase/functions/generate-insights/index.ts`

- Recebe no body: `{ context: string, data: object }`
- `context` identifica a página (instagram, facebook_ads, crm, financeiro, painel)
- `data` contém as métricas resumidas da página
- Monta um system prompt específico para análise de marketing/vendas em português
- Chama Lovable AI Gateway com tool calling para extrair um array estruturado de insights
- Retorna `{ insights: Insight[] }`
- Trata erros 429/402

O prompt do sistema instrui a IA a:
- Analisar os dados como um consultor de marketing digital
- Gerar 5-10 insights por página
- Classificar cada insight com type, title, metric, description, product, priority
- Focar em ações concretas e métricas reais dos dados

#### 4. Adicionar aba "Insights" em cada página

Cada página será modificada para:
- Importar `InsightsTable` e `useInsights`
- Preparar um resumo dos dados da página em JSON
- Adicionar `<TabsTrigger value="insights">Insights</TabsTrigger>` como última aba
- Adicionar `<TabsContent value="insights">` com o componente InsightsTable

| Página | Dados enviados para IA |
|--------|----------------------|
| `InstagramAnalytics.tsx` | followers, reach, engagement, avgLikes, avgComments, top posts, reels vs posts |
| `FacebookAdsPage.tsx` | spend, impressions, clicks, CTR, CPL, leads, campaigns com status/spend/cpl |
| `CrmAnalytics.tsx` | contacts, activeDeals, wonDeals, lostDeals, winRate, pipeline value, deals by channel, stage conversion |
| `Financeiro.tsx` | receita, totalVendas, ticketMedio, receita por produto, formas pagamento, evolução mensal |
| `PainelGeral.tsx` | todos os KPIs consolidados (instagram + facebook + CRM) |

#### 5. Atualizar `supabase/config.toml`
Adicionar a edge function `generate-insights` com `verify_jwt = false` para acesso público.

### Arquivos criados/modificados (8 arquivos)

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/InsightsTable.tsx` | Criar componente |
| `src/hooks/useInsights.ts` | Criar hook |
| `supabase/functions/generate-insights/index.ts` | Criar edge function |
| `supabase/config.toml` | Adicionar function config |
| `src/pages/InstagramAnalytics.tsx` | Adicionar aba Insights |
| `src/pages/FacebookAdsPage.tsx` | Adicionar aba Insights |
| `src/pages/CrmAnalytics.tsx` | Adicionar aba Insights |
| `src/pages/Financeiro.tsx` | Adicionar aba Insights |
| `src/pages/PainelGeral.tsx` | Adicionar aba Insights |

### Detalhes Técnicos

- **Modelo:** `google/gemini-3-flash-preview` (rápido e barato)
- **Structured output:** Tool calling com schema `generate_insights` para garantir formato correto
- **Cache:** React Query com `staleTime: 5min` para não chamar a IA a cada troca de aba
- **Fallback:** Se a IA falhar, mostra mensagem "Não foi possível gerar insights" com botão retry

