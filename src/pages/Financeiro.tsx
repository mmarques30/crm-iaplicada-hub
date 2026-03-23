import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { formatCurrency, formatDate } from '@/lib/format'
import { DollarSign, ShoppingCart, Receipt, CreditCard } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

const PRODUCT_COLORS: Record<string, string> = {
  academy: '#f59e0b',
  business: '#8b5cf6',
  skills: '#ec4899',
}

const PRODUCT_LABELS: Record<string, string> = {
  academy: 'Academy',
  business: 'Business',
  skills: 'Skills',
}

export default function Financeiro() {
  const { data: vendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('data_venda', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const allVendas = vendas || []
  const receitaTotal = allVendas.reduce((s, v) => s + Number(v.valor || 0), 0)
  const totalVendas = allVendas.length
  const ticketMedio = totalVendas > 0 ? receitaTotal / totalVendas : 0
  const parcelasAtivas = allVendas.filter(v => v.status === 'em_andamento').reduce((s, v) => s + (v.parcelas || 0), 0)

  // Receita por produto
  const byProduct: Record<string, { receita: number; count: number }> = {}
  for (const v of allVendas) {
    if (!byProduct[v.produto]) byProduct[v.produto] = { receita: 0, count: 0 }
    byProduct[v.produto].receita += Number(v.valor || 0)
    byProduct[v.produto].count++
  }
  const productData = Object.entries(byProduct).map(([name, data]) => ({
    name: PRODUCT_LABELS[name] || name,
    receita: data.receita,
    vendas: data.count,
    fill: PRODUCT_COLORS[name] || '#6b7280',
  }))

  // Formas de pagamento
  const byPayment: Record<string, number> = {}
  for (const v of allVendas) {
    const fp = v.forma_pagamento || 'Não informado'
    byPayment[fp] = (byPayment[fp] || 0) + 1
  }
  const paymentData = Object.entries(byPayment).map(([name, value]) => ({ name, value }))
  const PAY_COLORS = ['#10B981', '#3b82f6', '#f59e0b', '#ec4899', '#6b7280']

  // Evolução mensal
  const monthlyData: Record<string, { receita: number; vendas: number }> = {}
  for (const v of allVendas) {
    const month = v.data_venda.substring(0, 7) // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = { receita: 0, vendas: 0 }
    monthlyData[month].receita += Number(v.valor || 0)
    monthlyData[month].vendas++
  }
  const monthlyChart = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receita: data.receita,
      vendas: data.vendas,
    }))

  const emAndamento = allVendas.filter(v => v.status === 'em_andamento').length
  const concluidos = allVendas.filter(v => v.status === 'concluido').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Vendas & Receita</h1>
          <Badge variant="secondary">{totalVendas} vendas</Badge>
          <Badge className="bg-yellow-100 text-yellow-800">{emAndamento} em andamento</Badge>
          <Badge className="bg-green-100 text-green-800">{concluidos} concluídos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Acompanhamento financeiro integrado ao CRM</p>
      </div>

      {/* 4 KPI Cards with colored borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Receita Total" value={receitaTotal} prefix="R$ " decimals={2} icon={DollarSign} color="text-green-600" borderColor="#10B981" />
        <MetricCard title="Total Vendas" value={totalVendas} icon={ShoppingCart} color="text-blue-600" borderColor="#3b82f6" />
        <MetricCard title="Ticket Médio" value={ticketMedio} prefix="R$ " decimals={2} icon={Receipt} color="text-purple-600" borderColor="#8b5cf6" />
        <MetricCard title="Parcelas Ativas" value={parcelasAtivas} icon={CreditCard} color="text-orange-600" borderColor="#f59e0b" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {productData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={productData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 13 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="receita" name="Receita" radius={[0, 4, 4, 0]}>
                        {productData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de vendas</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label>
                        {paymentData.map((_, i) => (
                          <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />
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

        <TabsContent value="evolution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução Mensal de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number, name: string) => name === 'receita' ? formatCurrency(v) : v} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="receita" name="Receita" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="vendas" name="Nº Vendas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todas as Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Nome</th>
                      <th className="text-left py-2 px-3 font-medium">Produto</th>
                      <th className="text-left py-2 px-3 font-medium">Data</th>
                      <th className="text-left py-2 px-3 font-medium">Pagamento</th>
                      <th className="text-right py-2 px-3 font-medium">Valor</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVendas.map(v => (
                      <tr key={v.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3">{v.nome}</td>
                        <td className="py-2 px-3">
                          <Badge className="text-xs" style={{ backgroundColor: (PRODUCT_COLORS[v.produto] || '#6b7280') + '20', color: PRODUCT_COLORS[v.produto] || '#6b7280' }}>
                            {PRODUCT_LABELS[v.produto] || v.produto}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(v.data_venda)}</td>
                        <td className="py-2 px-3 text-muted-foreground">{v.forma_pagamento || '—'}</td>
                        <td className="py-2 px-3 text-right font-medium font-mono">{formatCurrency(Number(v.valor))}</td>
                        <td className="py-2 px-3">
                          <Badge variant={v.status === 'concluido' ? 'default' : 'secondary'} className="text-xs">
                            {v.status === 'concluido' ? 'Concluído' : v.status === 'cancelado' ? 'Cancelado' : 'Em andamento'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {allVendas.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sem vendas cadastradas</td></tr>
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
