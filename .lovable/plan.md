

## Modernização do Layout - Replicar Estrutura do lead.iaplicada.com

### Contexto
O app de referência (lead.iaplicada.com) tem um layout full-width sem sidebar, com header de navegação horizontal no topo, hero sections com título grande, KPI cards com borda colorida superior, e abas com mais sub-seções (Funil, ROI, Canais, Insights). O sistema atual usa sidebar lateral com navegação diferente.

A mudança principal: **remover referências ao HubSpot** (agora é CRM interno) e **replicar a estética visual** do Manus, mantendo as cores da marca IAplicada.

### Mudanças

#### 1. Modernizar MetricCard para replicar estilo Manus
O app de referência usa KPI cards com: borda colorida no topo, label uppercase pequena, número grande monocromático colorido, sem bordas laterais visíveis, fundo levemente azulado/cinza.

**Arquivo:** `src/components/dashboard/MetricCard.tsx`
- Adicionar prop `borderColor` para borda superior colorida (3px)
- Número com `font-mono` e tamanho maior (`text-3xl`)
- Remover ícone circular, usar ícone inline ao lado do label
- Background sutil diferenciado

#### 2. Criar SourceSummaryCard (componente novo)
No Manus, a aba "Visão Geral" do Painel mostra 3 cards lado a lado (Instagram / Facebook Ads / CRM), cada um com mini-KPIs e botão "Ver detalhes".

**Arquivo:** `src/components/dashboard/SourceSummaryCard.tsx`
- Props: title, icon, color, metrics (array de {label, value}), detailLink
- Grid 2x2 de mini-métricas + botão "Ver detalhes" com link

#### 3. Redesenhar PainelGeral.tsx (Visão Consolidada)
Replicar a estrutura do Manus:

- **Hero section**: Título "Visão Consolidada", subtítulo, badges de fontes conectadas, timestamp + botão atualizar
- **6 KPI Cards** com novo estilo (borda colorida no topo)
- **Filtros**: Adicionar dropdowns de período
- **Tabs expandidas**: Visão Geral, Crescimento, Canais, Funil, ROI
  - **Visão Geral**: 3 SourceSummaryCards (Instagram, Facebook Ads, CRM Interno) com "Ver detalhes"
  - **Funil**: Barras proporcionais horizontais (Impressões → Leads → Opportunities)
  - **Canais**: Gráfico de barras horizontais + tabela de conversão por canal
  - **Crescimento**: Gráficos de linha semanais
  - **ROI**: Cards de custo por canal

#### 4. Redesenhar CrmAnalytics.tsx → CRM Interno
Renomear de "HubSpot CRM" para "CRM Interno" / "Funil de Vendas":

- Título: "Funil de Vendas"
- Badges: "X Deals Ativos", "Y Contatos"
- **8 KPI cards** em 2 linhas de 4 (como no Manus)
- Tabs: Funil, Fontes, Leads, Insights
- Dados vêm das tabelas internas (`deals`, `contacts`, `stages`, `product_metrics`) em vez do snapshot HubSpot

#### 5. Modernizar FacebookAdsPage.tsx
- **8 KPI cards** em 2 linhas (4 grandes + 4 menores, como no Manus)
- Adicionar gráficos: Investimento por Campanha (horizontal), CPL por Campanha (horizontal)
- Tab "Evolução" com gráfico de área temporal

#### 6. Modernizar InstagramAnalytics.tsx
- Adicionar tab "Categorias" (se houver dados)
- Melhorar scatter plot com tooltip descritivo
- Cards de mini-KPIs (Méd. Curtidas/Post, Méd. Comentários/Post)

#### 7. Modernizar Financeiro.tsx
- KPI cards com borda colorida no topo (verde, azul, roxo, âmbar)
- Adicionar gráfico "Evolução Mensal de Vendas" (linha dupla: receita + volume)
- Remover referência "HubSpot" da descrição → "Acompanhamento financeiro integrado ao CRM"

#### 8. Atualizar referências HubSpot em todo o sistema
- `AppSidebar.tsx`: Renomear "CRM" para "Funil de Vendas" no menu analytics
- `CrmAnalytics.tsx`: Mudar para usar dados das tabelas internas (`deals_full`, `contacts`, `product_metrics`) em vez do snapshot HubSpot
- `PainelGeral.tsx`: Card "HubSpot CRM" → "CRM Interno" com dados de `product_metrics`

#### 9. CSS refinamentos (`src/index.css`)
- Adicionar classe `.metric-card-hero` para cards com borda superior colorida
- Garantir `font-feature-settings: "tnum"` nos números para alinhamento tabular

### Arquivos modificados (8 arquivos)
| Arquivo | O que muda |
|---------|-----------|
| `src/components/dashboard/MetricCard.tsx` | Estilo Manus: borda superior colorida, número grande mono |
| `src/components/dashboard/SourceSummaryCard.tsx` | Novo componente para Visão Geral |
| `src/pages/PainelGeral.tsx` | Redesign completo com tabs expandidas, SourceSummaryCards, funil |
| `src/pages/CrmAnalytics.tsx` | Renomear HubSpot → CRM Interno, usar dados internos |
| `src/pages/FacebookAdsPage.tsx` | 8 KPIs em 2 linhas, gráficos horizontais |
| `src/pages/Financeiro.tsx` | Borda colorida nos KPIs, evolução mensal, remover ref HubSpot |
| `src/pages/InstagramAnalytics.tsx` | Mini-KPI cards adicionais |
| `src/components/layout/AppSidebar.tsx` | Renomear "CRM" → "Funil de Vendas" |
| `src/index.css` | Classe utilitária para metric cards |

