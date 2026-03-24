import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { SourceSummaryCard } from '@/components/dashboard/SourceSummaryCard'
import { useDashboardSnapshot, useCollectDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Users, Eye, Heart, Target, DollarSign, TrendingUp, RefreshCw, Loader2, Instagram, Facebook, BarChart3 } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

const SEMANTIC_COLORS = ['#2CBBA6', '#4A9FE0', '#AFC040', '#E8A43C']
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

export default function PainelGeral() {
  const { data: snapshot, isLoading } = useDashboardSnapshot()
  const collectMutation = useCollectDashboardData()

  const ig = snapshot?.data?.instagram
  const fb = snapshot?.data?.facebook_ads

  const { data: productMetrics } = useQuery({
    queryKey: ['product_metrics'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('product_metrics').select('*')
      return (data || []) as any[]
    },
  })

  const { data: contactCount } = useQuery({
    queryKey: ['contacts_count'],
    queryFn: async () => {
      const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true })
      return count || 0
    },
  })

  const crmTotals = (productMetrics || []).reduce(
    (acc, pm) => ({
      activeDeals: acc.activeDeals + Number(pm.active_deals || 0),
      wonDeals: acc.wonDeals + Number(pm.won_deals || 0),
      lostDeals: acc.lostDeals + Number(pm.lost_deals || 0),
      pipelineValue: acc.pipelineValue + Number(pm.pipeline_value || 0),
    }),
    { activeDeals: 0, wonDeals: 0, lostDeals: 0, pipelineValue: 0 }
  )
  const crmWinRate = (crmTotals.wonDeals + crmTotals.lostDeals) > 0
    ? (crmTotals.wonDeals / (crmTotals.wonDeals + crmTotals.lostDeals)) * 100 : 0

  const followers = ig?.metrics?.followers || 0
  const totalReach = (ig?.metrics?.totalReach || 0) + (fb?.metrics?.totalReach || 0)
  const engagement = (ig?.metrics?.totalLikes || 0) + (ig?.metrics?.totalComments || 0)
  const leads = fb?.metrics?.totalLeads || 0
  const investment = fb?.metrics?.totalSpend || 0
  const cpl = fb?.metrics?.avgCPL || 0

  const funnelData = [
    { name: 'Impressões', value: fb?.metrics?.totalImpressions || 0, fill: '#2CBBA6' },
    { name: 'Alcance', value: totalReach, fill: '#4A9FE0' },
    { name: 'Cliques', value: fb?.metrics?.totalClicks || 0, fill: '#AFC040' },
    { name: 'Contatos CRM', value: contactCount || 0, fill: '#E8A43C' },
    { name: 'Deals Ativos', value: crmTotals.activeDeals, fill: '#2CBBA6' },
    { name: 'Deals Ganhos', value: crmTotals.wonDeals, fill: '#AFC040' },
  ].filter(d => d.value > 0)
  const maxFunnel = funnelData[0]?.value || 1

  const dailyReach = ig?.dailyReach?.map(d => ({
    date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    alcance: d.value,
  })) || []

  const { data: dealsByChannel } = useQuery({
    queryKey: ['deals_by_channel'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('deals_full').select('canal_origem')
      const channels: Record<string, number> = {}
      for (const d of (data || []) as any[]) {
        const ch = d.canal_origem || 'Não informado'
        channels[ch] = (channels[ch] || 0) + 1
      }
      return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    },
  })

  const painelInsightsData = {
    instagram: ig ? {
      followers: ig.metrics?.followers,
      totalReach: ig.metrics?.totalReach,
      avgEngagement: ig.metrics?.avgEngagement,
      totalPosts: ig.posts?.length,
    } : null,
    facebookAds: fb ? {
      totalSpend: fb.metrics?.totalSpend,
      totalLeads: fb.metrics?.totalLeads,
      avgCPL: fb.metrics?.avgCPL,
      avgCTR: fb.metrics?.avgCTR,
    } : null,
    crm: {
      contacts: contactCount,
      activeDeals: crmTotals.activeDeals,
      wonDeals: crmTotals.wonDeals,
      lostDeals: crmTotals.lostDeals,
      winRate: crmWinRate.toFixed(1),
      pipelineValue: crmTotals.pipelineValue,
    },
    followers, totalReach, engagement, leads, investment, cpl,
  }

  const { data: painelInsights, isLoading: painelInsightsLoading, error: painelInsightsError, refetch: refetchPainelInsights } = useInsights({
    context: 'painel',
    data: painelInsightsData,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Visão Consolidada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard integrado — Instagram, Facebook Ads e CRM Interno
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {ig && <Badge className="bg-[#141A04] text-[#AFC040] border-0">Instagram</Badge>}
            {fb && <Badge className="bg-[#040E1A] text-[#4A9FE0] border-0">Facebook Ads</Badge>}
            <Badge className="bg-[#031411] text-[#2CBBA6] border-0">CRM Interno</Badge>
            {!ig && !fb && <Badge variant="secondary">Aguardando dados externos</Badge>}
          </div>
        </div>
        <div className="text-right space-y-2 shrink-0">
          <Button
            onClick={() => collectMutation.mutate('all')}
            disabled={collectMutation.isPending}
            size="sm"
          >
            {collectMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Coletando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Atualizar Dados</>
            )}
          </Button>
          {snapshot?.collected_at && (
            <p className="text-xs text-muted-foreground">
              Atualizado: {formatDateTime(snapshot.collected_at)}
            </p>
          )}
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KPICard label="Seguidores" value={followers} icon={Users} accentColor="#2CBBA6" />
        <KPICard label="Alcance Total" value={totalReach} icon={Eye} accentColor="#4A9FE0" />
        <KPICard label="Engajamento" value={engagement} icon={Heart} accentColor="#AFC040" />
        <KPICard label="Leads Ads" value={leads} icon={Target} accentColor="#E8A43C" />
        <KPICard label="Investimento" value={formatCurrency(investment)} icon={DollarSign} accentColor="#E8A43C" />
        <KPICard label="CPL Médio" value={formatCurrency(cpl)} icon={TrendingUp} accentColor="#E8684A" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {['overview', 'funnel', 'channels', 'growth', 'roi', 'insights'].map(tab => (
            <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">
              {tab === 'overview' ? 'Visão Geral' : tab === 'funnel' ? 'Funil' : tab === 'channels' ? 'Canais' : tab === 'growth' ? 'Crescimento' : tab === 'roi' ? 'ROI' : 'Insights'}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SourceSummaryCard title="Instagram" icon={Instagram} accentColor="#AFC040" detailLink="/analytics/instagram"
              metrics={[
                { label: 'Seguidores', value: ig?.metrics?.followers || 0 },
                { label: 'Alcance', value: ig?.metrics?.totalReach || 0 },
                { label: 'Engajamento', value: `${ig?.metrics?.avgEngagement || 0}%` },
                { label: 'Posts', value: ig?.posts?.length || 0 },
              ]}
            />
            <SourceSummaryCard title="Facebook Ads" icon={Facebook} accentColor="#4A9FE0" detailLink="/analytics/facebook-ads"
              metrics={[
                { label: 'Investimento', value: formatCurrency(fb?.metrics?.totalSpend || 0) },
                { label: 'Impressões', value: fb?.metrics?.totalImpressions || 0 },
                { label: 'Leads', value: fb?.metrics?.totalLeads || 0 },
                { label: 'CPL', value: formatCurrency(fb?.metrics?.avgCPL || 0) },
              ]}
            />
            <SourceSummaryCard title="CRM Interno" icon={BarChart3} accentColor="#2CBBA6" detailLink="/analytics/crm"
              metrics={[
                { label: 'Contatos', value: contactCount || 0 },
                { label: 'Deals Ativos', value: crmTotals.activeDeals },
                { label: 'Win Rate', value: `${crmWinRate.toFixed(1)}%` },
                { label: 'Pipeline', value: formatCurrency(crmTotals.pipelineValue) },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil Integrado</CardTitle>
              <p className="text-xs text-muted-foreground">Impressões → Cliques → Contatos → Deals</p>
            </CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <div className="space-y-3">
                  {funnelData.map((item, i) => {
                    const prevValue = i > 0 ? funnelData[i - 1].value : item.value
                    const dropRate = prevValue > 0 && i > 0 ? ((1 - item.value / prevValue) * 100).toFixed(1) : null
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.name}</span>
                          <div className="flex items-center gap-3">
                            {dropRate && <span className="text-xs text-muted-foreground">-{dropRate}%</span>}
                            <span className="font-bold font-mono tabular-nums">{item.value.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="h-9 bg-[var(--c-raised)] rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-700 ease-out"
                            style={{
                              width: `${Math.max((item.value / maxFunnel) * 100, 3)}%`,
                              backgroundColor: item.fill,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Clique em "Atualizar Dados" para coletar dados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Deals por Canal de Origem</CardTitle></CardHeader>
              <CardContent>
                {(dealsByChannel || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dealsByChannel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Deals" fill="#2CBBA6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de canais</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Métricas por Produto</CardTitle></CardHeader>
              <CardContent>
                {(productMetrics || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(productMetrics || []).map(pm => ({
                      name: String(pm.product).charAt(0).toUpperCase() + String(pm.product).slice(1),
                      ativos: Number(pm.active_deals),
                      ganhos: Number(pm.won_deals),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 13, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="ativos" name="Deals Ativos" fill="#4A9FE0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ganhos" name="Deals Ganhos" fill="#AFC040" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Alcance Diário (Instagram)</CardTitle></CardHeader>
            <CardContent>
              {dailyReach.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dailyReach}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="alcance" stroke="#2CBBA6" fill="#2CBBA6" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de crescimento</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card style={{ borderTop: '3px solid #4A9FE0' }}>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Facebook Ads</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Investimento</span><span className="font-bold font-mono">{formatCurrency(investment)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Leads</span><span className="font-bold font-mono">{leads}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">CPL</span><span className="font-bold font-mono">{formatCurrency(cpl)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ borderTop: '3px solid #AFC040' }}>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Instagram Orgânico</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Alcance</span><span className="font-bold font-mono">{(ig?.metrics?.totalReach || 0).toLocaleString('pt-BR')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Engajamento</span><span className="font-bold font-mono">{ig?.metrics?.avgEngagement || 0}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo</span><span className="font-bold font-mono" style={{ color: '#AFC040' }}>R$ 0</span></div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ borderTop: '3px solid #2CBBA6' }}>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">CRM Interno</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pipeline</span><span className="font-bold font-mono">{formatCurrency(crmTotals.pipelineValue)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Win Rate</span><span className="font-bold font-mono">{crmWinRate.toFixed(1)}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Deals Ganhos</span><span className="font-bold font-mono">{crmTotals.wonDeals}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsTable
            insights={painelInsights || []}
            isLoading={painelInsightsLoading}
            error={painelInsightsError?.message}
            onRetry={() => refetchPainelInsights()}
            title="Insights Consolidados"
            subtitle="Análise cruzada entre Instagram, Facebook Ads e CRM gerada por IA"
            context="painel"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
