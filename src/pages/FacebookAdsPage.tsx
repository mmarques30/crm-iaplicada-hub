import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/format'
import { DollarSign, Eye, MousePointer, Target, TrendingUp, BarChart3 } from 'lucide-react'
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

  // Data para gráfico de barras
  const campaignChart = campaigns
    .filter(c => c.impressions > 0)
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 25 ? c.name.substring(0, 25) + '...' : c.name,
      impressões: c.impressions,
      cliques: c.clicks,
      leads: c.leads,
    }))

  // Distribuição de gastos
  const spendData = campaigns
    .filter(c => c.spend > 0)
    .map(c => ({ name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name, value: c.spend }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Facebook Ads</h1>
          <Badge className="bg-blue-100 text-blue-800">{activeCampaigns.length} ativas</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise de campanhas — últimos 30 dias</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Investimento" value={fb?.metrics?.totalSpend || 0} prefix="R$ " decimals={2} icon={DollarSign} color="text-blue-600" />
        <MetricCard title="Impressões" value={fb?.metrics?.totalImpressions || 0} icon={Eye} color="text-blue-500" />
        <MetricCard title="Alcance" value={fb?.metrics?.totalReach || 0} icon={BarChart3} color="text-blue-400" />
        <MetricCard title="Cliques" value={fb?.metrics?.totalClicks || 0} icon={MousePointer} color="text-indigo-600" />
        <MetricCard title="Leads" value={fb?.metrics?.totalLeads || 0} icon={Target} color="text-green-600" />
        <MetricCard title="CPL Médio" value={fb?.metrics?.avgCPL || 0} prefix="R$ " decimals={2} icon={TrendingUp} color="text-purple-600" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={campaignChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="impressões" fill="#1877F2" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cliques" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="leads" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>

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
          </div>
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
                        <td className="py-2 px-3 text-right">{formatCurrency(c.spend)}</td>
                        <td className="py-2 px-3 text-right">{c.impressions.toLocaleString('pt-BR')}</td>
                        <td className="py-2 px-3 text-right">{c.clicks.toLocaleString('pt-BR')}</td>
                        <td className="py-2 px-3 text-right">{c.ctr.toFixed(2)}%</td>
                        <td className="py-2 px-3 text-right">{c.leads}</td>
                        <td className="py-2 px-3 text-right">{c.costPerLead > 0 ? formatCurrency(c.costPerLead) : '—'}</td>
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
      </Tabs>
    </div>
  )
}
