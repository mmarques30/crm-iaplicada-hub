import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { formatCurrency, humanizeCampaignName, mapFbObjective, normalizeChannel } from '@/lib/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, Eye, MousePointer, Target, TrendingUp, BarChart3, Percent, ExternalLink, Users, Filter } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area, AreaChart,
} from 'recharts'

const SEMANTIC_COLORS = ['#AFC040', '#4A9FE0', '#2CBBA6', '#E8A43C', '#E8684A', '#7A8460']
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

export default function FacebookAdsPage() {
  const { data: snapshot } = useDashboardSnapshot()
  const fb = snapshot?.data?.facebook_ads
  const campaigns = fb?.campaigns || []
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE')
  const pausedCampaigns = campaigns.filter(c => c.status !== 'ACTIVE')
  const hasData = campaigns.length > 0

  // FIX Bug #1: Calculate totals from campaign data (single source of truth)
  const totals = useMemo(() => {
    const t = campaigns.reduce((acc, c) => ({
      spend: acc.spend + (c.spend || 0),
      impressions: acc.impressions + (c.impressions || 0),
      reach: acc.reach + (c.reach || 0),
      clicks: acc.clicks + (c.clicks || 0),
      leads: acc.leads + (c.leads || 0),
    }), { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 })
    return {
      ...t,
      ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
      cpl: t.leads > 0 ? t.spend / t.leads : 0,
    }
  }, [campaigns])

  // FIX Bug #2: Use totals.leads (from campaigns) consistently
  // Landing page views estimate (clicks * avg landing rate)
  const landingViews = fb?.metrics?.totalClicks ? Math.round((fb.metrics.totalClicks || 0) * 0.47) : Math.round(totals.clicks * 0.47)

  // Charts data
  const spendByCampaign = campaigns.filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 8)
  const cplByCampaign = campaigns.filter(c => c.spend > 0).map(c => ({ ...c, cplCalc: c.leads > 0 ? c.spend / c.leads : c.spend })).sort((a, b) => a.cplCalc - b.cplCalc).slice(0, 8)

  // FIX Bug #3: Pie chart by objective - group campaigns properly
  const spendByObjective = useMemo(() => {
    const obj: Record<string, number> = {}
    for (const c of campaigns) {
      const label = mapFbObjective(c.objective, c.name)
      obj[label] = (obj[label] || 0) + (c.spend || 0)
    }
    return Object.entries(obj).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  }, [campaigns])

  // CTR by campaign
  const ctrByCampaign = campaigns.filter(c => c.ctr > 0).sort((a, b) => b.ctr - a.ctr).slice(0, 8)

  // Best/worst CPL
  const bestCPL = cplByCampaign[0] || null
  const worstCPL = cplByCampaign.length > 1 ? cplByCampaign[cplByCampaign.length - 1] : null

  // Active campaign % of spend
  const activeSpendPct = totals.spend > 0 ? Math.round(activeCampaigns.reduce((s, c) => s + (c.spend || 0), 0) / totals.spend * 100) : 0

  // Insights data - FIX Bug #8: use consistent calculated values
  const insightsData = hasData ? {
    totalSpend: totals.spend, totalImpressions: totals.impressions, totalReach: totals.reach,
    totalClicks: totals.clicks, totalLeads: totals.leads, avgCPL: totals.cpl, avgCTR: totals.ctr,
    activeCampaigns: activeCampaigns.length, totalCampaigns: campaigns.length,
    activeSpendPct,
    campaigns: campaigns.slice(0, 8).map(c => ({ name: c.name.substring(0, 40), status: c.status, spend: c.spend, leads: c.leads, cpl: c.costPerLead, ctr: c.ctr })),
    bestCPL: bestCPL ? { name: bestCPL.name, cpl: bestCPL.costPerLead } : null,
    worstCPL: worstCPL ? { name: worstCPL.name, cpl: worstCPL.costPerLead } : null,
  } : null

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'facebook_ads', data: insightsData, enabled: hasData })

  // FIX Bug #7: Campaign name formatter with tooltip
  const shortName = (name: string, maxLen = 25) => humanizeCampaignName(name, maxLen)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Facebook Ads</h1>
          <Badge className="bg-[#141A04] text-[#AFC040]">{activeCampaigns.length} Ativa{activeCampaigns.length !== 1 ? 's' : ''}</Badge>
          <Badge variant="secondary">{pausedCampaigns.length} Pausada{pausedCampaigns.length !== 1 ? 's' : ''}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise de campanhas — todas as campanhas consolidadas</p>
      </div>

      {/* FIX Bug #1: KPIs from campaign totals, not API metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Total Investido" value={hasData ? formatCurrency(totals.spend) : '—'} icon={DollarSign} accentColor="#E8A43C" />
        <KPICard label="Impressões" value={hasData ? totals.impressions.toLocaleString('pt-BR') : '—'} icon={Eye} accentColor="#4A9FE0" />
        <KPICard label="Alcance" value={hasData ? totals.reach.toLocaleString('pt-BR') : '—'} icon={BarChart3} accentColor="#4A9FE0" />
        <KPICard label="Total Leads" value={hasData ? totals.leads : '—'} icon={Target} accentColor="#AFC040" sub={`${campaigns.length} campanhas`} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Total Cliques" value={hasData ? totals.clicks.toLocaleString('pt-BR') : '—'} icon={MousePointer} accentColor="#2CBBA6" />
        <KPICard label="CTR Médio" value={hasData ? `${totals.ctr.toFixed(2)}%` : '—'} icon={Percent} accentColor="#2CBBA6" />
        <KPICard label="CPL Médio" value={hasData && totals.cpl > 0 ? formatCurrency(totals.cpl) : '—'} icon={TrendingUp} accentColor="#E8684A" sub={totals.leads > 0 ? `R$${(totals.spend / totals.leads).toFixed(2)}/lead` : ''} />
        <KPICard label="Landing Views" value={hasData ? landingViews.toLocaleString('pt-BR') : '—'} icon={ExternalLink} accentColor="#2CBBA6" sub="~47% dos cliques" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'overview', l: 'Visão Geral' }, { v: 'campaigns', l: 'Campanhas' }, { v: 'evolution', l: 'Evolução' }, { v: 'funnel', l: 'Funil de Vendas' }, { v: 'insights', l: 'Insights' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Visão Geral ─── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FIX Bug #7: Tooltip with full campaign name */}
            <Card>
              <CardHeader><CardTitle className="text-base">Investimento por Campanha</CardTitle></CardHeader>
              <CardContent>
                {spendByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={spendByCampaign.map(c => ({ name: shortName(c.name), fullName: c.name, investimento: c.spend }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 300 }}><p className="text-xs font-medium" style={{ color: '#E8EDD8' }}>{d.fullName}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>Investimento: <strong>{formatCurrency(d.investimento)}</strong></p></div>)
                      }} />
                      <Bar dataKey="investimento" name="Investimento" fill="#E8A43C" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CPL por Campanha</CardTitle>
                {bestCPL && <p className="text-xs text-muted-foreground">Melhor: <strong className="text-[#AFC040]">{formatCurrency(bestCPL.cplCalc)}</strong> · Pior: <strong className="text-[#E8684A]">{formatCurrency(worstCPL?.cplCalc || 0)}</strong></p>}
              </CardHeader>
              <CardContent>
                {cplByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={cplByCampaign.map(c => ({ name: shortName(c.name), fullName: c.name, cpl: c.cplCalc }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 300 }}><p className="text-xs font-medium" style={{ color: '#E8EDD8' }}>{d.fullName}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>CPL: <strong>{formatCurrency(d.cpl)}</strong></p></div>)
                      }} />
                      <Bar dataKey="cpl" name="CPL" radius={[0, 4, 4, 0]}>
                        {cplByCampaign.map((c, i) => (
                          <Cell key={i} fill={c.cplCalc <= totals.cpl ? '#AFC040' : '#E8684A'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
                {/* Melhor / Pior CPL cards */}
                {bestCPL && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 rounded-lg bg-[#031411] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Melhor CPL</p>
                      <p className="text-xl font-bold font-mono" style={{ color: '#AFC040' }}>{formatCurrency(bestCPL.cplCalc)}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{shortName(bestCPL.name, 30)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1A0604] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pior CPL</p>
                      <p className="text-xl font-bold font-mono" style={{ color: '#E8684A' }}>{formatCurrency(worstCPL?.cplCalc || 0)}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{shortName(worstCPL?.name || '', 30)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Investimento por Objetivo</CardTitle></CardHeader>
              <CardContent>
                {spendByObjective.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={spendByObjective} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                        {spendByObjective.map((_, i) => <Cell key={i} fill={SEMANTIC_COLORS[i % SEMANTIC_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">CTR por Campanha (%)</CardTitle></CardHeader>
              <CardContent>
                {ctrByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ctrByCampaign.map(c => ({ name: shortName(c.name, 18), fullName: c.name, ctr: Math.round(c.ctr * 100) / 100 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, ...AXIS_TICK }} interval={0} height={60} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 300 }}><p className="text-xs font-medium" style={{ color: '#E8EDD8' }}>{d.fullName}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>CTR: <strong>{d.ctr}%</strong></p></div>)
                      }} />
                      <Bar dataKey="ctr" name="CTR %" radius={[4, 4, 0, 0]}>
                        {ctrByCampaign.map((_, i) => <Cell key={i} fill={SEMANTIC_COLORS[i % SEMANTIC_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Campanhas ─── */}
        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as Campanhas ({campaigns.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead>Campanha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">Alcance</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">CPL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-[250px]" title={c.name}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEMANTIC_COLORS[campaigns.indexOf(c) % SEMANTIC_COLORS.length] }} />
                            <p className="text-sm truncate">{c.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${c.status === 'ACTIVE' ? 'bg-[#141A04] text-[#AFC040]' : 'bg-muted text-muted-foreground'}`}>
                            {c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(c.spend || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{(c.impressions || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(c.reach || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(c.clicks || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(c.ctr || 0).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono">{c.leads || 0}</TableCell>
                        <TableCell className="text-right font-mono" style={{ color: c.costPerLead > 0 && c.costPerLead <= totals.cpl ? '#AFC040' : c.costPerLead > totals.cpl ? '#E8684A' : '#7A8460' }}>
                          {c.costPerLead > 0 ? formatCurrency(c.costPerLead) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    {campaigns.length > 0 && (
                      <TableRow className="bg-[var(--c-raised)] font-bold">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{campaigns.length} campanhas</Badge></TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: '#E8A43C' }}>{formatCurrency(totals.spend)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.impressions.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.reach.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.clicks.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.ctr.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: '#AFC040' }}>{totals.leads}</TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: '#E8684A' }}>{totals.cpl > 0 ? formatCurrency(totals.cpl) : '—'}</TableCell>
                      </TableRow>
                    )}
                    {campaigns.length === 0 && (<TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Sem dados de campanhas</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Evolução (dados diários reais) ─── */}
        <TabsContent value="evolution" className="space-y-4 mt-4">
          {(() => {
            const dailyInsights = fb?.dailyInsights || []
            if (dailyInsights.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Atualize os dados para ver a evolução diária.</p>
                    <p className="text-xs text-muted-foreground mt-1">Clique em "Atualizar dados" no Painel Geral para coletar dados diários dos últimos 90 dias.</p>
                  </CardContent>
                </Card>
              )
            }

            const fmtDate = (d: string) => {
              const parts = d.split('-')
              return `${parts[2]}/${parts[1]}`
            }

            // Weekly summary
            const weeklyData = (() => {
              const weeks: Record<string, { gasto: number; leads: number }> = {}
              dailyInsights.forEach((d, i) => {
                const weekIdx = Math.floor(i / 7)
                const key = `Sem ${weekIdx + 1}`
                if (!weeks[key]) weeks[key] = { gasto: 0, leads: 0 }
                weeks[key].gasto += d.spend
                weeks[key].leads += d.leads
              })
              return Object.entries(weeks).map(([name, v]) => ({
                name,
                gasto: Math.round(v.gasto * 100) / 100,
                leads: v.leads,
              }))
            })()

            return (
              <>
                {/* Investimento Diário */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Investimento Diário (Últimos 90 dias)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyInsights.map(d => ({ date: fmtDate(d.date), spend: d.spend }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, ...AXIS_TICK }} interval={Math.max(Math.floor(dailyInsights.length / 12), 1)} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Data: ${l}`} />
                        <Area type="monotone" dataKey="spend" name="Investimento" stroke="#E8684A" fill="#E8684A" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Impressões e Cliques */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Impressões e Cliques</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={dailyInsights.map(d => ({ date: fmtDate(d.date), impressoes: d.impressions, cliques: d.clicks }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, ...AXIS_TICK }} interval={Math.max(Math.floor(dailyInsights.length / 8), 1)} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="impressoes" name="Impressões" stroke="#4A9FE0" strokeWidth={2} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="cliques" name="Cliques" stroke="#E8684A" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* CTR Diário */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">CTR Diário (%)</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={dailyInsights.map(d => ({ date: fmtDate(d.date), ctr: Math.round(d.ctr * 100) / 100 }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, ...AXIS_TICK }} interval={Math.max(Math.floor(dailyInsights.length / 8), 1)} axisLine={false} tickLine={false} />
                          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                          <Area type="monotone" dataKey="ctr" name="CTR" stroke="#4A9FE0" fill="#4A9FE0" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumo Semanal */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Resumo Semanal</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                        <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="gasto" name="Gasto (R$)" fill="#E8684A" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="leads" name="Leads" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Eixo esquerdo: gasto (R$) · Eixo direito: leads</p>
                  </CardContent>
                </Card>
              </>
            )
          })()}
        </TabsContent>

        {/* ─── Funil de Vendas ─── */}
        <TabsContent value="funnel" className="space-y-4 mt-4">
          <FunnelTab />
        </TabsContent>

        {/* ─── Insights ─── */}
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights do Facebook Ads" subtitle={`${campaigns.length} campanhas · CPL médio ${totals.cpl > 0 ? formatCurrency(totals.cpl) : '—'} · ${activeSpendPct}% do orçamento na campanha ativa`} context="facebook_ads" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
