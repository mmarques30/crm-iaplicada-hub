

## Problem

The app pages show nothing when there's no data — no structure, no empty states. The RLS policies on `contacts`, `deals`, and `activities` require `authenticated` role, so anonymous access returns empty results silently.

The views (`product_metrics`, `stage_conversion`, `deals_full`, `avg_time_in_stage`, `mql_volume`) have NO RLS policies, and `pipelines`/`stages` allow `anon` read — so the sidebar, Settings pipelines, and Pipeline columns should actually work. But `deals` and `contacts` won't return data without auth.

## Plan

### 1. Add proper empty states to all pages

Instead of showing blank screens, show structured UI with empty state messages:

- **Dashboard**: Show the 4 metric cards with "0" values (already works), show the chart area with an empty state illustration/message "Nenhum deal cadastrado ainda"
- **Contacts**: Already shows "Nenhum contato encontrado" — good
- **Pipeline**: Show the kanban columns (from `stages` which allows anon read) even with 0 deals — the columns should render with headers and empty drop zones. Currently this works if `stages` loads, but if `pipeline` query fails (returns null because pipelines allow anon read, so it should work), nothing renders
- **ContactDetail**: Show a proper "Contato não encontrado" state instead of perpetual "Carregando..."
- **DealDetail**: Same — show "Deal não encontrado" instead of perpetual "Carregando..."

### 2. Add loading skeletons

Replace plain "Carregando..." text with skeleton UI:
- Dashboard: skeleton cards + skeleton chart
- Contacts: skeleton table rows
- Pipeline: skeleton columns
- ContactDetail / DealDetail: skeleton layout

### 3. Handle query errors gracefully

Add `isError` checks to all queries and show error messages with retry buttons.

### Files to modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add loading skeletons for cards/chart, empty state for chart |
| `src/pages/Contacts.tsx` | Add skeleton rows during loading |
| `src/pages/Pipeline.tsx` | Add loading skeleton columns, handle null pipeline gracefully |
| `src/pages/ContactDetail.tsx` | Add skeleton layout, "not found" state |
| `src/pages/DealDetail.tsx` | Add skeleton layout, "not found" state |
| `src/pages/Settings.tsx` | Add skeleton for pipelines section |

### Technical approach

- Use the existing `Skeleton` component from `src/components/ui/skeleton.tsx`
- Check `isLoading` and `isError` from `useQuery` return values
- For empty data, show the page structure (headers, cards, columns) with placeholder content
- Pipeline kanban columns will render from `stages` (anon-readable) regardless of whether deals exist

