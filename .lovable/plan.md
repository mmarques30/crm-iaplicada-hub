

## Redesign Visual Global + Fix Build Errors

### Escopo
14 arquivos modificados, 1 novo componente, 1 arquivo deletado. Dashboard (`/`) intocado.

---

### Passo 1 — Fix Build Errors (3 arquivos)

| Arquivo | Linha | Fix |
|---|---|---|
| `ContactLists.tsx` | 217 | Add `as any` cast on the delete query chain to break recursive type inference |
| `Contacts.tsx` | 152 | Wrap `insertData` in array: `.insert([insertData])` |
| `EmailTemplates.tsx` | 108 | Wrap `insertData` in array: `.insert([insertData])` |

---

### Passo 2 — CSS Variables (`src/index.css`)

Add to `:root` block (alongside existing HSL vars):
```css
--c-teal: #2CBBA6; --c-teal-s: #031411;
--c-amber: #E8A43C; --c-amber-s: #1A1206;
--c-green: #AFC040; --c-green-s: #141A04;
--c-coral: #E8684A; --c-coral-s: #1A0804;
--c-blue: #4A9FE0; --c-blue-s: #040E1A;
--c-card: #131608; --c-raised: #191D0C;
--c-border: #1E2610; --c-border-h: #2E3A18;
--c-text-p: #E8EDD8; --c-text-s: #7A8460; --c-text-m: #3D4A28;
```

Update qualification vars to map to semantic colors:
- `--qualification-lead` → teal hue
- `--qualification-mql` → blue hue
- `--qualification-sql` → green hue

---

### Passo 3 — Delete `src/App.css`

Remove unused Vite boilerplate styles.

---

### Passo 4 — New Component `src/components/dashboard/KPICard.tsx`

```
Props: label, value, sub?, accentColor, icon, trend?
```
- `bg-[#131608]`, `border-[#1E2610]`, `border-l-[3px] border-l-[accentColor]`
- radius 12px, padding 18px 20px
- Icon 16px top-right, label 12px `#7A8460`, value 28px bold accentColor, sub 11px `#3D4A28`
- Optional trend badge with TrendingUp/TrendingDown

---

### Passo 5 — `src/lib/format.ts` — Update semantic colors

- `qualificationColor`: lead→`border-l-[#2CBBA6]`, mql→`border-l-[#4A9FE0]`, sql→`border-l-[#AFC040]`
- `qualificationBadgeVariant`: lead→`bg-[#031411] text-[#2CBBA6]`, mql→`bg-[#040E1A] text-[#4A9FE0]`, sql→`bg-[#141A04] text-[#AFC040]`
- `productColor`: business→`bg-[#141A04] text-[#AFC040]`, academy→`bg-[#040E1A] text-[#4A9FE0]`

---

### Passo 6 — Layout & Sidebar

**AppLayout.tsx:**
- Remove `<div className="gradient-blob ...">` (line 27)
- Add `max-w-[1440px] mx-auto px-6` wrapper on `<main>`

**AppSidebar.tsx:**
- Replace all `activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"` with `activeClassName="bg-[#141A04] text-[#AFC040] font-semibold"`

---

### Passo 7 — Analytics Pages (chart + KPI updates, no query changes)

**Chart constants** (defined at top of each page):
```ts
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'
```

**PainelGeral.tsx (377 lines):**
- Replace 6 `MetricCard` → `KPICard`: Seguidores→teal, Alcance→blue, Engajamento→green, Leads→amber, Investimento→amber, CPL→coral
- Replace `COLORS` array → `['#2CBBA6','#4A9FE0','#AFC040','#E8A43C']`
- SourceSummaryCard accents: Instagram→`#AFC040`, Facebook→`#4A9FE0`, CRM→`#2CBBA6`
- Badges: `bg-pink-500/15 text-pink-400` → `bg-[#141A04] text-[#AFC040]`; `bg-blue-500/15` → `bg-[#040E1A] text-[#4A9FE0]`
- ROI cards borderTop: `#1877F2`→`#4A9FE0`, `#E1306C`→`#AFC040`
- All tooltipStyle/tickStyle → new constants
- All chart fills → semantic colors
- Remove hsl(220...) and hsl(340...) references

**InstagramAnalytics.tsx (249 lines):**
- 6 `MetricCard` → `KPICard`: Seguidores→teal, Alcance→blue, Views→green, Salvos→amber, Compartilhamentos→teal, Engajamento→green
- Mini cards borderTop: `#E1306C`→`#AFC040`, `#8b5cf6`→`#4A9FE0`, `#3b82f6`→`#2CBBA6`
- Username badge: `bg-pink-500/15 text-pink-400` → `bg-[#141A04] text-[#AFC040]`
- Charts: `#E1306C`→`#AFC040`, `#8b5cf6`→`#4A9FE0`
- Scatter: VIDEO→`#4A9FE0`, non-VIDEO→`#AFC040`
- AreaChart: stroke/fill `#2CBBA6`

**FacebookAdsPage.tsx (225 lines):**
- Replace `COLORS` array → `['#2CBBA6','#4A9FE0','#AFC040','#E8A43C','#E8684A','#7A8460']`
- 8 `MetricCard` → `KPICard`: Investimento→amber, Impressões→blue, Alcance→blue, Leads→green, Cliques→teal, CTR→teal, CPL→coral, Campanhas→teal
- Charts: investimento→`#E8A43C`, CPL→`#AFC040`, PieChart→semantic array
- Table: `text-green-600`→`text-[#AFC040]`, `text-red-500`→`text-[#E8684A]`
- Badge ativa: `bg-[#141A04] text-[#AFC040]`

**CrmAnalytics.tsx (261 lines):**
- Delete `PRODUCT_COLORS` with `#8b5cf6`/`#ec4899`
- Replace `SOURCE_COLORS` → semantic array
- 8 `MetricCard` → `KPICard`: Contatos→teal, Ativos→blue, Ganhos→green, Perdidos→coral, Pipeline→amber, Win Rate→green, Ticket→amber, Fechados→teal
- Remove `text-purple-600`, `borderColor="#8b5cf6"`, `text-indigo-600`, `text-orange-600`
- PieChart productPie: business→`#AFC040`, academy→`#4A9FE0`
- BarChart: ganhos→`#AFC040`, perdidos→`#E8684A`, ativos→`#4A9FE0`
- Badge: `bg-emerald-500/15`→`bg-[#141A04] text-[#AFC040]`

**Financeiro.tsx (264 lines):**
- Delete `PRODUCT_COLORS` with `#8b5cf6`/`#ec4899`
- Replace `PAY_COLORS` → `['#AFC040','#4A9FE0','#E8A43C','#E8684A','#7A8460']`
- 4 `MetricCard` → `KPICard`: Receita→amber, Vendas→teal, Ticket→amber, Parcelas→coral
- Remove `text-purple-600`, `borderColor="#8b5cf6"`
- Product fills: use new semantic mapping (business→`#AFC040`, academy→`#4A9FE0`)
- LineChart: Receita→`#E8A43C`, Nº Vendas→`#2CBBA6`
- Badges: `bg-yellow-500/15`→`bg-[#1A1206] text-[#E8A43C]`; `bg-green-500/15`→`bg-[#141A04] text-[#AFC040]`

---

### Passo 8 — Email Marketing Pages (5 pages)

**EmailMarketing.tsx:**
- statusLabel colors: draft→`bg-[#191D0C] text-[#7A8460]`, scheduled→`bg-[#040E1A] text-[#4A9FE0]`, sending→`bg-[#1A1206] text-[#E8A43C]`, sent→`bg-[#141A04] text-[#AFC040]`, cancelled→`bg-[#1A0804] text-[#E8684A]`
- KPI icon backgrounds: `bg-purple-100`→`bg-[#141A04]`, `text-purple-600`→`text-[#AFC040]`, etc.
- Global metrics icon bgs: `bg-emerald-100`→`bg-[#031411]`, `bg-sky-100`→`bg-[#040E1A]`, `bg-violet-100`→`bg-[#141A04]`
- Quick action bgs: `bg-purple-50`→`bg-[#141A04]`, `bg-blue-50`→`bg-[#040E1A]`, `bg-green-50`→`bg-[#141A04]`

**EmailCampaigns.tsx:**
- `STATUS_MAP` colors: same semantic mapping as above

**EmailTemplates.tsx:**
- Fix TS2769 (`.insert([insertData])`)

**ContactLists.tsx:**
- Fix TS2589 (type cast)

**EmailWorkflows.tsx:**
- Update any badge/status colors to semantic system

---

### Passo 9 — Pipeline Kanban (`Pipeline.tsx`)

No logic/DnD changes. Only colors:
- Deal cards: `qualificationColor` already uses format.ts (updated in Passo 5) → Lead=teal, MQL=blue, SQL=green border-left
- `qualificationBadgeVariant` → same semantic update
- Column headers: already use `bg-muted` which inherits theme

---

### Passo 10 — Contacts (`Contacts.tsx`)

- `qualificationBadge` function: lead→`bg-[#031411] text-[#2CBBA6]`, mql→`bg-[#040E1A] text-[#4A9FE0]`, sql→`bg-[#141A04] text-[#AFC040]`
- `originBadge`: Instagram→`bg-[#141A04] text-[#AFC040]`, WhatsApp→`bg-[#031411] text-[#2CBBA6]`, Social→`bg-[#031411] text-[#2CBBA6]`, Formulário→`bg-[#141A04] text-[#AFC040]`, Pipeline→`bg-[#1A1206] text-[#E8A43C]`
- Remove `bg-pink-100`, `bg-green-100`, `bg-emerald-100`, `bg-blue-100`

---

### Passo 11 — Tarefas (`ReceitaTasks.tsx`)

- `PRIORITY_DOT`: Alta→`bg-[#E8684A]`, Média→`bg-[#E8A43C]`, Baixa→`bg-[#2CBBA6]`
- Status select: concluido→`bg-[#141A04] text-[#AFC040]`, em_execucao→`bg-[#1A1206] text-[#E8A43C]`
- 3 KPI cards: replace generic Card with KPICard (Total→teal, Em execução→amber, Concluídos→green)

---

### Resumo de Arquivos

| # | Arquivo | Ação |
|---|---|---|
| 1 | `src/index.css` | Add `--c-*` vars, update qualification vars |
| 2 | `src/App.css` | Delete |
| 3 | `src/components/dashboard/KPICard.tsx` | Create new |
| 4 | `src/lib/format.ts` | Update semantic color functions |
| 5 | `src/components/layout/AppLayout.tsx` | Remove blob, add max-width |
| 6 | `src/components/layout/AppSidebar.tsx` | Update activeClassName |
| 7 | `src/pages/PainelGeral.tsx` | Full visual update |
| 8 | `src/pages/InstagramAnalytics.tsx` | Full visual update |
| 9 | `src/pages/FacebookAdsPage.tsx` | Full visual update |
| 10 | `src/pages/CrmAnalytics.tsx` | Full visual update, purge purple/pink |
| 11 | `src/pages/Financeiro.tsx` | Full visual update, purge purple/pink |
| 12 | `src/pages/EmailMarketing.tsx` | Update colors to semantic |
| 13 | `src/pages/EmailCampaigns.tsx` | Update STATUS_MAP colors |
| 14 | `src/pages/EmailTemplates.tsx` | Fix TS2769 |
| 15 | `src/pages/ContactLists.tsx` | Fix TS2589 |
| 16 | `src/pages/Contacts.tsx` | Fix TS2769 + update badge colors |
| 17 | `src/pages/ReceitaTasks.tsx` | Update priority/status colors + KPICard |
| 18 | `src/pages/Pipeline.tsx` | Colors auto-updated via format.ts |

