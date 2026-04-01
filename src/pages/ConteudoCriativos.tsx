import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Image, Megaphone, CheckCircle, Send, Plus, Trash2 } from 'lucide-react'

/* ─── Types ─── */

interface StaticContentItem {
  id: string
  titulo: string
  descricao: string | null
  tipo: string | null
  plataformas: string[] | null
  status: string
  categoria_conteudo: string | null
  prioridade: string | null
  deadline: string | null
  data_publicacao: string | null
  produto: string | null
  investimento: number | null
  impressoes: number | null
  cpc: number | null
  ctr: number | null
  created_at: string | null
}

/* ─── Constants ─── */

const STATUS_LIST = [
  { value: 'ideia', label: 'Ideia' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'roteiro', label: 'Roteiro' },
  { value: 'criacao', label: 'Criação' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

const PIPELINE_STATUSES = ['ideia', 'backlog', 'roteiro', 'criacao', 'revisao', 'aprovado', 'publicado'] as const

const STATUS_COLORS: Record<string, string> = {
  ideia: 'bg-[#0E041A] text-[#8b5cf6]',
  backlog: 'bg-muted text-muted-foreground',
  roteiro: 'bg-[#040E1A] text-[#4A9FE0]',
  criacao: 'bg-[#1A1206] text-[#E8A43C]',
  revisao: 'bg-[#031411] text-[#2CBBA6]',
  aprovado: 'bg-[#141A04] text-[#AFC040]',
  publicado: 'bg-[#141A04] text-[#AFC040]',
  cancelado: 'bg-[#1A0604] text-[#E8684A]',
}

const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_LIST.map(s => [s.value, s.label]))

const TIPO_OPTIONS = [
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'post', label: 'Post' },
  { value: 'story', label: 'Story' },
  { value: 'banner', label: 'Banner' },
]

const CATEGORIA_OPTIONS = [
  { value: 'organico', label: 'Orgânico' },
  { value: 'anuncio', label: 'Anúncio' },
]

const CATEGORIA_BADGE: Record<string, string> = {
  organico: 'bg-[#031411] text-[#2CBBA6]',
  anuncio: 'bg-[#1A1206] text-[#E8A43C]',
}

const PLATAFORMA_COLORS: Record<string, string> = {
  instagram: 'bg-[#0E041A] text-[#8b5cf6]',
  facebook: 'bg-[#040E1A] text-[#4A9FE0]',
  tiktok: 'bg-[#040E1A] text-[#4A9FE0]',
  linkedin: 'bg-[#040E1A] text-[#4A9FE0]',
  youtube: 'bg-[#1A0604] text-[#E8684A]',
  google: 'bg-[#1A1206] text-[#E8A43C]',
}

const PLATAFORMA_OPTIONS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'google']
const PRODUTO_OPTIONS = ['academy', 'business', 'skills']
const PRIORIDADE_OPTIONS = ['alta', 'media', 'baixa']

const PRODUTO_BADGE: Record<string, string> = {
  academy: 'bg-[#040E1A] text-[#4A9FE0]',
  business: 'bg-[#141A04] text-[#AFC040]',
  skills: 'bg-[#031411] text-[#2CBBA6]',
}

const PRIORIDADE_DOT: Record<string, string> = {
  alta: 'bg-[#E8684A]',
  media: 'bg-[#E8A43C]',
  baixa: 'bg-[#2CBBA6]',
}

/* ─── Component ─── */

export default function ConteudoCriativos() {
  const queryClient = useQueryClient()

  /* ─── State ─── */
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterCategoria, setFilterCategoria] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'post',
    plataformas: ['instagram'] as string[],
    categoria_conteudo: 'organico',
    prioridade: 'media',
    deadline: '',
    produto: 'academy',
    investimento: '',
  })

  const resetForm = () => setForm({
    titulo: '', descricao: '', tipo: 'post', plataformas: ['instagram'],
    categoria_conteudo: 'organico', prioridade: 'media', deadline: '', produto: 'academy',
    investimento: '',
  })

  /* ─── Query ─── */
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['static-content-items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('static_content_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as StaticContentItem[]
    },
  })

  /* ─── Mutations ─── */
  const createMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await (supabase as any).from('static_content_items').insert({
        titulo: f.titulo,
        descricao: f.descricao || null,
        tipo: f.tipo,
        plataformas: f.plataformas,
        categoria_conteudo: f.categoria_conteudo,
        prioridade: f.prioridade,
        deadline: f.deadline || null,
        produto: f.produto,
        investimento: f.categoria_conteudo === 'anuncio' && f.investimento ? Number(f.investimento) : null,
        status: 'ideia',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['static-content-items'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Criativo adicionado com sucesso!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('static_content_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['static-content-items'] })
      toast.success('Criativo removido!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status }
      if (status === 'publicado') updates.data_publicacao = new Date().toISOString()
      const { error } = await (supabase as any).from('static_content_items').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['static-content-items'] }),
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  /* ─── Derived ─── */
  const totalCriativos = items.length
  const organicos = items.filter(i => i.categoria_conteudo === 'organico').length
  const anuncios = items.filter(i => i.categoria_conteudo === 'anuncio').length
  const publicados = items.filter(i => i.status === 'publicado').length

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterStatus !== 'todos' && i.status !== filterStatus) return false
      if (filterTipo !== 'todos' && i.tipo !== filterTipo) return false
      if (filterCategoria !== 'todos' && i.categoria_conteudo !== filterCategoria) return false
      return true
    })
  }, [items, filterStatus, filterTipo, filterCategoria])

  const byStatus = useMemo(() => {
    const map: Record<string, StaticContentItem[]> = {}
    for (const s of PIPELINE_STATUSES) map[s] = []
    for (const item of items) {
      if (map[item.status]) map[item.status].push(item)
    }
    return map
  }, [items])

  const togglePlataforma = (p: string) => {
    setForm(f => {
      const has = f.plataformas.includes(p)
      return { ...f, plataformas: has ? f.plataformas.filter(x => x !== p) : [...f.plataformas, p] }
    })
  }

  /* ─── Render ─── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Criativos & Posts</h1>
          <Badge variant="secondary">{totalCriativos} criativos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Pipeline de produção de conteúdo estático e anúncios</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Criativos" value={totalCriativos} icon={Image} accentColor="#4A9FE0" />
        <KPICard label="Orgânicos" value={organicos} icon={Send} accentColor="#2CBBA6" />
        <KPICard label="Anúncios" value={anuncios} icon={Megaphone} accentColor="#E8A43C" />
        <KPICard label="Publicados" value={publicados} icon={CheckCircle} accentColor="#AFC040" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pipeline">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'pipeline', l: 'Pipeline' }, { v: 'todos', l: 'Todos os Criativos' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab: Pipeline ─── */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarColor: '#2E3A18 transparent', scrollbarWidth: 'thin' }}>
            {PIPELINE_STATUSES.map(status => {
              const col = byStatus[status] || []
              return (
                <div key={status} className="min-w-[260px] w-[280px] flex-shrink-0 flex flex-col" style={{ minHeight: 'calc(100vh - 320px)' }}>
                  <div className="bg-[var(--c-raised)] rounded-t-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
                    <Badge variant="secondary" className="text-xs">{col.length}</Badge>
                  </div>
                  <div className="flex-1 space-y-2 mt-1 overflow-y-auto pr-1 pb-2 border border-[var(--c-border)] border-t-0 rounded-b-lg p-2" style={{ scrollbarColor: '#2E3A18 transparent', scrollbarWidth: 'thin' }}>
                    {col.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum item</p>
                    )}
                    {col.map(item => (
                      <Card key={item.id} className="cursor-pointer hover:border-[var(--c-border-h)] transition-colors">
                        <CardContent className="p-3 space-y-2">
                          <p className="text-sm font-medium leading-tight">{item.titulo}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.categoria_conteudo && (
                              <Badge className={`text-[10px] ${CATEGORIA_BADGE[item.categoria_conteudo] || 'bg-muted text-muted-foreground'}`}>
                                {item.categoria_conteudo === 'organico' ? 'Orgânico' : 'Anúncio'}
                              </Badge>
                            )}
                            {item.tipo && (
                              <Badge variant="outline" className="text-[10px] capitalize">{item.tipo}</Badge>
                            )}
                            {item.produto && (
                              <Badge className={`text-[10px] ${PRODUTO_BADGE[item.produto] || 'bg-muted text-muted-foreground'}`}>
                                {item.produto}
                              </Badge>
                            )}
                          </div>
                          {(item.plataformas && item.plataformas.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {item.plataformas.map(p => (
                                <Badge key={p} className={`text-[10px] capitalize ${PLATAFORMA_COLORS[p] || 'bg-muted text-muted-foreground'}`}>{p}</Badge>
                              ))}
                            </div>
                          )}
                          {item.prioridade && (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${PRIORIDADE_DOT[item.prioridade] || 'bg-muted'}`} />
                              <span className="text-[10px] text-muted-foreground capitalize">{item.prioridade}</span>
                            </div>
                          )}
                          {item.deadline && (
                            <p className="text-[10px] text-muted-foreground">Deadline: {formatDate(item.deadline)}</p>
                          )}
                          {/* Quick status advance */}
                          {status !== 'publicado' && (
                            <div className="pt-1">
                              <Select
                                value={item.status}
                                onValueChange={(val) => updateStatusMutation.mutate({ id: item.id, status: val })}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_LIST.map(s => (
                                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── Tab: Todos os Criativos ─── */}
        <TabsContent value="todos" className="space-y-4 mt-4">
          {/* Filters + Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                {STATUS_LIST.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Tipos</SelectItem>
                {TIPO_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Categorias</SelectItem>
                {CATEGORIA_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold">
                    <Plus className="h-4 w-4 mr-1" /> Novo Criativo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Novo Criativo</DialogTitle>
                    <DialogDescription>Adicione um novo criativo ao pipeline de produção.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Título *</Label>
                      <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do criativo" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição ou briefing" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPO_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <Select value={form.categoria_conteudo} onValueChange={v => setForm(f => ({ ...f, categoria_conteudo: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIA_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Plataformas</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {PLATAFORMA_OPTIONS.map(p => (
                          <Badge
                            key={p}
                            className={`cursor-pointer capitalize text-xs transition-colors ${
                              form.plataformas.includes(p)
                                ? PLATAFORMA_COLORS[p] || 'bg-[#AFC040] text-[#0D0D0D]'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            onClick={() => togglePlataforma(p)}
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Prioridade</Label>
                        <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRIORIDADE_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Produto</Label>
                        <Select value={form.produto} onValueChange={v => setForm(f => ({ ...f, produto: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRODUTO_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Deadline</Label>
                        <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                      </div>
                      {form.categoria_conteudo === 'anuncio' && (
                        <div>
                          <Label>Investimento (R$)</Label>
                          <Input type="number" step="0.01" value={form.investimento} onChange={e => setForm(f => ({ ...f, investimento: e.target.value }))} placeholder="0.00" />
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button
                      className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                      disabled={!form.titulo.trim() || form.plataformas.length === 0 || createMutation.isPending}
                      onClick={() => createMutation.mutate(form)}
                    >
                      {createMutation.isPending ? 'Criando...' : 'Criar Criativo'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--c-raised)]">
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Título</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Tipo</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Plataformas</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Status</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Categoria</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Deadline</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Data Pub.</th>
                      <th className="text-right py-2.5 px-3 font-medium text-xs">Invest.</th>
                      <th className="text-right py-2.5 px-3 font-medium text-xs">Impr.</th>
                      <th className="text-right py-2.5 px-3 font-medium text-xs">CPC</th>
                      <th className="text-right py-2.5 px-3 font-medium text-xs">CTR</th>
                      <th className="text-center py-2.5 px-3 font-medium text-xs w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id} className="border-b border-[var(--c-border)] hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-medium max-w-[220px] truncate">{item.titulo}</td>
                        <td className="py-2 px-3 text-muted-foreground capitalize">{item.tipo || '—'}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.plataformas && item.plataformas.length > 0) ? item.plataformas.map(p => (
                              <Badge key={p} className={`text-[10px] capitalize ${PLATAFORMA_COLORS[p] || 'bg-muted text-muted-foreground'}`}>{p}</Badge>
                            )) : '—'}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground'}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {item.categoria_conteudo ? (
                            <Badge className={`text-xs ${CATEGORIA_BADGE[item.categoria_conteudo] || 'bg-muted text-muted-foreground'}`}>
                              {item.categoria_conteudo === 'organico' ? 'Orgânico' : 'Anúncio'}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(item.deadline)}</td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(item.data_publicacao)}</td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {item.categoria_conteudo === 'anuncio' && item.investimento != null ? formatCurrency(item.investimento) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {item.categoria_conteudo === 'anuncio' && item.impressoes != null ? item.impressoes.toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {item.categoria_conteudo === 'anuncio' && item.cpc != null ? formatCurrency(item.cpc) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {item.categoria_conteudo === 'anuncio' && item.ctr != null ? `${item.ctr.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]"
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-muted-foreground">
                          {isLoading ? 'Carregando...' : 'Nenhum criativo encontrado'}
                        </td>
                      </tr>
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
