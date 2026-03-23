import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/format'
import { DollarSign, Eye, MousePointer, Target, TrendingUp, BarChart3, Percent, ExternalLink } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#1877F2', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1e40af']

export default function FacebookAdsPage() {
  const { data: snapshot } = useDashboardSnapshot()
  const fb = snapshot?.data?.facebook_ads

  const campaigns = fb?.campaigns || []
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE')

  const insightsData = fb ? {
    totalSpend: fb.metrics?.totalSpend,
    totalImpressions: fb.metrics?.totalImpressions,
    totalReach: fb.metrics?.totalReach,
    totalClicks: fb.metrics?.totalClicks,
    totalLeads: fb.metrics?.totalLeads,
    avgCPL: fb.metrics?.avgCPL,
    avgCTR: fb.metrics?.avgCTR,
    activeCampaigns: activeCampaigns.length,
    totalCampaigns: campaigns.length,
    campaigns: campaigns.slice(0, 8).map(c => ({ name: c.name.substring(0, 40), status: c.status, spend: c.spend, leads: c.leads, cpl: c.costPerLead, ctr: c.ctr })),
  } : null

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({
    context: 'facebook_ads',
    data: insightsData,
    enabled: !!fb,
  })

  // Investimento por campanha (horizontal)
  const spendByCampaign = campaigns
    .filter(c => c.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map(c => ({
      name: c.name.length > 30 ? c.name.substring(0, 30) + '...' : c.name,
      investimento: c.spend,
    }))

  // CPL por campanha (horizontal)
  const cplByCampaign = campaigns
    .filter(c => c.costPerLead > 0)
    .sort((a, b) => a.costPerLead - b.costPerLead)
    .slice(0, 8)
    .map(c => ({
      name: c.name.length > 30 ? c.name.substring(0, 30) + '...' : c.name,
      cpl: c.costPerLead,
    }))

  // Distribuição de gastos
  const spendData = campaigns
    .filter(c => c.spend > 0)
    .map(c => ({ name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name, value: c.spend }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Facebook Ads</h1>
          <Badge className="bg-blue-500/15 text-blue-400">{activeCampaigns.length} Ativas</Badge>
          <Badge variant="secondary">{campaigns.length - activeCampaigns.length} Pausadas</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise de campanhas — últimos 30 dias</p>
      </div>

      {/* 8 KPI Cards — 2 rows of 4 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Investimento" value={fb?.metrics?.totalSpend || 0} prefix="R$ " decimals={2} icon={DollarSign} color="text-blue-600" borderColor="#1877F2" />
        <MetricCard title="Impressões" value={fb?.metrics?.totalImpressions || 0} icon={Eye} color="text-blue-500" borderColor="#3b82f6" />
        <MetricCard title="Alcance" value={fb?.metrics?.totalReach || 0} icon={BarChart3} color="text-blue-400" borderColor="#60a5fa" />
        <MetricCard title="Total Leads" value={fb?.metrics?.totalLeads || 0} icon={Target} color="text-green-600" borderColor="#10B981" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Cliques" value={fb?.metrics?.totalClicks || 0} icon={MousePointer} color="text-indigo-600" borderColor="#6366f1" />
        <MetricCard title="CTR Médio" value={fb?.metrics?.avgCTR || 0} suffix="%" decimals={2} icon={Percent} color="text-purple-600" borderColor="#8b5cf6" />
        <MetricCard title="CPL Médio" value={fb?.metrics?.avgCPL || 0} prefix="R$ " decimals={2} icon={TrendingUp} color="text-amber-600" borderColor="#f59e0b" />
        <MetricCard title="Campanhas" value={campaigns.length} icon={ExternalLink} color="text-slate-600" borderColor="#64748b" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investimento por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                {spendByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={spendByCampaign} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="investimento" name="Investimento" fill="#1877F2" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">CPL por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                {cplByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={cplByCampaign} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="cpl" name="CPL" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {spendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={spendData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label>
                      {spendData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todas as Campanhas</CardTitle>
            </CardHeader>
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
                        <td className={`py-2 px-3 text-right font-mono ${c.costPerLead > 0 && c.costPerLead <= (fb?.metrics?.avgCPL || 999) ? 'text-green-600' : c.costPerLead > (fb?.metrics?.avgCPL || 0) ? 'text-red-500' : ''}`}>
                          {c.costPerLead > 0 ? formatCurrency(c.costPerLead) : '—'}
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Sem dados de campanhas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsTable
            insights={insights || []}
            isLoading={insightsLoading}
            error={insightsError?.message}
            onRetry={() => refetchInsights()}
            title="Insights do Facebook Ads"
            subtitle="Análise de campanhas e performance gerada por IA"
            context="facebook_ads"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
