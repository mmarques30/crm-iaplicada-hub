import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate } from '@/lib/format'
import { DollarSign, ShoppingCart, Receipt, CreditCard } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

const PRODUCT_COLORS: Record<string, string> = { academy: '#4A9FE0', business: '#AFC040' }
const PRODUCT_LABELS: Record<string, string> = { academy: 'Academy', business: 'Business', skills: 'Skills' }
const PAY_COLORS = ['#AFC040', '#4A9FE0', '#E8A43C', '#E8684A', '#7A8460']
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

export default function Financeiro() {
  const { data: vendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: async () => { const { data, error } = await supabase.from('vendas').select('*').order('data_venda', { ascending: false }); if (error) throw error; return data || [] },
  })

  const allVendas = vendas || []
  const receitaTotal = allVendas.reduce((s, v) => s + Number(v.valor || 0), 0)
  const totalVendas = allVendas.length
  const ticketMedio = totalVendas > 0 ? receitaTotal / totalVendas : 0
  const parcelasAtivas = allVendas.filter(v => v.status === 'em_andamento').reduce((s, v) => s + (v.parcelas || 0), 0)

  const byProduct: Record<string, { receita: number; count: number }> = {}
  for (const v of allVendas) { if (!byProduct[v.produto]) byProduct[v.produto] = { receita: 0, count: 0 }; byProduct[v.produto].receita += Number(v.valor || 0); byProduct[v.produto].count++ }
  const productData = Object.entries(byProduct).map(([name, data]) => ({ name: PRODUCT_LABELS[name] || name, receita: data.receita, vendas: data.count, fill: PRODUCT_COLORS[name] || '#7A8460' }))

  const byPayment: Record<string, number> = {}
  for (const v of allVendas) { const fp = v.forma_pagamento || 'Não informado'; byPayment[fp] = (byPayment[fp] || 0) + 1 }
  const paymentData = Object.entries(byPayment).map(([name, value]) => ({ name, value }))

  const monthlyData: Record<string, { receita: number; vendas: number }> = {}
  for (const v of allVendas) { const month = v.data_venda.substring(0, 7); if (!monthlyData[month]) monthlyData[month] = { receita: 0, vendas: 0 }; monthlyData[month].receita += Number(v.valor || 0); monthlyData[month].vendas++ }
  const monthlyChart = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), receita: data.receita, vendas: data.vendas }))

  const emAndamento = allVendas.filter(v => v.status === 'em_andamento').length
  const concluidos = allVendas.filter(v => v.status === 'concluido').length

  const insightsData = totalVendas > 0 ? { receitaTotal, totalVendas, ticketMedio, emAndamento, concluidos, parcelasAtivas, receitaPorProduto: productData.map(p => ({ produto: p.name, receita: p.receita, vendas: p.vendas })), formasPagamento: paymentData, evolucaoMensal: monthlyChart } : null
  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'financeiro', data: insightsData, enabled: totalVendas > 0 })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Vendas & Receita</h1>
          <Badge variant="secondary">{totalVendas} vendas</Badge>
          <Badge className="bg-[#1A1206] text-[#E8A43C]">{emAndamento} em andamento</Badge>
          <Badge className="bg-[#141A04] text-[#AFC040]">{concluidos} concluídos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Acompanhamento financeiro integrado ao CRM</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Receita Total" value={formatCurrency(receitaTotal)} icon={DollarSign} accentColor="#E8A43C" />
        <KPICard label="Total Vendas" value={totalVendas} icon={ShoppingCart} accentColor="#2CBBA6" />
        <KPICard label="Ticket Médio" value={formatCurrency(ticketMedio)} icon={Receipt} accentColor="#E8A43C" />
        <KPICard label="Parcelas Ativas" value={parcelasAtivas} icon={CreditCard} accentColor="#E8684A" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'overview', l: 'Visão Geral' }, { v: 'evolution', l: 'Evolução' }, { v: 'vendas', l: 'Vendas' }, { v: 'insights', l: 'Insights' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Receita por Produto</CardTitle></CardHeader>
              <CardContent>
                {productData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={productData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `R$ ${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 13, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="receita" name="Receita" radius={[0, 4, 4, 0]}>
                        {productData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de vendas</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Formas de Pagamento</CardTitle></CardHeader>
              <CardContent>
                {paymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label>
                        {paymentData.map((_, i) => (<Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
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
            <CardHeader><CardTitle className="text-base">Evolução Mensal de Vendas</CardTitle></CardHeader>
            <CardContent>
              {monthlyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={AXIS_TICK} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => name === 'receita' ? formatCurrency(v) : v} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="receita" name="Receita" stroke="#E8A43C" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="vendas" name="Nº Vendas" stroke="#2CBBA6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as Vendas</CardTitle></CardHeader>
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
                          <Badge className={`text-xs ${v.produto === 'business' ? 'bg-[#141A04] text-[#AFC040]' : v.produto === 'academy' ? 'bg-[#040E1A] text-[#4A9FE0]' : 'bg-muted text-muted-foreground'}`}>
                            {PRODUCT_LABELS[v.produto] || v.produto}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(v.data_venda)}</td>
                        <td className="py-2 px-3 text-muted-foreground">{v.forma_pagamento || '—'}</td>
                        <td className="py-2 px-3 text-right font-medium font-mono" style={{ color: '#E8A43C' }}>{formatCurrency(Number(v.valor))}</td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${v.status === 'concluido' ? 'bg-[#141A04] text-[#AFC040]' : v.status === 'cancelado' ? 'bg-[#1A0804] text-[#E8684A]' : 'bg-[#1A1206] text-[#E8A43C]'}`}>
                            {v.status === 'concluido' ? 'Concluído' : v.status === 'cancelado' ? 'Cancelado' : 'Em andamento'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {allVendas.length === 0 && (<tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sem vendas cadastradas</td></tr>)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights Financeiros" subtitle="Análise de vendas e receita gerada por IA" context="financeiro" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
