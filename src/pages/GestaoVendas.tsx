import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { ShoppingCart, Receipt, FileText, Search, DollarSign, Users, AlertCircle, CheckCircle, Send, Plus } from 'lucide-react'

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

function regStatusBadgeClass(status: string) {
  switch (status) {
    case 'regularizado': return 'bg-[#141A04] text-[#AFC040]'
    case 'pendente': return 'bg-[#1A1206] text-[#E8A43C]'
    default: return 'bg-muted text-muted-foreground'
  }
}

export default function GestaoVendas() {
  /* ─── State ─── */
  const [searchVendas, setSearchVendas] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterProduto, setFilterProduto] = useState('todos')
  const [sortVendas, setSortVendas] = useState('recente')

  const [fiscalProduto, setFiscalProduto] = useState('todos')
  const [fiscalStatus, setFiscalStatus] = useState('todos')
  const [fiscalMes, setFiscalMes] = useState('todos')
  const [fiscalAno, setFiscalAno] = useState('todos')

  const [regAno, setRegAno] = useState('todos')
  const [regMes, setRegMes] = useState('todos')
  const [regMostrarRegularizados, setRegMostrarRegularizados] = useState(false)

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

  /* ─── Fiscal KPIs ─── */
  const fiscalClientes = useMemo(() => {
    const unique = new Set(allNFs.map((n: any) => n.cpf_cnpj).filter(Boolean))
    return unique.size
  }, [allNFs])
  const nfPendentes = allNFs.filter((n: any) => n.status === 'pendente').length
  const nfEmitidas = allNFs.filter((n: any) => n.status === 'emitida').length
  const nfEnviadas = allNFs.filter((n: any) => n.status === 'enviada').length

  /* ─── Filtered Fiscal ─── */
  const filteredNFs = useMemo(() => {
    let result = [...allNFs]
    if (fiscalProduto !== 'todos') result = result.filter((n: any) => n.produto === fiscalProduto)
    if (fiscalStatus !== 'todos') result = result.filter((n: any) => n.status === fiscalStatus)
    if (fiscalMes !== 'todos') result = result.filter((n: any) => {
      const m = (n.data_emissao || n.created_at || '').substring(5, 7)
      return m === fiscalMes
    })
    if (fiscalAno !== 'todos') result = result.filter((n: any) => {
      const y = (n.data_emissao || n.created_at || '').substring(0, 4)
      return y === fiscalAno
    })
    return result
  }, [allNFs, fiscalProduto, fiscalStatus, fiscalMes, fiscalAno])

  /* ─── Regularizacao KPIs ─── */
  const regRecords = useMemo(() => {
    return allNFs.filter((n: any) => n.regularizacao !== undefined || n.status_regularizacao !== undefined)
  }, [allNFs])
  const totalReg = allNFs.length
  const pendentesReg = allNFs.filter((n: any) => (n.status_regularizacao || n.status) === 'pendente').length
  const jaRegularizados = allNFs.filter((n: any) => (n.status_regularizacao || n.status) === 'regularizado' || (n.status_regularizacao || n.status) === 'emitida' || (n.status_regularizacao || n.status) === 'enviada').length

  /* ─── Filtered Regularizacao ─── */
  const filteredReg = useMemo(() => {
    let result = [...allNFs]
    if (regAno !== 'todos') result = result.filter((n: any) => {
      const y = (n.mes_ref || n.data_emissao || n.created_at || '').substring(0, 4)
      return y === regAno
    })
    if (regMes !== 'todos') result = result.filter((n: any) => {
      const m = (n.mes_ref || n.data_emissao || n.created_at || '').substring(5, 7)
      return m === regMes
    })
    if (!regMostrarRegularizados) {
      result = result.filter((n: any) => {
        const st = n.status_regularizacao || n.status
        return st !== 'regularizado' && st !== 'emitida' && st !== 'enviada'
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

  /* ─── Available years for filters ─── */
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    for (const n of allNFs) {
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
                <Button size="sm" className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Venda
                  {/* TODO: Dialog para criacao de nova venda */}
                </Button>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendas.map((v: any) => (
                        <TableRow key={v.id} className="hover:bg-[var(--c-raised)] cursor-pointer">
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ Tab: Fiscal ════════════════ */}
        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Clientes" value={fiscalClientes} icon={Users} accentColor="#2CBBA6" />
            <KPICard label="NFs Pendentes" value={nfPendentes} icon={AlertCircle} accentColor="#E8A43C" />
            <KPICard label="NFs Emitidas" value={nfEmitidas} icon={CheckCircle} accentColor="#AFC040" />
            <KPICard label="NFs Enviadas" value={nfEnviadas} icon={Send} accentColor="#4A9FE0" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controle Fiscal</CardTitle>
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
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="emitida">Emitida</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fiscalMes} onValueChange={setFiscalMes}>
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
                <Select value={fiscalAno} onValueChange={setFiscalAno}>
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
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead className="font-medium">Cliente</TableHead>
                      <TableHead className="font-medium">CPF/CNPJ</TableHead>
                      <TableHead className="font-medium">Razao Social</TableHead>
                      <TableHead className="font-medium">Status NF</TableHead>
                      <TableHead className="font-medium">Ultimo Envio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nfLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredNFs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Nenhuma nota fiscal encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNFs.map((n: any) => (
                        <TableRow key={n.id} className="hover:bg-[var(--c-raised)]">
                          <TableCell>
                            <div>
                              <span className="font-medium">{n.nome || n.cliente_nome || '—'}</span>
                              <p className="text-xs text-muted-foreground">{n.email || n.cliente_email || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{n.cpf_cnpj || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{n.razao_social || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${nfStatusBadgeClass(n.status)}`}>
                              {nfStatusLabel(n.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(n.ultimo_envio || n.data_envio || n.updated_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
              <CardTitle className="text-base">Regularizacao de Notas Fiscais</CardTitle>
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
                        const regStatus = n.status_regularizacao || n.status || 'pendente'
                        return (
                          <TableRow key={n.id} className="hover:bg-[var(--c-raised)]">
                            <TableCell className="font-mono text-xs">{n.numero_nf || n.id?.substring(0, 8) || '—'}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">{n.cpf_cnpj || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{n.razao_social || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{n.mes_ref || formatDate(n.data_emissao) || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">{n.endereco || n.cep || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{n.descricao_servico || n.descricao || '—'}</TableCell>
                            <TableCell className="text-right font-medium font-mono" style={{ color: '#E8A43C' }}>
                              {formatCurrency(Number(n.valor || 0))}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${regStatusBadgeClass(regStatus)}`}>
                                {regStatus === 'regularizado' ? 'Regularizado' : regStatus === 'pendente' ? 'Pendente' : nfStatusLabel(regStatus)}
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
