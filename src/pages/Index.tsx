import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, ScatterChart, Scatter, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  DollarSign, Users, Target, BarChart3, Filter, Download, Calendar,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { useDashboardSnapshot } from "@/hooks/useDashboardData";

/* ═══════════════════════════════════════════════════════════════
   SEMANTIC COLORS (hex for Recharts — matches CSS vars)
   ═══════════════════════════════════════════════════════════════ */
const C = {
  volMain: "#1D8A7A",  volBright: "#2CBBA6",  volSurf: "#031411",
  revMain: "#B07830",  revBright: "#E8A43C",  revSurf: "#1A1206",
  convMain: "#738925", convBright: "#AFC040",  convSurf: "#141A04",
  actMain: "#2B6CB0",  actBright: "#4A9FE0",  actSurf: "#040E1A",
  negMain: "#C94A2F",  negBright: "#E8684A",  negSurf: "#1A0804",
  purple: "#9B7FE8",
  bg: "#0A0C09",       card: "#121509",       raised: "#191E0C",
  border: "#1E2610",   borderH: "#2E3A18",
  textP: "#E8EDD8",    textS: "#7A8460",      textM: "#4A5230",
};

const TOOLTIP_STYLE = {
  contentStyle: { background: C.raised, border: `1px solid ${C.borderH}`, borderRadius: 8, fontSize: 12, fontFamily: "Sora" },
  itemStyle: { color: C.textP },
  labelStyle: { color: C.textS, marginBottom: 4 },
  cursor: { fill: "hsl(80 28% 11% / 0.4)" },
};

const GRID_PROPS = { strokeDasharray: "3 3", stroke: C.border, vertical: false };
const AXIS_TICK = { fill: C.textS, fontSize: 11, fontFamily: "Sora" };
const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 8 };

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface StageRow { stage_name: string; deal_count: number; total_amount: number; display_order: number; }
interface ProductMetric { product: string; active_deals: number; won_deals: number; lost_deals: number; pipeline_value: number; avg_deal_size: number; win_rate: number; }

/* ═══════════════════════════════════════════════════════════════
   FUNNEL ZONE COLOR HELPER
   ═══════════════════════════════════════════════════════════════ */
const STAGE_ORDER = [
  "Lead Capturado", "MQL", "Contato Iniciado", "Conectado", "SQL",
  "Reunião Agendada", "Reunião Realizada", "Inscrito",
  "Negociação", "Contrato Enviado", "Negócio Fechado",
  "Perdido", "Negócio Perdido",
];

function stageColor(name: string): string {
  const topFunnel = ["Lead Capturado", "MQL", "Contato Iniciado", "Conectado", "SQL"];
  const midFunnel = ["Reunião Agendada", "Reunião Realizada", "Inscrito"];
  const bottomFunnel = ["Negociação", "Contrato Enviado", "Negócio Fechado"];
  if (topFunnel.includes(name)) return C.volBright;
  if (midFunnel.includes(name)) return C.actBright;
  if (bottomFunnel.includes(name)) return C.convBright;
  return C.negBright;
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const SalesPipelineDashboard = () => {
  const [activeTab, setActiveTab] = useState("pipeline");

  /* ── Queries ─────────────────────────────────────────────── */
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["product_metrics"],
    queryFn: async () => { const { data } = await (supabase as any).from("product_metrics").select("*"); return (data || []) as ProductMetric[]; },
  });

  const { data: stageConversion, isLoading: stagesLoading } = useQuery({
    queryKey: ["stage_conversion_all"],
    queryFn: async () => { const { data } = await (supabase as any).from("stage_conversion").select("*").order("display_order"); return (data || []) as StageRow[]; },
  });

  const { data: deals } = useQuery({
    queryKey: ["deals_dashboard"],
    queryFn: async () => { const { data } = await supabase.from("deals").select("id, name, amount, product, is_won, canal_origem, created_at, stage_id"); return (data || []) as any[]; },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts_dashboard"],
    queryFn: async () => { const { data } = await supabase.from("contacts").select("id, lifecycle_stage, created_at"); return (data || []) as any[]; },
  });

  const { data: snapshot } = useDashboardSnapshot();

  /* ── Computed ────────────────────────────────────────────── */
  const totals = (metrics || []).reduce(
    (acc, m) => ({ active: acc.active + (m.active_deals || 0), pipeline: acc.pipeline + (m.pipeline_value || 0), won: acc.won + (m.won_deals || 0), lost: acc.lost + (m.lost_deals || 0), avgSize: acc.avgSize + (m.avg_deal_size || 0), count: acc.count + 1 }),
    { active: 0, pipeline: 0, won: 0, lost: 0, avgSize: 0, count: 0 },
  );
  const winRate = totals.won + totals.lost > 0 ? (totals.won / (totals.won + totals.lost)) * 100 : 0;
  const totalLeads = contacts?.length || 0;

  const pipelineStages = useMemo(() => Object.values(
    (stageConversion || []).reduce((acc: Record<string, StageRow>, item) => {
      const key = item.stage_name || "";
      if (!acc[key]) acc[key] = { stage_name: key, deal_count: 0, total_amount: 0, display_order: item.display_order || 0 };
      acc[key].deal_count += item.deal_count || 0;
      acc[key].total_amount += Number(item.total_amount) || 0;
      return acc;
    }, {}),
  ).sort((a, b) => a.display_order - b.display_order), [stageConversion]);

  const leadSources = useMemo(() => Object.entries(
    (deals || []).reduce((acc: Record<string, { leads: number; won: number; revenue: number }>, d) => {
      const source = d.canal_origem || "Direto";
      if (!acc[source]) acc[source] = { leads: 0, won: 0, revenue: 0 };
      acc[source].leads += 1;
      if (d.is_won) { acc[source].won += 1; acc[source].revenue += Number(d.amount) || 0; }
      return acc;
    }, {}),
  ).map(([name, data]: [string, { leads: number; won: number; revenue: number }]) => ({
    name, leads: data.leads, conversion: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0, revenue: data.revenue,
  })).sort((a, b) => b.leads - a.leads), [deals]);

  const fbAds = snapshot?.data?.facebook_ads;
  const totalAdSpend = fbAds?.metrics?.totalSpend || 0;
  const wonRevenue = (deals || []).filter((d) => d.is_won).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const roi = totalAdSpend > 0 ? (wonRevenue / totalAdSpend).toFixed(2) : "—";

  /* ── Funnel + velocity data ──────────────────────────────── */
  const maxStageCount = Math.max(...pipelineStages.map(s => s.deal_count), 1);

  const funnelRows = useMemo(() =>
    pipelineStages.map((s, i) => ({
      ...s,
      color: stageColor(s.stage_name),
      widthPct: s.deal_count > 0 ? Math.max((s.deal_count / maxStageCount) * 100, 2) : 2,
      conversion: i > 0 && pipelineStages[i - 1].deal_count > 0
        ? Math.round((s.deal_count / pipelineStages[i - 1].deal_count) * 100) : 100,
      isEmpty: s.deal_count === 0,
    })), [pipelineStages, maxStageCount]);

  /* ── Ticket stages ───────────────────────────────────────── */
  const ticketStages = pipelineStages.filter(s =>
    ["Contato Iniciado", "Reunião Agendada", "Reunião Realizada", "Negociação"].includes(s.stage_name)
  );

  /* ── Deals em Risco donut ────────────────────────────────── */
  const riskData = useMemo(() => {
    const allDeals = deals || [];
    const won = allDeals.filter(d => d.is_won === true).length;
    const lost = allDeals.filter(d => d.is_won === false).length;
    const active = allDeals.filter(d => d.is_won === null).length;
    const atRisk = Math.floor(active * 0.3);
    return [
      { name: "Ganhos", value: won, color: C.convBright },
      { name: "Em progresso", value: Math.max(active - atRisk, 0), color: C.actBright },
      { name: "Em risco", value: atRisk, color: C.revBright },
      { name: "Perdidos", value: lost, color: C.negBright },
    ].filter(d => d.value > 0);
  }, [deals]);
  const totalDeals = riskData.reduce((s, d) => s + d.value, 0);

  /* ── MOCK: Monthly channel performance (Tab 2) ───────────── */
  const monthlyChannels = useMemo(() => {
    const months = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
    return months.map((m, i) => ({
      month: m,
      organico: Math.floor(40 + Math.random() * 30 + i * 5),
      pago: Math.floor(60 + Math.random() * 40 + i * 8),
      referral: Math.floor(10 + Math.random() * 15),
      direto: Math.floor(15 + Math.random() * 10),
      conversion: Number((8 + Math.random() * 12 + i * 0.5).toFixed(1)),
    }));
  }, []);

  /* ── MOCK: CAC por canal (Tab 2) ─────────────────────────── */
  const cacData = useMemo(() => [
    { channel: "Orgânico", cac: 12 },
    { channel: "Referral", cac: 28 },
    { channel: "Direto", cac: 35 },
    { channel: "Pago", cac: 78 },
    { channel: "Social", cac: 55 },
  ].sort((a, b) => a.cac - b.cac), []);
  const avgCAC = Math.round(cacData.reduce((s, d) => s + d.cac, 0) / cacData.length);

  /* ── MOCK: Investment vs Return (Tab 3) ──────────────────── */
  const investData = useMemo(() => {
    const months = ["Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
    return months.map((m, i) => ({
      month: m,
      spend: Math.floor(3000 + i * 800 + Math.random() * 2000),
      revenue: Math.floor(5000 + i * 1500 + Math.random() * 4000),
      roi: Number((1.2 + Math.random() * 1.5 + i * 0.1).toFixed(2)),
    }));
  }, []);

  /* ── MOCK: Campaign scatter (Tab 3) ──────────────────────── */
  const scatterData = useMemo(() => {
    const names = ["Camp. Awareness", "Camp. Retargeting", "Camp. Lookalike", "Camp. Branding", "Camp. Lead Gen", "Camp. Video", "Camp. Carousel"];
    return names.map(name => ({
      name, budget: Math.floor(500 + Math.random() * 5000), leads: Math.floor(5 + Math.random() * 80), rate: Number((3 + Math.random() * 15).toFixed(1)),
    }));
  }, []);
  const avgBudget = scatterData.reduce((s, d) => s + d.budget, 0) / scatterData.length;
  const avgLeads = scatterData.reduce((s, d) => s + d.leads, 0) / scatterData.length;

  /* ── MOCK: Weekly ROI sparklines (Tab 3) ─────────────────── */
  const weeklyROI = useMemo(() => [
    { week: "Semana 1", roi: 2.1, trend: [1.8, 1.9, 2.0, 2.1, 2.3, 2.1, 2.2] },
    { week: "Semana 2", roi: 1.8, trend: [2.0, 1.9, 1.8, 1.7, 1.8, 1.9, 1.8] },
    { week: "Semana 3", roi: 2.5, trend: [2.0, 2.1, 2.3, 2.4, 2.5, 2.4, 2.5] },
    { week: "Semana 4", roi: 1.4, trend: [1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.4] },
  ], []);

  /* ── MOCK: Revenue vs Target (Tab 4) ─────────────────────── */
  const revenueTarget = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let cum = 0;
    return months.map((m, i) => {
      cum += Math.floor(8000 + i * 2000 + Math.random() * 5000);
      return { month: m, revenue: cum, target: (i + 1) * 15000 };
    });
  }, []);

  /* ── MOCK: Sales cycle (Tab 4) ───────────────────────────── */
  const cycleData = useMemo(() => [
    { stage: "Lead", days: 2, min: 1, max: 4 },
    { stage: "MQL", days: 5, min: 3, max: 8 },
    { stage: "Contato", days: 7, min: 4, max: 12 },
    { stage: "SQL", days: 4, min: 2, max: 7 },
    { stage: "Reunião", days: 10, min: 5, max: 18 },
    { stage: "Negociação", days: 14, min: 8, max: 22 },
    { stage: "Fechamento", days: 8, min: 4, max: 15 },
  ], []);

  /* ── MOCK: Cohort heatmap (Tab 4) ────────────────────────── */
  const cohortData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    return months.map(m => ({
      month: m,
      "1m": Math.floor(Math.random() * 25),
      "2m": Math.floor(Math.random() * 20),
      "3m": Math.floor(Math.random() * 15),
      "4m": Math.floor(Math.random() * 10),
      "5m+": Math.floor(Math.random() * 8),
    }));
  }, []);

  /* ── MOCK: Forecast (Tab 4) ──────────────────────────────── */
  const forecastData = useMemo(() => {
    const past = ["Jan", "Fev", "Mar"].map((m, i) => ({ month: m, actual: 15000 + i * 5000 + Math.floor(Math.random() * 3000), forecast: null as number | null, forecastLow: null as number | null, forecastHigh: null as number | null }));
    const future = ["Abr", "Mai", "Jun"].map((m, i) => {
      const base = 30000 + i * 6000;
      return { month: m, actual: null as number | null, forecast: base, forecastLow: base * 0.8, forecastHigh: base * 1.2 };
    });
    return [...past, ...future];
  }, []);

  /* ── Channel donut (Tab 2) ───────────────────────────────── */
  const channelDonut = useMemo(() => {
    const colors = [C.volBright, C.actBright, C.convBright, C.revBright, C.negBright];
    return leadSources.slice(0, 5).map((s, i) => ({ ...s, color: colors[i % colors.length] }));
  }, [leadSources]);
  const totalChannelLeads = channelDonut.reduce((s, d) => s + d.leads, 0);

  /* ── Sparkline helper ────────────────────────────────────── */
  const MiniSparkline = ({ data, up }: { data: number[]; up: boolean }) => (
    <ResponsiveContainer width={60} height={24}>
      <LineChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={up ? C.convBright : C.negBright} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  /* ── Velocity sparkline data (mock 7-day trend per stage) ── */
  const velocityTrends = useMemo(() =>
    pipelineStages.map(s => ({
      ...s,
      trend: Array.from({ length: 7 }, () => Math.max(0, s.deal_count + Math.floor((Math.random() - 0.4) * 3))),
      isUp: Math.random() > 0.4,
    })), [pipelineStages]);

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Dashboard de Vendas</h1>
          <p className="text-[13px] mt-1" style={{ color: C.textM }}>IAplicada · Visão Operacional</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary">
            <Calendar className="h-3.5 w-3.5 mr-2" />Últimos 30 dias
          </Button>
          <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary">
            <Filter className="h-3.5 w-3.5 mr-2" />Filtros
          </Button>
          <Button size="sm" className="font-bold" style={{ background: C.convBright, color: C.bg }}>
            <Download className="h-3.5 w-3.5 mr-2" />Exportar
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {([
          { title: "Valor no Pipeline", value: formatCurrency(totals.pipeline), icon: DollarSign, desc: `${totals.active} deals ativos`, accentColor: C.revBright, trendUp: true, trend: "+18.2% vs. mês anterior" },
          { title: "Total de Leads", value: totalLeads.toString(), icon: Users, desc: "cadastrados no CRM", accentColor: C.volBright, trendUp: true, trend: "+12.5% vs. mês anterior" },
          { title: "Taxa de Conversão", value: formatPercent(winRate), icon: Target, desc: "média do pipeline", accentColor: C.convBright, trendUp: true, trend: "+3.2% vs. mês anterior" },
          { title: "ROI de Ads", value: roi === "—" ? "—" : `${roi}x`, icon: BarChart3, desc: "retorno sobre investimento", accentColor: C.revBright, trendUp: false, trend: "-2.1% vs. mês anterior", borderOverride: C.negBright },
        ] as const).map((kpi, i) => (
          <Card key={i} className="card-hover relative overflow-hidden" style={{ borderLeft: `3px solid ${kpi.borderOverride || kpi.accentColor}` }}>
            <CardContent className="p-5">
              <div className="absolute top-4 right-4 opacity-60">
                <kpi.icon className="h-4 w-4" style={{ color: kpi.accentColor }} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{kpi.title}</p>
              {metricsLoading ? <Skeleton className="h-9 w-28" /> : (
                <>
                  <p className="text-[28px] font-bold tabular-nums leading-tight" style={{ color: kpi.accentColor }}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.desc}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {kpi.trendUp
                      ? <TrendingUp className="h-3 w-3" style={{ color: C.convBright }} />
                      : <TrendingDown className="h-3 w-3" style={{ color: C.negBright }} />
                    }
                    <span className="text-[11px]" style={{ color: kpi.trendUp ? C.convBright : C.negBright }}>{kpi.trend}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="border-b border-border pb-0 overflow-x-auto scrollbar-thin">
          <TabsList className="bg-transparent gap-1 p-0 h-auto">
            {[
              { v: "pipeline", l: "Pipeline de Vendas" },
              { v: "leads", l: "Canais de Leads" },
              { v: "marketing", l: "Marketing & Ads" },
              { v: "growth", l: "Crescimento" },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:font-bold transition-colors"
                style={activeTab === t.v ? { background: C.convBright, color: C.bg } : undefined}
              >{t.l}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ═══ TAB 1: Pipeline ═════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          {/* 1-A: Funnel — Horizontal Bar Rows */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Funil de Vendas</CardTitle>
              <CardDescription>Volume de deals por estágio com taxas de conversão</CardDescription>
            </CardHeader>
            <CardContent>
              {stagesLoading ? (
                <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : funnelRows.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Nenhum deal cadastrado ainda</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {funnelRows.map((row) => (
                    <div
                      key={row.stage_name}
                      className="flex items-center gap-3 py-1.5"
                      style={{ opacity: row.isEmpty ? 0.35 : 1 }}
                    >
                      <span className="text-xs w-[160px] shrink-0 truncate" style={{ color: C.textS }}>{row.stage_name}</span>
                      <div className="flex-1 h-2 rounded bg-border overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${row.widthPct}%`,
                            background: `linear-gradient(90deg, ${row.color}cc, ${row.color})`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-[52px] text-right" style={{ color: row.isEmpty ? C.textM : row.color }}>
                        {row.deal_count}
                      </span>
                      <span className="text-[11px] w-[72px] text-right tabular-nums" style={{ color: C.textM }}>
                        {row.conversion}% conv.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 1-B: Velocidade do Pipeline — Compact div rows */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-[15px]">Velocidade do Pipeline</CardTitle>
                <CardDescription className="text-xs">Deals por estágio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {velocityTrends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aguardando dados</p>
                ) : velocityTrends.map(s => {
                  const color = stageColor(s.stage_name);
                  return (
                    <div key={s.stage_name} className={`flex items-center gap-2 h-9 ${s.deal_count === 0 ? "opacity-35" : ""}`}>
                      <span className="text-xs w-28 truncate" style={{ color: C.textS }}>{s.stage_name}</span>
                      {s.deal_count > 0 && (
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                          <div className="h-full rounded-full" style={{ width: `${(s.deal_count / maxStageCount) * 100}%`, background: color }} />
                        </div>
                      )}
                      <span className="text-xs font-bold tabular-nums w-6 text-right" style={{ color: s.deal_count > 0 ? color : C.textM }}>{s.deal_count}</span>
                      <MiniSparkline data={s.trend} up={s.isUp} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* 1-C: Ticket Médio — Row list */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-[15px]">Ticket Médio por Estágio</CardTitle>
                <CardDescription className="text-xs">Valor médio das oportunidades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {ticketStages.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aguardando dados</div>
                ) : ticketStages.map(s => {
                  const avg = s.deal_count > 0 ? Math.round(s.total_amount / s.deal_count) : 0;
                  const hasValue = avg > 0;
                  return (
                    <div key={s.stage_name} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                      <span className="text-sm" style={{ color: C.textS }}>{s.stage_name}</span>
                      {hasValue ? (
                        <span className="text-sm font-bold tabular-nums" style={{ color: C.revBright }}>{formatCurrency(avg)}</span>
                      ) : (
                        <span className="text-sm" style={{ color: C.textM, opacity: 0.5 }}>—</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* 1-D: Deals em Risco Donut */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground font-semibold text-[15px]">Deals em Risco</CardTitle>
              <CardDescription className="text-xs">Distribuição de status</CardDescription>
            </CardHeader>
            <CardContent>
              {riskData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem deals</div>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" animationDuration={600}>
                        {riskData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums text-foreground">{totalDeals}</p>
                      <p className="text-[10px] text-muted-foreground">deals</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {riskData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                        <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2: Canais de Leads ══════════════════════════ */}
        <TabsContent value="leads" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Performance por Canal</CardTitle>
              <CardDescription>Volume de leads por canal vs taxa de conversão (6 meses)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                {[{ l: "Orgânico", c: C.volBright }, { l: "Pago", c: C.revBright }, { l: "Referral", c: C.convBright }, { l: "Direto", c: C.actBright }, { l: "Conversão %", c: C.negBright }].map(item => (
                  <div key={item.l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.c }} />
                    <span className="text-xs text-muted-foreground">{item.l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyChannels} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar yAxisId="left" dataKey="organico" fill={C.volBright} radius={[3, 3, 0, 0]} maxBarSize={16} name="Orgânico" />
                  <Bar yAxisId="left" dataKey="pago" fill={C.revBright} radius={[3, 3, 0, 0]} maxBarSize={16} name="Pago" />
                  <Bar yAxisId="left" dataKey="referral" fill={C.convBright} radius={[3, 3, 0, 0]} maxBarSize={16} name="Referral" />
                  <Bar yAxisId="left" dataKey="direto" fill={C.actBright} radius={[3, 3, 0, 0]} maxBarSize={16} name="Direto" />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" stroke={C.negBright} strokeWidth={2} dot={{ r: 3, fill: C.negBright }} activeDot={{ r: 5, stroke: C.textP, strokeWidth: 1 }} name="Conversão %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="card-hover md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-base">Distribuição por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                {channelDonut.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={channelDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="leads" paddingAngle={3} animationDuration={600}>
                          {channelDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v} leads`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 0, height: 200 }}>
                      <div className="text-center">
                        <p className="text-xl font-bold tabular-nums" style={{ color: C.volBright }}>{totalChannelLeads}</p>
                        <p className="text-[10px] text-muted-foreground">leads</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {channelDonut.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                          <span className="text-[10px] text-muted-foreground">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-hover md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-base">CAC por Canal</CardTitle>
                <CardDescription>Custo de aquisição por canal (ranking)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cacData} layout="vertical" margin={{ ...CHART_MARGIN, left: 60 }}>
                    <CartesianGrid {...GRID_PROPS} horizontal={false} vertical={true} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                    <YAxis type="category" dataKey="channel" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), "CAC"]} />
                    <ReferenceLine x={avgCAC} stroke={C.textS} strokeDasharray="4 4" label={{ value: `Média: R$${avgCAC}`, fill: C.textS, fontSize: 10, position: "top" }} />
                    <Bar dataKey="cac" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {cacData.map((d, i) => <Cell key={i} fill={d.cac > avgCAC ? C.negBright : C.convBright} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ TAB 3: Marketing & Ads ══════════════════════════ */}
        <TabsContent value="marketing" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Investimento vs Retorno</CardTitle>
              <CardDescription>Comparativo de investimento e receita nos últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={investData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.revBright} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.revBright} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Area yAxisId="left" type="monotone" dataKey="spend" fill="url(#spendGrad)" stroke={C.revBright} strokeWidth={2} name="Investimento" />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" fill="none" stroke={C.convBright} strokeWidth={2} name="Receita" />
                  <Line yAxisId="right" type="monotone" dataKey="roi" stroke={C.purple} strokeWidth={2.5} dot={{ r: 3, fill: C.purple }} activeDot={{ r: 5, stroke: C.textP, strokeWidth: 1 }} name="ROI" />
                  <ReferenceLine yAxisId="right" y={1} stroke={C.negBright} strokeDasharray="4 4" label={{ value: "ROI 1x", fill: C.negBright, fontSize: 10, position: "right" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-base">Performance de Campanhas</CardTitle>
                <CardDescription>Budget vs leads gerados (tamanho = conversão)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart margin={CHART_MARGIN}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis type="number" dataKey="budget" tick={AXIS_TICK} axisLine={false} tickLine={false} name="Budget" tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} />
                    <YAxis type="number" dataKey="leads" tick={AXIS_TICK} axisLine={false} tickLine={false} name="Leads" />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === "Budget" ? formatCurrency(v) : v, name]} />
                    <ReferenceLine x={avgBudget} stroke={C.textM} strokeDasharray="3 3" />
                    <ReferenceLine y={avgLeads} stroke={C.textM} strokeDasharray="3 3" />
                    <Scatter data={scatterData} animationDuration={600}>
                      {scatterData.map((d, i) => (
                        <Cell key={i} fill={d.leads > avgLeads ? C.convBright : C.negBright} r={Math.max(4, d.rate * 0.8)} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-muted-foreground">
                  <span>↖ Hidden gems</span><span className="text-right">↗ Escalar</span>
                  <span>↙ Ignorar</span><span className="text-right">↘ Cortar</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-base">ROI por Período</CardTitle>
                <CardDescription>Performance semanal com tendência</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {weeklyROI.map((w, i) => {
                    const isUp = w.trend[w.trend.length - 1] > w.trend[0];
                    return (
                      <div key={i} className="rounded-lg border border-border p-3 card-hover">
                        <p className="text-[10px] text-muted-foreground mb-1">{w.week}</p>
                        <p className="text-xl font-bold tabular-nums" style={{ color: C.revBright }}>{w.roi}x</p>
                        <div className="mt-1">
                          <ResponsiveContainer width="100%" height={40}>
                            <AreaChart data={w.trend.map((v, j) => ({ j, v }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                              <defs>
                                <linearGradient id={`wk${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isUp ? C.convBright : C.negBright} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={isUp ? C.convBright : C.negBright} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="v" stroke={isUp ? C.convBright : C.negBright} strokeWidth={1.5} fill={`url(#wk${i})`} dot={false} isAnimationActive={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ TAB 4: Crescimento ══════════════════════════════ */}
        <TabsContent value="growth" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Receita Acumulada vs Meta</CardTitle>
              <CardDescription>Progresso mensal em relação à meta anual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTarget} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.revBright} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.revBright} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatCurrency(v), name === "revenue" ? "Receita" : "Meta"]} />
                  <Area type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke={C.revBright} strokeWidth={2} animationDuration={600} name="Receita" />
                  <Line type="monotone" dataKey="target" stroke={C.convBright} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Meta" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-base">Ciclo de Vendas</CardTitle>
                <CardDescription>Dias médios por estágio (banda = variação)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={cycleData} margin={CHART_MARGIN}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="stage" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} label={{ value: "dias", angle: -90, position: "insideLeft", fill: C.textS, fontSize: 10 }} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v} dias`, name === "days" ? "Média" : name === "max" ? "Máximo" : "Mínimo"]} />
                    <Area type="monotone" dataKey="max" fill={C.actBright} fillOpacity={0.1} stroke="none" />
                    <Area type="monotone" dataKey="min" fill={C.card} fillOpacity={1} stroke="none" />
                    <Line type="monotone" dataKey="days" stroke={C.actBright} strokeWidth={2} dot={{ r: 3, fill: C.actBright }} activeDot={{ r: 5, stroke: C.textP, strokeWidth: 1 }} />
                    <ReferenceLine y={14} stroke={C.revBright} strokeDasharray="4 4" label={{ value: "Benchmark: 14d", fill: C.revBright, fontSize: 10, position: "right" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground font-semibold text-base">Cohort de Fechamento</CardTitle>
                <CardDescription>% conversão por mês de criação × tempo até fechar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Mês</th>
                        {["1m", "2m", "3m", "4m", "5m+"].map(c => (
                          <th key={c} className="text-center py-1.5 px-2 text-muted-foreground font-medium">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map(row => (
                        <tr key={row.month}>
                          <td className="py-1.5 px-2 text-muted-foreground font-medium">{row.month}</td>
                          {["1m", "2m", "3m", "4m", "5m+"].map(col => {
                            const val = row[col as keyof typeof row] as number;
                            const intensity = Math.min(val / 25, 1);
                            return (
                              <td key={col} className="py-1.5 px-2 text-center">
                                <div className="rounded px-2 py-1 tabular-nums font-medium" style={{
                                  background: `color-mix(in srgb, ${C.convBright} ${Math.round(intensity * 60)}%, ${C.raised})`,
                                  color: intensity > 0.4 ? C.textP : C.textS,
                                }}>
                                  {val}%
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Previsão Próximos 90 Dias</CardTitle>
              <CardDescription>Receita histórica + projeção com intervalo de confiança</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={forecastData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.revBright} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.revBright} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.purple} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number | null, name: string) => [v ? formatCurrency(v) : "—", name === "actual" ? "Realizado" : name === "forecast" ? "Projeção" : name]} />
                  <Area type="monotone" dataKey="forecastHigh" fill={C.purple} fillOpacity={0.08} stroke="none" />
                  <Area type="monotone" dataKey="forecastLow" fill={C.card} fillOpacity={1} stroke="none" />
                  <Area type="monotone" dataKey="actual" fill="url(#actualGrad)" stroke={C.revBright} strokeWidth={2} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke={C.purple} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: C.purple }} connectNulls={false} />
                  <ReferenceLine x="Mar" stroke={C.textS} strokeDasharray="3 3" label={{ value: "Hoje", fill: C.textS, fontSize: 10, position: "top" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesPipelineDashboard;
