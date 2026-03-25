import { useState, useMemo, useRef, useCallback } from 'react'
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
import { DollarSign, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Wallet, Receipt, Plus, Loader2, Trash2, Upload, Copy, Pencil } from 'lucide-react'
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
  sistemas: 'bg-[#0A0E1A] text-[#8A9FE0]',
  outros: 'bg-muted text-muted-foreground',
}

/* ─── Helpers ─── */
function monthKey(date: string) { return date.substring(0, 7) }
function monthIndex(mk: string) { return Number(mk.split('-')[1]) - 1 }

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

function fmtK(v: number): string {
  if (v === 0) return '-'
  if (v >= 1000000) return `${(v / 1000000).toFixed(2).replace('.', ',')}M`
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return String(v)
}

/* ─── BP Row definitions ─── */
interface BPRow {
  key: string
  label: string
  cat?: string // metas category key
  indent?: boolean
  isHeader?: boolean
  headerColor?: string
  headerBg?: string
  pctLabel?: string
  isCurrency?: boolean
  isPercent?: boolean
  isCalculated?: boolean
  calcFn?: (metas: Map<string, number>, monthIdx: number) => number
  execFn?: (vendas: any[], despesas: any[], monthKey: string) => number
}

const BP_ROWS: BPRow[] = [
  { key: 'receita_total', label: 'RECEITA GERAL', cat: 'receita_total', isHeader: true, headerColor: '#AFC040', headerBg: '#141A04', pctLabel: '100%', isCurrency: true,
    execFn: (v) => v.reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'receita_business', label: 'BUSINESS', cat: 'receita_business', indent: true, headerColor: '#4A7A20', headerBg: '#0F1504', pctLabel: '60%', isCurrency: true,
    execFn: (v) => v.filter((x: any) => x.produto === 'business').reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'business_ticket', label: 'Ticket Medio', cat: 'business_ticket', indent: true, isCurrency: true },
  { key: 'business_vendas', label: '#Vendas', cat: 'business_vendas', indent: true,
    execFn: (v) => v.filter((x: any) => x.produto === 'business').length },
  { key: 'business_sdrs', label: '#SDRs', cat: 'business_sdrs', indent: true },
  { key: 'business_vendedores', label: '#Vendedores', cat: 'business_vendedores', indent: true },
  { key: 'receita_skills', label: 'SKILLS', cat: 'receita_skills', indent: true, headerColor: '#2CBBA6', headerBg: '#031411', pctLabel: '15%', isCurrency: true,
    execFn: (v) => v.filter((x: any) => x.produto === 'skills').reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'skills_ticket', label: 'Ticket Medio', cat: 'skills_ticket', indent: true, isCurrency: true },
  { key: 'skills_vendas', label: '#Vendas', cat: 'skills_vendas', indent: true,
    execFn: (v) => v.filter((x: any) => x.produto === 'skills').length },
  { key: 'receita_academy', label: 'ACADEMY', cat: 'receita_academy', indent: true, headerColor: '#4A9FE0', headerBg: '#040E1A', pctLabel: '25%', isCurrency: true,
    execFn: (v) => v.filter((x: any) => x.produto === 'academy').reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'academy_ticket', label: 'Ticket Medio', cat: 'academy_ticket', indent: true, isCurrency: true },
  { key: 'academy_vendas', label: '#Vendas', cat: 'academy_vendas', indent: true,
    execFn: (v) => v.filter((x: any) => x.produto === 'academy').length },
  { key: 'folha_total', label: 'FOLHA', cat: 'folha_total', isHeader: true, headerColor: '#E8A43C', headerBg: '#1A1206', isCurrency: true,
    execFn: (v, d, mk) => d.filter((x: any) => x.categoria === 'folha' && monthKey(x.data) === mk).reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'folha_diretoria', label: 'Diretoria', cat: 'folha_diretoria', indent: true, isCurrency: true },
  { key: 'folha_marketing', label: 'Marketing', cat: 'folha_marketing', indent: true, isCurrency: true },
  { key: 'folha_vendas', label: 'Vendas', cat: 'folha_vendas', indent: true, isCurrency: true },
  { key: 'folha_comissao', label: 'Comissão (5%)', cat: 'folha_comissao', indent: true, pctLabel: '5%', isCurrency: true, isCalculated: true },
  { key: 'folha_operacoes', label: 'Operações', cat: 'folha_operacoes', indent: true, isCurrency: true },
  { key: 'publicidade', label: 'PUBLICIDADE', cat: 'publicidade', isHeader: true, headerColor: '#4A9FE0', headerBg: '#040E1A', pctLabel: '10%', isCurrency: true,
    execFn: (v, d, mk) => d.filter((x: any) => x.categoria === 'publicidade' && monthKey(x.data) === mk).reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'custos_total', label: 'CUSTOS', cat: 'custos_total', isHeader: true, headerColor: '#E8684A', headerBg: '#1A0804', isCurrency: true,
    execFn: (v, d, mk) => d.filter((x: any) => (x.categoria === 'custos' || x.categoria === 'impostos' || x.categoria === 'sistemas') && monthKey(x.data) === mk).reduce((s: number, x: any) => s + Number(x.valor || 0), 0) },
  { key: 'custos_impostos', label: 'Impostos (6%)', cat: 'custos_impostos', indent: true, pctLabel: '6%', isCurrency: true, isCalculated: true },
  { key: 'custos_sistemas', label: 'Sistemas', cat: 'custos_sistemas', indent: true, isCurrency: true },
  { key: 'resultado', label: 'RESULTADO', isHeader: true, headerColor: '#2CBBA6', headerBg: '#031411', isCurrency: true, isCalculated: true,
    calcFn: (m) => (m.get('receita_total') || 0) - (m.get('folha_total') || 0) - (m.get('publicidade') || 0) - (m.get('custos_total') || 0) },
  { key: 'margem', label: 'MARGEM %', isHeader: true, headerColor: '#E8EDD8', headerBg: '#031411', isPercent: true, isCalculated: true,
    calcFn: (m) => { const r = m.get('receita_total') || 0; const res = (m.get('receita_total') || 0) - (m.get('folha_total') || 0) - (m.get('publicidade') || 0) - (m.get('custos_total') || 0); return r > 0 ? (res / r) * 100 : 0 } },
]

/* ─── Component ─── */
export default function FinanceiroPainel() {
  const [period, setPeriod] = useState('ytd')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterProduct, setFilterProduct] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [bpYear, setBpYear] = useState(2026)
  const [registroTab, setRegistroTab] = useState<'receitas' | 'despesas'>('receitas')
  const [editingCell, setEditingCell] = useState<{ cat: string; mes: number } | null>(null)
  const [editValue, setEditValue] = useState('')

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
      const { data: fixas, error: fetchErr } = await (supabase as any).from('despesas').select('*').eq('tipo', 'fixa').gte('data', currentStart).lte('data', currentEnd)
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

  const upsertMetaMutation = useMutation({
    mutationFn: async ({ ano, mes, categoria, valor_projetado }: { ano: number; mes: number; categoria: string; valor_projetado: number }) => {
      // Try update first, then insert
      const { data: existing } = await (supabase as any).from('metas').select('id').eq('ano', ano).eq('mes', mes).eq('categoria', categoria).limit(1)
      if (existing && existing.length > 0) {
        const { error } = await (supabase as any).from('metas').update({ valor_projetado }).eq('id', existing[0].id)
        if (error) throw error
      } else {
        const { error } = await (supabase as any).from('metas').insert({ ano, mes, categoria, valor_projetado })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fin_metas'] })
      setEditingCell(null)
      toast.success('Meta atualizada!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
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
      const { data, error } = await supabase.from('vendas').select('*').gte('data_venda', range.start).lte('data_venda', range.end).order('data_venda', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: parcelasPagas, isLoading: parcelasLoading } = useQuery({
    queryKey: ['fin_parcelas_pagas', range],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('parcelas').select('*').eq('status', 'pago').gte('data_vencimento', range.start).lte('data_vencimento', range.end)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: parcelasPendentes } = useQuery({
    queryKey: ['fin_parcelas_pendentes', range],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('parcelas').select('*').eq('status', 'pendente').gte('data_vencimento', range.start).lte('data_vencimento', range.end)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: despesas, isLoading: despesasLoading } = useQuery({
    queryKey: ['fin_despesas', range],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('despesas').select('*').gte('data', range.start).lte('data', range.end).order('data', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: metas } = useQuery({
    queryKey: ['fin_metas', bpYear],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('metas').select('*').eq('ano', bpYear)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  const { data: allVendasYear } = useQuery({
    queryKey: ['fin_vendas_year', bpYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendas').select('*').gte('data_venda', `${bpYear}-01-01`).lte('data_venda', `${bpYear}-12-31`)
      if (error) throw error
      return data || []
    },
  })

  const { data: allDespesasYear } = useQuery({
    queryKey: ['fin_despesas_year', bpYear],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('despesas').select('*').gte('data', `${bpYear}-01-01`).lte('data', `${bpYear}-12-31`)
      if (error) throw error
      return (data || []) as any[]
    },
    retry: 1,
  })

  /* ─── Filtered data ─── */
  const allVendas = useMemo(() => {
    let v = vendas || []
    if (filterMonth !== 'all') v = v.filter(x => monthKey(x.data_venda) === filterMonth)
    if (filterProduct !== 'all') v = v.filter(x => x.produto === filterProduct)
    return v
  }, [vendas, filterMonth, filterProduct])

  const allDespesas = useMemo(() => {
    let d = (despesas || []) as any[]
    if (filterMonth !== 'all') d = d.filter(x => monthKey(x.data) === filterMonth)
    if (filterCategory !== 'all') d = d.filter(x => x.categoria === filterCategory)
    return d
  }, [despesas, filterMonth, filterCategory])

  const allParcPagas = useMemo(() => {
    let p = (parcelasPagas || []) as any[]
    if (filterMonth !== 'all') p = p.filter(x => monthKey(x.data_vencimento) === filterMonth)
    return p
  }, [parcelasPagas, filterMonth])

  const allParcPendentes = useMemo(() => {
    let p = (parcelasPendentes || []) as any[]
    if (filterMonth !== 'all') p = p.filter(x => monthKey(x.data_vencimento) === filterMonth)
    return p
  }, [parcelasPendentes, filterMonth])

  /* ─── Derived metrics ─── */
  const faturamento = allVendas.reduce((s, v) => s + Number(v.valor || 0), 0)
  const fluxoCaixa = allParcPagas.reduce((s: number, p: any) => s + Number(p.valor || 0), 0)
  const totalDespesas = allDespesas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0)
  const lucroLiquido = fluxoCaixa - totalDespesas
  const contasReceber = allParcPendentes.reduce((s: number, p: any) => s + Number(p.valor || 0), 0)

  /* ─── Evolution chart data ─── */
  const evolutionData = useMemo(() => {
    const months: Record<string, { faturamento: number; fluxo: number; despesas: number }> = {}
    for (const v of allVendas) {
      const mk = monthKey(v.data_venda)
      if (!months[mk]) months[mk] = { faturamento: 0, fluxo: 0, despesas: 0 }
      months[mk].faturamento += Number(v.valor || 0)
    }
    for (const p of allParcPagas) {
      const mk = monthKey(p.data_vencimento)
      if (!months[mk]) months[mk] = { faturamento: 0, fluxo: 0, despesas: 0 }
      months[mk].fluxo += Number(p.valor || 0)
    }
    for (const d of allDespesas) {
      const mk = monthKey(d.data)
      if (!months[mk]) months[mk] = { faturamento: 0, fluxo: 0, despesas: 0 }
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

  /* ─── Month filter options ─── */
  const monthOptions = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    return MONTH_LABELS.map((l, i) => ({ value: `${y}-${String(i + 1).padStart(2, '0')}`, label: l }))
  }, [])

  /* ─── Business Plan Data ─── */
  const bpData = useMemo(() => {
    const yearVendas = allVendasYear || []
    const yearDespesas = allDespesasYear || []
    const yearMetas = metas || []

    // Build lookup: { categoria: { mes: valor_projetado } }
    const metaLookup = new Map<string, Map<number, number>>()
    for (const m of yearMetas) {
      if (!metaLookup.has(m.categoria)) metaLookup.set(m.categoria, new Map())
      metaLookup.get(m.categoria)!.set(m.mes, Number(m.valor_projetado || 0))
    }

    const getMeta = (cat: string, mes: number) => metaLookup.get(cat)?.get(mes) || 0

    // For each month, calculate projected and executed for each row
    return MONTH_LABELS.map((label, idx) => {
      const mes = idx + 1
      const mk = `${bpYear}-${String(mes).padStart(2, '0')}`
      const mesVendas = yearVendas.filter(v => monthKey(v.data_venda) === mk)
      const mesDespesas = yearDespesas.filter((d: any) => monthKey(d.data) === mk)

      const projected = new Map<string, number>()
      const executed = new Map<string, number>()

      for (const row of BP_ROWS) {
        // Projected
        if (row.cat) {
          projected.set(row.key, getMeta(row.cat, mes))
        } else if (row.calcFn) {
          projected.set(row.key, row.calcFn(projected, idx))
        }

        // Executed
        if (row.execFn) {
          executed.set(row.key, row.execFn(mesVendas, mesDespesas, mk))
        } else if (row.calcFn) {
          executed.set(row.key, row.calcFn(executed, idx))
        } else {
          executed.set(row.key, 0)
        }
      }

      return { month: label, mes, mk, projected, executed }
    })
  }, [allVendasYear, allDespesasYear, metas, bpYear])

  // Totals for BP
  const bpTotals = useMemo(() => {
    const pTotals = new Map<string, number>()
    const eTotals = new Map<string, number>()
    for (const row of BP_ROWS) {
      let pSum = 0, eSum = 0
      for (const m of bpData) {
        pSum += m.projected.get(row.key) || 0
        eSum += m.executed.get(row.key) || 0
      }
      pTotals.set(row.key, pSum)
      eTotals.set(row.key, eSum)
    }
    return { projected: pTotals, executed: eTotals }
  }, [bpData])

  /* ─── Insights ─── */
  const todayStr = new Date().toISOString().split('T')[0]
  const overdueParcelas = allParcPendentes.filter((p: any) => p.data_vencimento < todayStr)
  const agingData = {
    ate30dias: overdueParcelas.filter((p: any) => { const d = Math.floor((Date.now() - new Date(p.data_vencimento).getTime()) / 86400000); return d <= 30 }).reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    de31a60dias: overdueParcelas.filter((p: any) => { const d = Math.floor((Date.now() - new Date(p.data_vencimento).getTime()) / 86400000); return d > 30 && d <= 60 }).reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    de61a90dias: overdueParcelas.filter((p: any) => { const d = Math.floor((Date.now() - new Date(p.data_vencimento).getTime()) / 86400000); return d > 60 && d <= 90 }).reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    acima90dias: overdueParcelas.filter((p: any) => { const d = Math.floor((Date.now() - new Date(p.data_vencimento).getTime()) / 86400000); return d > 90 }).reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
  }

  const insightsData = faturamento > 0 || totalDespesas > 0
    ? {
        faturamento, fluxoCaixa, totalDespesas, lucroLiquido, contasReceber,
        evolucao: evolutionData,
        parcelasVencidas: overdueParcelas.length,
        valorVencido: overdueParcelas.reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
        taxaInadimplencia: allParcPendentes.length > 0
          ? ((overdueParcelas.length / (allParcPagas.length + allParcPendentes.length)) * 100).toFixed(1) : '0',
        aging: agingData,
      }
    : null
  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({
    context: 'parcelas',
    data: insightsData,
    enabled: !!insightsData,
  })

  const isLoading = vendasLoading || parcelasLoading || despesasLoading

  const handleStartEdit = useCallback((cat: string, mes: number, currentValue: number) => {
    setEditingCell({ cat, mes })
    setEditValue(String(currentValue))
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return
    const val = Number(editValue) || 0
    upsertMetaMutation.mutate({ ano: bpYear, mes: editingCell.mes, categoria: editingCell.cat, valor_projetado: val })
  }, [editingCell, editValue, bpYear, upsertMetaMutation])

  /* ─── Render ─── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Controle Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel integrado de receitas, despesas e fluxo de caixa</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 text-sm w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
              <SelectItem value="12meses">12 Meses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 text-sm w-28"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="h-9 text-sm w-32"><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="skills">Skills</SelectItem>
              <SelectItem value="academy">Academy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="folha">Folha</SelectItem>
              <SelectItem value="publicidade">Publicidade</SelectItem>
              <SelectItem value="custos">Custos</SelectItem>
              <SelectItem value="impostos">Impostos</SelectItem>
              <SelectItem value="sistemas">Sistemas</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
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
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab 1: Painel Geral ─── */}
        <TabsContent value="painel" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard label="Vendido" value={formatCurrency(faturamento)} icon={DollarSign} accentColor="#AFC040" sub={`${allVendas.length} vendas`} />
            <KPICard label="Fluxo de Caixa" value={formatCurrency(fluxoCaixa)} icon={Wallet} accentColor="#4A9FE0" sub="Parcelas recebidas" />
            <KPICard label="Despesas" value={formatCurrency(totalDespesas)} icon={ArrowDownCircle} accentColor="#E8684A" sub={`${allDespesas.length} lançamentos`} />
            <KPICard label="Lucro Líquido" value={formatCurrency(lucroLiquido)} icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown} accentColor={lucroLiquido >= 0 ? '#2CBBA6' : '#E8684A'} sub={fluxoCaixa > 0 ? `Margem: ${((lucroLiquido / fluxoCaixa) * 100).toFixed(1)}%` : undefined} />
            <KPICard label="Contas a Receber" value={formatCurrency(contasReceber)} icon={Receipt} accentColor="#E8A43C" sub={`${allParcPendentes.length} parcelas`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Evolução Financeira Mensal</CardTitle></CardHeader>
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
        </TabsContent>

        {/* ─── Tab 2: Business Plan ─── */}
        <TabsContent value="bp" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Business Plan {bpYear}</h2>
              <Select value={String(bpYear)} onValueChange={(v) => setBpYear(Number(v))}>
                <SelectTrigger className="w-28 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#AFC040]/20 border border-[#AFC040]/40" /> P = Projetado</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border" /> E = Executado</span>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[160px]">Categoria</TableHead>
                      <TableHead className="text-center min-w-[50px]">%</TableHead>
                      {MONTH_LABELS.map(m => (
                        <TableHead key={m} className="text-center min-w-[110px]" colSpan={2}>{m}</TableHead>
                      ))}
                      <TableHead className="text-center min-w-[110px] font-bold" colSpan={2}>Total</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10" />
                      <TableHead />
                      {MONTH_LABELS.map(m => (
                        <><TableHead key={`${m}-p`} className="text-center text-xs text-muted-foreground">P</TableHead><TableHead key={`${m}-e`} className="text-center text-xs text-muted-foreground">E</TableHead></>
                      ))}
                      <TableHead className="text-center text-xs font-bold text-[#AFC040]">P</TableHead>
                      <TableHead className="text-center text-xs font-bold">E</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {BP_ROWS.map((row) => {
                      const isEditable = !!row.cat && !row.isCalculated
                      const bgClass = row.isHeader && row.headerBg ? `bg-[${row.headerBg}]/30` : ''
                      const isResultRow = row.key === 'resultado'
                      const isMargemRow = row.key === 'margem'

                      return (
                        <TableRow key={row.key} className={`${isResultRow ? 'border-t-2 font-bold' : ''} ${row.isHeader ? 'font-semibold' : ''}`}
                          style={row.isHeader && row.headerBg ? { backgroundColor: `${row.headerBg}30` } : undefined}>
                          <TableCell className="sticky left-0 z-10 text-xs" style={{
                            backgroundColor: row.isHeader && row.headerBg ? `${row.headerBg}50` : 'hsl(var(--card))',
                            color: row.headerColor || (row.indent ? 'hsl(var(--muted-foreground))' : undefined),
                            paddingLeft: row.indent ? '1.5rem' : undefined,
                          }}>
                            {row.label}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{row.pctLabel || '-'}</TableCell>
                          {bpData.map((m, mi) => {
                            const pVal = m.projected.get(row.key) || 0
                            const eVal = m.executed.get(row.key) || 0
                            const isCurrentEdit = editingCell?.cat === row.cat && editingCell?.mes === m.mes

                            return (
                              <>
                                <TableCell key={`${row.key}-p-${mi}`} className="text-center text-xs font-mono p-1"
                                  style={{ color: row.headerColor || '#8A9070' }}
                                  onClick={() => { if (isEditable && row.cat) handleStartEdit(row.cat, m.mes, pVal) }}>
                                  {isCurrentEdit ? (
                                    <Input
                                      type="number"
                                      className="h-6 w-16 text-xs text-center mx-auto p-0.5"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleSaveEdit}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                                      autoFocus
                                    />
                                  ) : (
                                    <span className={isEditable ? 'cursor-pointer hover:underline' : ''}>
                                      {row.isPercent ? `${pVal.toFixed(0)}%` : row.isCurrency ? fmtK(pVal) : (pVal === 0 ? '-' : pVal)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell key={`${row.key}-e-${mi}`} className="text-center text-xs font-mono p-1"
                                  style={{ color: isResultRow ? (eVal >= 0 ? '#2CBBA6' : '#E8684A') : isMargemRow ? (eVal >= 0 ? '#2CBBA6' : '#E8684A') : undefined }}>
                                  {row.isPercent ? `${eVal.toFixed(0)}%` : row.isCurrency ? fmtK(eVal) : (eVal === 0 ? '-' : eVal)}
                                </TableCell>
                              </>
                            )
                          })}
                          {/* Total columns */}
                          <TableCell className="text-center text-xs font-mono font-bold p-1" style={{ color: row.headerColor || '#AFC040' }}>
                            {row.isPercent
                              ? (() => {
                                  const totalR = bpTotals.projected.get('receita_total') || 0
                                  const totalRes = (bpTotals.projected.get('receita_total') || 0) - (bpTotals.projected.get('folha_total') || 0) - (bpTotals.projected.get('publicidade') || 0) - (bpTotals.projected.get('custos_total') || 0)
                                  return totalR > 0 ? `${((totalRes / totalR) * 100).toFixed(0)}%` : '0%'
                                })()
                              : row.isCurrency ? fmtK(bpTotals.projected.get(row.key) || 0) : (bpTotals.projected.get(row.key) || '-')}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold p-1">
                            {row.isPercent
                              ? (() => {
                                  const totalR = bpTotals.executed.get('receita_total') || 0
                                  const totalRes = (bpTotals.executed.get('receita_total') || 0) - (bpTotals.executed.get('folha_total') || 0) - (bpTotals.executed.get('publicidade') || 0) - (bpTotals.executed.get('custos_total') || 0)
                                  return totalR > 0 ? `${((totalRes / totalR) * 100).toFixed(0)}%` : '0%'
                                })()
                              : row.isCurrency ? fmtK(bpTotals.executed.get(row.key) || 0) : (bpTotals.executed.get(row.key) || '-')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Registros ─── */}
        <TabsContent value="registros" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Faturamento" value={formatCurrency(faturamento)} icon={DollarSign} accentColor="#AFC040" />
            <KPICard label="Fluxo de Caixa" value={formatCurrency(fluxoCaixa)} icon={ArrowUpCircle} accentColor="#4A9FE0" />
            <KPICard label="Despesas Líquidas" value={formatCurrency(totalDespesas)} icon={ArrowDownCircle} accentColor="#E8684A" />
            <KPICard label="Lucro Líquido" value={formatCurrency(lucroLiquido)} icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown} accentColor={lucroLiquido >= 0 ? '#2CBBA6' : '#E8684A'} />
          </div>

          <div className="flex items-center gap-2">
            <Button variant={registroTab === 'receitas' ? 'default' : 'outline'} size="sm" className={registroTab === 'receitas' ? 'bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90' : ''} onClick={() => setRegistroTab('receitas')}>Receitas</Button>
            <Button variant={registroTab === 'despesas' ? 'default' : 'outline'} size="sm" className={registroTab === 'despesas' ? 'bg-[#E8684A] text-white hover:bg-[#E8684A]/90' : ''} onClick={() => setRegistroTab('despesas')}>Despesas</Button>
          </div>

          {registroTab === 'receitas' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Receitas</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Produto</TableHead>
                        <TableHead className="text-right">Valor</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-center">Parcelas</TableHead>
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
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem receitas no período</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {registroTab === 'despesas' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Despesas</CardTitle>
                  <div className="flex items-center gap-2">
                    <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }} />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => csvInputRef.current?.click()}><Upload className="h-3.5 w-3.5" />Importar CSV</Button>
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={replicarMesMutation.isPending} onClick={() => replicarMesMutation.mutate()}>
                      {replicarMesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}Replicar Mês
                    </Button>
                    <Button size="sm" className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" onClick={() => setNovaDespesaOpen(true)}><Plus className="h-3.5 w-3.5" />Nova Despesa</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDespesas.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-muted-foreground">{formatDate(d.data)}</TableCell>
                          <TableCell>{d.descricao || '—'}</TableCell>
                          <TableCell><Badge className={`text-xs ${DESP_CATEGORY_COLORS[d.categoria] || DESP_CATEGORY_COLORS.outros}`}>{d.categoria ? d.categoria.charAt(0).toUpperCase() + d.categoria.slice(1) : '—'}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{d.tipo === 'fixa' ? 'Fixa' : 'Pontual'}</Badge></TableCell>
                          <TableCell><Badge className={`text-xs ${d.status === 'pago' ? 'bg-[#141A04] text-[#AFC040]' : 'bg-[#1A1206] text-[#E8A43C]'}`}>{d.status === 'pago' ? 'Pago' : 'Pendente'}</Badge></TableCell>
                          <TableCell className="text-right font-mono font-medium" style={{ color: '#E8684A' }}>{formatCurrency(Number(d.valor))}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]" disabled={deleteDespesaMutation.isPending}
                              onClick={() => { if (window.confirm('Excluir esta despesa?')) deleteDespesaMutation.mutate(d.id) }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {allDespesas.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem despesas no período</TableCell></TableRow>
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
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights Financeiros" subtitle="Análise financeira gerada por IA" context="financeiro" />
        </TabsContent>
      </Tabs>

      {/* ─── Nova Despesa Dialog ─── */}
      <Dialog open={novaDespesaOpen} onOpenChange={setNovaDespesaOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Preencha os campos para adicionar uma nova despesa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (!novaDespesa.descricao || !novaDespesa.valor) { toast.error('Preencha todos os campos obrigatórios'); return }
            insertDespesaMutation.mutate({ data: novaDespesa.data, descricao: novaDespesa.descricao, categoria: novaDespesa.categoria, tipo: novaDespesa.tipo, status: novaDespesa.status, pagamento: novaDespesa.pagamento, forma_pgto: novaDespesa.forma_pgto, valor: Number(novaDespesa.valor) })
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="desp-data">Data *</Label><Input id="desp-data" type="date" required value={novaDespesa.data} onChange={(e) => setNovaDespesa(p => ({ ...p, data: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="desp-valor">Valor *</Label><Input id="desp-valor" type="number" step="0.01" min="0" required placeholder="0.00" value={novaDespesa.valor} onChange={(e) => setNovaDespesa(p => ({ ...p, valor: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="desp-descricao">Descrição *</Label><Input id="desp-descricao" required placeholder="Ex: Aluguel escritório" value={novaDespesa.descricao} onChange={(e) => setNovaDespesa(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Categoria</Label><Select value={novaDespesa.categoria} onValueChange={(v) => setNovaDespesa(p => ({ ...p, categoria: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="folha">Folha</SelectItem><SelectItem value="sistemas">Sistemas</SelectItem><SelectItem value="publicidade">Publicidade</SelectItem><SelectItem value="custos">Custos</SelectItem><SelectItem value="outros">Outros</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Tipo</Label><Select value={novaDespesa.tipo} onValueChange={(v) => setNovaDespesa(p => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixa">Fixa</SelectItem><SelectItem value="pontual">Pontual</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Status</Label><Select value={novaDespesa.status} onValueChange={(v) => setNovaDespesa(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Pagamento</Label><Select value={novaDespesa.pagamento} onValueChange={(v) => setNovaDespesa(p => ({ ...p, pagamento: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a_vista">À Vista</SelectItem><SelectItem value="parcelado">Parcelado</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Forma Pgto</Label><Select value={novaDespesa.forma_pgto} onValueChange={(v) => setNovaDespesa(p => ({ ...p, forma_pgto: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pix">PIX</SelectItem><SelectItem value="boleto">Boleto</SelectItem><SelectItem value="cartao">Cartão</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovaDespesaOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" disabled={insertDespesaMutation.isPending}>
                {insertDespesaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
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
            <DialogDescription>Colunas esperadas: data, descricao, categoria, tipo, status, pagamento, forma_pgto, valor</DialogDescription>
          </DialogHeader>
          {csvRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Preview ({Math.min(csvRows.length, 5)} de {csvRows.length} linhas):</p>
              <div className="overflow-x-auto max-h-[240px] border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Data</TableHead><TableHead className="text-xs">Descrição</TableHead><TableHead className="text-xs">Categoria</TableHead><TableHead className="text-xs">Tipo</TableHead><TableHead className="text-xs text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}><TableCell className="text-xs">{r.data}</TableCell><TableCell className="text-xs">{r.descricao}</TableCell><TableCell className="text-xs">{r.categoria}</TableCell><TableCell className="text-xs">{r.tipo}</TableCell><TableCell className="text-xs text-right font-mono">{r.valor}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvDialogOpen(false); setCsvRows([]) }}>Cancelar</Button>
            <Button className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" disabled={csvImporting || csvRows.length === 0} onClick={handleCsvImport}>
              {csvImporting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Importar {csvRows.length} linha(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
