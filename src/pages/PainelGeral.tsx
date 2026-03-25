import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { SourceSummaryCard } from '@/components/dashboard/SourceSummaryCard'
import { useDashboardSnapshot, useCollectDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  Users, Eye, Heart, Target, DollarSign, TrendingUp, RefreshCw, Loader2,
  Instagram, Facebook, BarChart3, GraduationCap, BookOpen, AlertTriangle,
} from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useLeadsAula, useLeadsVisitantes } from '@/hooks/useExternalSupabase'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'
const CHANNEL_COLORS = ['#AFC040', '#4A9FE0', '#2CBBA6', '#E8A43C', '#E8684A', '#7A8460']

export default function PainelGeral() {
  const { data: snapshot } = useDashboardSnapshot()
  const collectMutation = useCollectDashboardData()

  const ig = snapshot?.data?.instagram
  const fb = snapshot?.data?.facebook_ads
  const hs = snapshot?.data?.hubspot

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

  // Contacts by source for channels tab
  const { data: contactsBySource } = useQuery({
    queryKey: ['contacts_by_source'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('utm_source, fonte_registro, lifecycle_stage, hubspot_id, first_conversion, instagram_opt_in, whatsapp_opt_in, manychat_id')
      return (data || []) as any[]
    },
  })

  const { data: dealsByChannel } = useQuery({
    queryKey: ['deals_by_channel'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('deals_full').select('canal_origem')
      const channels: Record<string, number> = {}
      for (const d of (data || []) as any[]) {
        const ch = d.canal_origem || 'Não rastreado'
        channels[ch] = (channels[ch] || 0) + 1
      }
      return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    },
  })

  const leadsAula = useLeadsAula()
  const leadsVisitantes = useLeadsVisitantes()

  // ─── Computed metrics ───
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
  const investment = fb?.metrics?.totalSpend || 0
  const totalContacts = contactCount || 0

  // FIX Bug #1: CPL calculation - use real spend / real leads from CRM, not API field
  const fbLeads = fb?.metrics?.totalLeads || 0
  const cplReal = useMemo(() => {
    if (investment > 0 && totalContacts > 0) {
      // CPL ponderado = investimento total / contatos com origem ads
      const adsContacts = (contactsBySource || []).filter((c: any) =>
        c.utm_source === 'paid' || c.utm_source === 'facebook' || c.utm_source === 'meta' ||
        c.fonte_registro === 'PAID_SOCIAL' || c.fonte_registro === 'PAID_SEARCH'
      ).length
      if (adsContacts > 0) return investment / adsContacts
      // Fallback: use FB leads count
      if (fbLeads > 0) return investment / fbLeads
    }
    return fb?.metrics?.avgCPL || 0
  }, [investment, totalContacts, contactsBySource, fbLeads, fb])

  // FIX Bug #3: Channel distribution with "Não rastreado"
  const channelDistribution = useMemo(() => {
    const channels: Record<string, { contatos: number; leads: number; opportunities: number; customers: number }> = {}
    for (const c of contactsBySource || []) {
      let ch = 'Não rastreado'
      if (c.utm_source === 'instagram' || c.fonte_registro === 'SOCIAL_MEDIA' || c.instagram_opt_in) ch = 'Instagram Orgânico'
      else if (c.utm_source === 'paid' || c.utm_source === 'facebook' || c.fonte_registro === 'PAID_SOCIAL') ch = 'Facebook Ads'
      else if (c.utm_source === 'direct' || c.fonte_registro === 'DIRECT_TRAFFIC') ch = 'Tráfego Direto'
      else if (c.whatsapp_opt_in || c.manychat_id) ch = 'WhatsApp'
      else if (c.first_conversion || c.hubspot_id) ch = 'Formulário / Orgânico'
      else if (c.fonte_registro === 'OFFLINE') ch = 'Offline'

      if (!channels[ch]) channels[ch] = { contatos: 0, leads: 0, opportunities: 0, customers: 0 }
      channels[ch].contatos++
      const ls = (c.lifecycle_stage || '').toLowerCase()
      if (ls === 'lead' || ls === 'subscriber' || ls === 'marketingqualifiedlead' || ls === 'salesqualifiedlead') channels[ch].leads++
      if (ls === 'opportunity') channels[ch].opportunities++
      if (ls === 'customer') channels[ch].customers++
    }
    return Object.entries(channels)
      .map(([name, data]) => ({ name, ...data, convRate: data.contatos > 0 ? Math.round((data.opportunities / data.contatos) * 1000) / 10 : 0 }))
      .sort((a, b) => b.contatos - a.contatos)
  }, [contactsBySource])

  // FIX Bug #2: Funnel with proper conversion rates (not drop rates for items that grow)
  const funnelSteps = useMemo(() => {
    const impressions = fb?.metrics?.totalImpressions || 0
    const clicks = fb?.metrics?.totalClicks || 0
    const steps = [
      { name: 'Impressões (Ads)', value: impressions, fill: '#4A9FE0' },
      { name: 'Cliques (Ads)', value: clicks, fill: '#2CBBA6' },
      { name: 'Contatos CRM', value: totalContacts, fill: '#AFC040', isMultiSource: true },
      { name: 'Deals Ativos', value: crmTotals.activeDeals, fill: '#E8A43C' },
      { name: 'Deals Ganhos', value: crmTotals.wonDeals, fill: '#AFC040' },
    ].filter(d => d.value > 0)
    return steps
  }, [fb, totalContacts, crmTotals])
  const maxFunnel = funnelSteps[0]?.value || 1

  // ROI per channel
  const roiData = useMemo(() => {
    const igContacts = channelDistribution.find(c => c.name === 'Instagram Orgânico')
    const fbContacts = channelDistribution.find(c => c.name === 'Facebook Ads')
    return {
      instagram: { contatos: igContacts?.contatos || 0, opportunities: igContacts?.opportunities || 0, custo: 0, cpl: 0 },
      facebookAds: { contatos: fbContacts?.contatos || 0, opportunities: fbContacts?.opportunities || 0, custo: investment, cpl: fbContacts && fbContacts.contatos > 0 ? investment / fbContacts.contatos : 0 },
    }
  }, [channelDistribution, investment])

  const dailyReach = ig?.dailyReach?.map(d => ({
    date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    alcance: d.value,
  })) || []

  // Insights data
  const painelInsightsData = {
    instagram: ig ? { followers: ig.metrics?.followers, totalReach: ig.metrics?.totalReach, avgEngagement: ig.metrics?.avgEngagement, totalPosts: ig.posts?.length } : null,
    facebookAds: fb ? { totalSpend: fb.metrics?.totalSpend, totalLeads: fbLeads, avgCPL: cplReal, avgCTR: fb.metrics?.avgCTR } : null,
    crm: { contacts: totalContacts, activeDeals: crmTotals.activeDeals, wonDeals: crmTotals.wonDeals, lostDeals: crmTotals.lostDeals, winRate: crmWinRate.toFixed(1), pipelineValue: crmTotals.pipelineValue },
    channelDistribution: channelDistribution.slice(0, 5),
    followers, totalReach, engagement, leads: fbLeads, investment, cpl: cplReal,
    presenca: { totalParticipantes: leadsAula.totalUnique, leadsQuentes: leadsAula.leadsQuentes.length, noCrm: leadsAula.inCrmCount, semCrm: leadsAula.notInCrmCount },
    visitantes: { totalAcessos: leadsVisitantes.resumo.totalAcessos, uniqueUsers: leadsVisitantes.resumo.uniqueUsers, noCrm: leadsVisitantes.inCrmCount },
  }

  const { data: painelInsights, isLoading: painelInsightsLoading, error: painelInsightsError, refetch: refetchPainelInsights } = useInsights({
    context: 'painel', data: painelInsightsData,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Visão Consolidada</h1>
          <p className="text-sm text-muted-foreground mt-1">Dashboard integrado — Instagram, Facebook Ads e CRM</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {ig && <Badge className="bg-[#141A04] text-[#AFC040] border-0">Instagram</Badge>}
            {fb && <Badge className="bg-[#040E1A] text-[#4A9FE0] border-0">Facebook Ads</Badge>}
            <Badge className="bg-[#031411] text-[#2CBBA6] border-0">CRM Interno</Badge>
            {leadsAula.totalUnique > 0 && <Badge className="bg-[#1A0E04] text-[#E8A43C] border-0">Presença Aulas</Badge>}
            {leadsVisitantes.resumo.uniqueUsers > 0 && <Badge className="bg-[#0E041A] text-[#8b5cf6] border-0">Visitantes</Badge>}
            {!ig && !fb && <Badge variant="secondary">Aguardando dados externos</Badge>}
          </div>
        </div>
        <div className="text-right space-y-2 shrink-0">
          <Button onClick={() => collectMutation.mutate('all')} disabled={collectMutation.isPending} size="sm">
            {collectMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Coletando...</> : <><RefreshCw className="h-4 w-4 mr-2" />Atualizar Dados</>}
          </Button>
          {snapshot?.collected_at && <p className="text-xs text-muted-foreground">Atualizado: {formatDateTime(snapshot.collected_at)}</p>}
        </div>
      </div>

      {/* 6 KPI Cards - FIX Bug #1: CPL uses real calculation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KPICard label="Seguidores" value={followers} icon={Users} accentColor="#2CBBA6" />
        <KPICard label="Alcance Total" value={totalReach} icon={Eye} accentColor="#4A9FE0" sub="IG + FB Ads (28 dias)" />
        <KPICard label="Engajamento" value={engagement} icon={Heart} accentColor="#AFC040" />
        <KPICard label="Contatos CRM" value={totalContacts} icon={Target} accentColor="#E8A43C" />
        <KPICard label="Investimento" value={formatCurrency(investment)} icon={DollarSign} accentColor="#E8A43C" />
        <KPICard label="CPL Médio" value={cplReal > 0 ? formatCurrency(cplReal) : '—'} icon={TrendingUp} accentColor="#E8684A" sub={cplReal > 0 ? `${roiData.facebookAds.contatos} contatos via Ads` : 'Sem dados de Ads'} />
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

        {/* ─── Visão Geral ─── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SourceSummaryCard title="Instagram" icon={Instagram} accentColor="#AFC040" detailLink="/analytics/instagram" metrics={[
              { label: 'Seguidores', value: ig?.metrics?.followers || 0 },
              { label: 'Alcance', value: ig?.metrics?.totalReach || 0 },
              { label: 'Engajamento', value: `${ig?.metrics?.avgEngagement || 0}%` },
              { label: 'Posts', value: ig?.posts?.length || 0 },
            ]} />
            <SourceSummaryCard title="Facebook Ads" icon={Facebook} accentColor="#4A9FE0" detailLink="/analytics/facebook-ads" metrics={[
              { label: 'Investimento', value: formatCurrency(investment) },
              { label: 'Impressões', value: fb?.metrics?.totalImpressions || 0 },
              { label: 'Cliques', value: fb?.metrics?.totalClicks || 0 },
              { label: 'CPL', value: cplReal > 0 ? formatCurrency(cplReal) : '—' },
            ]} />
            <SourceSummaryCard title="CRM Interno" icon={BarChart3} accentColor="#2CBBA6" detailLink="/analytics/crm" metrics={[
              { label: 'Contatos', value: totalContacts },
              { label: 'Deals Ativos', value: crmTotals.activeDeals },
              { label: 'Win Rate', value: `${crmWinRate.toFixed(1)}%` },
              { label: 'Pipeline', value: formatCurrency(crmTotals.pipelineValue) },
            ]} />
            <SourceSummaryCard title="Presença Aulas" icon={GraduationCap} accentColor="#E8A43C" detailLink="/analytics/crm" metrics={[
              { label: 'Participantes', value: leadsAula.totalUnique },
              { label: 'Leads Quentes', value: leadsAula.leadsQuentes.length },
              { label: 'No CRM', value: leadsAula.inCrmCount },
              { label: 'Sem CRM', value: leadsAula.notInCrmCount },
            ]} />
            <SourceSummaryCard title="Visitantes" icon={BookOpen} accentColor="#E8684A" detailLink="/analytics/crm" metrics={[
              { label: 'Total Acessos', value: leadsVisitantes.resumo.totalAcessos },
              { label: 'Únicos', value: leadsVisitantes.resumo.uniqueUsers },
              { label: 'Últimos 7d', value: leadsVisitantes.resumo.accessesLast7Days },
              { label: 'No CRM', value: leadsVisitantes.inCrmCount },
            ]} />
          </div>
        </TabsContent>

        {/* ─── Funil - FIX Bug #2: proper conversion rates ─── */}
        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil Integrado</CardTitle>
              <p className="text-xs text-muted-foreground">Ads → Cliques → CRM → Deals → Ganhos</p>
            </CardHeader>
            <CardContent>
              {funnelSteps.length > 0 ? (
                <div className="space-y-3">
                  {funnelSteps.map((item, i) => {
                    const prevValue = i > 0 ? funnelSteps[i - 1].value : item.value
                    // FIX Bug #2: Only show conversion rate if current < previous (actual funnel drop)
                    // If current > previous (multi-source), show "+X" or skip
                    let convLabel: string | null = null
                    if (i > 0) {
                      if (item.value <= prevValue) {
                        const rate = ((item.value / prevValue) * 100).toFixed(1)
                        convLabel = `${rate}% conv.`
                      } else if ((item as any).isMultiSource) {
                        convLabel = 'multi-fonte'
                      }
                    }
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {(item as any).isMultiSource && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">multi-fonte</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {convLabel && !((item as any).isMultiSource) && (
                              <span className="text-xs text-muted-foreground">{convLabel}</span>
                            )}
                            <span className="font-bold font-mono tabular-nums">{item.value.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="h-9 bg-[var(--c-raised)] rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg transition-all duration-700 ease-out" style={{
                            width: `${Math.max((item.value / maxFunnel) * 100, 3)}%`,
                            backgroundColor: item.fill,
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Clique em "Atualizar Dados" para coletar dados</p>}

              {/* Conversion badges between steps */}
              {funnelSteps.length > 1 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {funnelSteps.slice(1).map((step, i) => {
                    const prev = funnelSteps[i]
                    if ((step as any).isMultiSource || step.value > prev.value) return null
                    const rate = (step.value / prev.value) * 100
                    const rateColor = rate > 50 ? '#AFC040' : rate > 10 ? '#E8A43C' : '#E8684A'
                    const shortPrev = prev.name.split(' ')[0]
                    const shortCurr = step.name.split(' ')[0]
                    return (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--c-raised)] text-xs">
                        <span className="text-muted-foreground uppercase tracking-wide">{shortPrev} → {shortCurr}</span>
                        <span className="font-mono font-bold" style={{ color: rateColor }}>{rate.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary metrics */}
              {funnelSteps.length > 2 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fb?.metrics?.totalClicks && fb?.metrics?.totalImpressions ? (
                    <div className="p-3 rounded-lg bg-[var(--c-raised)] text-center">
                      <p className="text-xs text-muted-foreground">CTR (Ads)</p>
                      <p className="text-lg font-bold font-mono" style={{ color: '#4A9FE0' }}>
                        {((fb.metrics.totalClicks / fb.metrics.totalImpressions) * 100).toFixed(1)}%
                      </p>
                    </div>
                  ) : null}
                  <div className="p-3 rounded-lg bg-[var(--c-raised)] text-center">
                    <p className="text-xs text-muted-foreground">Deal Rate</p>
                    <p className="text-lg font-bold font-mono" style={{ color: '#E8A43C' }}>
                      {totalContacts > 0 ? ((crmTotals.activeDeals + crmTotals.wonDeals) / totalContacts * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--c-raised)] text-center">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-bold font-mono" style={{ color: '#AFC040' }}>{crmWinRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--c-raised)] text-center">
                    <p className="text-xs text-muted-foreground">CPL Real</p>
                    <p className="text-lg font-bold font-mono" style={{ color: '#E8684A' }}>{cplReal > 0 ? formatCurrency(cplReal) : '—'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Canais - FIX Bug #3: include "Não rastreado" ─── */}
        <TabsContent value="channels" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contatos por Canal de Origem</CardTitle>
              <p className="text-xs text-muted-foreground">{totalContacts} contatos totais — distribuição por fonte de aquisição</p>
            </CardHeader>
            <CardContent>
              {channelDistribution.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[var(--c-raised)]">
                        <TableHead>Canal</TableHead>
                        <TableHead className="text-right">Contatos</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Opportunities</TableHead>
                        <TableHead className="text-right">Customers</TableHead>
                        <TableHead className="text-right">Conv. Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channelDistribution.map((ch, i) => (
                        <TableRow key={ch.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                              {ch.name}
                              {ch.name === 'Não rastreado' && <AlertTriangle className="h-3 w-3 text-[#E8A43C]" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{ch.contatos}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{totalContacts > 0 ? ((ch.contatos / totalContacts) * 100).toFixed(1) : 0}%</TableCell>
                          <TableCell className="text-right font-mono">{ch.leads}</TableCell>
                          <TableCell className="text-right font-mono">{ch.opportunities}</TableCell>
                          <TableCell className="text-right font-mono">{ch.customers}</TableCell>
                          <TableCell className="text-right font-mono" style={{ color: ch.convRate > 10 ? '#AFC040' : ch.convRate > 5 ? '#E8A43C' : '#7A8460' }}>
                            {ch.convRate}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de canais</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição de Contatos</CardTitle></CardHeader>
              <CardContent>
                {channelDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {channelDistribution.map((ch, i) => {
                      const pct = totalContacts > 0 ? (ch.contatos / totalContacts) * 100 : 0
                      return (
                        <div key={ch.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                              <span className="font-medium truncate">{ch.name}</span>
                            </div>
                            <span className="font-mono font-bold tabular-nums shrink-0 ml-2">{ch.contatos}</span>
                          </div>
                          <div className="h-6 bg-[var(--c-raised)] rounded-md overflow-hidden relative">
                            <div
                              className="h-full rounded-md transition-all duration-700 ease-out"
                              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length], opacity: 0.85 }}
                            />
                            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono font-semibold text-foreground">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 border-t border-[var(--c-border)] flex justify-between text-xs text-muted-foreground">
                      <span>Total</span>
                      <span className="font-mono font-bold text-foreground">{totalContacts}</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Deals por Canal</CardTitle></CardHeader>
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
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Crescimento ─── */}
        <TabsContent value="growth" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alcance Diário (IG)</CardTitle>
                <p className="text-xs text-muted-foreground">Últimos 28 dias</p>
              </CardHeader>
              <CardContent>
                {dailyReach.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyReach}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="alcance" stroke="#2CBBA6" fill="#2CBBA6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seguidores IG</CardTitle>
                <p className="text-xs text-muted-foreground">Evolução diária</p>
              </CardHeader>
              <CardContent>
                {(ig?.dailyFollowers || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={(ig?.dailyFollowers || []).map(d => ({
                      date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                      seguidores: d.value,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="seguidores" stroke="#AFC040" fill="#AFC040" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investimento por Campanha</CardTitle>
                <p className="text-xs text-muted-foreground">Facebook / Meta Ads</p>
              </CardHeader>
              <CardContent>
                {(fb?.campaigns || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={(fb?.campaigns || []).filter(c => c.spend > 0).map(c => ({
                      name: c.name.length > 25 ? c.name.substring(0, 25) + '…' : c.name,
                      investimento: c.spend,
                      leads: c.leads || 0,
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="investimento" name="Investimento" fill="#4A9FE0" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de campanhas</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engajamento IG por Post</CardTitle>
                <p className="text-xs text-muted-foreground">Likes + Comentários (últimos posts)</p>
              </CardHeader>
              <CardContent>
                {(ig?.posts || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={(ig?.posts || []).slice(0, 12).reverse().map(p => ({
                      date: new Date(p.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                      likes: p.like_count,
                      comments: p.comments_count,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="likes" name="Likes" fill="#AFC040" radius={[4, 4, 0, 0]} stackId="eng" />
                      <Bar dataKey="comments" name="Comentários" fill="#4A9FE0" radius={[4, 4, 0, 0]} stackId="eng" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de posts</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── ROI - FIX Bug #5: no duplicate investment ─── */}
        <TabsContent value="roi" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card style={{ borderTop: '3px solid #AFC040' }}>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Instagram Orgânico</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contatos</span><span className="font-bold font-mono">{roiData.instagram.contatos}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Opportunities</span><span className="font-bold font-mono">{roiData.instagram.opportunities}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Alcance</span><span className="font-bold font-mono">{(ig?.metrics?.totalReach || 0).toLocaleString('pt-BR')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo</span><span className="font-bold font-mono" style={{ color: '#AFC040' }}>R$ 0 (Grátis)</span></div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ borderTop: '3px solid #4A9FE0' }}>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Facebook / Meta Ads</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Investimento</span><span className="font-bold font-mono">{formatCurrency(investment)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contatos (Ads)</span><span className="font-bold font-mono">{roiData.facebookAds.contatos}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">CPL</span><span className="font-bold font-mono">{roiData.facebookAds.cpl > 0 ? formatCurrency(roiData.facebookAds.cpl) : '—'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Opportunities</span><span className="font-bold font-mono">{roiData.facebookAds.opportunities}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ borderTop: '3px solid #2CBBA6' }}>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">CRM — Pipeline</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pipeline</span><span className="font-bold font-mono">{formatCurrency(crmTotals.pipelineValue)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Win Rate</span><span className="font-bold font-mono">{crmWinRate.toFixed(1)}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Deals Ganhos</span><span className="font-bold font-mono">{crmTotals.wonDeals}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Deals Perdidos</span><span className="font-bold font-mono text-[#E8684A]">{crmTotals.lostDeals}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Insights ─── */}
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={painelInsights || []} isLoading={painelInsightsLoading} error={painelInsightsError?.message} onRetry={() => refetchPainelInsights()} title="Insights Consolidados" subtitle="Análise cruzada entre Instagram, Facebook Ads, CRM, Presença e Visitantes" context="painel" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
