

## Redesign: Semantic Color Dashboard

### What Changes

The current dashboard already has the right structure (4 tabs, charts, KPIs). The redesign focuses on:
1. **New CSS variable naming** with `--c-volume-*`, `--c-revenue-*`, `--c-convert-*`, `--c-activity-*`, `--c-negative-*` triplets (main/bright/surface)
2. **Replacing the AreaChart funnel** (Section 1-A) with horizontal bar rows, each colored by funnel zone (teal for top, blue for mid, green for bottom, coral for losses)
3. **KPI cards with semantic border-left** — each card uses its own data-type color, with trend badges showing directional arrows
4. **Tab styling** — pill-shaped active tab with `--c-convert-bright` background
5. **Velocity and Ticket cards** — simplified row-based layouts (no Recharts for velocity, just styled divs)

### Files Modified

| File | Change |
|---|---|
| `src/index.css` | Add `--c-volume-*`, `--c-revenue-*`, `--c-convert-*`, `--c-activity-*`, `--c-negative-*` CSS variables alongside existing vars. Update `--bg-page`, `--bg-card`, `--bg-raised`, text vars. |
| `src/pages/Index.tsx` | Rewrite render section: (1) KPI cards with `border-left: 3px solid [semantic]`, icon top-right, trend badge with arrow icon. (2) Replace funnel AreaChart with horizontal bar rows grouped by zone — each row has stage name, proportional bar with semantic fill, count badge, conversion %. (3) Velocity card as compact div rows (no chart). (4) Ticket card as row list with `--c-revenue-bright` values, "—" for zeros. Keep all existing data queries, mock data, and tabs 2-4 charts unchanged except color constant updates. |

### Technical Details

**Funnel bar rows** replace the stepped AreaChart:
```text
[Stage Name 160px] [████████████░░░░░░░░ bar] [count] [45% conv.]
```
- Bar width = `(count / maxCount) * 100%`
- Stages 0-4 (Lead→SQL): teal bars
- Stages 5-7 (Reunião→Inscrito): blue bars  
- Stages 8-10 (Negociação→Fechado): green bars
- Loss stages: coral bars
- Count=0 rows: opacity 0.35, bar at 2% width

**Color constant object** updated:
```ts
const C = {
  volMain: "#1D8A7A", volBright: "#2CBBA6", volSurf: "#031411",
  revMain: "#B07830", revBright: "#E8A43C", revSurf: "#1A1206",
  convMain: "#738925", convBright: "#AFC040", convSurf: "#141A04",
  actMain: "#2B6CB0", actBright: "#4A9FE0", actSurf: "#040E1A",
  negMain: "#C94A2F", negBright: "#E8684A", negSurf: "#1A0804",
  // backgrounds/text unchanged
};
```

**KPI card structure:**
- Card 1 (Pipeline Value): `border-left: revBright`, icon DollarSign in revBright, value in revBright
- Card 2 (Leads): `border-left: volBright`, icon Users in volBright, value in volBright
- Card 3 (Conversion): `border-left: convBright`, icon Target in convBright, value in convBright
- Card 4 (ROI): `border-left: negBright` (negative trend), icon BarChart3 in revBright, value in revBright, trend in negBright with TrendingDown

All existing Recharts charts in tabs 2-4 stay as-is, just updating color references to use the new `C.*` constants. No new dependencies needed.

