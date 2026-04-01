import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { CalendarDays, Video, Radio, HelpCircle, Plus, ChevronLeft, ChevronRight, Loader2, Trash2, Sparkles, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

/* ─── Constants ─── */

const EVENT_TYPE_COLORS: Record<string, string> = {
  aula: 'bg-[#040E1A] text-[#4A9FE0]',
  live: 'bg-[#1A0604] text-[#E8684A]',
  qa: 'bg-[#031411] text-[#2CBBA6]',
}

const EVENT_TYPE_DOT: Record<string, string> = {
  aula: '#4A9FE0',
  live: '#E8684A',
  qa: '#2CBBA6',
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-[#1A1206] text-[#E8A43C]',
  concluido: 'bg-[#141A04] text-[#AFC040]',
  cancelado: 'bg-[#1A0604] text-[#E8684A]',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const TYPE_LABELS: Record<string, string> = {
  aula: 'Aula',
  live: 'Live',
  qa: 'Q&A',
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const EMPTY_EVENT_FORM = {
  titulo: '',
  tipo: 'aula',
  ferramenta: '',
  data: '',
  horario: '',
  plataforma: '',
  comunidade: '',
  status: 'pendente',
  produto: 'academy',
  descricao: '',
}

const MESSAGE_TIMES = ['08:00', '12:00', '18:00']

/* ─── Types ─── */

interface EventRecord {
  id: string
  titulo: string
  tipo: string
  ferramenta: string | null
  data: string | null
  horario: string | null
  plataforma: string | null
  comunidade: string | null
  status: string
  produto: string | null
  descricao: string | null
  created_at: string | null
}

interface CommunityRecord {
  id: string
  nome: string
  plataforma: string | null
}

interface GeneratedMessage {
  comunidade: string
  horario: string
  mensagem: string
}

/* ─── Component ─── */

export default function ConteudoEventos() {
  const queryClient = useQueryClient()

  // State
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [eventOpen, setEventOpen] = useState(false)
  const [eventForm, setEventForm] = useState({ ...EMPTY_EVENT_FORM })
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterComunidade, setFilterComunidade] = useState('all')
  const [filterMes, setFilterMes] = useState('all')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([])
  const [generating, setGenerating] = useState(false)
  const [savingMessages, setSavingMessages] = useState(false)
  // Tool suggestions state
  const [suggestCategory, setSuggestCategory] = useState('Produtividade')
  const [suggestedTools, setSuggestedTools] = useState<any[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [researching, setResearching] = useState<string | null>(null)
  const [toolResearch, setToolResearch] = useState<Record<string, string>>({})
  const [createFromTool, setCreateFromTool] = useState<any | null>(null)

  // Queries
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('events').select('*').order('data', { ascending: true })
      return (data || []) as EventRecord[]
    },
  })

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('communities').select('*').order('nome', { ascending: true })
      return (data || []) as CommunityRecord[]
    },
  })

  // KPIs
  const totalEventos = events.length
  const totalAulas = events.filter(e => e.tipo === 'aula').length
  const totalLives = events.filter(e => e.tipo === 'live').length
  const totalQAs = events.filter(e => e.tipo === 'qa').length

  // Calendar
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStr = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number | null; events: EventRecord[] }> = []
    for (let i = 0; i < firstDay; i++) days.push({ day: null, events: [] })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayEvents = events.filter(e => e.data === dateStr)
      days.push({ day: d, events: dayEvents })
    }
    return days
  }, [events, year, month, firstDay, daysInMonth])

  // Filtered events for Lista tab
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterTipo !== 'all' && e.tipo !== filterTipo) return false
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      if (filterComunidade !== 'all' && e.comunidade !== filterComunidade) return false
      if (filterMes !== 'all' && e.data) {
        const eventMonth = e.data.substring(0, 7) // YYYY-MM
        if (eventMonth !== filterMes) return false
      }
      return true
    })
  }, [events, filterTipo, filterStatus, filterComunidade, filterMes])

  // Unique months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    events.forEach(e => {
      if (e.data) months.add(e.data.substring(0, 7))
    })
    return Array.from(months).sort()
  }, [events])

  // Unique communities from events
  const eventCommunities = useMemo(() => {
    const comms = new Set<string>()
    events.forEach(e => {
      if (e.comunidade) comms.add(e.comunidade)
    })
    return Array.from(comms).sort()
  }, [events])

  // Selected event for AI tab
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId) || null, [events, selectedEventId])

  // Mutations
  const createEvent = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = { ...eventForm }
      if (!payload.ferramenta) delete payload.ferramenta
      if (!payload.horario) delete payload.horario
      if (!payload.plataforma) delete payload.plataforma
      if (!payload.comunidade) delete payload.comunidade
      if (!payload.descricao) delete payload.descricao
      if (!payload.data) delete payload.data
      const { error } = await (supabase as any).from('events').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setEventOpen(false)
      setEventForm({ ...EMPTY_EVENT_FORM })
      toast.success('Evento criado com sucesso!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Evento removido')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const updateEventStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('events').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Status atualizado')
    },
    onError: (e: any) => toast.error(e.message),
  })

  // AI message generation
  const generateMessages = useCallback(async () => {
    if (!selectedEvent) return
    setGenerating(true)
    setGeneratedMessages([])

    const eventCommunities = communities.length > 0
      ? communities.slice(0, 2)
      : [{ id: '1', nome: selectedEvent.comunidade || 'Comunidade Geral', plataforma: 'whatsapp' }]

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          action: 'generate',
          tool: selectedEvent.ferramenta || selectedEvent.titulo,
          date: selectedEvent.data,
          eventType: selectedEvent.tipo || 'aula',
          communities: communities.map((c: any) => ({
            slug: c.slug || c.nome?.toLowerCase(),
            nome: c.nome,
            tom_de_voz: c.tom_de_voz || 'Acessível e prático',
            objetivo: c.objetivo || 'Engajar participantes',
          })),
        },
      })

      if (error || !data?.messages) throw new Error('Fallback to template')

      setGeneratedMessages(data.messages as GeneratedMessage[])
    } catch {
      // Template fallback
      const messages: GeneratedMessage[] = []
      const communityList = communities.length > 0
        ? communities.slice(0, 2)
        : [{ id: '1', nome: selectedEvent.comunidade || 'Comunidade Geral', plataforma: null }]

      for (const community of communityList) {
        for (const time of MESSAGE_TIMES) {
          const timeLabel = time === '08:00' ? 'manhã' : time === '12:00' ? 'almoço' : 'noite'
          const typeLabel = TYPE_LABELS[selectedEvent.tipo] || selectedEvent.tipo
          const dateFormatted = selectedEvent.data ? formatDate(selectedEvent.data) : 'em breve'
          const hourStr = selectedEvent.horario || '20:00'

          let msg = ''
          if (time === '08:00') {
            msg = `Bom dia, ${community.nome}! Hoje temos ${typeLabel} "${selectedEvent.titulo}" às ${hourStr}. Prepare suas dúvidas e não perca!`
          } else if (time === '12:00') {
            msg = `Lembrete: ${typeLabel} "${selectedEvent.titulo}" acontece hoje às ${hourStr}. Anote na agenda! Data: ${dateFormatted}.`
          } else {
            msg = `Falta pouco! ${typeLabel} "${selectedEvent.titulo}" começa às ${hourStr}. ${selectedEvent.plataforma ? `Acesse via ${selectedEvent.plataforma}.` : 'Nos vemos lá!'}`
          }

          messages.push({
            comunidade: community.nome,
            horario: time,
            mensagem: msg,
          })
        }
      }
      setGeneratedMessages(messages)
      toast.info('Mensagens geradas via template (IA indisponível)')
    } finally {
      setGenerating(false)
    }
  }, [selectedEvent, communities])

  const saveMessages = useCallback(async () => {
    if (generatedMessages.length === 0 || !selectedEvent) return
    setSavingMessages(true)

    try {
      const rows = generatedMessages.map(m => ({
        event_id: selectedEvent.id,
        comunidade: m.comunidade,
        horario_envio: m.horario,
        mensagem: m.mensagem,
        status: 'pendente',
      }))

      const { error } = await (supabase as any).from('routine_messages').insert(rows)
      if (error) throw error

      toast.success(`${rows.length} mensagens salvas com sucesso!`)
      setGeneratedMessages([])
      setSelectedEventId(null)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar mensagens')
    } finally {
      setSavingMessages(false)
    }
  }, [generatedMessages, selectedEvent])

  // Form field updater
  const updateForm = (field: string, value: string) => setEventForm(prev => ({ ...prev, [field]: value }))

  // Next status cycle
  const nextStatus = (current: string) => {
    if (current === 'pendente') return 'concluido'
    if (current === 'concluido') return 'cancelado'
    return 'pendente'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold">Eventos & Aulas</h1>
          <div className="flex gap-1.5">
            <Badge className="bg-[#040E1A] text-[#4A9FE0] text-[10px]">{totalAulas} Aulas</Badge>
            <Badge className="bg-[#1A0604] text-[#E8684A] text-[10px]">{totalLives} Lives</Badge>
            <Badge className="bg-[#031411] text-[#2CBBA6] text-[10px]">{totalQAs} Q&As</Badge>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold" onClick={() => setEventOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Novo Evento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Total Eventos" value={totalEventos} icon={CalendarDays} accentColor="#AFC040" />
        <KPICard label="Aulas" value={totalAulas} icon={Video} accentColor="#4A9FE0" />
        <KPICard label="Lives" value={totalLives} icon={Radio} accentColor="#E8684A" />
        <KPICard label="Q&As" value={totalQAs} icon={HelpCircle} accentColor="#2CBBA6" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendario">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[
            { v: 'calendario', l: 'Calendário' },
            { v: 'lista', l: 'Lista' },
            { v: 'sugestoes', l: 'Sugerir Ferramentas' },
            { v: 'gerador', l: 'Gerador IA' },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab 1: Calendário ─── */}
        <TabsContent value="calendario" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base capitalize">{monthStr}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {calendarDays.map((cell, i) => {
                  const isToday = cell.day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] border border-[var(--c-border)] p-1 ${cell.day ? 'bg-[var(--c-card)]' : 'bg-transparent'} ${isToday ? 'ring-1 ring-[#AFC040]' : ''}`}
                    >
                      {cell.day && (
                        <>
                          <span className="text-xs text-muted-foreground">{cell.day}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cell.events.map(ev => (
                              <div
                                key={ev.id}
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: EVENT_TYPE_DOT[ev.tipo] || '#7A8460' }}
                                title={`${TYPE_LABELS[ev.tipo] || ev.tipo}: ${ev.titulo}${ev.horario ? ` (${ev.horario})` : ''}`}
                              />
                            ))}
                          </div>
                          {cell.events.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {cell.events.slice(0, 2).map(ev => (
                                <div
                                  key={ev.id}
                                  className="text-[9px] px-1 py-0.5 rounded truncate"
                                  style={{
                                    backgroundColor: `${EVENT_TYPE_DOT[ev.tipo] || '#7A8460'}22`,
                                    color: EVENT_TYPE_DOT[ev.tipo] || '#7A8460',
                                  }}
                                >
                                  {ev.titulo.substring(0, 12)}
                                </div>
                              ))}
                              {cell.events.length > 2 && (
                                <span className="text-[9px] text-muted-foreground">+{cell.events.length - 2}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                {Object.entries(EVENT_TYPE_DOT).map(([tipo, color]) => (
                  <div key={tipo} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span>{TYPE_LABELS[tipo]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Lista ─── */}
        <TabsContent value="lista" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="aula">Aula</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="qa">Q&A</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterComunidade} onValueChange={setFilterComunidade}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Comunidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Comunidades</SelectItem>
                {eventCommunities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Meses</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>
                    {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold ml-auto" onClick={() => setEventOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo Evento
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ferramenta</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Comunidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Nenhum evento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map(ev => (
                        <TableRow key={ev.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{ev.titulo}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${EVENT_TYPE_COLORS[ev.tipo] || 'bg-muted text-muted-foreground'}`}>
                              {TYPE_LABELS[ev.tipo] || ev.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ev.ferramenta || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ev.data ? formatDate(ev.data) : '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ev.horario || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ev.plataforma || '—'}</TableCell>
                          <TableCell>
                            {ev.comunidade ? (
                              <Badge variant="secondary" className="text-[10px]">{ev.comunidade}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] cursor-pointer transition-opacity hover:opacity-80 ${STATUS_COLORS[ev.status] || 'bg-muted text-muted-foreground'}`}
                              onClick={() => updateEventStatus.mutate({ id: ev.id, status: nextStatus(ev.status) })}
                              title={`Clique para mudar para "${STATUS_LABELS[nextStatus(ev.status)]}"`}
                            >
                              {STATUS_LABELS[ev.status] || ev.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ev.produto || '—'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]"
                              onClick={() => { if (window.confirm('Remover este evento?')) deleteEvent.mutate(ev.id) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

        {/* ─── Tab: Sugerir Ferramentas (Perplexity) ─── */}
        <TabsContent value="sugestoes" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#E8A43C]" />
                    Sugerir Ferramentas de IA via Perplexity
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Busca ferramentas de nicho por categoria para usar nas próximas aulas</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="space-y-1.5 flex-1">
                  <Label>Categoria</Label>
                  <Select value={suggestCategory} onValueChange={setSuggestCategory}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Produtividade', 'Texto', 'Video', 'Audio', 'Design', 'Dados', 'Automação', 'Pesquisa', 'Código', 'Apresentações'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                  disabled={suggesting}
                  onClick={async () => {
                    setSuggesting(true)
                    setSuggestedTools([])
                    try {
                      const existingTools = (events || []).map((e: any) => e.ferramenta).filter(Boolean)
                      const { data, error } = await supabase.functions.invoke('generate-content', {
                        body: { action: 'suggest', category: suggestCategory, excludeTools: existingTools },
                      })
                      if (error) throw error
                      setSuggestedTools(data?.tools || [])
                      if ((data?.tools || []).length === 0) toast.info('Nenhuma ferramenta encontrada para essa categoria')
                    } catch (err: any) {
                      toast.error('Erro ao buscar sugestões: ' + (err.message || 'tente novamente'))
                    } finally {
                      setSuggesting(false)
                    }
                  }}
                >
                  {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {suggesting ? 'Pesquisando...' : 'Buscar Ferramentas'}
                </Button>
              </div>

              {/* Results */}
              {suggestedTools.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{suggestedTools.length} ferramentas encontradas na categoria "{suggestCategory}"</p>
                  {suggestedTools.map((tool, i) => (
                    <div key={i} className="p-4 rounded-lg border border-[var(--c-border)] hover:border-[var(--c-border-h)] transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold" style={{ color: '#E8EDD8' }}>{tool.name}</h3>
                          {tool.tagline && <p className="text-xs text-muted-foreground mt-0.5">{tool.tagline}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            disabled={researching === tool.name}
                            onClick={async () => {
                              setResearching(tool.name)
                              try {
                                const { data, error } = await supabase.functions.invoke('rapid-task', {
                                  body: { action: 'research', tool: tool.name },
                                })
                                if (error) throw error
                                setToolResearch(prev => ({ ...prev, [tool.name]: data?.research || 'Sem resultado' }))
                              } catch {
                                toast.error('Erro ao pesquisar')
                              } finally {
                                setResearching(null)
                              }
                            }}
                          >
                            {researching === tool.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Pesquisar
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 text-xs bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                            onClick={() => {
                              setCreateFromTool(tool)
                              setEventForm({
                                ...EMPTY_EVENT_FORM,
                                titulo: `${tool.name}: ${tool.tagline || tool.useCase || ''}`.substring(0, 100),
                                ferramenta: tool.name,
                                tipo: 'aula',
                                descricao: toolResearch[tool.name] || tool.useCase || '',
                              })
                              setEventOpen(true)
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Criar Evento
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tool.category && <Badge variant="secondary" className="text-[10px]">{tool.category}</Badge>}
                        {tool.pricing && <Badge className="text-[10px] bg-[#1A1206] text-[#E8A43C]">{tool.pricing}</Badge>}
                        {tool.wow && <Badge className="text-[10px] bg-[#141A04] text-[#AFC040]">✱ {tool.wow}</Badge>}
                      </div>
                      {tool.useCase && <p className="text-xs text-muted-foreground">{tool.useCase}</p>}

                      {/* Expanded research */}
                      {toolResearch[tool.name] && (
                        <div className="mt-2 p-3 rounded-lg bg-[var(--c-raised)] text-sm whitespace-pre-wrap">
                          {toolResearch[tool.name]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Gerador IA ─── */}
        <TabsContent value="gerador" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#E8A43C]" />
                Gerador de Mensagens para Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event selector */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5 flex-1 min-w-[250px]">
                  <Label>Selecionar Evento</Label>
                  <Select value={selectedEventId || ''} onValueChange={v => { setSelectedEventId(v); setGeneratedMessages([]) }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Escolha um evento..." /></SelectTrigger>
                    <SelectContent>
                      {events.map(ev => (
                        <SelectItem key={ev.id} value={ev.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: EVENT_TYPE_DOT[ev.tipo] || '#7A8460' }} />
                            {ev.titulo} — {ev.data ? formatDate(ev.data) : 'Sem data'}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-[#E8A43C] text-[#0D0D0D] hover:bg-[#E8A43C]/90 font-semibold"
                  disabled={!selectedEventId || generating}
                  onClick={generateMessages}
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Gerar Mensagens
                </Button>
              </div>

              {/* Selected event summary */}
              {selectedEvent && (
                <div className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-card)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{selectedEvent.titulo}</span>
                    <Badge className={`text-[10px] ${EVENT_TYPE_COLORS[selectedEvent.tipo] || ''}`}>
                      {TYPE_LABELS[selectedEvent.tipo] || selectedEvent.tipo}
                    </Badge>
                    {selectedEvent.data && <span className="text-xs text-muted-foreground">{formatDate(selectedEvent.data)}</span>}
                    {selectedEvent.horario && <span className="text-xs text-muted-foreground">às {selectedEvent.horario}</span>}
                    {selectedEvent.comunidade && <Badge variant="secondary" className="text-[10px]">{selectedEvent.comunidade}</Badge>}
                  </div>
                </div>
              )}

              {/* Generated messages preview */}
              {generatedMessages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Mensagens Geradas ({generatedMessages.length})</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={generateMessages}
                        disabled={generating}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                        Regenerar
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                        onClick={saveMessages}
                        disabled={savingMessages}
                      >
                        {savingMessages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Salvar
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {generatedMessages.map((msg, idx) => {
                      const timeLabel = msg.horario === '08:00' ? 'Manhã' : msg.horario === '12:00' ? 'Almoço' : 'Noite'
                      const timeColor = msg.horario === '08:00' ? '#E8A43C' : msg.horario === '12:00' ? '#4A9FE0' : '#2CBBA6'
                      return (
                        <div key={idx} className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-card)] space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[10px]">{msg.comunidade}</Badge>
                            <Badge className="text-[10px]" style={{ backgroundColor: `${timeColor}22`, color: timeColor }}>
                              {timeLabel} ({msg.horario})
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{msg.mensagem}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!selectedEventId && generatedMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Selecione um evento para gerar mensagens automáticas</p>
                  <p className="text-xs mt-1">3 horários x comunidades = mensagens prontas para envio</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── New Event Dialog ─── */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
            <DialogDescription>Cadastrar aula, live ou sessão de Q&A</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={eventForm.titulo} onChange={e => updateForm('titulo', e.target.value)} placeholder="Título do evento" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={eventForm.tipo} onValueChange={v => updateForm('tipo', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aula">Aula</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="qa">Q&A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ferramenta</Label>
                <Input value={eventForm.ferramenta} onChange={e => updateForm('ferramenta', e.target.value)} placeholder="Ex: Zoom, Meet" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={eventForm.data} onChange={e => updateForm('data', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <Input type="time" value={eventForm.horario} onChange={e => updateForm('horario', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plataforma</Label>
                <Input value={eventForm.plataforma} onChange={e => updateForm('plataforma', e.target.value)} placeholder="Ex: YouTube, Zoom" />
              </div>
              <div className="space-y-1.5">
                <Label>Comunidade</Label>
                <Select value={eventForm.comunidade} onValueChange={v => updateForm('comunidade', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {communities.length > 0 ? (
                      communities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)
                    ) : (
                      <>
                        <SelectItem value="academy">Academy</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="skills">Skills</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={eventForm.status} onValueChange={v => updateForm('status', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Produto</Label>
                <Select value={eventForm.produto} onValueChange={v => updateForm('produto', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academy">Academy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="skills">Skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={eventForm.descricao} onChange={e => updateForm('descricao', e.target.value)} placeholder="Detalhes do evento" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
              disabled={!eventForm.titulo || createEvent.isPending}
              onClick={() => createEvent.mutate()}
            >
              {createEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
