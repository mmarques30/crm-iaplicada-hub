import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { formatCurrency } from '@/lib/format'
import { Users, Target, Trophy, TrendingUp, Briefcase, BarChart3, XCircle, Percent } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const PRODUCT_COLORS: Record<string, string> = {
  business: '#8b5cf6',
  skills: '#ec4899',
  academy: '#f59e0b',
}

export default function CrmAnalytics() {
  const { data: productMetrics } = useQuery({
    queryKey: ['product_metrics'],
    queryFn: async () => {
      const { data } = await supabase.from('product_metrics').select('*')
      return data || []
    },
  })

  const { data: stageConversion } = useQuery({
    queryKey: ['stage_conversion'],
    queryFn: async () => {
      const { data } = await supabase.from('stage_conversion').select('*').order('display_order')
      return data || []
    },
  })

  const { data: contactCount } = useQuery({
    queryKey: ['contacts_count'],
    queryFn: async () => {
      const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true })
      return count || 0
    },
  })

  const { data: dealsByChannel } = useQuery({
    queryKey: ['deals_by_channel_crm'],
    queryFn: async () => {
      const { data } = await supabase.from('deals_full').select('canal_origem')
      const channels: Record<string, number> = {}
      for (const d of data || []) {
        const ch = d.canal_origem || 'Não informado'
        channels[ch] = (channels[ch] || 0) + 1
      }
      return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    },
  })

  const totals = (productMetrics || []).reduce(
    (acc, pm) => ({
      activeDeals: acc.activeDeals + Number(pm.active_deals || 0),
      wonDeals: acc.wonDeals + Number(pm.won_deals || 0),
      lostDeals: acc.lostDeals + Number(pm.lost_deals || 0),
      pipelineValue: acc.pipelineValue + Number(pm.pipeline_value || 0),
      avgDealSize: acc.avgDealSize + Number(pm.avg_deal_size || 0),
    }),
    { activeDeals: 0, wonDeals: 0, lostDeals: 0, pipelineValue: 0, avgDealSize: 0 }
  )
  const totalClosed = totals.wonDeals + totals.lostDeals
  const winRate = totalClosed > 0 ? (totals.wonDeals / totalClosed) * 100 : 0
  const avgDeal = (productMetrics || []).length > 0 ? totals.avgDealSize / (productMetrics || []).length : 0

  // Funil stages
  const funnelStages = (stageConversion || []).filter(s => (s.deal_count || 0) > 0)
  const maxStage = funnelStages[0]?.deal_count || 1

  const productPie = (productMetrics || []).map(pm => ({
    name: String(pm.product).charAt(0).toUpperCase() + String(pm.product).slice(1),
    value: Number(pm.active_deals || 0),
    fill: PRODUCT_COLORS[String(pm.product)] || '#6b7280',
  }))

  const SOURCE_COLORS = ['#10B981', '#1877F2', '#E1306C', '#8b5cf6', '#f59e0b', '#6b7280']

  const insightsData = {
    totalContacts: contactCount || 0,
    activeDeals: totals.activeDeals,
    wonDeals: totals.wonDeals,
    lostDeals: totals.lostDeals,
    winRate: winRate.toFixed(1),
    pipelineValue: totals.pipelineValue,
    avgDealSize: avgDeal,
    funnelStages: funnelStages.map(s => ({ name: s.stage_name, deals: s.deal_count, amount: s.total_amount })),
    productMetrics: (productMetrics || []).map(pm => ({ product: pm.product, active: pm.active_deals, won: pm.won_deals, lost: pm.lost_deals, winRate: pm.win_rate })),
    dealsByChannel: (dealsByChannel || []).slice(0, 6),
  }

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({
    context: 'crm',
    data: insightsData,
    enabled: (contactCount || 0) > 0 || totals.activeDeals > 0,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Funil de Vendas</h1>
          <Badge className="bg-emerald-500/15 text-emerald-400">{totals.activeDeals} Deals Ativos</Badge>
          <Badge variant="secondary">{contactCount} Contatos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise do pipeline de vendas interno</p>
      </div>

      {/* 8 KPI Cards — 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Total Contatos" value={contactCount || 0} icon={Users} color="text-orange-600" borderColor="#FF7A59" />
        <MetricCard title="Deals Ativos" value={totals.activeDeals} icon={Briefcase} color="text-blue-600" borderColor="#3b82f6" />
        <MetricCard title="Deals Ganhos" value={totals.wonDeals} icon={Trophy} color="text-green-600" borderColor="#10B981" />
        <MetricCard title="Deals Perdidos" value={totals.lostDeals} icon={XCircle} color="text-red-500" borderColor="#ef4444" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Pipeline" value={totals.pipelineValue} prefix="R$ " decimals={2} icon={BarChart3} color="text-purple-600" borderColor="#8b5cf6" />
        <MetricCard title="Win Rate" value={winRate} suffix="%" decimals={1} icon={Percent} color="text-emerald-600" borderColor="#059669" />
        <MetricCard title="Ticket Médio" value={avgDeal} prefix="R$ " decimals={2} icon={TrendingUp} color="text-amber-600" borderColor="#f59e0b" />
        <MetricCard title="Total Fechados" value={totalClosed} icon={Target} color="text-indigo-600" borderColor="#6366f1" />
      </div>

      <Tabs defaultValue="funnel">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline por Estágio</CardTitle>
            </CardHeader>
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
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{
                            width: `${Math.max((Number(stage.deal_count) / Number(maxStage)) * 100, 3)}%`,
                            backgroundColor: 'hsl(var(--primary))',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de pipeline</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deals por Canal de Origem</CardTitle>
            </CardHeader>
            <CardContent>
              {(dealsByChannel || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dealsByChannel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Deals" radius={[0, 4, 4, 0]}>
                      {(dealsByChannel || []).map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de canais</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deals por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {productPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={productPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                        {productPie.map((entry, i) => (
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
                <CardTitle className="text-base">Performance por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {(productMetrics || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(productMetrics || []).map(pm => ({
                      name: String(pm.product).charAt(0).toUpperCase() + String(pm.product).slice(1),
                      ganhos: Number(pm.won_deals),
                      perdidos: Number(pm.lost_deals),
                      ativos: Number(pm.active_deals),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ganhos" name="Ganhos" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="perdidos" name="Perdidos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ativos" name="Ativos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsTable
            insights={insights || []}
            isLoading={insightsLoading}
            error={insightsError?.message}
            onRetry={() => refetchInsights()}
            title="Insights do CRM"
            subtitle="Análise do funil de vendas e pipeline gerada por IA"
            context="crm"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
