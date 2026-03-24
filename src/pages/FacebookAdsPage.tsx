import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/format'
import { DollarSign, Eye, MousePointer, Target, TrendingUp, BarChart3, Percent, ExternalLink } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const SEMANTIC_COLORS = ['#2CBBA6', '#4A9FE0', '#AFC040', '#E8A43C', '#E8684A', '#7A8460']
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

export default function FacebookAdsPage() {
  const { data: snapshot } = useDashboardSnapshot()
  const fb = snapshot?.data?.facebook_ads
  const campaigns = fb?.campaigns || []
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE')

  const insightsData = fb ? {
    totalSpend: fb.metrics?.totalSpend, totalImpressions: fb.metrics?.totalImpressions, totalReach: fb.metrics?.totalReach, totalClicks: fb.metrics?.totalClicks, totalLeads: fb.metrics?.totalLeads, avgCPL: fb.metrics?.avgCPL, avgCTR: fb.metrics?.avgCTR,
    activeCampaigns: activeCampaigns.length, totalCampaigns: campaigns.length,
    campaigns: campaigns.slice(0, 8).map(c => ({ name: c.name.substring(0, 40), status: c.status, spend: c.spend, leads: c.leads, cpl: c.costPerLead, ctr: c.ctr })),
  } : null

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'facebook_ads', data: insightsData, enabled: !!fb })

  const spendByCampaign = campaigns.filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 8).map(c => ({ name: c.name.length > 30 ? c.name.substring(0, 30) + '...' : c.name, investimento: c.spend }))
  const cplByCampaign = campaigns.filter(c => c.costPerLead > 0).sort((a, b) => a.costPerLead - b.costPerLead).slice(0, 8).map(c => ({ name: c.name.length > 30 ? c.name.substring(0, 30) + '...' : c.name, cpl: c.costPerLead }))
  const spendData = campaigns.filter(c => c.spend > 0).map(c => ({ name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name, value: c.spend }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Facebook Ads</h1>
          <Badge className="bg-[#141A04] text-[#AFC040]">{activeCampaigns.length} Ativas</Badge>
          <Badge variant="secondary">{campaigns.length - activeCampaigns.length} Pausadas</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise de campanhas — últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Investimento" value={formatCurrency(fb?.metrics?.totalSpend || 0)} icon={DollarSign} accentColor="#E8A43C" />
        <KPICard label="Impressões" value={fb?.metrics?.totalImpressions || 0} icon={Eye} accentColor="#4A9FE0" />
        <KPICard label="Alcance" value={fb?.metrics?.totalReach || 0} icon={BarChart3} accentColor="#4A9FE0" />
        <KPICard label="Total Leads" value={fb?.metrics?.totalLeads || 0} icon={Target} accentColor="#AFC040" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Cliques" value={fb?.metrics?.totalClicks || 0} icon={MousePointer} accentColor="#2CBBA6" />
        <KPICard label="CTR Médio" value={`${(fb?.metrics?.avgCTR || 0).toFixed(2)}%`} icon={Percent} accentColor="#2CBBA6" />
        <KPICard label="CPL Médio" value={formatCurrency(fb?.metrics?.avgCPL || 0)} icon={TrendingUp} accentColor="#E8684A" />
        <KPICard label="Campanhas" value={campaigns.length} icon={ExternalLink} accentColor="#2CBBA6" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'overview', l: 'Visão Geral' }, { v: 'campaigns', l: 'Campanhas' }, { v: 'insights', l: 'Insights' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Investimento por Campanha</CardTitle></CardHeader>
              <CardContent>
                {spendByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={spendByCampaign} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="investimento" name="Investimento" fill="#E8A43C" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">CPL por Campanha</CardTitle></CardHeader>
              <CardContent>
                {cplByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={cplByCampaign} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="cpl" name="CPL" fill="#AFC040" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição de Gastos</CardTitle></CardHeader>
            <CardContent>
              {spendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={spendData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label>
                      {spendData.map((_, i) => (<Cell key={i} fill={SEMANTIC_COLORS[i % SEMANTIC_COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as Campanhas</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Campanha</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-right py-2 px-3 font-medium">Gasto</th>
                      <th className="text-right py-2 px-3 font-medium">Impressões</th>
                      <th className="text-right py-2 px-3 font-medium">Cliques</th>
                      <th className="text-right py-2 px-3 font-medium">CTR</th>
                      <th className="text-right py-2 px-3 font-medium">Leads</th>
                      <th className="text-right py-2 px-3 font-medium">CPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 max-w-[200px] truncate">{c.name}</td>
                        <td className="py-2 px-3">
                          <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : c.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(c.spend)}</td>
                        <td className="py-2 px-3 text-right font-mono">{c.impressions.toLocaleString('pt-BR')}</td>
                        <td className="py-2 px-3 text-right font-mono">{c.clicks.toLocaleString('pt-BR')}</td>
                        <td className="py-2 px-3 text-right font-mono">{c.ctr.toFixed(2)}%</td>
                        <td className="py-2 px-3 text-right font-mono">{c.leads}</td>
                        <td className={`py-2 px-3 text-right font-mono ${c.costPerLead > 0 && c.costPerLead <= (fb?.metrics?.avgCPL || 999) ? 'text-[#AFC040]' : c.costPerLead > (fb?.metrics?.avgCPL || 0) ? 'text-[#E8684A]' : ''}`}>
                          {c.costPerLead > 0 ? formatCurrency(c.costPerLead) : '—'}
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (<tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Sem dados de campanhas</td></tr>)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights do Facebook Ads" subtitle="Análise de campanhas e performance gerada por IA" context="facebook_ads" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
