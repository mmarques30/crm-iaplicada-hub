import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Video, Film, CheckCircle, Send, Plus, Trash2 } from 'lucide-react'

/* ─── Constants ─── */

interface ContentItem {
  id: string
  titulo: string
  descricao: string | null
  tipo_video: string | null
  plataforma: string | null
  status: string
  prioridade: string | null
  deadline: string | null
  data_publicacao: string | null
  produto: string | null
  created_at: string | null
}

const STATUS_LIST = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'roteiro', label: 'Roteiro' },
  { value: 'gravado', label: 'Gravado' },
  { value: 'edicao', label: 'Edição' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'edicao_concluida', label: 'Edição Concluída' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

const PIPELINE_STATUSES = ['backlog', 'roteiro', 'gravado', 'edicao', 'revisao', 'edicao_concluida', 'publicado'] as const

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-muted text-muted-foreground',
  roteiro: 'bg-[#040E1A] text-[#4A9FE0]',
  gravado: 'bg-[#031411] text-[#2CBBA6]',
  edicao: 'bg-[#1A1206] text-[#E8A43C]',
  revisao: 'bg-[#0E041A] text-[#8b5cf6]',
  edicao_concluida: 'bg-[#141A04] text-[#AFC040]',
  publicado: 'bg-[#141A04] text-[#AFC040]',
  cancelado: 'bg-[#1A0604] text-[#E8684A]',
}

const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_LIST.map(s => [s.value, s.label]))

const PLATAFORMA_COLORS: Record<string, string> = {
  youtube: 'bg-[#1A0604] text-[#E8684A]',
  instagram: 'bg-[#0E041A] text-[#8b5cf6]',
  tiktok: 'bg-[#040E1A] text-[#4A9FE0]',
  facebook: 'bg-[#040E1A] text-[#4A9FE0]',
  linkedin: 'bg-[#040E1A] text-[#4A9FE0]',
}

const TIPO_OPTIONS = [
  { value: 'video', label: 'Vídeo' },
  { value: 'reel', label: 'Reel' },
  { value: 'short', label: 'Short' },
  { value: 'live', label: 'Live' },
]

const PLATAFORMA_OPTIONS = ['youtube', 'instagram', 'tiktok', 'facebook', 'linkedin']
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

export default function ConteudoVideos() {
  const queryClient = useQueryClient()

  /* ─── State ─── */
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterPlataforma, setFilterPlataforma] = useState('todos')
  const [filterProduto, setFilterProduto] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tipo_video: 'video',
    plataforma: 'youtube',
    prioridade: 'media',
    deadline: '',
    produto: 'academy',
  })

  const resetForm = () => setForm({
    titulo: '', descricao: '', tipo_video: 'video', plataforma: 'youtube',
    prioridade: 'media', deadline: '', produto: 'academy',
  })

  /* ─── Query ─── */
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['content-items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('content_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as ContentItem[]
    },
  })

  /* ─── Mutations ─── */
  const createMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await (supabase as any).from('content_items').insert({
        titulo: f.titulo,
        descricao: f.descricao || null,
        tipo_video: f.tipo_video,
        plataforma: f.plataforma,
        prioridade: f.prioridade,
        deadline: f.deadline || null,
        produto: f.produto,
        status: 'backlog',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Vídeo criado com sucesso!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('content_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] })
      toast.success('Vídeo removido!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status }
      if (status === 'publicado') updates.data_publicacao = new Date().toISOString()
      const { error } = await (supabase as any).from('content_items').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content-items'] }),
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  /* ─── Derived ─── */
  const totalVideos = items.length
  const emProducao = items.filter(i => !['publicado', 'cancelado'].includes(i.status)).length
  const concluidos = items.filter(i => i.status === 'edicao_concluida' || i.status === 'publicado').length
  const publicados = items.filter(i => i.status === 'publicado').length

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterStatus !== 'todos' && i.status !== filterStatus) return false
      if (filterPlataforma !== 'todos' && i.plataforma !== filterPlataforma) return false
      if (filterProduto !== 'todos' && i.produto !== filterProduto) return false
      return true
    })
  }, [items, filterStatus, filterPlataforma, filterProduto])

  const byStatus = useMemo(() => {
    const map: Record<string, ContentItem[]> = {}
    for (const s of PIPELINE_STATUSES) map[s] = []
    for (const item of items) {
      if (map[item.status]) map[item.status].push(item)
    }
    return map
  }, [items])

  /* ─── Render ─── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Produção de Vídeos</h1>
          <Badge variant="secondary">{totalVideos} vídeos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Pipeline de produção de conteúdo em vídeo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Vídeos" value={totalVideos} icon={Video} accentColor="#4A9FE0" />
        <KPICard label="Em Produção" value={emProducao} icon={Film} accentColor="#E8A43C" />
        <KPICard label="Concluídos" value={concluidos} icon={CheckCircle} accentColor="#AFC040" />
        <KPICard label="Publicados" value={publicados} icon={Send} accentColor="#2CBBA6" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pipeline">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'pipeline', l: 'Pipeline' }, { v: 'todos', l: 'Todos os Vídeos' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab: Pipeline ─── */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STATUSES.map(status => {
              const col = byStatus[status] || []
              return (
                <div key={status} className="min-w-[260px] max-w-[300px] flex-shrink-0">
                  <div className="bg-[var(--c-raised)] rounded-t-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
                    <Badge variant="secondary" className="text-xs">{col.length}</Badge>
                  </div>
                  <div className="space-y-2 mt-2 max-h-[65vh] overflow-y-auto pr-1">
                    {col.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum item</p>
                    )}
                    {col.map(item => (
                      <Card key={item.id} className="cursor-pointer hover:border-[var(--c-border-h)] transition-colors">
                        <CardContent className="p-3 space-y-2">
                          <p className="text-sm font-medium leading-tight">{item.titulo}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.plataforma && (
                              <Badge className={`text-[10px] ${PLATAFORMA_COLORS[item.plataforma] || 'bg-muted text-muted-foreground'}`}>
                                {item.plataforma}
                              </Badge>
                            )}
                            {item.produto && (
                              <Badge className={`text-[10px] ${PRODUTO_BADGE[item.produto] || 'bg-muted text-muted-foreground'}`}>
                                {item.produto}
                              </Badge>
                            )}
                            {item.tipo_video && (
                              <Badge variant="outline" className="text-[10px]">{item.tipo_video}</Badge>
                            )}
                          </div>
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

        {/* ─── Tab: Todos os Vídeos ─── */}
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
            <Select value={filterPlataforma} onValueChange={setFilterPlataforma}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Plataformas</SelectItem>
                {PLATAFORMA_OPTIONS.map(p => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProduto} onValueChange={setFilterProduto}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Produto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Produtos</SelectItem>
                {PRODUTO_OPTIONS.map(p => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold">
                    <Plus className="h-4 w-4 mr-1" /> Novo Vídeo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Novo Vídeo</DialogTitle>
                    <DialogDescription>Adicione um novo vídeo ao pipeline de produção.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Título *</Label>
                      <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do vídeo" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição ou briefing" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={form.tipo_video} onValueChange={v => setForm(f => ({ ...f, tipo_video: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPO_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Plataforma</Label>
                        <Select value={form.plataforma} onValueChange={v => setForm(f => ({ ...f, plataforma: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PLATAFORMA_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                    <div>
                      <Label>Deadline</Label>
                      <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button
                      className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                      disabled={!form.titulo.trim() || createMutation.isPending}
                      onClick={() => createMutation.mutate(form)}
                    >
                      {createMutation.isPending ? 'Criando...' : 'Criar Vídeo'}
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
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Plataforma</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Status</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Prioridade</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Deadline</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Data Pub.</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Produto</th>
                      <th className="text-center py-2.5 px-3 font-medium text-xs w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id} className="border-b border-[var(--c-border)] hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-medium max-w-[250px] truncate">{item.titulo}</td>
                        <td className="py-2 px-3 text-muted-foreground capitalize">{item.tipo_video || '—'}</td>
                        <td className="py-2 px-3">
                          {item.plataforma ? (
                            <Badge className={`text-xs capitalize ${PLATAFORMA_COLORS[item.plataforma] || 'bg-muted text-muted-foreground'}`}>{item.plataforma}</Badge>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground'}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {item.prioridade ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${PRIORIDADE_DOT[item.prioridade] || 'bg-muted'}`} />
                              <span className="capitalize text-muted-foreground">{item.prioridade}</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(item.deadline)}</td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(item.data_publicacao)}</td>
                        <td className="py-2 px-3">
                          {item.produto ? (
                            <Badge className={`text-xs capitalize ${PRODUTO_BADGE[item.produto] || 'bg-muted text-muted-foreground'}`}>{item.produto}</Badge>
                          ) : '—'}
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
                        <td colSpan={9} className="py-8 text-center text-muted-foreground">
                          {isLoading ? 'Carregando...' : 'Nenhum vídeo encontrado'}
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
