import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
} from "lucide-react";
import { useDashboardSnapshot } from "@/hooks/useDashboardData";

/* ─── Metric Card ─────────────────────────────────────────── */

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  loading?: boolean;
}

const MetricCard = ({ title, value, change, icon, description, loading }: MetricCardProps) => {
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {change != null && (
                <div className={`flex items-center text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span className="font-medium">{Math.abs(change)}%</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{description || "vs mês anterior"}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/* ─── Types ──────────────────────────────────────────────────── */

interface StageRow {
  stage_name: string;
  deal_count: number;
  total_amount: number;
  display_order: number;
  product?: string;
}

interface ProductMetric {
  product: string;
  active_deals: number;
  won_deals: number;
  lost_deals: number;
  pipeline_value: number;
  avg_deal_size: number;
  win_rate: number;
}

/* ─── Dashboard ──────────────────────────────────────────────── */

const SalesPipelineDashboard = () => {
  const [selectedPeriod] = useState<string>("30d");

  /* ── Data queries ────────────────────────────────────────── */

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["product_metrics"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("product_metrics").select("*");
      return (data || []) as ProductMetric[];
    },
  });

  const { data: stageConversion, isLoading: stagesLoading } = useQuery({
    queryKey: ["stage_conversion_all"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("stage_conversion")
        .select("*")
        .order("display_order");
      return (data || []) as StageRow[];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["deals_dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, name, amount, product, is_won, canal_origem, created_at");
      return (data || []) as any[];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts_dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, lifecyclestage, created_at");
      return (data || []) as any[];
    },
  });

  const { data: snapshot } = useDashboardSnapshot();

  /* ── Computed: totals ────────────────────────────────────── */

  const totals = (metrics || []).reduce(
    (acc, m) => ({
      active: acc.active + (m.active_deals || 0),
      pipeline: acc.pipeline + (m.pipeline_value || 0),
      won: acc.won + (m.won_deals || 0),
      lost: acc.lost + (m.lost_deals || 0),
      avgSize: acc.avgSize + (m.avg_deal_size || 0),
      count: acc.count + 1,
    }),
    { active: 0, pipeline: 0, won: 0, lost: 0, avgSize: 0, count: 0 },
  );

  const winRate = totals.won + totals.lost > 0 ? (totals.won / (totals.won + totals.lost)) * 100 : 0;
  const totalLeads = contacts?.length || 0;

  /* ── Computed: pipeline stages ───────────────────────────── */

  const pipelineStages = Object.values(
    (stageConversion || []).reduce(
      (acc: Record<string, StageRow>, item) => {
        const key = item.stage_name || "";
        if (!acc[key]) acc[key] = { stage_name: key, deal_count: 0, total_amount: 0, display_order: item.display_order || 0 };
        acc[key].deal_count += item.deal_count || 0;
        acc[key].total_amount += Number(item.total_amount) || 0;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => a.display_order - b.display_order);

  const firstStageCount = pipelineStages[0]?.deal_count || 1;

  /* ── Computed: lead sources ──────────────────────────────── */

  const leadSources = Object.entries(
    (deals || []).reduce(
      (acc: Record<string, { leads: number; won: number; revenue: number }>, d) => {
        const source = d.canal_origem || "Direto";
        if (!acc[source]) acc[source] = { leads: 0, won: 0, revenue: 0 };
        acc[source].leads += 1;
        if (d.is_won) {
          acc[source].won += 1;
          acc[source].revenue += Number(d.amount) || 0;
        }
        return acc;
      },
      {},
    ),
  )
    .map(([name, data]: [string, { leads: number; won: number; revenue: number }]) => ({
      name,
      leads: data.leads,
      conversion: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.leads - a.leads);

  const bestConversion = [...leadSources].sort((a, b) => b.conversion - a.conversion)[0];
  const highestVolume = leadSources[0];
  const highestRevenue = [...leadSources].sort((a, b) => b.revenue - a.revenue)[0];

  /* ── Facebook Ads data ───────────────────────────────────── */

  const fbAds = snapshot?.data?.facebook_ads;
  const fbCampaigns = fbAds?.campaigns || [];
  const totalAdSpend = fbAds?.metrics?.totalSpend || 0;
  const totalImpressions = fbAds?.metrics?.totalImpressions || 0;
  const avgCTR = fbAds?.metrics?.avgCTR || 0;
  const totalFbLeads = fbAds?.metrics?.totalLeads || 0;

  /* ── Per-product metrics ─────────────────────────────────── */

  const productMetrics = (metrics || []).filter((m) => m.product !== "skills");

  /* ── ROI calculation ─────────────────────────────────────── */

  const wonRevenue = (deals || []).filter((d) => d.is_won).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const roi = totalAdSpend > 0 ? (wonRevenue / totalAdSpend).toFixed(2) : "—";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Vendas</h1>
          <p className="text-muted-foreground mt-1">
            Visão completa do pipeline, leads e performance de marketing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {selectedPeriod === "7d" ? "Últimos 7 dias" : selectedPeriod === "30d" ? "Últimos 30 dias" : "Últimos 90 dias"}
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Valor no Pipeline"
          value={formatCurrency(totals.pipeline)}
          icon={<DollarSign className="h-4 w-4" />}
          description={`${totals.active} deals ativos`}
          loading={metricsLoading}
        />
        <MetricCard
          title="Total de Leads"
          value={totalLeads.toString()}
          icon={<Users className="h-4 w-4" />}
          description="cadastrados no CRM"
          loading={metricsLoading}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={formatPercent(winRate)}
          icon={<Target className="h-4 w-4" />}
          description="média do pipeline"
          loading={metricsLoading}
        />
        <MetricCard
          title="ROI de Ads"
          value={roi === "—" ? "—" : `${roi}x`}
          icon={<BarChart3 className="h-4 w-4" />}
          description="retorno sobre investimento"
          loading={metricsLoading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline de Vendas</TabsTrigger>
          <TabsTrigger value="leads">Canais de Leads</TabsTrigger>
          <TabsTrigger value="marketing">Marketing & Ads</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
        </TabsList>

        {/* ═══ Pipeline Tab ═══════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Vendas</CardTitle>
              <CardDescription>
                Visualização completa do pipeline com taxas de conversão entre estágios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stagesLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-20" /></div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : pipelineStages.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Nenhum deal cadastrado ainda</p>
                  <p className="text-xs">Crie deals no Pipeline para visualizar o funil</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pipelineStages.map((stage, index) => {
                    const conversion = firstStageCount > 0 ? Math.round((stage.deal_count / firstStageCount) * 100) : 0;
                    return (
                      <div key={stage.stage_name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{stage.stage_name}</p>
                              <p className="text-sm text-muted-foreground">{stage.deal_count} oportunidades</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(stage.total_amount)}</p>
                            <Badge variant="secondary" className="mt-1">{conversion}% conversão</Badge>
                          </div>
                        </div>
                        <Progress value={conversion} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Velocidade do Pipeline</CardTitle>
                <CardDescription>Deals por estágio do funil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pipelineStages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  pipelineStages.map((stage) => (
                    <div key={stage.stage_name} className="flex justify-between items-center">
                      <span className="text-sm">{stage.stage_name}</span>
                      <span className="font-semibold">{stage.deal_count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Médio por Estágio</CardTitle>
                <CardDescription>Valor médio das oportunidades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pipelineStages.filter((s) => s.deal_count > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  pipelineStages.filter((s) => s.deal_count > 0).map((stage) => (
                    <div key={stage.stage_name} className="flex justify-between items-center">
                      <span className="text-sm">{stage.stage_name}</span>
                      <span className="font-semibold">{formatCurrency(stage.total_amount / stage.deal_count)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Leads Tab ══════════════════════════════════════ */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Canal</CardTitle>
              <CardDescription>
                Análise detalhada de leads e conversão por fonte de tráfego
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadSources.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum deal com canal de origem definido
                </div>
              ) : (
                <div className="space-y-4">
                  {leadSources.map((source) => (
                    <div key={source.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{source.name}</h4>
                        <Badge variant="outline">{source.leads} leads</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Conversão</p>
                          <p className="font-semibold text-lg">{source.conversion}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Receita</p>
                          <p className="font-semibold text-lg">{formatCurrency(source.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CPL</p>
                          <p className="font-semibold text-lg">
                            {source.leads > 0 ? formatCurrency(source.revenue / source.leads) : "—"}
                          </p>
                        </div>
                      </div>
                      <Progress value={source.conversion} className="h-2 mt-3" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {leadSources.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Melhor Canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold">{bestConversion?.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{bestConversion?.conversion || 0}% de conversão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maior Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">{highestVolume?.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{highestVolume?.leads || 0} leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maior Receita</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold">{highestRevenue?.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(highestRevenue?.revenue || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══ Marketing & Ads Tab ════════════════════════════ */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Investimento Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalAdSpend)}</div>
                <p className="text-xs text-muted-foreground mt-1">em campanhas ativas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Impressões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalImpressions > 0 ? `${(totalImpressions / 1000).toFixed(0)}k` : "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">alcance total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CTR Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgCTR.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">taxa de cliques</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CPA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalFbLeads > 0 ? formatCurrency(totalAdSpend / totalFbLeads) : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">custo por aquisição</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campanhas Ativas</CardTitle>
              <CardDescription>Performance detalhada de cada campanha publicitária</CardDescription>
            </CardHeader>
            <CardContent>
              {fbCampaigns.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <BarChart3 className="h-12 w-12 mx-auto opacity-30" />
                  <p className="text-sm">Nenhuma campanha encontrada</p>
                  <p className="text-xs">Configure a integração com Facebook Ads em Configurações</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fbCampaigns.map((campaign: any) => {
                    const ctr = (campaign.ctr || 0).toFixed(2);
                    const cpl = campaign.costPerLead || (campaign.leads > 0 ? campaign.spend / campaign.leads : 0);
                    const campaignRevenue = campaign.leads > 0 && totalFbLeads > 0
                      ? (wonRevenue * (campaign.leads / totalFbLeads))
                      : 0;
                    const campaignRoi = campaign.spend > 0
                      ? Math.round(((campaignRevenue - campaign.spend) / campaign.spend) * 100)
                      : 0;

                    return (
                      <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                            {campaign.status === "ACTIVE" ? "Ativa" : campaign.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Impressões</p>
                            <p className="font-semibold">{((campaign.impressions || 0) / 1000).toFixed(0)}k</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cliques</p>
                            <p className="font-semibold">{campaign.clicks || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CTR</p>
                            <p className="font-semibold">{ctr}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Leads</p>
                            <p className="font-semibold">{campaign.leads || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Receita Est.</p>
                            <p className="font-semibold text-green-600">{formatCurrency(campaignRevenue)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm text-muted-foreground">
                            Investimento: {formatCurrency(campaign.spend || 0)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              CPL: {formatCurrency(cpl)}
                            </span>
                            {campaignRoi > 0 && (
                              <Badge variant={campaignRoi > 300 ? "default" : "secondary"}>
                                ROI: {campaignRoi}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Growth Tab ═════════════════════════════════════ */}
        <TabsContent value="growth" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Métricas por Produto</CardTitle>
                <CardDescription>Evolução dos produtos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {productMetrics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados de produtos</p>
                ) : (
                  productMetrics.map((pm) => (
                    <div key={pm.product} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm capitalize">{pm.product}</span>
                        <span className="font-semibold text-green-600">{formatPercent(pm.win_rate)}</span>
                      </div>
                      <Progress value={pm.win_rate} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metas de Vendas</CardTitle>
                <CardDescription>Progresso em relação aos objetivos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pipeline</span>
                    <span className="font-semibold">{formatCurrency(totals.pipeline)}</span>
                  </div>
                  <Progress value={Math.min((totals.pipeline / (totals.pipeline * 1.5 || 1)) * 100, 100)} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Deals Ativos</span>
                    <span className="font-semibold">{totals.active}</span>
                  </div>
                  <Progress value={Math.min((totals.active / Math.max(totals.active * 1.3, 1)) * 100, 100)} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Win Rate</span>
                    <span className="font-semibold">{formatPercent(winRate)}</span>
                  </div>
                  <Progress value={winRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ROI de Ads</span>
                    <span className="font-semibold">{roi === "—" ? "—" : `${roi}x`}</span>
                  </div>
                  <Progress value={roi === "—" ? 0 : Math.min(Number(roi) * 10, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Visão por Produto</CardTitle>
              <CardDescription>Comparativo de performance</CardDescription>
            </CardHeader>
            <CardContent>
              {productMetrics.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">Sem dados de produtos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {productMetrics.map((pm) => (
                    <div key={pm.product} className="space-y-2">
                      <p className="text-sm text-muted-foreground capitalize">{pm.product}</p>
                      <p className="text-2xl font-bold">{formatCurrency(pm.pipeline_value)}</p>
                      <div className="flex items-center text-sm text-green-600">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {pm.won_deals} deals ganhos · {formatPercent(pm.win_rate)} win rate
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesPipelineDashboard;
