

## Plano: Adicionar gráficos de fontes à aba Funil de Vendas

### Problema
A aba "Funil de Vendas" atual mostra apenas 3 cards + banner + tabela cruzada. O Manus (screenshot) mostra adicionalmente 3 gráficos analíticos que estão faltando:

1. **Contatos por Fonte de Aquisição** — BarChart horizontal (rosa para maior, azul, laranja, etc.)
2. **Taxa de Conversão por Fonte** — BarChart horizontal empilhado com 2 métricas: Lead→Opp (azul) e Opp→Customer (verde)
3. **Evolução Mensal de Novos Contatos (excl. Offline)** — AreaChart empilhado por fonte ao longo do tempo (Dez/2025, Jan/2026, Fev/2026)

### Alterações

#### `src/pages/FacebookAdsPage.tsx` — FunnelTab

Adicionar 3 gráficos **após os 3 cards de fonte e o banner**, **antes da tabela cruzada**:

**a) "Contatos por Fonte de Aquisição"** (metade esquerda)
- Horizontal `BarChart` (layout="vertical")
- Agrupar ALL contacts por `normalizeChannel(utm_source || fonte_registro)`, ordenar desc
- Barras com cores semânticas por fonte (rosa Instagram, azul Tráfego, etc.)
- Eixo X = quantidade, Eixo Y = nome da fonte

**b) "Taxa de Conversão por Fonte"** (metade direita)
- Horizontal stacked `BarChart` (layout="vertical")
- Para cada fonte: calcular Lead→Opp % (opportunities / total contacts) e Opp→Customer % (customers / opportunities)
- Duas barras empilhadas: azul = Lead→Opp, verde = Opp→Customer
- Eixo X = 0%–100%, legenda embaixo

**c) "Evolução Mensal de Novos Contatos (excl. Offline)"** (full-width)
- `AreaChart` empilhado (stackId="1")
- Agrupar contacts por mês de `created_at` e fonte normalizada
- Cada fonte = uma `Area` com cor semântica
- Eixo X = meses formatados "MMM/YYYY"
- Legenda embaixo com todas as fontes
- Excluir fontes "Offline" se existir

Layout: `grid-cols-2` para os 2 primeiros gráficos, full-width para o terceiro.

Dados usados: os mesmos contacts e deals já carregados no FunnelTab (sem queries novas). Apenas computar com `useMemo` as agregações necessárias.

### Arquivo afetado
- `src/pages/FacebookAdsPage.tsx` — adicionar gráficos dentro de FunnelTab

