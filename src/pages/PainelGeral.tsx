import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useDashboardSnapshot, useCollectDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Users, Eye, Heart, Target, DollarSign, TrendingUp, RefreshCw, BarChart3, Loader2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts'

const COLORS = ['#E1306C', '#1877F2', '#FF7A59', '#10B981', '#8b5cf6', '#f59e0b']

export default function PainelGeral() {
  const { data: snapshot, isLoading } = useDashboardSnapshot()
  const collectMutation = useCollectDashboardData()

  const ig = snapshot?.data?.instagram
  const fb = snapshot?.data?.facebook_ads
  const hs = snapshot?.data?.hubspot

  const followers = ig?.metrics?.followers || 0
  const totalReach = (ig?.metrics?.totalReach || 0) + (fb?.metrics?.totalReach || 0)
  const engagement = (ig?.metrics?.totalLikes || 0) + (ig?.metrics?.totalComments || 0)
  const leads = hs?.metrics?.leads || 0
  const investment = fb?.metrics?.totalSpend || 0
  const cpl = fb?.metrics?.avgCPL || 0

  // Dados para gráficos
  const stageData = hs?.byStage
    ? Object.entries(hs.byStage).map(([name, value]) => ({ name, value }))
    : []

  const sourceData = hs?.bySource
    ? Object.entries(hs.bySource).map(([name, value]) => ({ name, value }))
    : []

  const dailyReach = ig?.dailyReach?.map((d) => ({
    date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    alcance: d.value,
  })) || []

  // Funil integrado
  const funnelData = [
    { name: 'Impressões', value: fb?.metrics?.totalImpressions || 0, fill: '#1877F2' },
    { name: 'Alcance', value: totalReach, fill: '#3b82f6' },
    { name: 'Cliques', value: fb?.metrics?.totalClicks || 0, fill: '#8b5cf6' },
    { name: 'Contatos', value: hs?.metrics?.totalContacts || 0, fill: '#FF7A59' },
    { name: 'Leads', value: leads, fill: '#f59e0b' },
    { name: 'Opportunities', value: hs?.metrics?.opportunities || 0, fill: '#10B981' },
    { name: 'Customers', value: hs?.metrics?.customers || 0, fill: '#059669' },
  ].filter(d => d.value > 0)

  const maxFunnel = funnelData[0]?.value || 1

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visão Consolidada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard integrado: Instagram, Facebook Ads e HubSpot CRM
          </p>
          <div className="flex gap-2 mt-2">
            {ig && <Badge className="bg-pink-100 text-pink-800">Instagram</Badge>}
            {fb && <Badge className="bg-blue-100 text-blue-800">Facebook Ads</Badge>}
            {hs && <Badge className="bg-orange-100 text-orange-800">HubSpot CRM</Badge>}
            {!ig && !fb && !hs && <Badge variant="secondary">Sem dados</Badge>}
          </div>
        </div>
        <div className="text-right space-y-2">
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

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Seguidores" value={followers} icon={Users} color="text-pink-600" />
        <MetricCard title="Alcance Total" value={totalReach} icon={Eye} color="text-blue-600" />
        <MetricCard title="Engajamento" value={engagement} icon={Heart} color="text-red-500" />
        <MetricCard title="Leads" value={leads} icon={Target} color="text-orange-600" />
        <MetricCard title="Investimento" value={investment} prefix="R$ " decimals={2} icon={DollarSign} color="text-green-600" />
        <MetricCard title="CPL Médio" value={cpl} prefix="R$ " decimals={2} icon={TrendingUp} color="text-purple-600" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Instagram Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  Instagram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Seguidores</span><span className="font-medium">{(ig?.metrics?.followers || 0).toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Alcance</span><span className="font-medium">{(ig?.metrics?.totalReach || 0).toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Engajamento Médio</span><span className="font-medium">{ig?.metrics?.avgEngagement || 0}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Posts</span><span className="font-medium">{ig?.posts?.length || 0}</span></div>
              </CardContent>
            </Card>

            {/* Facebook Ads Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  Facebook Ads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Investimento</span><span className="font-medium">{formatCurrency(fb?.metrics?.totalSpend || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Impressões</span><span className="font-medium">{(fb?.metrics?.totalImpressions || 0).toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><span className="font-medium">{fb?.metrics?.totalLeads || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPL</span><span className="font-medium">{formatCurrency(fb?.metrics?.avgCPL || 0)}</span></div>
              </CardContent>
            </Card>

            {/* HubSpot Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  HubSpot CRM
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Contatos</span><span className="font-medium">{(hs?.metrics?.totalContacts || 0).toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><span className="font-medium">{hs?.metrics?.leads || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opportunities</span><span className="font-medium">{hs?.metrics?.opportunities || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="font-medium">{hs?.metrics?.winRate || 0}%</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil Integrado</CardTitle>
            </CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <div className="space-y-3">
                  {funnelData.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{
                            width: `${Math.max((item.value / maxFunnel) * 100, 2)}%`,
                            backgroundColor: item.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Clique em "Atualizar Dados" para coletar dados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contatos por Origem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contatos por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#FF7A59" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>

            {/* Lifecycle Stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lifecycle Stage</CardTitle>
              </CardHeader>
              <CardContent>
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stageData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label>
                        {stageData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alcance Diário (Instagram)</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReach.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyReach}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="alcance" stroke="#E1306C" fill="#E1306C" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
