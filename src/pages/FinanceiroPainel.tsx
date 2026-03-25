import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/format'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { DollarSign, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Wallet, Receipt, CreditCard, Copy, Plus, Loader2, Trash2, Upload } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { toast } from 'sonner'

/* ─── Design tokens ─── */
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const PRODUCT_LABELS: Record<string, string> = { business: 'Business', skills: 'Skills', academy: 'Academy' }

const DESP_CATEGORY_COLORS: Record<string, string> = {
  folha: 'bg-[#141A04] text-[#AFC040]',
  publicidade: 'bg-[#040E1A] text-[#4A9FE0]',
  custos: 'bg-[#1A1206] text-[#E8A43C]',
  impostos: 'bg-[#1A0804] text-[#E8684A]',
  outros: 'bg-muted text-muted-foreground',
}

/* ─── Helpers ─── */
function monthKey(date: string) { return date.substring(0, 7) }
function monthIndex(mk: string) { return Number(mk.split('-')[1]) - 1 }
function yearOf(date: string) { return Number(date.substring(0, 4)) }

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (period) {
    case 'mes': {
      const s = new Date(y, m, 1)
      const e = new Date(y, m + 1, 0)
      return { start: s.toISOString().substring(0, 10), end: e.toISOString().substring(0, 10) }
    }
    case 'trimestre': {
      const qStart = Math.floor(m / 3) * 3
      const s = new Date(y, qStart, 1)
      const e = new Date(y, qStart + 3, 0)
      return { start: s.toISOString().substring(0, 10), end: e.toISOString().substring(0, 10) }
    }
    case 'ytd': {
      return { start: `${y}-01-01`, end: now.toISOString().substring(0, 10) }
    }
    case '12meses':
    default: {
      const s = new Date(y, m - 11, 1)
      return { start: s.toISOString().substring(0, 10), end: now.toISOString().substring(0, 10) }
    }
  }
}

/* ─── Component ─── */
export default function FinanceiroPainel() {
  const [period, setPeriod] = useState('ytd')
  const [bpYear, setBpYear] = useState(2026)
  const [registroTab, setRegistroTab] = useState<'receitas' | 'despesas'>('receitas')

  // Nova Despesa dialog state
  const [novaDespesaOpen, setNovaDespesaOpen] = useState(false)
  const [novaDespesa, setNovaDespesa] = useState({
    data: new Date().toISOString().substring(0, 10),
    descricao: '',
    categoria: 'outros',
    tipo: 'pontual',
    status: 'pendente',
    pagamento: 'a_vista',
    forma_pgto: 'pix',
    valor: '',
  })

  // CSV import state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<any[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()

  const range = useMemo(() => getDateRange(period), [period])

  // ─── Mutations ───
  const insertDespesaMutation = useMutation({
    mutationFn: async (despesa: any) => {
      const { error } = await (supabase as any).from('despesas').insert(despesa)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fin_despesas'] })
      queryClient.invalidateQueries({ queryKey: ['fin_despesas_year'] })
      setNovaDespesaOpen(false)
      setNovaDespesa({ data: new Date().toISOString().substring(0, 10), descricao: '', categoria: 'outros', tipo: 'pontual', status: 'pendente', pagamento: 'a_vista', forma_pgto: 'pix', valor: '' })
      toast.success('Despesa criada com sucesso!')
    },
    onError: (err: any) => toast.error(`Erro ao criar despesa: ${err.message}`),
  })

  const deleteDespesaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('despesas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fin_despesas'] })
      queryClient.invalidateQueries({ queryKey: ['fin_despesas_year'] })
      toast.success('Despesa excluída com sucesso!')
    },
    onError: (err: any) => toast.error(`Erro ao excluir despesa: ${err.message}`),
  })

  const replicarMesMutation = useMutation({
    mutationFn: async () => {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()
      const currentStart = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const currentEnd = new Date(y, m + 1, 0).toISOString().substring(0, 10)

      const { data: fixas, error: fetchErr } = await (supabase as any)
        .from('despesas')
        .select('*')
        .eq('tipo', 'fixa')
        .gte('data', currentStart)
        .lte('data', currentEnd)
      if (fetchErr) throw fetchErr
      if (!fixas || fixas.length === 0) throw new Error('Nenhuma despesa fixa encontrada no mês atual')

      const cloned = fixas.map((d: any) => {
        const origDate = new Date(d.data + 'T12:00:00')
        const nextMonth = new Date(origDate.getFullYear(), origDate.getMonth() + 1, origDate.getDate())
        const { id, created_at, ...rest } = d
        return { ...rest, data: nextMonth.toISOString().substring(0, 10) }
      })

      const { error: insertErr } = await (supabase as any).from('despesas').insert(cloned)
      if (insertErr) throw insertErr
      return cloned.length
    },
    onSuccess: (count: number) => {
      queryClient.invalidateQueries({ queryKey: ['fin_despesas'] })
      queryClient.invalidateQueries({ queryKey: ['fin_despesas_year'] })
      toast.success(`${count} despesa(s) fixa(s) replicada(s) para o próximo mês!`)
    },
    onError: (err: any) => toast.error(`Erro ao replicar: ${err.message}`),
  })

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { toast.error('CSV vazio ou sem dados'); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((h, i) => { row[h] = values[i] || '' })
        if (row.valor) row.valor = Number(row.valor)
        return row
      }).filter(r => r.descricao && r.valor)
      setCsvRows(rows)
      setCsvDialogOpen(true)
    }
    reader.readAsText(file)
  }

  async function handleCsvImport() {
    if (csvRows.length === 0) return
    setCsvImporting(true)
    try {
      const { error } = await (supabase as any).from('despesas').insert(csvRows)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['fin_despesas'] })
      queryClient.invalidateQueries({ queryKey: ['fin_despesas_year'] })
      toast.success(`${csvRows.length} despesa(s) importada(s) com sucesso!`)
      setCsvDialogOpen(false)
      setCsvRows([])
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`)
    } finally {
      setCsvImporting(false)
    }
  }

  /* ─── Queries ─── */
  const { data: vendas, isLoading: vendasLoading } = useQuery({
    queryKey: ['fin_vendas', range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .gte('data_venda', range.start)
        .lte('data_venda', range.end)
        .order('data_venda', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: parcelasPagas, isLoading: parcelasLoading } = useQuery({
    queryKey: ['fin_parcelas_pagas', range],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('parcelas')
        .select('*')
        .eq('status', 'pago')
        .gte('data_vencimento', range.start)
        .lte('data_vencimento', range.end)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: parcelasPendentes } = useQuery({
    queryKey: ['fin_parcelas_pendentes', range],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('parcelas')
        .select('*')
        .eq('status', 'pendente')
        .gte('data_vencimento', range.start)
        .lte('data_vencimento', range.end)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: despesas, isLoading: despesasLoading } = useQuery({
    queryKey: ['fin_despesas', range],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('despesas')
        .select('*')
        .gte('data', range.start)
        .lte('data', range.end)
        .order('data', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: metas } = useQuery({
    queryKey: ['fin_metas', bpYear],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('metas')
        .select('*')
        .eq('ano', bpYear)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: allVendasYear } = useQuery({
    queryKey: ['fin_vendas_year', bpYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .gte('data_venda', `${bpYear}-01-01`)
        .lte('data_venda', `${bpYear}-12-31`)
      if (error) throw error
      return data || []
    },
  })

  const { data: allDespesasYear } = useQuery({
    queryKey: ['fin_despesas_year', bpYear],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('despesas')
        .select('*')
        .gte('data', `${bpYear}-01-01`)
        .lte('data', `${bpYear}-12-31`)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  /* ─── Derived metrics ─── */
  const allVendas = vendas || []
  const allParcPagas = parcelasPagas || []
  const allParcPendentes = parcelasPendentes || []
  const allDespesas = despesas || []

  const faturamento = allVendas.reduce((s, v) => s + Number(v.valor || 0), 0)
  const fluxoCaixa = allParcPagas.reduce((s, p) => s + Number(p.valor || 0), 0)
  const totalDespesas = allDespesas.reduce((s, d) => s + Number(d.valor || 0), 0)
  const lucroLiquido = fluxoCaixa - totalDespesas
  const contasReceber = allParcPendentes.reduce((s, p) => s + Number(p.valor || 0), 0)

  // Find meta for current period
  const metaVendas = (metas || []).reduce((s: number, m: any) => s + Number(m.meta_vendas || 0), 0)

  /* ─── Evolution chart data ─── */
  const evolutionData = useMemo(() => {
    const months: Record<string, { faturamento: number; fluxo: number; despesas: number; lucro: number }> = {}

    for (const v of allVendas) {
      const mk = monthKey(v.data_venda)
      if (!months[mk]) months[mk] = { faturamento: 0, fluxo: 0, despesas: 0, lucro: 0 }
      months[mk].faturamento += Number(v.valor || 0)
    }
    for (const p of allParcPagas) {
      const mk = monthKey(p.data_vencimento)
      if (!months[mk]) months[mk] = { faturamento: 0, fluxo: 0, despesas: 0, lucro: 0 }
      months[mk].fluxo += Number(p.valor || 0)
    }
    for (const d of allDespesas) {
      const mk = monthKey(d.data)
      if (!months[mk]) months[mk] = { faturamento: 0, fluxo: 0, despesas: 0, lucro: 0 }
      months[mk].despesas += Number(d.valor || 0)
    }

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mk, d]) => ({
        month: MONTH_LABELS[monthIndex(mk)] || mk,
        Faturamento: d.faturamento,
        'Fluxo de Caixa': d.fluxo,
        Despesas: d.despesas,
        Lucro: d.fluxo - d.despesas,
      }))
  }, [allVendas, allParcPagas, allDespesas])

  /* ─── Annual summary ─── */
  const receitaAcumulada = allVendas.reduce((s, v) => s + Number(v.valor || 0), 0)
  const vendasAcumuladas = allVendas.length
  const repassesIndicacao = allVendas
    .filter((v: any) => v.indicacao_por)
    .reduce((s, v) => s + Number(v.valor || 0) * 0.1, 0)

  /* ─── Business Plan ─── */
  const bpData = useMemo(() => {
    const yearVendas = allVendasYear || []
    const yearDespesas = allDespesasYear || []
    const yearMetas = metas || []

    return MONTH_LABELS.map((label, idx) => {
      const mk = `${bpYear}-${String(idx + 1).padStart(2, '0')}`

      // Projetado (from metas)
      const metaMes = yearMetas.find((m: any) => m.mes === idx + 1)
      const pReceita = Number(metaMes?.meta_receita || 0)
      const pBusiness = pReceita * 0.6
      const pSkills = pReceita * 0.15
      const pAcademy = pReceita * 0.25
      const pFolha = Number(metaMes?.meta_folha || 0)
      const pPublicidade = Number(metaMes?.meta_publicidade || 0)
      const pCustos = Number(metaMes?.meta_custos || 0)
      const pTotal = pReceita
      const pDespTotal = pFolha + pPublicidade + pCustos
      const pResultado = pTotal - pDespTotal
      const pMargem = pTotal > 0 ? (pResultado / pTotal) * 100 : 0

      // Executado (from vendas/despesas)
      const mesVendas = yearVendas.filter(v => monthKey(v.data_venda) === mk)
      const mesDespesas = yearDespesas.filter((d: any) => monthKey(d.data) === mk)
      const eReceita = mesVendas.reduce((s, v) => s + Number(v.valor || 0), 0)
      const eBusiness = mesVendas.filter(v => v.produto === 'business').reduce((s, v) => s + Number(v.valor || 0), 0)
      const eSkills = mesVendas.filter(v => v.produto === 'skills').reduce((s, v) => s + Number(v.valor || 0), 0)
      const eAcademy = mesVendas.filter(v => v.produto === 'academy').reduce((s, v) => s + Number(v.valor || 0), 0)
      const eFolha = mesDespesas.filter((d: any) => d.categoria === 'folha').reduce((s: number, d: any) => s + Number(d.valor || 0), 0)
      const ePublicidade = mesDespesas.filter((d: any) => d.categoria === 'publicidade').reduce((s: number, d: any) => s + Number(d.valor || 0), 0)
      const eCustos = mesDespesas.filter((d: any) => d.categoria === 'custos').reduce((s: number, d: any) => s + Number(d.valor || 0), 0)
      const eDespTotal = eFolha + ePublicidade + eCustos
      const eResultado = eReceita - eDespTotal
      const eMargem = eReceita > 0 ? (eResultado / eReceita) * 100 : 0

      return {
        month: label,
        pBusiness, pSkills, pAcademy, pReceita: pTotal, pFolha, pPublicidade, pCustos, pDespTotal, pResultado, pMargem,
        eBusiness, eSkills, eAcademy, eReceita, eFolha, ePublicidade, eCustos, eDespTotal, eResultado, eMargem,
      }
    })
  }, [allVendasYear, allDespesasYear, metas, bpYear])

  /* ─── Insights ─── */
  const insightsData = faturamento > 0 || totalDespesas > 0
    ? { faturamento, fluxoCaixa, totalDespesas, lucroLiquido, contasReceber, metaVendas, evolucao: evolutionData }
    : null
  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({
    context: 'financeiro',
    data: insightsData,
    enabled: !!insightsData,
  })

  const isLoading = vendasLoading || parcelasLoading || despesasLoading

  /* ─── Render ─── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Controle Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Painel integrado de receitas, despesas e fluxo de caixa
          </p>
        </div>
        <div className="w-48">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
              <SelectItem value="12meses">12 Meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="painel">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[
            { v: 'painel', l: 'Painel Geral' },
            { v: 'bp', l: 'Business Plan' },
            { v: 'registros', l: 'Registros' },
            { v: 'insights', l: 'Insights' },
          ].map(t => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab 1: Painel Geral ─── */}
        <TabsContent value="painel" className="space-y-6 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              label="Vendido"
              value={formatCurrency(faturamento)}
              icon={DollarSign}
              accentColor="#AFC040"
              sub={metaVendas > 0 ? `Meta: ${formatCurrency(metaVendas)}` : undefined}
              trend={metaVendas > 0 ? { value: `${((faturamento / metaVendas) * 100).toFixed(0)}% da meta`, positive: faturamento >= metaVendas * 0.8 } : undefined}
            />
            <KPICard
              label="Fluxo de Caixa"
              value={formatCurrency(fluxoCaixa)}
              icon={Wallet}
              accentColor="#4A9FE0"
              sub="Parcelas recebidas"
            />
            <KPICard
              label="Despesas"
              value={formatCurrency(totalDespesas)}
              icon={ArrowDownCircle}
              accentColor="#E8684A"
              sub={`${allDespesas.length} lançamentos`}
            />
            <KPICard
              label="Lucro Líquido"
              value={formatCurrency(lucroLiquido)}
              icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown}
              accentColor={lucroLiquido >= 0 ? '#2CBBA6' : '#E8684A'}
              sub={fluxoCaixa > 0 ? `Margem: ${((lucroLiquido / fluxoCaixa) * 100).toFixed(1)}%` : undefined}
            />
            <KPICard
              label="Contas a Receber"
              value={formatCurrency(contasReceber)}
              icon={Receipt}
              accentColor="#E8A43C"
              sub={`${allParcPendentes.length} parcelas`}
            />
          </div>

          {/* Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução Financeira Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="Faturamento" stroke="#AFC040" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Fluxo de Caixa" stroke="#4A9FE0" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Despesas" stroke="#E8684A" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Lucro" stroke="#2CBBA6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados no período selecionado</p>
              )}
            </CardContent>
          </Card>

          {/* Annual Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Acumulada vs Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" style={{ color: '#AFC040' }}>{formatCurrency(receitaAcumulada)}</p>
                {metaVendas > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso</span>
                      <span>{((receitaAcumulada / metaVendas) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--c-border)]">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((receitaAcumulada / metaVendas) * 100, 100)}%`, backgroundColor: '#AFC040' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Meta: {formatCurrency(metaVendas)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Acumuladas vs Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" style={{ color: '#4A9FE0' }}>{vendasAcumuladas}</p>
                <p className="text-xs text-muted-foreground mt-1">vendas no periodo</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Repasses por Indicação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" style={{ color: '#E8A43C' }}>{formatCurrency(repassesIndicacao)}</p>
                <p className="text-xs text-muted-foreground mt-1">10% sobre vendas indicadas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 2: Business Plan ─── */}
        <TabsContent value="bp" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Business Plan</h2>
            <Select value={String(bpYear)} onValueChange={(v) => setBpYear(Number(v))}>
              <SelectTrigger className="w-28 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-[var(--c-card)] z-10 min-w-[160px]">Categoria</TableHead>
                      {MONTH_LABELS.map(m => (
                        <TableHead key={m} className="text-center min-w-[120px]" colSpan={2}>{m}</TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-[var(--c-card)] z-10" />
                      {MONTH_LABELS.map(m => (
                        <>
                          <TableHead key={`${m}-p`} className="text-center text-xs text-muted-foreground">P</TableHead>
                          <TableHead key={`${m}-e`} className="text-center text-xs text-muted-foreground">E</TableHead>
                        </>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* RECEITA Section */}
                    <TableRow className="bg-[#141A04]/30 font-semibold">
                      <TableCell className="sticky left-0 bg-[#141A04]/30 z-10 text-[#AFC040]">RECEITA</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`r-p-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.pReceita)}</TableCell>
                          <TableCell key={`r-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eReceita)}</TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-[var(--c-card)] z-10 pl-6 text-muted-foreground">Business (60%)</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`b-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{formatCurrency(d.pBusiness)}</TableCell>
                          <TableCell key={`b-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eBusiness)}</TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-[var(--c-card)] z-10 pl-6 text-muted-foreground">Skills (15%)</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`s-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{formatCurrency(d.pSkills)}</TableCell>
                          <TableCell key={`s-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eSkills)}</TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-[var(--c-card)] z-10 pl-6 text-muted-foreground">Academy (25%)</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`a-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{formatCurrency(d.pAcademy)}</TableCell>
                          <TableCell key={`a-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eAcademy)}</TableCell>
                        </>
                      ))}
                    </TableRow>

                    {/* DESPESAS Section */}
                    <TableRow className="bg-[#1A0804]/20 font-semibold">
                      <TableCell className="sticky left-0 bg-[#1A0804]/20 z-10 text-[#E8684A]">DESPESAS</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`dt-p-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.pDespTotal)}</TableCell>
                          <TableCell key={`dt-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eDespTotal)}</TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-[var(--c-card)] z-10 pl-6 text-muted-foreground">Folha</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`f-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{formatCurrency(d.pFolha)}</TableCell>
                          <TableCell key={`f-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eFolha)}</TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-[var(--c-card)] z-10 pl-6 text-muted-foreground">Publicidade</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`pub-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{formatCurrency(d.pPublicidade)}</TableCell>
                          <TableCell key={`pub-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.ePublicidade)}</TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-[var(--c-card)] z-10 pl-6 text-muted-foreground">Custos</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`c-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{formatCurrency(d.pCustos)}</TableCell>
                          <TableCell key={`c-e-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.eCustos)}</TableCell>
                        </>
                      ))}
                    </TableRow>

                    {/* RESULTADO */}
                    <TableRow className="bg-[#031411]/30 font-bold border-t-2">
                      <TableCell className="sticky left-0 bg-[#031411]/30 z-10 text-[#2CBBA6]">RESULTADO</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`res-p-${i}`} className="text-center text-xs font-mono">{formatCurrency(d.pResultado)}</TableCell>
                          <TableCell key={`res-e-${i}`} className="text-center text-xs font-mono" style={{ color: d.eResultado >= 0 ? '#2CBBA6' : '#E8684A' }}>
                            {formatCurrency(d.eResultado)}
                          </TableCell>
                        </>
                      ))}
                    </TableRow>
                    <TableRow className="bg-[#031411]/20">
                      <TableCell className="sticky left-0 bg-[#031411]/20 z-10 text-muted-foreground">MARGEM %</TableCell>
                      {bpData.map((d, i) => (
                        <>
                          <TableCell key={`m-p-${i}`} className="text-center text-xs font-mono text-muted-foreground">{d.pMargem.toFixed(1)}%</TableCell>
                          <TableCell key={`m-e-${i}`} className="text-center text-xs font-mono" style={{ color: d.eMargem >= 0 ? '#2CBBA6' : '#E8684A' }}>
                            {d.eMargem.toFixed(1)}%
                          </TableCell>
                        </>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Registros ─── */}
        <TabsContent value="registros" className="space-y-6 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Faturamento" value={formatCurrency(faturamento)} icon={DollarSign} accentColor="#AFC040" />
            <KPICard label="Fluxo de Caixa" value={formatCurrency(fluxoCaixa)} icon={ArrowUpCircle} accentColor="#4A9FE0" />
            <KPICard label="Despesas Líquidas" value={formatCurrency(totalDespesas)} icon={ArrowDownCircle} accentColor="#E8684A" />
            <KPICard label="Lucro Líquido" value={formatCurrency(lucroLiquido)} icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown} accentColor={lucroLiquido >= 0 ? '#2CBBA6' : '#E8684A'} />
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant={registroTab === 'receitas' ? 'default' : 'outline'}
              size="sm"
              className={registroTab === 'receitas' ? 'bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90' : ''}
              onClick={() => setRegistroTab('receitas')}
            >
              Receitas
            </Button>
            <Button
              variant={registroTab === 'despesas' ? 'default' : 'outline'}
              size="sm"
              className={registroTab === 'despesas' ? 'bg-[#E8684A] text-white hover:bg-[#E8684A]/90' : ''}
              onClick={() => setRegistroTab('despesas')}
            >
              Despesas
            </Button>
          </div>

          {/* Receitas Table */}
          {registroTab === 'receitas' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-center">Parcelas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allVendas.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-muted-foreground">{formatDate(v.data_venda)}</TableCell>
                          <TableCell>{v.nome || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${v.produto === 'business' ? 'bg-[#141A04] text-[#AFC040]' : v.produto === 'academy' ? 'bg-[#040E1A] text-[#4A9FE0]' : 'bg-[#031411] text-[#2CBBA6]'}`}>
                              {PRODUCT_LABELS[v.produto] || v.produto}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium" style={{ color: '#AFC040' }}>{formatCurrency(Number(v.valor))}</TableCell>
                          <TableCell className="text-muted-foreground">{v.forma_pagamento || '—'}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{v.parcelas || '—'}</TableCell>
                        </TableRow>
                      ))}
                      {allVendas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Sem receitas no período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Despesas Table */}
          {registroTab === 'despesas' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Despesas</CardTitle>
                  <div className="flex items-center gap-2">
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }}
                    />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => csvInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" />
                      Importar CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={replicarMesMutation.isPending}
                      onClick={() => replicarMesMutation.mutate()}
                    >
                      {replicarMesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      Replicar Mês
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                      onClick={() => setNovaDespesaOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nova Despesa
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDespesas.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-muted-foreground">{formatDate(d.data)}</TableCell>
                          <TableCell>{d.descricao || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${DESP_CATEGORY_COLORS[d.categoria] || DESP_CATEGORY_COLORS.outros}`}>
                              {d.categoria ? d.categoria.charAt(0).toUpperCase() + d.categoria.slice(1) : '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {d.tipo === 'fixa' ? 'Fixa' : 'Pontual'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${d.status === 'pago' ? 'bg-[#141A04] text-[#AFC040]' : d.status === 'pendente' ? 'bg-[#1A1206] text-[#E8A43C]' : 'bg-muted text-muted-foreground'}`}>
                              {d.status === 'pago' ? 'Pago' : d.status === 'pendente' ? 'Pendente' : d.status || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium" style={{ color: '#E8684A' }}>{formatCurrency(Number(d.valor))}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]"
                              disabled={deleteDespesaMutation.isPending}
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
                                  deleteDespesaMutation.mutate(d.id)
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {allDespesas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Sem despesas no período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Tab 4: Insights ─── */}
        <TabsContent value="insights" className="mt-4">
          <InsightsTable
            insights={insights || []}
            isLoading={insightsLoading}
            error={insightsError?.message}
            onRetry={() => refetchInsights()}
            title="Insights Financeiros"
            subtitle="Análise financeira gerada por IA com base nos dados do período"
            context="financeiro"
          />
        </TabsContent>
      </Tabs>

      {/* ─── Nova Despesa Dialog ─── */}
      <Dialog open={novaDespesaOpen} onOpenChange={setNovaDespesaOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Preencha os campos para adicionar uma nova despesa.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!novaDespesa.descricao || !novaDespesa.valor) { toast.error('Preencha todos os campos obrigatórios'); return }
              insertDespesaMutation.mutate({
                data: novaDespesa.data,
                descricao: novaDespesa.descricao,
                categoria: novaDespesa.categoria,
                tipo: novaDespesa.tipo,
                status: novaDespesa.status,
                pagamento: novaDespesa.pagamento,
                forma_pgto: novaDespesa.forma_pgto,
                valor: Number(novaDespesa.valor),
              })
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desp-data">Data *</Label>
                <Input id="desp-data" type="date" required value={novaDespesa.data} onChange={(e) => setNovaDespesa(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desp-valor">Valor *</Label>
                <Input id="desp-valor" type="number" step="0.01" min="0" required placeholder="0.00" value={novaDespesa.valor} onChange={(e) => setNovaDespesa(p => ({ ...p, valor: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desp-descricao">Descrição *</Label>
              <Input id="desp-descricao" required placeholder="Ex: Aluguel escritório" value={novaDespesa.descricao} onChange={(e) => setNovaDespesa(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={novaDespesa.categoria} onValueChange={(v) => setNovaDespesa(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folha">Folha</SelectItem>
                    <SelectItem value="sistemas">Sistemas</SelectItem>
                    <SelectItem value="publicidade">Publicidade</SelectItem>
                    <SelectItem value="custos">Custos</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={novaDespesa.tipo} onValueChange={(v) => setNovaDespesa(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="pontual">Pontual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={novaDespesa.status} onValueChange={(v) => setNovaDespesa(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Select value={novaDespesa.pagamento} onValueChange={(v) => setNovaDespesa(p => ({ ...p, pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_vista">À Vista</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma Pgto</Label>
                <Select value={novaDespesa.forma_pgto} onValueChange={(v) => setNovaDespesa(p => ({ ...p, forma_pgto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovaDespesaOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" disabled={insertDespesaMutation.isPending}>
                {insertDespesaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── CSV Import Dialog ─── */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importar Despesas via CSV</DialogTitle>
            <DialogDescription>
              Colunas esperadas: data, descricao, categoria, tipo, status, pagamento, forma_pgto, valor
            </DialogDescription>
          </DialogHeader>
          {csvRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Preview ({Math.min(csvRows.length, 5)} de {csvRows.length} linhas):</p>
              <div className="overflow-x-auto max-h-[240px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.data}</TableCell>
                        <TableCell className="text-xs">{r.descricao}</TableCell>
                        <TableCell className="text-xs">{r.categoria}</TableCell>
                        <TableCell className="text-xs">{r.tipo}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{r.valor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvDialogOpen(false); setCsvRows([]) }}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
              disabled={csvImporting || csvRows.length === 0}
              onClick={handleCsvImport}
            >
              {csvImporting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Importar {csvRows.length} linha(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
