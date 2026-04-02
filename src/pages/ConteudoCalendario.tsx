import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Video, Image, Lightbulb, Plus, ChevronLeft, ChevronRight, Loader2, Send, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

const PLATFORM_COLORS: Record<string, string> = { instagram: '#E1306C', youtube: '#FF0000', tiktok: '#2CBBA6', linkedin: '#0A66C2', twitter: '#1DA1F2', facebook: '#1877F2' }
const STATUS_COLORS: Record<string, string> = { agendado: 'bg-[#1A1206] text-[#E8A43C]', publicado: 'bg-[#141A04] text-[#AFC040]', rascunho: 'bg-muted text-muted-foreground', cancelado: 'bg-[#1A0604] text-[#E8684A]', edicao_concluida: 'bg-[#141A04] text-[#AFC040]', aprovado: 'bg-[#031411] text-[#2CBBA6]' }
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface UnifiedPost { id: string; titulo: string; plataforma: string; data: string; status: string; source: 'video' | 'static' | 'manual'; tipo: string; produto: string }

export default function ConteudoCalendario() {
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [ideaOpen, setIdeaOpen] = useState(false)
  const [ideaForm, setIdeaForm] = useState({ titulo: '', descricao: '', tipo: 'video', plataforma: 'instagram', produto: 'academy' })
  const [postOpen, setPostOpen] = useState(false)
  const [postForm, setPostForm] = useState({ titulo: '', plataforma: 'instagram', data_agendamento: '', tipo: 'post', produto: 'academy' })
  const [editIdeaId, setEditIdeaId] = useState<string | null>(null)

  // Fetch all content sources
  const { data: videos } = useQuery({ queryKey: ['content_items_cal'], queryFn: async () => { const { data } = await (supabase as any).from('content_items').select('*').not('data_publicacao', 'is', null); return (data || []) as any[] } })
  const { data: statics } = useQuery({ queryKey: ['static_items_cal'], queryFn: async () => { const { data } = await (supabase as any).from('static_content_items').select('*').not('data_publicacao', 'is', null); return (data || []) as any[] } })
  const { data: posts } = useQuery({ queryKey: ['social_posts_cal'], queryFn: async () => { const { data } = await (supabase as any).from('social_posts').select('*'); return (data || []) as any[] } })
  const { data: backlogVideos } = useQuery({ queryKey: ['backlog_videos'], queryFn: async () => { const { data } = await (supabase as any).from('content_items').select('*').is('data_publicacao', null).in('status_producao', ['backlog', 'roteiro', 'gravado', 'edicao', 'revisao', 'edicao_concluida']); return (data || []) as any[] } })
  const { data: backlogStatics } = useQuery({ queryKey: ['backlog_statics'], queryFn: async () => { const { data } = await (supabase as any).from('static_content_items').select('*').is('data_publicacao', null).in('status', ['ideia', 'backlog', 'roteiro', 'criacao', 'revisao', 'aprovado']); return (data || []) as any[] } })
  const { data: ideas } = useQuery({ queryKey: ['content_ideas'], queryFn: async () => { const { data } = await (supabase as any).from('content_ideas').select('*').order('created_at', { ascending: false }); return (data || []) as any[] } })

  // Unified posts
  const allPosts = useMemo<UnifiedPost[]>(() => {
    const unified: UnifiedPost[] = []
    for (const v of videos || []) unified.push({ id: v.id, titulo: v.titulo, plataforma: v.plataforma || 'youtube', data: v.data_publicacao, status: v.status_producao, source: 'video', tipo: v.tipo_video || 'video', produto: v.produto || 'academy' })
    for (const s of statics || []) unified.push({ id: s.id, titulo: s.titulo, plataforma: (s.plataformas || ['instagram'])[0], data: s.data_publicacao, status: s.status, source: 'static', tipo: s.tipo || 'post', produto: s.produto || 'academy' })
    for (const p of posts || []) unified.push({ id: p.id, titulo: p.titulo, plataforma: p.plataforma, data: p.data_agendamento, status: p.status, source: 'manual', tipo: p.tipo || 'post', produto: p.produto || 'academy' })
    return unified.sort((a, b) => (a.data || '').localeCompare(b.data || ''))
  }, [videos, statics, posts])

  // KPIs
  const agendados = allPosts.filter(p => p.status !== 'publicado' && p.status !== 'cancelado').length
  const publicados = allPosts.filter(p => p.status === 'publicado').length
  const backlogCount = (backlogVideos || []).length + (backlogStatics || []).length
  const ideasCount = (ideas || []).length

  // Calendar grid
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStr = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number | null; posts: UnifiedPost[] }> = []
    for (let i = 0; i < firstDay; i++) days.push({ day: null, posts: [] })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayPosts = allPosts.filter(p => p.data === dateStr)
      days.push({ day: d, posts: dayPosts })
    }
    return days
  }, [allPosts, year, month, firstDay, daysInMonth])

  // Mutations
  const createIdea = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('content_ideas').insert(ideaForm)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['content_ideas'] }); setIdeaOpen(false); setIdeaForm({ titulo: '', descricao: '', tipo: 'video', plataforma: 'instagram', produto: 'academy' }); toast.success('Ideia criada!') },
    onError: (e: any) => toast.error(e.message),
  })

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('social_posts').insert(postForm)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social_posts_cal'] }); setPostOpen(false); setPostForm({ titulo: '', plataforma: 'instagram', data_agendamento: '', tipo: 'post', produto: 'academy' }); toast.success('Post agendado!') },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteIdea = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from('content_ideas').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['content_ideas'] }); toast.success('Ideia removida') },
  })

  const updateIdea = useMutation({
    mutationFn: async () => {
      if (!editIdeaId) return
      const { error } = await (supabase as any).from('content_ideas').update(ideaForm).eq('id', editIdeaId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_ideas'] })
      setEditIdeaId(null)
      setIdeaOpen(false)
      setIdeaForm({ titulo: '', descricao: '', tipo: 'video', plataforma: 'instagram', produto: 'academy' })
      toast.success('Ideia atualizada!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const openEditIdea = (idea: any) => {
    setEditIdeaId(idea.id)
    setIdeaForm({
      titulo: idea.titulo || '',
      descricao: idea.descricao || '',
      tipo: idea.tipo || 'video',
      plataforma: idea.plataforma || 'instagram',
      produto: idea.produto || 'academy',
    })
    setIdeaOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Calendário de Conteúdo</h1>
          <p className="text-sm text-muted-foreground mt-1">Planejamento e agendamento de publicações</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPostOpen(true)}><Plus className="h-3.5 w-3.5" /> Novo Post</Button>
          <Button size="sm" className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" onClick={() => setIdeaOpen(true)}><Lightbulb className="h-3.5 w-3.5" /> Nova Ideia</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Agendados" value={agendados} icon={Calendar} accentColor="#4A9FE0" />
        <KPICard label="Publicados" value={publicados} icon={Send} accentColor="#AFC040" />
        <KPICard label="Backlog" value={backlogCount} icon={Video} accentColor="#E8A43C" />
        <KPICard label="Ideias" value={ideasCount} icon={Lightbulb} accentColor="#2CBBA6" />
      </div>

      <Tabs defaultValue="calendario">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'calendario', l: 'Calendário' }, { v: 'tabela', l: 'Tabela' }, { v: 'backlog', l: 'Backlog' }, { v: 'ideias', l: 'Ideias' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* Calendar */}
        <TabsContent value="calendario" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-base capitalize">{monthStr}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>)}
                {calendarDays.map((cell, i) => (
                  <div key={i} className={`min-h-[80px] border border-[var(--c-border)] p-1 ${cell.day ? 'bg-[var(--c-card)]' : 'bg-transparent'} ${cell.day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear() ? 'ring-1 ring-[#AFC040]' : ''}`}>
                    {cell.day && (
                      <>
                        <span className="text-xs text-muted-foreground">{cell.day}</span>
                        <div className="space-y-0.5 mt-1">
                          {cell.posts.slice(0, 3).map(p => (
                            <div key={p.id} className="text-[9px] px-1 py-0.5 rounded truncate" style={{ backgroundColor: `${PLATFORM_COLORS[p.plataforma] || '#7A8460'}22`, color: PLATFORM_COLORS[p.plataforma] || '#7A8460' }}>
                              {p.titulo.substring(0, 15)}
                            </div>
                          ))}
                          {cell.posts.length > 3 && <span className="text-[9px] text-muted-foreground">+{cell.posts.length - 3}</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table */}
        <TabsContent value="tabela" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Todos os Conteúdos Agendados ({allPosts.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Produto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPosts.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum conteúdo agendado</TableCell></TableRow>
                    ) : allPosts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{p.titulo}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.tipo}</Badge></TableCell>
                        <TableCell><Badge className="text-[10px]" style={{ backgroundColor: `${PLATFORM_COLORS[p.plataforma] || '#7A8460'}22`, color: PLATFORM_COLORS[p.plataforma] || '#7A8460' }}>{p.plataforma}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.data ? formatDate(p.data) : '—'}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${STATUS_COLORS[p.status] || 'bg-muted text-muted-foreground'}`}>{p.status}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.source === 'video' ? 'Vídeo' : p.source === 'static' ? 'Criativo' : 'Manual'}</Badge></TableCell>
                        <TableCell><Badge className={`text-[10px] ${p.produto === 'business' ? 'bg-[#141A04] text-[#AFC040]' : p.produto === 'academy' ? 'bg-[#040E1A] text-[#4A9FE0]' : 'bg-muted text-muted-foreground'}`}>{p.produto}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backlog */}
        <TabsContent value="backlog" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Vídeos em Produção ({(backlogVideos || []).length})</CardTitle></CardHeader>
            <CardContent>
              {(backlogVideos || []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum vídeo no backlog</p> : (
                <div className="space-y-2">
                  {(backlogVideos || []).map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--c-border)]">
                      <div>
                        <p className="text-sm font-medium">{v.titulo}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className={`text-[10px] ${STATUS_COLORS[v.status_producao] || 'bg-muted text-muted-foreground'}`}>{v.status_producao}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{v.plataforma || 'youtube'}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Criativos em Produção ({(backlogStatics || []).length})</CardTitle></CardHeader>
            <CardContent>
              {(backlogStatics || []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum criativo no backlog</p> : (
                <div className="space-y-2">
                  {(backlogStatics || []).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--c-border)]">
                      <div>
                        <p className="text-sm font-medium">{s.titulo}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className={`text-[10px] ${STATUS_COLORS[s.status] || 'bg-muted text-muted-foreground'}`}>{s.status}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{s.tipo || 'post'}</Badge>
                          {s.categoria_conteudo === 'anuncio' && <Badge className="text-[10px] bg-[#1A0604] text-[#E8684A]">Anúncio</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ideas */}
        <TabsContent value="ideias" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ideias de Conteúdo ({ideasCount})</CardTitle>
                <Button size="sm" className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" onClick={() => setIdeaOpen(true)}><Plus className="h-3.5 w-3.5" /> Nova Ideia</Button>
              </div>
            </CardHeader>
            <CardContent>
              {ideasCount === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ideia cadastrada</p> : (
                <div className="space-y-2">
                  {(ideas || []).map((idea: any) => (
                    <div key={idea.id} className="flex items-start justify-between p-3 rounded-lg border border-[var(--c-border)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{idea.titulo}</p>
                        {idea.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{idea.descricao}</p>}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">{idea.tipo}</Badge>
                          <Badge className="text-[10px]" style={{ backgroundColor: `${PLATFORM_COLORS[idea.plataforma] || '#7A8460'}22`, color: PLATFORM_COLORS[idea.plataforma] || '#7A8460' }}>{idea.plataforma || '—'}</Badge>
                          <Badge className={`text-[10px] ${idea.prioridade === 'alta' ? 'bg-[#1A0604] text-[#E8684A]' : idea.prioridade === 'media' ? 'bg-[#1A1206] text-[#E8A43C]' : 'bg-muted text-muted-foreground'}`}>{idea.prioridade}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditIdea(idea)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]" onClick={() => { if (window.confirm('Remover ideia?')) deleteIdea.mutate(idea.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Idea Dialog */}
      <Dialog open={ideaOpen} onOpenChange={(open) => { setIdeaOpen(open); if (!open) setEditIdeaId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editIdeaId ? 'Editar Ideia' : 'Nova Ideia de Conteúdo'}</DialogTitle><DialogDescription>{editIdeaId ? 'Altere os dados da ideia' : 'Registre uma ideia para produzir depois'}</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Título *</Label><Input value={ideaForm.titulo} onChange={e => setIdeaForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título da ideia" /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={ideaForm.descricao} onChange={e => setIdeaForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes da ideia" rows={3} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Tipo</Label><Select value={ideaForm.tipo} onValueChange={v => setIdeaForm(p => ({ ...p, tipo: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="video">Vídeo</SelectItem><SelectItem value="carrossel">Carrossel</SelectItem><SelectItem value="post">Post</SelectItem><SelectItem value="reel">Reel</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Plataforma</Label><Select value={ideaForm.plataforma} onValueChange={v => setIdeaForm(p => ({ ...p, plataforma: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="youtube">YouTube</SelectItem><SelectItem value="tiktok">TikTok</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Produto</Label><Select value={ideaForm.produto} onValueChange={v => setIdeaForm(p => ({ ...p, produto: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="academy">Academy</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="skills">Skills</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIdeaOpen(false); setEditIdeaId(null) }}>Cancelar</Button>
            <Button className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" disabled={!ideaForm.titulo || createIdea.isPending || updateIdea.isPending} onClick={() => editIdeaId ? updateIdea.mutate() : createIdea.mutate()}>{(createIdea.isPending || updateIdea.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : editIdeaId ? 'Salvar' : 'Criar Ideia'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Post Dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Post</DialogTitle><DialogDescription>Agendar um post manual no calendário</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Título *</Label><Input value={postForm.titulo} onChange={e => setPostForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título do post" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Plataforma</Label><Select value={postForm.plataforma} onValueChange={v => setPostForm(p => ({ ...p, plataforma: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="youtube">YouTube</SelectItem><SelectItem value="tiktok">TikTok</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Data *</Label><Input type="date" value={postForm.data_agendamento} onChange={e => setPostForm(p => ({ ...p, data_agendamento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tipo</Label><Select value={postForm.tipo} onValueChange={v => setPostForm(p => ({ ...p, tipo: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="post">Post</SelectItem><SelectItem value="story">Story</SelectItem><SelectItem value="reel">Reel</SelectItem><SelectItem value="carrossel">Carrossel</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Produto</Label><Select value={postForm.produto} onValueChange={v => setPostForm(p => ({ ...p, produto: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="academy">Academy</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="skills">Skills</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostOpen(false)}>Cancelar</Button>
            <Button className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" disabled={!postForm.titulo || !postForm.data_agendamento || createPost.isPending} onClick={() => createPost.mutate()}>{createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agendar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
