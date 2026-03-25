import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { FiscalAIButton } from '@/components/financeiro/FiscalAIButton'
import { EditVendaDialog } from '@/components/financeiro/EditVendaDialog'
import { VendaParcelasDialog } from '@/components/financeiro/VendaParcelasDialog'
import { RepassesTab } from '@/components/financeiro/RepassesTab'
import { toast } from 'sonner'
import { ShoppingCart, Receipt, FileText, Search, DollarSign, Users, AlertCircle, CheckCircle, Send, Plus, Trash2, Upload, Pencil, CreditCard, Save } from 'lucide-react'

const PRODUCT_LABELS: Record<string, string> = { academy: 'Academy', business: 'Business', skills: 'Skills', ferramentas: 'Ferramentas' }

function productBadgeClass(produto: string) {
  switch (produto) {
    case 'business': return 'bg-[#141A04] text-[#AFC040]'
    case 'academy': return 'bg-[#040E1A] text-[#4A9FE0]'
    case 'skills': return 'bg-[#031411] text-[#2CBBA6]'
    default: return 'bg-muted text-muted-foreground'
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'concluido': return 'bg-[#141A04] text-[#AFC040]'
    case 'em_andamento': return 'bg-[#1A1206] text-[#E8A43C]'
    case 'cancelado': return 'bg-[#1A0604] text-[#E8684A]'
    default: return 'bg-muted text-muted-foreground'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'concluido': return 'Concluido'
    case 'em_andamento': return 'Em andamento'
    case 'cancelado': return 'Cancelado'
    default: return status
  }
}

function nfStatusBadgeClass(status: string) {
  switch (status) {
    case 'emitida': return 'bg-[#141A04] text-[#AFC040]'
    case 'enviada': return 'bg-[#040E1A] text-[#4A9FE0]'
    case 'pendente': return 'bg-[#1A1206] text-[#E8A43C]'
    case 'erro': return 'bg-[#1A0604] text-[#E8684A]'
    default: return 'bg-muted text-muted-foreground'
  }
}

function nfStatusLabel(status: string) {
  switch (status) {
    case 'emitida': return 'Emitida'
    case 'enviada': return 'Enviada'
    case 'pendente': return 'Pendente'
    case 'erro': return 'Erro'
    default: return status
  }
}


export default function GestaoVendas() {
  const queryClient = useQueryClient()

  /* ─── State ─── */
  const [searchVendas, setSearchVendas] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterProduto, setFilterProduto] = useState('todos')
  const [sortVendas, setSortVendas] = useState('recente')

  const [fiscalProduto, setFiscalProduto] = useState('todos')
  const [fiscalStatus, setFiscalStatus] = useState('todos')

  const [regAno, setRegAno] = useState('todos')
  const [regMes, setRegMes] = useState('todos')
  const [regMostrarRegularizados, setRegMostrarRegularizados] = useState(false)

  /* ─── Edit/Parcelas Dialog State ─── */
  const [editVenda, setEditVenda] = useState<any>(null)
  const [editVendaOpen, setEditVendaOpen] = useState(false)
  const [parcelasVendaId, setParcelasVendaId] = useState<string | null>(null)
  const [parcelasVendaNome, setParcelasVendaNome] = useState('')
  const [parcelasOpen, setParcelasOpen] = useState(false)

  /* ─── Inline Fiscal Editing State ─── */
  const [editingFiscalId, setEditingFiscalId] = useState<string | null>(null)
  const [fiscalEditForm, setFiscalEditForm] = useState<Record<string, any>>({})

  /* ─── Inline Reg Editing State ─── */
  const [editingRegId, setEditingRegId] = useState<string | null>(null)
  const [regEditForm, setRegEditForm] = useState<Record<string, any>>({})

  /* ─── Nova Venda Dialog State ─── */
  const [novaVendaOpen, setNovaVendaOpen] = useState(false)
  const [nvForm, setNvForm] = useState({
    nome_cliente: '',
    email: '',
    telefone: '',
    produto: 'academy',
    valor_contrato: '',
    data_venda: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix_a_vista',
    parcelas: '1',
    por_indicacao: false,
    cpf_cnpj: '',
    razao_social: '',
  })

  const resetNvForm = () => setNvForm({
    nome_cliente: '', email: '', telefone: '', produto: 'academy',
    valor_contrato: '', data_venda: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix_a_vista', parcelas: '1', por_indicacao: false,
    cpf_cnpj: '', razao_social: '',
  })

  /* ─── CSV Import Dialog State ─── */
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvProgress, setCsvProgress] = useState(0)
  const csvFileRef = useRef<HTMLInputElement>(null)

  /* ─── Mutations ─── */
  const createVendaMutation = useMutation({
    mutationFn: async (form: typeof nvForm) => {
      const valor = Number(form.valor_contrato)
      const numParcelas = Number(form.parcelas) || 1

      // 1. Insert venda
      const { data: venda, error: vendaErr } = await (supabase as any)
        .from('vendas')
        .insert({
          nome: form.nome_cliente,
          email: form.email || null,
          telefone: form.telefone || null,
          produto: form.produto,
          valor: valor,
          data_venda: form.data_venda,
          forma_pagamento: form.forma_pagamento,
          parcelas: numParcelas,
          por_indicacao: form.por_indicacao,
          cpf_cnpj: form.cpf_cnpj || null,
          razao_social: form.razao_social || null,
          status: 'em_andamento',
        })
        .select()
        .single()
      if (vendaErr) throw vendaErr

      // 2. Auto-generate parcelas
      const valorParcela = Math.round((valor / numParcelas) * 100) / 100
      const parcelasArr = Array.from({ length: numParcelas }, (_, i) => {
        const dueDate = new Date(form.data_venda)
        dueDate.setMonth(dueDate.getMonth() + i)
        return {
          venda_id: venda.id,
          numero: i + 1,
          valor: i === numParcelas - 1 ? Math.round((valor - valorParcela * (numParcelas - 1)) * 100) / 100 : valorParcela,
          data_vencimento: dueDate.toISOString().split('T')[0],
          status: 'pendente',
        }
      })
      const { error: parcelasErr } = await (supabase as any).from('parcelas').insert(parcelasArr)
      if (parcelasErr) throw parcelasErr

      // 3. If business, auto-generate notas_fiscais
      if (form.produto === 'business') {
        const nfArr = Array.from({ length: numParcelas }, (_, i) => {
          const mesRef = new Date(form.data_venda)
          mesRef.setMonth(mesRef.getMonth() + i)
          return {
            venda_id: venda.id,
            nome: form.nome_cliente,
            email: form.email || null,
            cpf_cnpj: form.cpf_cnpj || null,
            razao_social: form.razao_social || null,
            produto: form.produto,
            valor: valorParcela,
            mes_ref: mesRef.toISOString().split('T')[0].substring(0, 7),
            status: 'pendente',
          }
        })
        const { error: nfErr } = await (supabase as any).from('notas_fiscais').insert(nfArr)
        if (nfErr) throw nfErr
      }

      // 4. If por_indicacao, create repasse (10%)
      if (form.por_indicacao) {
        await (supabase as any).from('repasses').insert({
          venda_id: venda.id,
          valor: Math.round(valor * 0.1 * 100) / 100,
          status: 'pendente',
        })
      }

      return venda
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-vendas'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-parcelas'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-notas-fiscais'] })
      setNovaVendaOpen(false)
      resetNvForm()
      toast.success('Venda criada com sucesso!')
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar venda: ${err.message}`)
    },
  })

  const deleteVendaMutation = useMutation({
    mutationFn: async (vendaId: string) => {
      // Delete parcelas and notas_fiscais first (or rely on FK cascade)
      await (supabase as any).from('parcelas').delete().eq('venda_id', vendaId)
      await (supabase as any).from('notas_fiscais').delete().eq('venda_id', vendaId)
      await (supabase as any).from('repasses').delete().eq('venda_id', vendaId)
      const { error } = await (supabase as any).from('vendas').delete().eq('id', vendaId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-vendas'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-parcelas'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-notas-fiscais'] })
      toast.success('Venda excluida com sucesso!')
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir venda: ${err.message}`)
    },
  })

  /* ─── Inline Fiscal Save Mutation ─── */
  const saveFiscalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const { error } = await (supabase as any).from('vendas').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-vendas'] })
      setEditingFiscalId(null)
      toast.success('Dados fiscais atualizados!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  /* ─── Inline Reg Save Mutation ─── */
  const saveRegMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const { error } = await (supabase as any).from('notas_fiscais').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-notas-fiscais'] })
      setEditingRegId(null)
      toast.success('NF atualizada!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  /* ─── CSV Parsing ─── */
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.trim().split('\n')
      if (lines.length < 2) { toast.error('CSV vazio ou sem dados'); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = values[i] || '' })
        return row
      }).filter(r => r.nome || r.email)
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (csvRows.length === 0) return
    setCsvImporting(true)
    setCsvProgress(0)
    let success = 0
    for (let i = 0; i < csvRows.length; i++) {
      const r = csvRows[i]
      try {
        const valor = Number(r.valor) || 0
        const numParcelas = Number(r.parcelas) || 1
        const dataVenda = r.data_venda || new Date().toISOString().split('T')[0]

        const { data: venda, error: vendaErr } = await (supabase as any)
          .from('vendas')
          .insert({
            nome: r.nome || '',
            email: r.email || null,
            telefone: r.telefone || null,
            produto: r.produto || 'academy',
            valor: valor,
            data_venda: dataVenda,
            forma_pagamento: r.forma_pagamento || 'pix_a_vista',
            parcelas: numParcelas,
            status: r.status || 'em_andamento',
            cpf_cnpj: r.cpf_cnpj || null,
            razao_social: r.razao_social || null,
          })
          .select()
          .single()
        if (vendaErr) throw vendaErr

        // Auto-generate parcelas
        const valorParcela = Math.round((valor / numParcelas) * 100) / 100
        const parcelasArr = Array.from({ length: numParcelas }, (_, idx) => {
          const dueDate = new Date(dataVenda)
          dueDate.setMonth(dueDate.getMonth() + idx)
          return {
            venda_id: venda.id,
            numero: idx + 1,
            valor: idx === numParcelas - 1 ? Math.round((valor - valorParcela * (numParcelas - 1)) * 100) / 100 : valorParcela,
            data_vencimento: dueDate.toISOString().split('T')[0],
            status: 'pendente',
          }
        })
        await (supabase as any).from('parcelas').insert(parcelasArr)
        success++
      } catch (err) {
        console.error(`Erro ao importar linha ${i + 1}:`, err)
      }
      setCsvProgress(Math.round(((i + 1) / csvRows.length) * 100))
    }
    setCsvImporting(false)
    queryClient.invalidateQueries({ queryKey: ['gestao-vendas'] })
    queryClient.invalidateQueries({ queryKey: ['gestao-parcelas'] })
    toast.success(`${success} de ${csvRows.length} vendas importadas com sucesso!`)
    setCsvRows([])
    setCsvOpen(false)
    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  /* ─── Queries ─── */
  const { data: vendas, isLoading: vendasLoading } = useQuery({
    queryKey: ['gestao-vendas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('vendas').select('*').order('data_venda', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: parcelas } = useQuery({
    queryKey: ['gestao-parcelas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('parcelas').select('*')
      if (error) throw error
      return data || []
    },
  })

  const { data: notasFiscais, isLoading: nfLoading } = useQuery({
    queryKey: ['gestao-notas-fiscais'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('notas_fiscais').select('*')
      if (error) throw error
      return data || []
    },
  })

  const allVendas: any[] = vendas || []
  const allParcelas: any[] = parcelas || []
  const allNFs: any[] = notasFiscais || []

  /* ─── Derived KPIs (Vendas) ─── */
  const totalVendas = allVendas.length
  const emAndamento = allVendas.filter((v: any) => v.status === 'em_andamento').length
  const concluidos = allVendas.filter((v: any) => v.status === 'concluido').length
  const receitaTotal = allVendas.reduce((s: number, v: any) => s + Number(v.valor || 0), 0)
  const receitaAcademy = allVendas.filter((v: any) => v.produto === 'academy').reduce((s: number, v: any) => s + Number(v.valor || 0), 0)
  const receitaBusiness = allVendas.filter((v: any) => v.produto === 'business').reduce((s: number, v: any) => s + Number(v.valor || 0), 0)

  // Evolucao mensal (% vs previous month)
  const evolucaoMensal = useMemo(() => {
    const byMonth: Record<string, number> = {}
    for (const v of allVendas) {
      const m = (v.data_venda || '').substring(0, 7)
      if (m) byMonth[m] = (byMonth[m] || 0) + Number(v.valor || 0)
    }
    const months = Object.keys(byMonth).sort()
    if (months.length < 2) return null
    const curr = byMonth[months[months.length - 1]]
    const prev = byMonth[months[months.length - 2]]
    if (!prev) return null
    return ((curr - prev) / prev) * 100
  }, [allVendas])

  /* ─── Filtered Vendas ─── */
  const filteredVendas = useMemo(() => {
    let result = [...allVendas]
    if (searchVendas.trim()) {
      const q = searchVendas.toLowerCase()
      result = result.filter((v: any) =>
        (v.nome || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'todos') result = result.filter((v: any) => v.status === filterStatus)
    if (filterProduto !== 'todos') result = result.filter((v: any) => v.produto === filterProduto)
    if (sortVendas === 'recente') result.sort((a: any, b: any) => (b.data_venda || '').localeCompare(a.data_venda || ''))
    else result.sort((a: any, b: any) => (a.data_venda || '').localeCompare(b.data_venda || ''))
    return result
  }, [allVendas, searchVendas, filterStatus, filterProduto, sortVendas])

  /* ─── Fiscal KPIs (from vendas table - client fiscal profile) ─── */
  const fiscalClientes = allVendas.length
  const nfPendentesVendas = allVendas.filter((v: any) => (v.status_nf || 'pendente') === 'pendente').length
  const nfEmitidasVendas = allVendas.filter((v: any) => v.status_nf === 'emitida').length
  const nfEnviadasVendas = allVendas.filter((v: any) => v.status_nf === 'enviada').length

  /* ─── Filtered Fiscal (from vendas) ─── */
  const filteredFiscal = useMemo(() => {
    let result = [...allVendas]
    if (fiscalProduto !== 'todos') result = result.filter((v: any) => v.produto === fiscalProduto)
    if (fiscalStatus !== 'todos') result = result.filter((v: any) => (v.status_nf || 'pendente') === fiscalStatus)
    return result
  }, [allVendas, fiscalProduto, fiscalStatus])

  /* ─── Regularização KPIs (from notas_fiscais - monthly NFs) ─── */
  const nfPendentes = allNFs.filter((n: any) => n.status_nf === 'pendente').length
  const nfEmitidas = allNFs.filter((n: any) => n.status_nf === 'emitida').length
  const nfEnviadas = allNFs.filter((n: any) => n.status_nf === 'enviada').length

  /* ─── Filtered Regularizacao (from notas_fiscais) ─── */
  const totalReg = allNFs.length
  const pendentesReg = allNFs.filter((n: any) => n.status_nf === 'pendente').length
  const jaRegularizados = allNFs.filter((n: any) => n.status_nf === 'emitida' || n.status_nf === 'enviada').length

  /* ─── Filtered Regularizacao ─── */
  const MES_NAMES: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  }
  const filteredReg = useMemo(() => {
    let result = [...allNFs]
    if (regAno !== 'todos') result = result.filter((n: any) => {
      const ref = n.mes_referencia || ''
      const match = ref.match(/(\d{4})/)
      if (match) return match[1] === regAno
      const y = (n.data_emissao || n.created_at || '').substring(0, 4)
      return y === regAno
    })
    if (regMes !== 'todos') result = result.filter((n: any) => {
      const ref = n.mes_referencia || ''
      const mesName = MES_NAMES[regMes] || ''
      if (mesName && ref.toLowerCase().includes(mesName.toLowerCase())) return true
      const m = (n.data_emissao || n.created_at || '').substring(5, 7)
      return m === regMes
    })
    if (!regMostrarRegularizados) {
      result = result.filter((n: any) => {
        const st = n.status_nf || 'pendente'
        return st !== 'emitida' && st !== 'enviada'
      })
    }
    return result
  }, [allNFs, regAno, regMes, regMostrarRegularizados])

  /* ─── Insights ─── */
  const insightsData = totalVendas > 0 ? {
    receitaTotal,
    totalVendas,
    emAndamento,
    concluidos,
    receitaAcademy,
    receitaBusiness,
    evolucaoMensal,
    nfPendentes,
    nfEmitidas,
    nfEnviadas,
  } : null

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({
    context: 'financeiro',
    data: insightsData,
    enabled: totalVendas > 0,
  })

  /* ─── Fiscal Insights (from vendas - client fiscal profile) ─── */
  const fiscalInsightsData = allVendas.length > 0 ? {
    totalClientes: allVendas.length,
    nfPendentes: nfPendentesVendas,
    nfEmitidas: nfEmitidasVendas,
    nfEnviadas: nfEnviadasVendas,
    clientesSemCpfCnpj: allVendas.filter((v: any) => !v.cpf_cnpj).length,
    clientesSemRazaoSocial: allVendas.filter((v: any) => !v.razao_social).length,
    clientesSemEmailFiscal: allVendas.filter((v: any) => !v.email_fiscal).length,
    clientesSemDescricaoServico: allVendas.filter((v: any) => !v.descricao_servico).length,
    receitaTotal,
  } : null

  const { data: fiscalInsights, isLoading: fiscalInsightsLoading, error: fiscalInsightsError, refetch: refetchFiscalInsights } = useInsights({
    context: 'fiscal',
    data: fiscalInsightsData,
    enabled: allVendas.length > 0,
  })

  /* ─── Parcelas Insights ─── */
  const today = new Date().toISOString().split('T')[0]
  const parcelasVencidas = allParcelas.filter((p: any) => p.status === 'pendente' && p.data_vencimento < today)
  const parcelasPagas = allParcelas.filter((p: any) => p.status === 'pago')
  const parcelasPendentesAll = allParcelas.filter((p: any) => p.status === 'pendente')

  const parcelasInsightsData = allParcelas.length > 0 ? {
    totalParcelas: allParcelas.length,
    parcelasPagas: parcelasPagas.length,
    parcelasPendentes: parcelasPendentesAll.length,
    parcelasVencidas: parcelasVencidas.length,
    valorTotalParcelas: allParcelas.reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    valorPago: parcelasPagas.reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    valorPendente: parcelasPendentesAll.reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    valorVencido: parcelasVencidas.reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    aging: {
      ate30dias: parcelasVencidas.filter((p: any) => {
        const dias = Math.floor((new Date().getTime() - new Date(p.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
        return dias <= 30
      }).length,
      de31a60dias: parcelasVencidas.filter((p: any) => {
        const dias = Math.floor((new Date().getTime() - new Date(p.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 30 && dias <= 60
      }).length,
      de61a90dias: parcelasVencidas.filter((p: any) => {
        const dias = Math.floor((new Date().getTime() - new Date(p.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 60 && dias <= 90
      }).length,
      acima90dias: parcelasVencidas.filter((p: any) => {
        const dias = Math.floor((new Date().getTime() - new Date(p.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 90
      }).length,
    },
    taxaInadimplencia: allParcelas.length > 0 ? ((parcelasVencidas.length / allParcelas.length) * 100).toFixed(1) : '0',
  } : null

  const { data: parcelasInsights, isLoading: parcelasInsightsLoading, error: parcelasInsightsError, refetch: refetchParcelasInsights } = useInsights({
    context: 'parcelas',
    data: parcelasInsightsData,
    enabled: allParcelas.length > 0,
  })

  /* ─── Available years for reg filters ─── */
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    for (const n of allNFs) {
      // mes_referencia is like "Março/2026"
      const match = (n.mes_referencia || '').match(/(\d{4})/)
      if (match) years.add(match[1])
      const y = (n.data_emissao || n.created_at || '').substring(0, 4)
      if (y && y.length === 4) years.add(y)
    }
    return Array.from(years).sort().reverse()
  }, [allNFs])

  const MONTHS = [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Marco' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* ─── Header ─── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Comercial — Vendas</h1>
          <Badge variant="secondary">{totalVendas} vendas</Badge>
          <Badge className="bg-[#1A1206] text-[#E8A43C]">{emAndamento} em andamento</Badge>
          <Badge className="bg-[#141A04] text-[#AFC040]">{concluidos} concluidos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Gestao integrada de vendas, fiscal e regularizacao</p>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Vendas Realizadas"
          value={totalVendas}
          sub={`Total: ${formatCurrency(receitaTotal)}`}
          icon={ShoppingCart}
          accentColor="#2CBBA6"
        />
        <KPICard
          label="Receita Academy"
          value={formatCurrency(receitaAcademy)}
          icon={DollarSign}
          accentColor="#4A9FE0"
        />
        <KPICard
          label="Receita Business"
          value={formatCurrency(receitaBusiness)}
          icon={DollarSign}
          accentColor="#AFC040"
        />
        <KPICard
          label="Evolucao Mensal"
          value={evolucaoMensal != null ? `${evolucaoMensal >= 0 ? '+' : ''}${evolucaoMensal.toFixed(1)}%` : '—'}
          sub="vs. mes anterior"
          icon={Receipt}
          accentColor={evolucaoMensal != null && evolucaoMensal >= 0 ? '#AFC040' : '#E8684A'}
          trend={evolucaoMensal != null ? { value: `${Math.abs(evolucaoMensal).toFixed(1)}%`, positive: evolucaoMensal >= 0 } : undefined}
        />
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="vendas">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[
            { v: 'vendas', l: 'Vendas' },
            { v: 'fiscal', l: 'Fiscal' },
            { v: 'regularizacao', l: 'Regularizacao NF' },
            { v: 'repasses', l: 'Repasses' },
            { v: 'insights', l: 'Insights' },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ════════════════ Tab: Vendas ════════════════ */}
        <TabsContent value="vendas" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">Todas as Vendas</CardTitle>
                <div className="flex gap-2">
                  {/* ─── CSV Import Dialog ─── */}
                  <Dialog open={csvOpen} onOpenChange={(open) => { setCsvOpen(open); if (!open) { setCsvRows([]); if (csvFileRef.current) csvFileRef.current.value = '' } }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="font-semibold">
                        <Upload className="h-4 w-4 mr-1" />
                        Importar CSV
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Importar Vendas via CSV</DialogTitle>
                        <DialogDescription>
                          Colunas esperadas: nome, email, telefone, produto, valor, data_venda, forma_pagamento, parcelas, status, cpf_cnpj, razao_social
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Input ref={csvFileRef} type="file" accept=".csv" onChange={handleCsvFile} />
                        {csvRows.length > 0 && (
                          <>
                            <p className="text-sm text-muted-foreground">Preview ({Math.min(5, csvRows.length)} de {csvRows.length} linhas):</p>
                            <div className="overflow-x-auto border rounded max-h-[200px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Nome</TableHead>
                                    <TableHead className="text-xs">Email</TableHead>
                                    <TableHead className="text-xs">Produto</TableHead>
                                    <TableHead className="text-xs">Valor</TableHead>
                                    <TableHead className="text-xs">Parcelas</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {csvRows.slice(0, 5).map((r, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="text-xs">{r.nome || '—'}</TableCell>
                                      <TableCell className="text-xs">{r.email || '—'}</TableCell>
                                      <TableCell className="text-xs">{r.produto || '—'}</TableCell>
                                      <TableCell className="text-xs">{r.valor || '—'}</TableCell>
                                      <TableCell className="text-xs">{r.parcelas || '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        )}
                        {csvImporting && (
                          <div className="space-y-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="bg-[#AFC040] h-2 rounded-full transition-all" style={{ width: `${csvProgress}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">{csvProgress}% concluido</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCsvOpen(false)} disabled={csvImporting}>Cancelar</Button>
                        <Button
                          className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                          onClick={handleCsvImport}
                          disabled={csvRows.length === 0 || csvImporting}
                        >
                          {csvImporting ? 'Importando...' : `Importar ${csvRows.length} vendas`}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* ─── Nova Venda Dialog ─── */}
                  <Dialog open={novaVendaOpen} onOpenChange={(open) => { setNovaVendaOpen(open); if (!open) resetNvForm() }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold">
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Venda
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Nova Venda</DialogTitle>
                        <DialogDescription>Preencha os dados para registrar uma nova venda.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="nv-nome">Nome do Cliente *</Label>
                          <Input id="nv-nome" value={nvForm.nome_cliente} onChange={e => setNvForm(f => ({ ...f, nome_cliente: e.target.value }))} placeholder="Nome completo" required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="nv-email">Email</Label>
                            <Input id="nv-email" type="email" value={nvForm.email} onChange={e => setNvForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="nv-telefone">Telefone</Label>
                            <Input id="nv-telefone" value={nvForm.telefone} onChange={e => setNvForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label>Produto</Label>
                            <Select value={nvForm.produto} onValueChange={v => setNvForm(f => ({ ...f, produto: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="academy">Academy</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="skills">Skills</SelectItem>
                                <SelectItem value="ferramentas">Ferramentas</SelectItem>
                                <SelectItem value="hora_trabalho">Hora Trabalho</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="nv-valor">Valor do Contrato *</Label>
                            <Input id="nv-valor" type="number" min="0" step="0.01" value={nvForm.valor_contrato} onChange={e => setNvForm(f => ({ ...f, valor_contrato: e.target.value }))} placeholder="0.00" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="nv-data">Data da Venda</Label>
                            <Input id="nv-data" type="date" value={nvForm.data_venda} onChange={e => setNvForm(f => ({ ...f, data_venda: e.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={nvForm.forma_pagamento} onValueChange={v => setNvForm(f => ({ ...f, forma_pagamento: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix_a_vista">PIX a Vista</SelectItem>
                                <SelectItem value="boleto">Boleto</SelectItem>
                                <SelectItem value="entrada_boleto">Entrada + Boleto</SelectItem>
                                <SelectItem value="cartao">Cartao</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="nv-parcelas">Parcelas</Label>
                            <Input id="nv-parcelas" type="number" min="1" max="12" value={nvForm.parcelas} onChange={e => setNvForm(f => ({ ...f, parcelas: e.target.value }))} />
                          </div>
                          <div className="flex items-end gap-2 pb-1">
                            <input id="nv-indicacao" type="checkbox" checked={nvForm.por_indicacao} onChange={e => setNvForm(f => ({ ...f, por_indicacao: e.target.checked }))} className="rounded border-[var(--c-border)] accent-[#AFC040]" />
                            <Label htmlFor="nv-indicacao" className="cursor-pointer">Por indicacao (repasse 10%)</Label>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="nv-cpf">CPF/CNPJ</Label>
                            <Input id="nv-cpf" value={nvForm.cpf_cnpj} onChange={e => setNvForm(f => ({ ...f, cpf_cnpj: e.target.value }))} placeholder="000.000.000-00" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="nv-razao">Razao Social</Label>
                            <Input id="nv-razao" value={nvForm.razao_social} onChange={e => setNvForm(f => ({ ...f, razao_social: e.target.value }))} placeholder="Razao social" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNovaVendaOpen(false)}>Cancelar</Button>
                        <Button
                          className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                          disabled={!nvForm.nome_cliente || !nvForm.valor_contrato || createVendaMutation.isPending}
                          onClick={() => createVendaMutation.mutate(nvForm)}
                        >
                          {createVendaMutation.isPending ? 'Criando...' : 'Criar Venda'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchVendas}
                    onChange={e => setSearchVendas(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterProduto} onValueChange={setFilterProduto}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="academy">Academy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="skills">Skills</SelectItem>
                    <SelectItem value="ferramentas">Ferramentas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortVendas} onValueChange={setSortVendas}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recente">Mais recente</SelectItem>
                    <SelectItem value="antigo">Mais antigo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead className="font-medium">Nome</TableHead>
                      <TableHead className="font-medium">Email</TableHead>
                      <TableHead className="font-medium">Produto</TableHead>
                      <TableHead className="font-medium">Data Venda</TableHead>
                      <TableHead className="font-medium">Forma Pagto</TableHead>
                      <TableHead className="font-medium text-center">Parcelas</TableHead>
                      <TableHead className="font-medium text-right">Valor</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendas.map((v: any) => (
                        <TableRow key={v.id} className="hover:bg-[var(--c-raised)] cursor-pointer" onClick={() => { setEditVenda(v); setEditVendaOpen(true) }}>
                          <TableCell className="font-medium">{v.nome || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{v.email || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${productBadgeClass(v.produto)}`}>
                              {PRODUCT_LABELS[v.produto] || v.produto || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(v.data_venda)}</TableCell>
                          <TableCell className="text-muted-foreground">{v.forma_pagamento || '—'}</TableCell>
                          <TableCell className="text-center">{v.parcelas || '—'}</TableCell>
                          <TableCell className="text-right font-medium font-mono" style={{ color: '#E8A43C' }}>
                            {formatCurrency(Number(v.valor || 0))}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${statusBadgeClass(v.status)}`}>
                              {statusLabel(v.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={(e) => { e.stopPropagation(); setEditVenda(v); setEditVendaOpen(true) }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Parcelas" onClick={(e) => { e.stopPropagation(); setParcelasVendaId(v.id); setParcelasVendaNome(v.nome || ''); setParcelasOpen(true) }}>
                                <CreditCard className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                disabled={deleteVendaMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm(`Excluir venda de "${v.nome || 'sem nome'}"?`)) {
                                    deleteVendaMutation.mutate(v.id)
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ Tab: Fiscal (from vendas - client profile) ════════════════ */}
        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Clientes" value={fiscalClientes} icon={Users} accentColor="#2CBBA6" />
            <KPICard label="NFs Pendentes" value={nfPendentesVendas} icon={AlertCircle} accentColor="#E8A43C" />
            <KPICard label="NFs Emitidas" value={nfEmitidasVendas} icon={CheckCircle} accentColor="#AFC040" />
            <KPICard label="NFs Enviadas" value={nfEnviadasVendas} icon={Send} accentColor="#4A9FE0" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controle Fiscal — Perfil do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={fiscalProduto} onValueChange={setFiscalProduto}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="academy">Academy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="skills">Skills</SelectItem>
                    <SelectItem value="ferramentas">Ferramentas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fiscalStatus} onValueChange={setFiscalStatus}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Status NF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="emitida">Emitida</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead className="font-medium">Cliente</TableHead>
                      <TableHead className="font-medium">Produto</TableHead>
                      <TableHead className="font-medium text-right">Valor Contrato</TableHead>
                      <TableHead className="font-medium">CPF/CNPJ</TableHead>
                      <TableHead className="font-medium">Razão Social</TableHead>
                      <TableHead className="font-medium">Email Fiscal</TableHead>
                      <TableHead className="font-medium">Status NF</TableHead>
                      <TableHead className="font-medium">Nº NF</TableHead>
                      <TableHead className="font-medium">Data Envio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredFiscal.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiscal.map((v: any) => (
                        <TableRow key={v.id} className="hover:bg-[var(--c-raised)]">
                          <TableCell>
                            <div>
                              <span className="font-medium">{v.nome || '—'}</span>
                              <p className="text-xs text-muted-foreground">{v.email || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${productBadgeClass(v.produto)}`}>
                              {PRODUCT_LABELS[v.produto] || v.produto || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium font-mono" style={{ color: '#E8A43C' }}>
                            {formatCurrency(Number(v.valor || 0))}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{v.cpf_cnpj || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">{v.razao_social || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{v.email_fiscal || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${nfStatusBadgeClass(v.status_nf || 'pendente')}`}>
                              {nfStatusLabel(v.status_nf || 'pendente')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{v.numero_nf || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(v.data_envio_nf)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Insights */}
          <InsightsTable
            insights={fiscalInsights || []}
            isLoading={fiscalInsightsLoading}
            error={fiscalInsightsError?.message}
            onRetry={() => refetchFiscalInsights()}
            title="Insights Fiscais"
            subtitle="Análise de compliance e NFs pendentes"
            context="fiscal"
          />
        </TabsContent>

        {/* ════════════════ Tab: Regularizacao NF ════════════════ */}
        <TabsContent value="regularizacao" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Registros" value={totalReg} icon={FileText} accentColor="#4A9FE0" />
            <KPICard label="Pendentes Regularizacao" value={pendentesReg} icon={AlertCircle} accentColor="#E8A43C" />
            <KPICard label="Ja Regularizados" value={jaRegularizados} icon={CheckCircle} accentColor="#AFC040" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Regularizacao de Notas Fiscais</CardTitle>
                <FiscalAIButton
                  action="generate_nf_data"
                  data={{
                    nfs_pendentes: filteredReg.filter((n: any) => !n.descricao_servico).slice(0, 10).map((n: any) => ({
                      id: n.id,
                      produto: n.produto,
                      valor: n.valor,
                      nome: n.nome || n.razao_social,
                      mes_referencia: n.mes_referencia || n.mes_ref,
                    })),
                  }}
                  label="Gerar Dados Fiscais com IA"
                  onResult={() => toast.success('Dados fiscais gerados! Revise os resultados.')}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={regAno} onValueChange={setRegAno}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={regMes} onValueChange={setRegMes}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regMostrarRegularizados}
                    onChange={e => setRegMostrarRegularizados(e.target.checked)}
                    className="rounded border-[var(--c-border)] accent-[#AFC040]"
                  />
                  Mostrar regularizados
                </label>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead className="font-medium">NF#</TableHead>
                      <TableHead className="font-medium">CPF/CNPJ</TableHead>
                      <TableHead className="font-medium">Razao Social</TableHead>
                      <TableHead className="font-medium">Mes Ref</TableHead>
                      <TableHead className="font-medium">Endereco/CEP</TableHead>
                      <TableHead className="font-medium">Descricao Servico</TableHead>
                      <TableHead className="font-medium text-right">Valor</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nfLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredReg.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReg.map((n: any) => {
                        const regStatus = n.status_nf || 'pendente'
                        return (
                          <TableRow key={n.id} className="hover:bg-[var(--c-raised)]">
                            <TableCell className="font-mono text-xs">{n.numero_nf || n.id?.substring(0, 8) || '—'}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">{n.cpf_cnpj || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{n.razao_social || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{n.mes_referencia || formatDate(n.data_emissao) || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">{n.endereco || n.cep || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{n.descricao_servico || '—'}</TableCell>
                            <TableCell className="text-right font-medium font-mono" style={{ color: '#E8A43C' }}>
                              {formatCurrency(Number(n.valor || 0))}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${nfStatusBadgeClass(regStatus)}`}>
                                {nfStatusLabel(regStatus)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Parcelas/Regularização Insights */}
          <InsightsTable
            insights={parcelasInsights || []}
            isLoading={parcelasInsightsLoading}
            error={parcelasInsightsError?.message}
            onRetry={() => refetchParcelasInsights()}
            title="Insights de Parcelas & Recebíveis"
            subtitle="Análise de inadimplência, aging e fluxo de caixa"
            context="parcelas"
          />
        </TabsContent>

        {/* ════════════════ Tab: Insights ════════════════ */}
        <TabsContent value="insights" className="mt-4">
          <InsightsTable
            insights={insights || []}
            isLoading={insightsLoading}
            error={insightsError?.message}
            onRetry={() => refetchInsights()}
            title="Insights Comerciais"
            subtitle="Analise de vendas, fiscal e regularizacao gerada por IA"
            context="financeiro"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
