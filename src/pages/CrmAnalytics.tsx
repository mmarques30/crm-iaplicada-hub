import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  Users, Target, Trophy, TrendingUp, Briefcase, BarChart3, XCircle, Percent,
  GraduationCap, Eye, Video, FileDown, UserCheck, UserX, Flame, Loader2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { useLeadsAula, useLeadsVisitantes, PRESENCA_QUERY_KEY, VISITANTES_QUERY_KEY } from '@/hooks/useExternalSupabase'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useNavigate } from 'react-router-dom'

const PRODUCT_COLORS: Record<string, string> = { business: '#AFC040', academy: '#4A9FE0' }
const SOURCE_COLORS = ['#2CBBA6', '#4A9FE0', '#AFC040', '#E8A43C', '#E8684A', '#7A8460']
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

const FREQ_COLORS = ['#7A8460', '#4A9FE0', '#E8A43C', '#E8684A', '#AFC040']
const LIFECYCLE_COLORS: Record<string, string> = {
  lead: '#7A8460',
  mql: '#E8A43C',
  sql: '#2CBBA6',
}

const INITIAL_ROWS = 10

export default function CrmAnalytics() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [aulaExpanded, setAulaExpanded] = useState(false)
  const [visitanteExpanded, setVisitanteExpanded] = useState(false)

  const { data: productMetrics } = useQuery({
    queryKey: ['product_metrics'],
    queryFn: async () => { const { data } = await (supabase as any).from('product_metrics').select('*'); return (data || []) as any[] },
  })
  const { data: stageConversion } = useQuery({
    queryKey: ['stage_conversion'],
    queryFn: async () => { const { data } = await (supabase as any).from('stage_conversion').select('*').order('display_order'); return (data || []) as any[] },
  })
  const { data: contactCount } = useQuery({
    queryKey: ['contacts_count'],
    queryFn: async () => { const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true }); return count || 0 },
  })
  const { data: dealsByChannel } = useQuery({
    queryKey: ['deals_by_channel_crm'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('deals_full').select('canal_origem')
      const channels: Record<string, number> = {}
      for (const d of (data || []) as any[]) { const ch = d.canal_origem || 'Não informado'; channels[ch] = (channels[ch] || 0) + 1 }
      return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    },
  })

  // External data
  const leadsAula = useLeadsAula()
  const leadsVisitantes = useLeadsVisitantes()

  const totals = (productMetrics || []).reduce(
    (acc, pm) => ({ activeDeals: acc.activeDeals + Number(pm.active_deals || 0), wonDeals: acc.wonDeals + Number(pm.won_deals || 0), lostDeals: acc.lostDeals + Number(pm.lost_deals || 0), pipelineValue: acc.pipelineValue + Number(pm.pipeline_value || 0), avgDealSize: acc.avgDealSize + Number(pm.avg_deal_size || 0) }),
    { activeDeals: 0, wonDeals: 0, lostDeals: 0, pipelineValue: 0, avgDealSize: 0 }
  )
  const totalClosed = totals.wonDeals + totals.lostDeals
  const winRate = totalClosed > 0 ? (totals.wonDeals / totalClosed) * 100 : 0
  const avgDeal = (productMetrics || []).length > 0 ? totals.avgDealSize / (productMetrics || []).length : 0

  const funnelStages = (stageConversion || []).filter(s => (s.deal_count || 0) > 0)
  const maxStage = funnelStages[0]?.deal_count || 1

  const productPie = (productMetrics || []).map(pm => ({
    name: String(pm.product).charAt(0).toUpperCase() + String(pm.product).slice(1),
    value: Number(pm.active_deals || 0),
    fill: PRODUCT_COLORS[String(pm.product)] || '#7A8460',
  }))

  const insightsData = {
    totalContacts: contactCount || 0, activeDeals: totals.activeDeals, wonDeals: totals.wonDeals, lostDeals: totals.lostDeals, winRate: winRate.toFixed(1), pipelineValue: totals.pipelineValue, avgDealSize: avgDeal,
    funnelStages: funnelStages.map(s => ({ name: s.stage_name, deals: s.deal_count, amount: s.total_amount })),
    productMetrics: (productMetrics || []).map(pm => ({ product: pm.product, active: pm.active_deals, won: pm.won_deals, lost: pm.lost_deals, winRate: pm.win_rate })),
    dealsByChannel: (dealsByChannel || []).slice(0, 6),
    leadsAula: {
      totalParticipantes: leadsAula.totalUnique,
      leadsQuentes: leadsAula.leadsQuentes.length,
      noCrm: leadsAula.inCrmCount,
      semCrm: leadsAula.notInCrmCount,
    },
    leadsVisitantes: {
      totalAcessos: leadsVisitantes.resumo.totalAcessos,
      uniqueUsers: leadsVisitantes.resumo.uniqueUsers,
      noCrm: leadsVisitantes.inCrmCount,
    },
  }

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'crm', data: insightsData, enabled: (contactCount || 0) > 0 || totals.activeDeals > 0 })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Funil de Vendas</h1>
          <Badge className="bg-[#141A04] text-[#AFC040]">{totals.activeDeals} Deals Ativos</Badge>
          <Badge variant="secondary">{contactCount} Contatos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise do pipeline de vendas interno</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Total Contatos" value={contactCount || 0} icon={Users} accentColor="#2CBBA6" />
        <KPICard label="Deals Ativos" value={totals.activeDeals} icon={Briefcase} accentColor="#4A9FE0" />
        <KPICard label="Deals Ganhos" value={totals.wonDeals} icon={Trophy} accentColor="#AFC040" />
        <KPICard label="Deals Perdidos" value={totals.lostDeals} icon={XCircle} accentColor="#E8684A" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Pipeline" value={formatCurrency(totals.pipelineValue)} icon={BarChart3} accentColor="#E8A43C" />
        <KPICard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={Percent} accentColor="#AFC040" />
        <KPICard label="Ticket Médio" value={formatCurrency(avgDeal)} icon={TrendingUp} accentColor="#E8A43C" />
        <KPICard label="Total Fechados" value={totalClosed} icon={Target} accentColor="#2CBBA6" />
      </div>

      <Tabs defaultValue="funnel">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[
            { v: 'funnel', l: 'Funil' },
            { v: 'sources', l: 'Fontes' },
            { v: 'products', l: 'Produtos' },
            { v: 'leads-aula', l: 'Leads Aula' },
            { v: 'leads-visitantes', l: 'Leads Visitantes' },
            { v: 'insights', l: 'Insights' },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Funil ─── */}
        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline por Estágio</CardTitle></CardHeader>
            <CardContent>
              {funnelStages.length > 0 ? (
                <div className="space-y-3">
                  {funnelStages.map(stage => (
                    <div key={stage.stage_name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{stage.stage_name}</span>
                        <div className="flex gap-4">
                          <span className="text-xs text-muted-foreground">{formatCurrency(Number(stage.total_amount || 0))}</span>
                          <span className="font-bold font-mono tabular-nums">{stage.deal_count} deals</span>
                        </div>
                      </div>
                      <div className="h-8 bg-[var(--c-raised)] rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${Math.max((Number(stage.deal_count) / Number(maxStage)) * 100, 3)}%`, background: 'linear-gradient(90deg, #738925, #AFC040)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de pipeline</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Fontes ─── */}
        <TabsContent value="sources" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Deals por Canal de Origem</CardTitle></CardHeader>
            <CardContent>
              {(dealsByChannel || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dealsByChannel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" name="Deals" radius={[0, 4, 4, 0]}>
                      {(dealsByChannel || []).map((_, i) => (<Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de canais</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Produtos ─── */}
        <TabsContent value="products" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Deals por Produto</CardTitle></CardHeader>
              <CardContent>
                {productPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={productPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                        {productPie.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Performance por Produto</CardTitle></CardHeader>
              <CardContent>
                {(productMetrics || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(productMetrics || []).map(pm => ({ name: String(pm.product).charAt(0).toUpperCase() + String(pm.product).slice(1), ganhos: Number(pm.won_deals), perdidos: Number(pm.lost_deals), ativos: Number(pm.active_deals) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 13, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                      <Bar dataKey="ganhos" name="Ganhos" fill="#AFC040" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="perdidos" name="Perdidos" fill="#E8684A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ativos" name="Ativos" fill="#4A9FE0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Leads Aula (Supabase Presença) ─── */}
        <TabsContent value="leads-aula" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { queryClient.invalidateQueries({ queryKey: PRESENCA_QUERY_KEY }); queryClient.invalidateQueries({ queryKey: ['contacts_for_crossing', 'presenca'] }); }}>
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar dados
            </Button>
          </div>
          {leadsAula.isLoading ? (
            <Card>
              <CardContent className="py-12 space-y-3">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando dados de presença...</span>
                </div>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          ) : leadsAula.error ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Erro ao carregar dados de presença</p>
                <p className="text-xs mt-1">{(leadsAula.error as Error).message}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <KPICard label="Total Participantes" value={leadsAula.totalUnique} icon={GraduationCap} accentColor="#4A9FE0" />
                <KPICard label="Leads Quentes (3+)" value={leadsAula.leadsQuentes.length} icon={Flame} accentColor="#E8A43C" />
                <KPICard label="No CRM" value={leadsAula.inCrmCount} icon={UserCheck} accentColor="#2CBBA6" />
                <KPICard label="Sem CRM (cadastrar)" value={leadsAula.notInCrmCount} icon={UserX} accentColor="#E8684A" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Distribuição de Frequência</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={leadsAula.freqDist}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="count" name="Participantes" radius={[4, 4, 0, 0]}>
                          {leadsAula.freqDist.map((_, i) => (
                            <Cell key={i} fill={FREQ_COLORS[i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Qualificação dos Leads Quentes</CardTitle></CardHeader>
                  <CardContent>
                    {Object.keys(leadsAula.lifecycleDist).length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={Object.entries(leadsAula.lifecycleDist).map(([name, value]) => ({
                              name: name.toUpperCase(),
                              value,
                              fill: LIFECYCLE_COLORS[name] || '#7A8460',
                            }))}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label
                          >
                            {Object.entries(leadsAula.lifecycleDist).map(([name], i) => (
                              <Cell key={i} fill={LIFECYCLE_COLORS[name] || '#7A8460'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Sem dados de qualificação</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Leads Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leads Quentes — {leadsAula.leadsQuentes.length} participantes com 3+ aulas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-[var(--c-border)] rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[var(--c-raised)]">
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="text-center">Aulas</TableHead>
                          <TableHead>Frequência</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>CRM</TableHead>
                          <TableHead>Qualificação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsAula.leadsQuentes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Nenhum lead com 3+ aulas encontrado
                            </TableCell>
                          </TableRow>
                         ) : (
                          (aulaExpanded ? leadsAula.leadsQuentes : leadsAula.leadsQuentes.slice(0, INITIAL_ROWS)).map((lead) => (
                            <TableRow
                              key={lead.email}
                              className={lead.contactId ? 'cursor-pointer hover:bg-[var(--c-raised)]' : ''}
                              onClick={() => lead.contactId && navigate(`/contacts/${lead.contactId}`)}
                            >
                              <TableCell className="font-medium whitespace-nowrap">{lead.name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{lead.email}</TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">{lead.phone || '—'}</TableCell>
                              <TableCell className="text-center font-mono font-bold">{lead.totalAulas}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`text-[10px] ${
                                  lead.totalAulas >= 10 ? 'bg-[#1A0604] text-[#E8684A]' :
                                  lead.totalAulas >= 5 ? 'bg-[#1A0E04] text-[#E8A43C]' :
                                  'bg-[#141A04] text-[#AFC040]'
                                }`}>
                                  {lead.frequenciaLabel}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono font-bold">{lead.score}</TableCell>
                              <TableCell>
                                {lead.inCrm ? (
                                  <Badge className="text-[10px] bg-[#031411] text-[#2CBBA6]">No CRM</Badge>
                                ) : (
                                  <Badge className="text-[10px] bg-[#1A0604] text-[#E8684A]">Falta cadastro</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {lead.lifecycleStage ? (
                                  <Badge className="text-[10px]" style={{
                                    backgroundColor: `${LIFECYCLE_COLORS[lead.lifecycleStage] || '#7A8460'}22`,
                                    color: LIFECYCLE_COLORS[lead.lifecycleStage] || '#7A8460',
                                  }}>
                                    {lead.lifecycleStage.toUpperCase()}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {leadsAula.leadsQuentes.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        Mostrando {aulaPage * PAGE_SIZE + 1}–{Math.min((aulaPage + 1) * PAGE_SIZE, leadsAula.leadsQuentes.length)} de {leadsAula.leadsQuentes.length}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={aulaPage === 0} onClick={() => setAulaPage(p => p - 1)}>
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button variant="outline" size="sm" disabled={(aulaPage + 1) * PAGE_SIZE >= leadsAula.leadsQuentes.length} onClick={() => setAulaPage(p => p + 1)}>
                          Próximo <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Leads Visitantes (Supabase Visitantes) ─── */}
        <TabsContent value="leads-visitantes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { queryClient.invalidateQueries({ queryKey: VISITANTES_QUERY_KEY }); queryClient.invalidateQueries({ queryKey: ['contacts_for_crossing', 'visitantes'] }); setVisitantePage(0); }}>
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar dados
            </Button>
          </div>
          {leadsVisitantes.isLoading ? (
            <Card>
              <CardContent className="py-12 space-y-3">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando dados de visitantes...</span>
                </div>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          ) : leadsVisitantes.error ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Erro ao carregar dados de visitantes</p>
                <p className="text-xs mt-1">{(leadsVisitantes.error as Error).message}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <KPICard label="Total Acessos" value={leadsVisitantes.resumo.totalAcessos} icon={Eye} accentColor="#4A9FE0" />
                <KPICard label="Visitantes Únicos" value={leadsVisitantes.resumo.uniqueUsers} icon={Users} accentColor="#AFC040" />
                <KPICard label="Últimos 7 Dias" value={leadsVisitantes.resumo.accessesLast7Days} icon={TrendingUp} accentColor="#2CBBA6" />
                <KPICard label="Também no CRM" value={leadsVisitantes.inCrmCount} icon={UserCheck} accentColor="#E8A43C" />
              </div>

              {/* Top Conteúdos */}
              <Card>
                <CardHeader><CardTitle className="text-base">Top Conteúdos Mais Acessados</CardTitle></CardHeader>
                <CardContent>
                  {leadsVisitantes.topConteudos.length > 0 ? (
                    <div className="border border-[var(--c-border)] rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[var(--c-raised)]">
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Acessos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leadsVisitantes.topConteudos.slice(0, 10).map((tc, i) => (
                            <TableRow key={tc.id || i}>
                              <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-medium">{tc.title}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  {tc.type === 'video' ? <Video className="h-3 w-3" /> : <FileDown className="h-3 w-3" />}
                                  {tc.type === 'video' ? 'Vídeo' : 'Material'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">{tc.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Sem dados de conteúdo</p>
                  )}
                </CardContent>
              </Card>

              {/* Leads Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leads por Engajamento — {leadsVisitantes.leads.length} visitantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-[var(--c-border)] rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[var(--c-raised)]">
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">
                            <div className="flex items-center justify-center gap-1"><Video className="h-3 w-3" /> Vídeos</div>
                          </TableHead>
                          <TableHead className="text-center">
                            <div className="flex items-center justify-center gap-1"><FileDown className="h-3 w-3" /> Materiais</div>
                          </TableHead>
                          <TableHead className="text-center">Acessos</TableHead>
                          <TableHead>Último Acesso</TableHead>
                          <TableHead>CRM</TableHead>
                          <TableHead>Qualificação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsVisitantes.leads.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              Nenhum visitante com engajamento encontrado
                            </TableCell>
                          </TableRow>
                         ) : (
                          leadsVisitantes.leads.slice(visitantePage * PAGE_SIZE, (visitantePage + 1) * PAGE_SIZE).map((lead) => (
                            <TableRow
                              key={lead.email}
                              className={lead.contactId ? 'cursor-pointer hover:bg-[var(--c-raised)]' : ''}
                              onClick={() => lead.contactId && navigate(`/contacts/${lead.contactId}`)}
                            >
                              <TableCell className="font-medium whitespace-nowrap">{lead.name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{lead.email}</TableCell>
                              <TableCell className="text-center">
                                <span className={`font-mono font-bold`} style={{
                                  color: lead.score >= 70 ? '#2CBBA6' : lead.score >= 40 ? '#E8A43C' : '#7A8460'
                                }}>
                                  {lead.score}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-mono">{lead.videoCount}</TableCell>
                              <TableCell className="text-center font-mono">{lead.materialCount}</TableCell>
                              <TableCell className="text-center font-mono">{lead.totalAccesses}</TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                {lead.lastAccess ? formatDate(lead.lastAccess) : '—'}
                              </TableCell>
                              <TableCell>
                                {lead.inCrm ? (
                                  <Badge className="text-[10px] bg-[#031411] text-[#2CBBA6]">No CRM</Badge>
                                ) : (
                                  <Badge className="text-[10px] bg-[#1A0604] text-[#E8684A]">Falta</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {lead.lifecycleStage ? (
                                  <Badge className="text-[10px]" style={{
                                    backgroundColor: `${LIFECYCLE_COLORS[lead.lifecycleStage] || '#7A8460'}22`,
                                    color: LIFECYCLE_COLORS[lead.lifecycleStage] || '#7A8460',
                                  }}>
                                    {lead.lifecycleStage.toUpperCase()}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {leadsVisitantes.leads.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        Mostrando {visitantePage * PAGE_SIZE + 1}–{Math.min((visitantePage + 1) * PAGE_SIZE, leadsVisitantes.leads.length)} de {leadsVisitantes.leads.length}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={visitantePage === 0} onClick={() => setVisitantePage(p => p - 1)}>
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button variant="outline" size="sm" disabled={(visitantePage + 1) * PAGE_SIZE >= leadsVisitantes.leads.length} onClick={() => setVisitantePage(p => p + 1)}>
                          Próximo <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Insights ─── */}
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights do CRM" subtitle="Análise do funil de vendas, leads de aula e visitantes gerada por IA" context="crm" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
