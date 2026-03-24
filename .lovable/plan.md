

## Complete Dashboard Redesign — Premium B2B Analytics

### Overview
Full rewrite of `src/pages/Index.tsx` and `src/index.css` to deliver a rich, multi-chart sales dashboard with semantic color coding, varied Recharts visualizations, and a fintech-grade dark UI.

### Files to Modify

#### 1. `src/index.css` — Semantic color system
Replace existing CSS variables with the new semantic tokens:
- Page/card/raised backgrounds, border colors
- Semantic data colors: teal (volume), amber (revenue), green (conversion), coral (loss), blue (activity), purple (forecasts)
- Each semantic color has a surface variant (`-s`) for subtle card backgrounds
- Keep Sora font, update body bg to `#0A0C09`

#### 2. `src/pages/Index.tsx` — Complete rewrite (~800 lines)
The file will be restructured into the 4-tab layout with distinct chart types per section.

**Header & KPI Cards** (unchanged data queries, new visual treatment):
- 4 KPI cards with semantic color coding per metric type
- Icon top-right, large accent number, trend badge, muted description

**Tab styling:**
- Active: `bg-[#AFC040] text-[#0A0C09]` rounded-full
- Inactive: transparent, muted text

---

**TAB 1 — Pipeline de Vendas (4 sections, 4 chart types):**

| Section | Chart Type | Recharts Component | Data |
|---|---|---|---|
| 1-A Funil | Stepped AreaChart | `AreaChart` with step curve, 3-zone fill (teal→blue→green) | `pipelineStages` count by stage |
| 1-B Velocidade | Horizontal bars + sparklines | Custom div rows + tiny `LineChart` (60×24px) | Stage counts + mock 7-day trend |
| 1-C Ticket Médio | Vertical BarChart | `BarChart` with amber bars, rounded tops | 4 filtered stages, avg deal value |
| 1-D Deals em Risco | Donut | `PieChart` with inner radius | Won/InProgress/AtRisk/Lost breakdown |

**TAB 2 — Canais de Leads (3 sections, 3 chart types):**

| Section | Chart Type | Data |
|---|---|---|
| 2-A Performance | ComposedChart (grouped bars + line, dual Y-axis) | Mock 6-month channel volume + conversion line |
| 2-B Distribuição | Donut with center label | Channel lead distribution from `leadSources` |
| 2-C CAC por Canal | Horizontal BarChart with reference line | Cost per lead ranking, color-coded vs average |

**TAB 3 — Marketing & Ads (3 sections):**

| Section | Chart Type | Data |
|---|---|---|
| 3-A Investimento vs Retorno | ComposedChart (area + line overlay, dual Y) | Mock 12-month spend vs ROI |
| 3-B Performance Campanhas | ScatterChart with quadrant lines | Budget vs Leads, dot size = conversion |
| 3-C ROI por Período | 4 compact sparkline cards (2×2 grid) | Weekly ROI with mini area trends |

**TAB 4 — Crescimento (4 sections):**

| Section | Chart Type | Data |
|---|---|---|
| 4-A Receita vs Meta | AreaChart + ReferenceLine | Monthly revenue vs annual target |
| 4-B Ciclo de Vendas | LineChart with confidence band | Avg days per stage + std deviation area |
| 4-C Cohort | HTML heatmap table | Month created × months to close |
| 4-D Previsão 90 Dias | AreaChart with forecast zone | Historical + projected revenue, purple forecast |

---

### Chart Defaults (all Recharts)
- Grid: horizontal only, `#1E2610`, dasharray "3 3"
- Tooltip: bg `#191E0C`, border `#2E3A18`, Sora 12px
- Axis labels: 11px, fill `#7A8460`, no axis lines
- Dots: 3px filled, 5px white-border on hover
- Animation: 600ms ease-out, once on mount
- Margins: `{ top: 8, right: 16, bottom: 8, left: 8 }`

### Data Strategy
- Real data from existing Supabase queries for: pipeline stages, contacts, deals, lead sources, FB ads, product metrics
- Mock/generated data for: monthly time series (tabs 2-A, 3-A, 4-A, 4-D), sparklines, scatter plots, cohort heatmap, confidence bands
- Mock data clearly marked with `// MOCK DATA` comments for future replacement

### Interactions
- Funnel stage click → filters velocity + ticket cards
- Export button → CSV download of current tab data
- Scatter quadrant labels visible as subtle corner text
- All tooltips use semantic colors matching the data type

### Responsiveness
- Mobile: KPIs 2×2, cards stack, tabs scroll horizontally
- Tablet: 2-col for half-cards, full-width for main charts
- Desktop: as specified

### No New Dependencies
All charts use existing `recharts` package. No new libraries needed.

