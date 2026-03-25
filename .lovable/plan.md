

## Fix: Dashboard Filters Not Affecting Data

### Root Cause
The dashboard KPI cards and pipeline charts use **pre-aggregated database views** (`product_metrics`, `stage_conversion`) that have no `created_at`, `canal_origem`, or individual deal rows. Filters only affect `filteredDeals` and `filteredContacts`, but the main visualizations ignore those filtered arrays and read from the static views instead.

Specifically:
- **"Valor no Pipeline"** and **"Taxa de Conversão"** KPIs come from `totals` (derived from `product_metrics` view) — only `productFilter` works, period/channel are ignored
- **Funnel chart** and **Velocity card** come from `pipelineStages` (derived from `stage_conversion` view) — completely unfiltered
- **The 3 bottom cards** (Velocity, Revenue, Donut) are hardcoded with static stage data

### Solution
Compute all dashboard metrics from raw `deals` data (already fetched) when any filter is active. Use the pre-aggregated views only as default/unfiltered state.

### Changes — `src/pages/Index.tsx` only

1. **`totals`** — Rewrite to compute from `filteredDeals` instead of `metrics` view:
   - `active`: count deals where `is_won === null`
   - `pipeline`: sum `amount` of active deals
   - `won` / `lost`: count by `is_won`
   - `avgSize`: average amount

2. **`pipelineStages`** — When filters are active, compute from `filteredDeals` joined with stages data instead of `stage_conversion` view. Add a query for `stages` table to get stage names/order, then group `filteredDeals` by `stage_id`.

3. **`winRate`** — Already derived from `totals`, will auto-fix.

4. **Bottom 3 cards** (Velocity, Revenue, Donut) — Currently partially hardcoded. Make them derive from the filtered `pipelineStages` and `filteredDeals` so numbers update with filters.

5. **Add stages query** — Fetch `stages` table (`id, name, display_order, pipeline_id, is_won, is_lost`) to map `deal.stage_id` → stage name/order for client-side grouping.

### What stays unchanged
- All existing queries remain (no Supabase changes)
- Pre-aggregated views still load (used as fallback for "all" state for performance)
- Visual design, layout, tabs, charts — no changes
- No other files modified

