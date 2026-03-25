

## Plano: Corrigir aba "Evolução" do Facebook Ads para corresponder ao Manus

### Problema
A aba Evolução atual usa **dados simulados com Math.random()** — não há dados diários reais. O Manus mostra 4 gráficos com dados diários reais dos últimos 90 dias:

1. **Investimento Diário (Últimos 90 dias)** — AreaChart rosa com datas no eixo X
2. **Impressões e Cliques** — LineChart duplo (azul impressões, vermelho cliques)
3. **CTR Diário** — AreaChart azul com % no eixo Y
4. **Resumo Semanal** — BarChart com gasto (rosa) e leads (azul escuro) por semana

### Causa raiz
O collector (`dashboard-collector/index.ts`) só busca insights agregados por campanha (`level=campaign`). Não busca dados diários (`time_increment=1`).

### Alterações

#### 1. Edge Function: buscar dados diários (`supabase/functions/dashboard-collector/index.ts`)
Na função `collectFacebookAds`, adicionar uma terceira chamada à API:
```
/insights?fields=spend,impressions,clicks,ctr,reach,actions
  &date_preset=last_90d&time_increment=1&access_token=...
```
Retornar array `dailyInsights` com `{ date, spend, impressions, clicks, ctr, leads }` no resultado.

#### 2. Tipo: adicionar `dailyInsights` (`src/hooks/useDashboardData.ts`)
Adicionar ao tipo `facebook_ads`:
```ts
dailyInsights?: Array<{
  date: string; spend: number; impressions: number
  clicks: number; ctr: number; leads: number
}>
```

#### 3. Aba Evolução: reconstruir com 4 gráficos reais (`src/pages/FacebookAdsPage.tsx`)

Substituir o conteúdo da `TabsContent value="evolution"` por:

- **Investimento Diário** — `AreaChart` full-width, dados de `dailyInsights`, eixo X com datas formatadas `dd/MM`, fill rosa `#E8684A` com opacidade
- **Impressões e Cliques** (metade esquerda) — `ComposedChart` com duas `Line`: impressões (azul `#4A9FE0`) e cliques (vermelho `#E8684A`), legend embaixo
- **CTR Diário** (metade direita) — `AreaChart` azul com fill, eixo Y em `%`
- **Resumo Semanal** (full-width) — Agrupar `dailyInsights` por semana (`getISOWeek`), `BarChart` com barras de gasto (rosa) e leads (azul escuro `#1E3A5F`), labels "Sem 1", "Sem 2"...

Layout: primeiro gráfico full-width, dois gráficos lado a lado (`grid-cols-2`), último full-width.

### Arquivos afetados
- `supabase/functions/dashboard-collector/index.ts` — nova query diária
- `src/hooks/useDashboardData.ts` — tipo `dailyInsights`
- `src/pages/FacebookAdsPage.tsx` — reconstruir aba Evolução

### Fallback
Se `dailyInsights` estiver vazio (snapshot antigo sem redeploy), mostrar mensagem "Atualize os dados para ver a evolução diária" em vez de dados simulados.

