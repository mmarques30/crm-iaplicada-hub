import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/format'
import { Users, Target, Trophy, TrendingUp, Briefcase, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const STAGE_COLORS: Record<string, string> = {
  subscriber: '#93c5fd',
  lead: '#f59e0b',
  marketingqualifiedlead: '#8b5cf6',
  salesqualifiedlead: '#ec4899',
  opportunity: '#10B981',
  customer: '#059669',
  evangelist: '#0ea5e9',
  other: '#6b7280',
  unknown: '#d1d5db',
}

const STAGE_LABELS: Record<string, string> = {
  subscriber: 'Subscriber',
  lead: 'Lead',
  marketingqualifiedlead: 'MQL',
  salesqualifiedlead: 'SQL',
  opportunity: 'Opportunity',
  customer: 'Customer',
  evangelist: 'Evangelist',
  other: 'Outro',
  unknown: 'Desconhecido',
}

const SOURCE_COLORS = ['#FF7A59', '#1877F2', '#E1306C', '#10B981', '#8b5cf6', '#f59e0b', '#6b7280']

export default function CrmAnalytics() {
  const { data: snapshot } = useDashboardSnapshot()
  const hs = snapshot?.data?.hubspot

  const stageData = hs?.byStage
    ? Object.entries(hs.byStage).map(([name, value]) => ({
        name: STAGE_LABELS[name] || name,
        value,
        fill: STAGE_COLORS[name] || STAGE_COLORS.other,
      }))
    : []

  const sourceData = hs?.bySource
    ? Object.entries(hs.bySource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    : []

  const deals = hs?.deals || []
  const dealsByStage: Record<string, { count: number; amount: number }> = {}
  for (const deal of deals) {
    const stage = deal.stage || 'unknown'
    if (!dealsByStage[stage]) dealsByStage[stage] = { count: 0, amount: 0 }
    dealsByStage[stage].count++
    dealsByStage[stage].amount += deal.amount
  }
  const dealStageData = Object.entries(dealsByStage).map(([name, data]) => ({
    name,
    deals: data.count,
    valor: data.amount,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">HubSpot CRM</h1>
          {hs?.metrics?.totalContacts && (
            <Badge className="bg-orange-100 text-orange-800">{hs.metrics.totalContacts} contatos</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise de contatos, deals e pipeline</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Contatos" value={hs?.metrics?.totalContacts || 0} icon={Users} color="text-orange-600" />
        <MetricCard title="Leads" value={hs?.metrics?.leads || 0} icon={Target} color="text-yellow-600" />
        <MetricCard title="Opportunities" value={hs?.metrics?.opportunities || 0} icon={TrendingUp} color="text-green-600" />
        <MetricCard title="Customers" value={hs?.metrics?.customers || 0} icon={Trophy} color="text-emerald-600" />
        <MetricCard title="Deals Ativos" value={hs?.metrics?.activeDeals || 0} icon={Briefcase} color="text-blue-600" />
        <MetricCard title="Win Rate" value={hs?.metrics?.winRate || 0} suffix="%" decimals={1} icon={BarChart3} color="text-purple-600" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contatos por Lifecycle Stage</CardTitle>
              </CardHeader>
              <CardContent>
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stageData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                        {stageData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contatos por Fonte</CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Contatos" radius={[0, 4, 4, 0]}>
                        {sourceData.map((_, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contatos Recentes do HubSpot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Nome</th>
                      <th className="text-left py-2 px-3 font-medium">Email</th>
                      <th className="text-left py-2 px-3 font-medium">Empresa</th>
                      <th className="text-left py-2 px-3 font-medium">Stage</th>
                      <th className="text-left py-2 px-3 font-medium">Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hs?.contacts || []).slice(0, 50).map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3">{[c.firstname, c.lastname].filter(Boolean).join(' ') || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{c.email || '—'}</td>
                        <td className="py-2 px-3">{c.company || '—'}</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: STAGE_COLORS[c.lifecyclestage] || '#6b7280' }}
                          >
                            {STAGE_LABELS[c.lifecyclestage] || c.lifecyclestage || '—'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{c.source || '—'}</td>
                      </tr>
                    ))}
                    {(!hs?.contacts || hs.contacts.length === 0) && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem dados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deals por Estágio</CardTitle>
            </CardHeader>
            <CardContent>
              {dealStageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dealStageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="deals" name="Qtd Deals" fill="#FF7A59" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="valor" name="Valor (R$)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de deals</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
