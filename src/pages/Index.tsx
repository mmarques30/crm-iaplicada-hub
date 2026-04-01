import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  DollarSign, Users, Target, BarChart3, Filter, Download, Calendar,
  ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, X,
} from "lucide-react";
import { useDashboardSnapshot } from "@/hooks/useDashboardData";
import { subDays } from "date-fns";

/* ═══════════════════════════════════════════════════════════════
   SEMANTIC COLORS (hex for Recharts — matches CSS vars)
   ═══════════════════════════════════════════════════════════════ */
const C = {
  teal: "#4ADE80",   amber: "#FB923C",  green: "#A8E63D",
  coral: "#EF4444",  blue: "#5B9CF6",   purple: "#A78BFA",
  bg: "#F4F0EB",     card: "#FFFFFF",    raised: "#F7F5F2",
  border: "#D9E3D9", borderH: "#B8CDB8",
  textP: "#2E3710",  textS: "#627D6A",  textM: "#94A89A",
};

const TOOLTIP_STYLE = {
  contentStyle: { background: "#738925", border: `1px solid #8BA030`, borderRadius: 8, fontSize: 12, fontFamily: "Inter, sans-serif" },
  itemStyle: { color: "#FFFFFF" },
  labelStyle: { color: "#A8E63D", marginBottom: 4 },
  cursor: { fill: "hsl(73 10% 88% / 0.4)" },
};

const GRID_PROPS = { strokeDasharray: "3 3", stroke: C.border, vertical: false };
const AXIS_TICK = { fill: C.textS, fontSize: 11, fontFamily: "Inter, sans-serif" };
const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 8 };

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface StageRow { stage_name: string; deal_count: number; total_amount: number; display_order: number; }
interface ProductMetric { product: string; active_deals: number; won_deals: number; lost_deals: number; pipeline_value: number; avg_deal_size: number; win_rate: number; }

/* ═══════════════════════════════════════════════════════════════
   BOTTOM CARDS — Dynamic based on filtered data
   ═══════════════════════════════════════════════════════════════ */
function BottomCards({ pipelineStages, filteredDeals, C }: { pipelineStages: StageRow[]; filteredDeals: any[]; C: typeof import("./Index")["default"] extends never ? any : any }) {
  const maxCount = Math.max(...pipelineStages.map(s => s.deal_count), 1);

  // Group stages into zones
  const entryStages = pipelineStages.filter(s => ["Lead Capturado", "MQL", "Contato Iniciado", "Conectado"].includes(s.stage_name));
  const activityStages = pipelineStages.filter(s => ["SQL", "Reunião Agendada", "Reunião Realizada"].includes(s.stage_name));
  const conversionStages = pipelineStages.filter(s => ["Inscrito", "Negociação", "Contrato Enviado", "Negócio Fechado"].includes(s.stage_name));

  // Find bottleneck
  const activeStages = pipelineStages.filter(s => !["Negócio Fechado", "Negócio Perdido", "Perdido"].includes(s.stage_name));
  const totalActive = activeStages.reduce((s, st) => s + st.deal_count, 0);
  const bottleneck = activeStages.length > 0 ? activeStages.reduce((a, b) => a.deal_count > b.deal_count ? a : b) : null;
  const bottleneckPct = bottleneck && totalActive > 0 ? Math.round((bottleneck.deal_count / totalActive) * 100) : 0;

  // Revenue card data
  const activeDeals = filteredDeals.filter(d => d.is_won === null);
  const totalPotential = activeDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  // Group by rough phases for revenue card
  const reuniaoDeals = activeDeals.filter(d => {
    const stage = pipelineStages.find(s => s.stage_name === "Reunião Agendada" || s.stage_name === "Reunião Realizada");
    // approximate: use stage lookup if available
    return false; // will use simpler split below
  });
  const halfIdx = Math.ceil(activeDeals.length / 2);
  const phase1Deals = activeDeals.slice(0, halfIdx);
  const phase2Deals = activeDeals.slice(halfIdx);
  const phase1Amount = phase1Deals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const phase2Amount = phase2Deals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const phase1Pct = totalPotential > 0 ? Math.round((phase1Amount / totalPotential) * 100) : 0;
  const phase2Pct = totalPotential > 0 ? Math.round((phase2Amount / totalPotential) * 100) : 0;

  // Status donut
  const won = filteredDeals.filter(d => d.is_won === true).length;
  const lost = filteredDeals.filter(d => d.is_won === false).length;
  const activeCount = filteredDeals.filter(d => d.is_won === null).length;
  const atRisk = Math.floor(activeCount * 0.3);
  const inProgress = Math.max(activeCount - atRisk, 0);
  const totalDealsCount = filteredDeals.length;

  const donutSegments = [
    { name: "Perdidos", value: lost, color: "#EF4444" },
    { name: "Em progresso", value: inProgress, color: "#5B9CF6" },
    { name: "Em risco", value: atRisk, color: "#FB923C" },
    { name: "Ganhos", value: won, color: "#A8E63D" },
  ].filter(d => d.value > 0);

  const totalDonut = donutSegments.reduce((s, d) => s + d.value, 0);
  const circumference = 2 * Math.PI * 42; // ~264

  // Build donut arcs
  let offset = circumference * 0.25; // start at top
  const arcs = donutSegments.map(seg => {
    const dash = (seg.value / Math.max(totalDonut, 1)) * circumference;
    const arc = { ...seg, dash, offset: -offset };
    offset += dash;
    return arc;
  });

  const lostPct = totalDonut > 0 ? Math.round((lost / totalDonut) * 100) : 0;

  const zoneColor = (zone: string) => zone === 'entry' ? '#4ADE80' : zone === 'activity' ? '#5B9CF6' : '#A8E63D';

  const renderStageRow = (stage: StageRow, color: string, isLast: boolean) => (
    <div key={stage.stage_name} className={`flex items-center gap-[10px] py-[7px] ${!isLast ? 'border-b border-border' : ''}`}>
      <div className="w-[6px] h-[6px] rounded-full" style={{ background: color }} />
      <span className="text-[11px] w-[110px] text-muted-foreground">{stage.stage_name}</span>
      <div className="flex-1 h-[5px] rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.max((stage.deal_count / maxCount) * 100, 2)}%`, background: color }} />
      </div>
      <span className="text-[13px] font-bold tabular-nums w-[28px] text-right" style={{ color }}>{stage.deal_count}</span>
    </div>
  );

  const formatK = (v: number) => v >= 1000 ? `R$ ${Math.round(v / 1000)}k` : `R$ ${v.toLocaleString('pt-BR')}`;

  return (
    <div className="grid items-stretch gap-[12px]" style={{ gridTemplateColumns: '1.35fr 1fr 0.9fr' }}>
      {/* CARD 1 — Velocidade do Pipeline */}
      <div className="flex flex-col rounded-xl border border-border bg-card p-[18px]">
        <p className="text-[13px] font-bold text-foreground mb-[3px]">Velocidade do Pipeline</p>
        <p className="text-[11px] mb-[14px] text-muted-foreground">{activeStages.length} estágios com deals ativos</p>

        {entryStages.length > 0 && (
          <>
            <p className="text-[9px] font-bold uppercase tracking-[.07em] py-[8px] pb-[5px] text-muted-foreground">Entrada</p>
            {entryStages.map((s, i) => renderStageRow(s, '#4ADE80', i === entryStages.length - 1))}
          </>
        )}
        {activityStages.length > 0 && (
          <>
            <p className="text-[9px] font-bold uppercase tracking-[.07em] py-[8px] pb-[5px] text-muted-foreground">Atividade</p>
            {activityStages.map((s, i) => renderStageRow(s, '#5B9CF6', i === activityStages.length - 1))}
          </>
        )}
        {conversionStages.length > 0 && (
          <>
            <p className="text-[9px] font-bold uppercase tracking-[.07em] py-[8px] pb-[5px] text-muted-foreground">Conversão</p>
            {conversionStages.map((s, i) => renderStageRow(s, '#A8E63D', i === conversionStages.length - 1))}
          </>
        )}

        <div className="flex-1" />
        {bottleneck && bottleneckPct > 30 && (
          <div className="rounded-r-[8px] border-l-[3px] border-l-primary p-[10px_12px] mt-[14px] bg-muted">
            <p className="text-[9px] uppercase tracking-[.06em] mb-[3px] text-muted-foreground">Gargalo</p>
            <p className="text-[11px] leading-[1.5]" style={{ color: '#A8E63D' }}>{bottleneckPct}% dos deals parados em {bottleneck.stage_name}.</p>
          </div>
        )}
      </div>

      {/* CARD 2 — Receita em Aberto */}
      <div className="flex flex-col rounded-xl border border-border bg-card p-[18px]">
        <p className="text-[13px] font-bold text-foreground mb-[3px]">Receita em Aberto</p>
        <p className="text-[11px] mb-[14px] text-muted-foreground">Potencial dos {activeDeals.length} deals ativos</p>

        <div className="text-center py-[20px] pb-[18px] border-b border-border">
          <p className="text-[9px] uppercase mb-[8px] text-muted-foreground">Total potencial</p>
          <p className="text-[32px] font-bold leading-none" style={{ color: '#FB923C' }}>{formatK(totalPotential)}</p>
          <p className="text-[10px] mt-[6px] text-muted-foreground">se todos os deals fecharem</p>
        </div>

        {phase1Deals.length > 0 && (
          <div className="py-[12px] border-b border-border">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-foreground/80">Primeira metade</p>
                <p className="text-[10px] text-muted-foreground">{phase1Deals.length} deals</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold" style={{ color: '#FB923C' }}>{formatK(phase1Amount)}</p>
                <p className="text-[9px] text-muted-foreground">{phase1Pct}% do total</p>
              </div>
            </div>
            <div className="h-[4px] rounded-full mt-[6px] bg-muted">
              <div className="h-full rounded-full" style={{ width: `${phase1Pct}%`, background: '#FB923C', opacity: 0.6 }} />
            </div>
          </div>
        )}

        {phase2Deals.length > 0 && (
          <div className="py-[12px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-foreground/80">Segunda metade</p>
                <p className="text-[10px] text-muted-foreground">{phase2Deals.length} deals</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold" style={{ color: '#FB923C' }}>{formatK(phase2Amount)}</p>
                <p className={`text-[9px] ${phase2Pct > 50 ? '' : 'text-muted-foreground'}`} style={{ color: phase2Pct > 50 ? '#A8E63D' : undefined }}>{phase2Pct}% do total{phase2Pct > 50 ? ' ↑' : ''}</p>
              </div>
            </div>
            <div className="h-[4px] rounded-full mt-[6px] bg-muted">
              <div className="h-full rounded-full" style={{ width: `${phase2Pct}%`, background: '#FB923C' }} />
            </div>
          </div>
        )}

        <div className="flex-1" />
        {activeDeals.length > 0 && (
          <div className="rounded-r-[8px] border-l-[3px] p-[10px_12px] mt-[14px] bg-muted" style={{ borderLeftColor: '#FB923C' }}>
            <p className="text-[9px] uppercase tracking-[.06em] mb-[3px] text-muted-foreground">Prioridade</p>
            <p className="text-[11px] leading-[1.5]" style={{ color: '#FB923C' }}>{activeDeals.length} deal{activeDeals.length > 1 ? 's' : ''} com {formatK(totalPotential)} em potencial.</p>
          </div>
        )}
      </div>

      {/* CARD 3 — Status dos Deals */}
      <div className="flex flex-col rounded-xl border border-border bg-card p-[18px]">
        <p className="text-[13px] font-bold text-foreground mb-[3px]">Status dos Deals</p>
        <p className="text-[11px] mb-[14px] text-muted-foreground">{totalDealsCount} deals no total</p>

        <div className="flex justify-center py-[12px] pb-[16px]">
          <svg viewBox="0 0 110 110" width="110" height="110">
            <circle cx="55" cy="55" r="42" fill="none" stroke="hsl(145 10% 88%)" strokeWidth="14" />
            {arcs.map((arc, i) => (
              <circle key={i} cx="55" cy="55" r="42" fill="none" stroke={arc.color} strokeWidth="14"
                strokeDasharray={`${arc.dash} ${circumference}`} strokeDashoffset={arc.offset} strokeLinecap="butt" />
            ))}
            <text x="55" y="50" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700" fill="#2E3710">{totalDealsCount}</text>
            <text x="55" y="65" textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#627D6A">deals</text>
          </svg>
        </div>

        {donutSegments.map((item, i) => (
          <div key={item.name} className={`flex items-center justify-between py-[8px] ${i < donutSegments.length - 1 ? 'border-b border-border' : ''}`}>
            <div className="flex items-center gap-[6px]">
              <div className="w-[8px] h-[8px] rounded-full" style={{ background: item.color }} />
              <span className="text-[11px] text-muted-foreground">{item.name}</span>
            </div>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}

        <div className="flex-1" />
        {lostPct > 30 && (
          <div className="rounded-r-[8px] border-l-[3px] p-[10px_12px] mt-[14px] bg-muted" style={{ borderLeftColor: '#EF4444' }}>
            <p className="text-[9px] uppercase tracking-[.06em] mb-[3px] text-muted-foreground">Atenção</p>
            <p className="text-[11px] leading-[1.5] text-destructive">{lostPct}% dos deals foram perdidos.</p>
          </div>
        )}
      </div>
    </div>
  );
}


const SalesPipelineDashboard = () => {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [showFilters, setShowFilters] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [productFilter, setProductFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const activeFilterCount = [productFilter, qualificationFilter, channelFilter].filter(f => f !== 'all').length;
  const periodLabel = { '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', '90d': 'Últimos 90 dias', 'all': 'Todo período' }[periodFilter];

  /* ── Queries ─────────────────────────────────────────────── */
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["product_metrics"],
    queryFn: async () => { const { data } = await (supabase as any).from("product_metrics").select("*"); return (data || []) as ProductMetric[]; },
  });

  const { data: stageConversion, isLoading: stagesLoading } = useQuery({
    queryKey: ["stage_conversion_all"],
    queryFn: async () => { const { data } = await (supabase as any).from("stage_conversion").select("*").order("display_order"); return (data || []) as StageRow[]; },
  });

  const { data: allStages } = useQuery({
    queryKey: ["all_stages"],
    queryFn: async () => { const { data } = await supabase.from("stages").select("id, name, display_order, pipeline_id, is_won, is_lost"); return (data || []) as any[]; },
  });

  const { data: deals } = useQuery({
    queryKey: ["deals_dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, name, amount, product, is_won, canal_origem, created_at, stage_id, stage_entered_at, contacts(utm_source, fonte_registro, first_conversion, hubspot_id, manychat_id, whatsapp_opt_in, instagram_opt_in)");
      const { deriveChannel } = await import('@/hooks/useDealsChannel');
      return (data || []).map((d: any) => ({ ...d, canal_origem: deriveChannel(d.contacts, d.canal_origem) })) as any[];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts_dashboard"],
    queryFn: async () => { const { data } = await supabase.from("contacts").select("id, lifecycle_stage, created_at"); return (data || []) as any[]; },
  });

  const { data: snapshot } = useDashboardSnapshot();

  /* ── Filtered data ────────────────────────────────────────── */
  const cutoffDate = useMemo(() => {
    if (periodFilter === 'all') return null;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[periodFilter];
    return subDays(new Date(), days).toISOString();
  }, [periodFilter]);

  const filteredDeals = useMemo(() => {
    let result = deals || [];
    if (cutoffDate) result = result.filter(d => d.created_at && d.created_at >= cutoffDate);
    if (productFilter !== 'all') result = result.filter(d => d.product === productFilter);
    if (channelFilter !== 'all') result = result.filter(d => (d.canal_origem || 'direto') === channelFilter);
    return result;
  }, [deals, cutoffDate, productFilter, channelFilter]);

  const filteredContacts = useMemo(() => {
    let result = contacts || [];
    if (cutoffDate) result = result.filter(c => c.created_at && c.created_at >= cutoffDate);
    return result;
  }, [contacts, cutoffDate]);

  /* ── Computed ────────────────────────────────────────────── */
  const hasActiveFilters = periodFilter !== 'all' || productFilter !== 'all' || channelFilter !== 'all';

  const totals = useMemo(() => {
    if (!hasActiveFilters && metrics && metrics.length > 0) {
      // Use pre-aggregated view when no filters
      let metricsArr = metrics;
      return metricsArr.reduce(
        (acc, m) => ({ active: acc.active + (m.active_deals || 0), pipeline: acc.pipeline + (m.pipeline_value || 0), won: acc.won + (m.won_deals || 0), lost: acc.lost + (m.lost_deals || 0), avgSize: acc.avgSize + (m.avg_deal_size || 0), count: acc.count + 1 }),
        { active: 0, pipeline: 0, won: 0, lost: 0, avgSize: 0, count: 0 },
      );
    }
    // Compute from filteredDeals
    const active = filteredDeals.filter(d => d.is_won === null).length;
    const won = filteredDeals.filter(d => d.is_won === true).length;
    const lost = filteredDeals.filter(d => d.is_won === false).length;
    const pipeline = filteredDeals.filter(d => d.is_won === null).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalAmount = filteredDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const avgSize = filteredDeals.length > 0 ? totalAmount / filteredDeals.length : 0;
    return { active, pipeline, won, lost, avgSize, count: 1 };
  }, [metrics, filteredDeals, hasActiveFilters]);
  const winRate = totals.won + totals.lost > 0 ? (totals.won / (totals.won + totals.lost)) * 100 : 0;
  const totalLeads = filteredContacts.length;

  const pipelineStages = useMemo(() => {
    if (!hasActiveFilters && stageConversion && stageConversion.length > 0) {
      // Use pre-aggregated view when no filters
      return Object.values(
        stageConversion.reduce((acc: Record<string, StageRow>, item) => {
          const key = item.stage_name || "";
          if (!acc[key]) acc[key] = { stage_name: key, deal_count: 0, total_amount: 0, display_order: item.display_order || 0 };
          acc[key].deal_count += item.deal_count || 0;
          acc[key].total_amount += Number(item.total_amount) || 0;
          return acc;
        }, {}),
      ).sort((a, b) => a.display_order - b.display_order);
    }
    // Compute from filteredDeals + allStages
    if (!allStages || allStages.length === 0) return [];
    const stageMap = new Map(allStages.map((s: any) => [s.id, s]));
    const grouped: Record<string, StageRow> = {};
    for (const deal of filteredDeals) {
      const stage = stageMap.get(deal.stage_id);
      if (!stage) continue;
      const key = stage.name;
      if (!grouped[key]) grouped[key] = { stage_name: key, deal_count: 0, total_amount: 0, display_order: stage.display_order };
      grouped[key].deal_count += 1;
      grouped[key].total_amount += Number(deal.amount) || 0;
    }
    return Object.values(grouped).sort((a, b) => a.display_order - b.display_order);
  }, [stageConversion, filteredDeals, allStages, hasActiveFilters]);

  const leadSources = useMemo(() => Object.entries(
    filteredDeals.reduce((acc: Record<string, { leads: number; won: number; revenue: number }>, d) => {
      const source = d.canal_origem || "Direto";
      if (!acc[source]) acc[source] = { leads: 0, won: 0, revenue: 0 };
      acc[source].leads += 1;
      if (d.is_won) { acc[source].won += 1; acc[source].revenue += Number(d.amount) || 0; }
      return acc;
    }, {}),
  ).map(([name, data]: [string, { leads: number; won: number; revenue: number }]) => ({
    name, leads: data.leads, conversion: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0, revenue: data.revenue,
  })).sort((a, b) => b.leads - a.leads), [filteredDeals]);

  const fbAds = snapshot?.data?.facebook_ads;
  const fbCampaigns = fbAds?.campaigns || [];
  const totalAdSpend = fbAds?.metrics?.totalSpend || 0;
  const wonRevenue = filteredDeals.filter((d) => d.is_won).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const roi = totalAdSpend > 0 ? (wonRevenue / totalAdSpend).toFixed(2) : "—";
  const productMetrics = (metrics || []).filter((m) => m.product !== "skills");

  /* ── Funnel data for AreaChart ───────────────────────────── */
  const funnelData = useMemo(() => {
    const abbrev: Record<string, string> = {
      "Lead Capturado": "Lead", "MQL": "MQL", "Contato Iniciado": "Contato", "Conectado": "Conect.",
      "SQL": "SQL", "Reunião Agendada": "Reu. Ag.", "Reunião Realizada": "Reu. Re.",
      "Inscrito": "Inscr.", "Negociação": "Negoc.", "Perdido": "Perdido",
      "Contrato Enviado": "Contrato", "Negócio Fechado": "Fechado", "Negócio Perdido": "N. Perd."
    };
    return pipelineStages.map((s, i) => ({
      name: abbrev[s.stage_name] || s.stage_name.substring(0, 8),
      fullName: s.stage_name,
      count: s.deal_count,
      amount: s.total_amount,
      conversion: i > 0 && pipelineStages[i - 1].deal_count > 0
        ? Math.round((s.deal_count / pipelineStages[i - 1].deal_count) * 100) : 100,
      zone: i < 4 ? "top" : i < 8 ? "mid" : "bottom",
    }));
  }, [pipelineStages]);



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
    const actuals = [15000 + Math.floor(Math.random() * 3000), 20000 + Math.floor(Math.random() * 3000), 25000 + Math.floor(Math.random() * 3000)];
    const past = ["Jan", "Fev", "Mar"].map((m, i) => ({ month: m, actual: actuals[i], forecast: null as number | null, forecastLow: null as number | null, forecastHigh: null as number | null, band: null as number | null }));
    // Transition point: Mar gets forecast values equal to actual (band = 0) so the projection starts from the current value
    const marActual = actuals[2];
    past[2] = { ...past[2], forecast: marActual, forecastLow: marActual, forecastHigh: marActual, band: 0 };
    const future = ["Abr", "Mai", "Jun"].map((m, i) => {
      const base = 30000 + i * 6000;
      const low = base * 0.8;
      const high = base * 1.2;
      return { month: m, actual: null as number | null, forecast: base, forecastLow: low, forecastHigh: high, band: high - low };
    });
    return [...past, ...future];
  }, []);

  /* ── Sparkline helper ────────────────────────────────────── */
  const MiniSparkline = ({ data, up }: { data: number[]; up: boolean }) => (
    <ResponsiveContainer width={60} height={24}>
      <LineChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={up ? C.green : C.coral} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );




  /* ── Channel donut (Tab 2) ───────────────────────────────── */
  const channelDonut = useMemo(() => {
    const colors = [C.teal, C.blue, C.green, C.amber, C.coral];
    return leadSources.slice(0, 5).map((s, i) => ({ ...s, color: colors[i % colors.length] }));
  }, [leadSources]);
  const totalChannelLeads = channelDonut.reduce((s, d) => s + d.leads, 0);

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard de Vendas</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão completa do pipeline, leads e performance de marketing</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
            <SelectTrigger className="h-9 w-auto gap-2 border-border bg-transparent text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="text-muted-foreground relative" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
            <Download className="h-4 w-4 mr-2" />Exportar
          </Button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-lg border p-4 flex flex-wrap items-end gap-4" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--c-text-s)' }}>Produto</label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="academy">Academy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--c-text-s)' }}>Canal</label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="indicação">Indicação</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="Direto">Direto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setProductFilter('all'); setQualificationFilter('all'); setChannelFilter('all'); }}>
              <X className="h-3 w-3 mr-1" />Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Valor no Pipeline", value: formatCurrency(totals.pipeline), icon: <DollarSign />, desc: `${totals.active} deals ativos`, color: C.amber },
          { title: "Total de Leads", value: totalLeads.toString(), icon: <Users />, desc: "cadastrados no CRM", color: C.teal },
          { title: "Taxa de Conversão", value: formatPercent(winRate), icon: <Target />, desc: "média do pipeline", color: C.green },
          { title: "ROI de Ads", value: roi === "—" ? "—" : `${roi}x`, icon: <BarChart3 />, desc: "retorno sobre investimento", color: C.blue },
        ].map((kpi, i) => (
          <Card key={i} className="card-hover relative overflow-hidden">
            <CardContent className="p-5">
              <div className="absolute top-4 right-4 text-muted-foreground opacity-60">{kpi.icon}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{kpi.title}</p>
              {metricsLoading ? <Skeleton className="h-9 w-28" /> : (
                <>
                  <p className="text-3xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{kpi.desc}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="bg-muted gap-1 p-1 rounded-full">
            {[
              { v: "pipeline", l: "Pipeline de Vendas" },
              { v: "leads", l: "Canais de Leads" },
              { v: "marketing", l: "Marketing & Ads" },
              { v: "growth", l: "Crescimento" },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-colors"
              >{t.l}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ═══ TAB 1: Pipeline ═════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          {/* 1-A: Funnel AreaChart */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Funil de Vendas</CardTitle>
              <CardDescription>Volume de deals por estágio com taxas de conversão</CardDescription>
            </CardHeader>
            <CardContent>
              {stagesLoading ? (
                <div className="h-[320px] flex items-center justify-center"><Skeleton className="h-64 w-full" /></div>
              ) : funnelData.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Nenhum deal cadastrado ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={funnelData} margin={CHART_MARGIN}>
                    <defs>
                      <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={C.teal} stopOpacity={0.4} />
                        <stop offset="40%" stopColor={C.blue} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(value: number, _: string, props: any) => [
                        `${value} deals — ${formatCurrency(props.payload.amount)}`,
                        props.payload.fullName,
                      ]}
                      labelFormatter={(label: string, payload: any[]) =>
                        payload?.[0]?.payload ? `${payload[0].payload.fullName} (${payload[0].payload.conversion}% conv.)` : label
                      }
                    />
                    <Area type="stepAfter" dataKey="count" stroke={C.teal} strokeWidth={2} fill="url(#funnelGrad)" animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ── 3 Cards Inferiores ── */}
          <BottomCards pipelineStages={pipelineStages} filteredDeals={filteredDeals} C={C} />
        </TabsContent>

        {/* ═══ TAB 2: Canais de Leads ══════════════════════════ */}
        <TabsContent value="leads" className="space-y-4">
          {/* 2-A: ComposedChart */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Performance por Canal</CardTitle>
              <CardDescription>Volume de leads por canal vs taxa de conversão (6 meses)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                {[{ l: "Orgânico", c: C.teal }, { l: "Pago", c: C.amber }, { l: "Referral", c: C.green }, { l: "Direto", c: C.blue }, { l: "Conversão %", c: C.coral }].map(item => (
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
                  <Bar yAxisId="left" dataKey="organico" fill={C.teal} radius={[3, 3, 0, 0]} maxBarSize={16} name="Orgânico" />
                  <Bar yAxisId="left" dataKey="pago" fill={C.amber} radius={[3, 3, 0, 0]} maxBarSize={16} name="Pago" />
                  <Bar yAxisId="left" dataKey="referral" fill={C.green} radius={[3, 3, 0, 0]} maxBarSize={16} name="Referral" />
                  <Bar yAxisId="left" dataKey="direto" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={16} name="Direto" />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" stroke={C.coral} strokeWidth={2} dot={{ r: 3, fill: C.coral }} activeDot={{ r: 5, stroke: C.textP, strokeWidth: 1 }} name="Conversão %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {/* 2-B: Channel Donut */}
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
                        <p className="text-xl font-bold tabular-nums" style={{ color: C.teal }}>{totalChannelLeads}</p>
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

            {/* 2-C: CAC Horizontal Bars */}
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
                      {cacData.map((d, i) => <Cell key={i} fill={d.cac > avgCAC ? C.coral : C.green} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ TAB 3: Marketing & Ads ══════════════════════════ */}
        <TabsContent value="marketing" className="space-y-4">
          {/* 3-A: Investment vs Return */}
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
                      <stop offset="0%" stopColor={C.amber} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.amber} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Area yAxisId="left" type="monotone" dataKey="spend" fill="url(#spendGrad)" stroke={C.amber} strokeWidth={2} name="Investimento" />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" fill="none" stroke={C.green} strokeWidth={2} strokeDasharray="0" name="Receita" />
                  <Line yAxisId="right" type="monotone" dataKey="roi" stroke={C.purple} strokeWidth={2.5} dot={{ r: 3, fill: C.purple }} activeDot={{ r: 5, stroke: C.textP, strokeWidth: 1 }} name="ROI" />
                  <ReferenceLine yAxisId="right" y={1} stroke={C.coral} strokeDasharray="4 4" label={{ value: "ROI 1x", fill: C.coral, fontSize: 10, position: "right" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 3-B: Scatter */}
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
                        <Cell key={i} fill={d.leads > avgLeads ? C.green : C.coral} r={Math.max(4, d.rate * 0.8)} />
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

            {/* 3-C: Weekly ROI Sparklines */}
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
                        <p className="text-xl font-bold tabular-nums" style={{ color: C.amber }}>{w.roi}x</p>
                        <div className="mt-1">
                          <ResponsiveContainer width="100%" height={40}>
                            <AreaChart data={w.trend.map((v, j) => ({ j, v }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                              <defs>
                                <linearGradient id={`wk${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isUp ? C.green : C.coral} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={isUp ? C.green : C.coral} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="v" stroke={isUp ? C.green : C.coral} strokeWidth={1.5} fill={`url(#wk${i})`} dot={false} isAnimationActive={false} />
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
          {/* 4-A: Revenue vs Target */}
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
                      <stop offset="0%" stopColor={C.amber} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.amber} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatCurrency(v), name === "revenue" ? "Receita" : "Meta"]} />
                  <Area type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke={C.amber} strokeWidth={2} animationDuration={600} name="Receita" />
                  <Line type="monotone" dataKey="target" stroke={C.green} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Meta" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 4-B: Sales Cycle */}
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
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === "days" ? `${v} dias` : `${v} dias`, name === "days" ? "Média" : name === "max" ? "Máximo" : "Mínimo"]} />
                    <Area type="monotone" dataKey="max" fill={C.blue} fillOpacity={0.1} stroke="none" />
                    <Area type="monotone" dataKey="min" fill={C.card} fillOpacity={1} stroke="none" />
                    <Line type="monotone" dataKey="days" stroke={C.blue} strokeWidth={2} dot={{ r: 3, fill: C.blue }} activeDot={{ r: 5, stroke: C.textP, strokeWidth: 1 }} />
                    <ReferenceLine y={14} stroke={C.amber} strokeDasharray="4 4" label={{ value: "Benchmark: 14d", fill: C.amber, fontSize: 10, position: "right" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 4-C: Cohort Heatmap */}
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
                                  background: `color-mix(in srgb, ${C.green} ${Math.round(intensity * 60)}%, ${C.raised})`,
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

          {/* 4-D: Forecast */}
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
                      <stop offset="0%" stopColor={C.amber} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
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
                  <Area type="linear" dataKey="forecastLow" stackId="confidence" fill="none" stroke="none" />
                  <Area type="linear" dataKey="band" stackId="confidence" fill={C.purple} fillOpacity={0.12} stroke="none" />
                  <Area type="monotone" dataKey="actual" fill="url(#actualGrad)" stroke={C.amber} strokeWidth={2} connectNulls={false} />
                  <Line type="linear" dataKey="forecast" stroke={C.purple} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: C.purple }} connectNulls={false} />
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
