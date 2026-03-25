

## Plano: Adicionar aba "Funil de Vendas" ao Facebook Ads

### Problema
A página Facebook Ads não tem aba de funil. O Manus mostra 3 blocos + banner + tabela cruzada, todos usando dados CRM filtrados por fontes Meta/Instagram.

### Estrutura do Manus (screenshot)

```text
┌─ Instagram Orgânico ─┐ ┌─ Facebook/Instagram Ads ┐ ┌─ Campanhas (Meta Ads) ─┐
│ 158 contatos          │ │ 14 contatos              │ │ 47 contatos            │
│ → Leads         123   │ │ → Leads            0     │ │ → Leads          33    │
│ → Opportunities  32   │ │ → Opportunities   14     │ │ → Opportunities  13    │
│ → Customers       3   │ │ → Customers        0     │ │ → Customers       1    │
│ Conv. Rate    20.3%   │ │ Conv. Rate      100%     │ │ Conv. Rate     27.7%   │
│ Sub-sources...        │ │ Instagram Ads  11        │ │ Aula IA (Meta)   22    │
│                       │ │ Facebook Ads    3        │ │ Link na Bio      19    │
└───────────────────────┘ └──────────────────────────┘ │ TikTok (Orgânico) 10   │
                                                       │ Editors            3    │
                                                       └────────────────────────┘

┌──────────────────── TOTAL ECOSSISTEMA META/INSTAGRAM ────────────────────────┐
│              219 contatos (19.1% do total)                                   │
│          59 Opportunities  ·  4 Customers  ·  19 Deals                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──── Deals por Fonte × Estágio do Funil ──────────────────────────────────────┐
│ FONTE           MQL  CONT.INIC  SQL  CONECT  REUN.AG  REUN.REAL  FECH  PERD │
│ Tráfego Direto   1      4       2     2       1        2          —     6    │
│ Facebook Ads     —      7       2     1       1        1          —     2    │
│ ...                                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Alterações

#### 1. `src/pages/FacebookAdsPage.tsx`

**Adicionar aba "Funil"** na lista de tabs (entre "Evolução" e "Insights"):
```ts
{ v: 'funnel', l: 'Funil de Vendas' }
```

**Novo `TabsContent value="funnel"`** com 3 seções:

**a) Três cards de fonte** — Buscar dados de `deals_full` (canal_origem, stage_name, stage_order, is_won) e `contacts` (utm_source). Agrupar em 3 categorias Meta/Instagram:
- "Instagram Orgânico" — canal_origem normalizado = "Instagram Orgânico"
- "Facebook/Instagram Ads" — canal_origem normalizado = "Facebook Ads"
- "Campanhas (Meta Ads)" — canal_origem contendo "meta", "campanha", ou utm_campaign com padrões Meta

Cada card mostra: total contatos, leads (stage_order=0 ou qualification=lead), opportunities (stage_order>=2), customers (is_won), conv. rate, e sub-fontes (utm_campaign ou utm_medium breakdown).

**b) Banner "TOTAL ECOSSISTEMA META/INSTAGRAM"** — Soma dos 3 cards, percentual sobre total geral de contatos, com sub-métricas (Opportunities, Customers, Deals).

**c) Tabela cruzada "Deals por Fonte × Estágio do Funil"** — Reutilizar padrão do CrmAnalytics (cross-tab). Linhas = fontes (normalizeChannel), colunas = stage_names ordenados por display_order + "NEGÓCIO PERDIDO" + "TOTAL". Células com badge circular colorida quando >0, "—" quando 0. Linha "NEGÓCIO PERDIDO" em vermelho (`#E8684A`).

#### 2. Queries necessárias

Adicionar 2 queries dentro do componente (mesmo padrão do CrmAnalytics):
```ts
const { data: dealsFullDetailed } = useQuery({
  queryKey: ['deals_full_fb_funnel'],
  queryFn: () => supabase.from('deals_full').select('canal_origem, stage_name, stage_order, is_won, qualification_status, created_at')
})

const { data: contactsBySource } = useQuery({
  queryKey: ['contacts_meta_sources'],
  queryFn: () => supabase.from('contacts').select('utm_source, utm_medium, utm_campaign', { count: 'exact' })
})
```

### Arquivo afetado
- `src/pages/FacebookAdsPage.tsx` — nova aba + queries

