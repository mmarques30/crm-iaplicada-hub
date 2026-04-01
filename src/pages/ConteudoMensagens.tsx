import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MessageSquare, Send, Clock, Camera, ChevronLeft, ChevronRight, Copy, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

/* ─── Constants ─── */

const COMUNIDADE_COLORS: Record<string, string> = {
  gratuita: '#7A8460',
  academy: '#4A9FE0',
  business: '#AFC040',
}

const CANAL_COLORS: Record<string, string> = {
  whatsapp: '#2CBBA6',
  email: '#4A9FE0',
  stories: '#E8684A',
}

const STATUS_CLASSES: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  aprovado: 'bg-[#1A1206] text-[#E8A43C]',
  enviado: 'bg-[#141A04] text-[#AFC040]',
}

const TIME_SLOTS = ['08:00', '14:00', '19:20']

const STORIES_SLOTS = [
  { slot: 'hook', label: 'Hook', time: '08:30' },
  { slot: 'valor', label: 'Valor', time: '12:00' },
  { slot: 'conexao', label: 'Conexao', time: '15:00' },
  { slot: 'engajamento', label: 'Engajamento', time: '18:00' },
  { slot: 'cta', label: 'CTA', time: '20:00' },
]

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

/* ─── Helpers ─── */

function getWeekRange(baseDate: Date) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)
  return { monday, friday }
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Texto copiado!')).catch(() => toast.error('Erro ao copiar'))
}

/* ─── Component ─── */

export default function ConteudoMensagens() {
  const queryClient = useQueryClient()
  const [filterComunidade, setFilterComunidade] = useState('todas')
  const [filterCanal, setFilterCanal] = useState('todos')
  const [weekBase, setWeekBase] = useState(new Date())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { monday, friday } = useMemo(() => getWeekRange(weekBase), [weekBase])

  /* ─── Queries ─── */
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['routine_messages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('routine_messages')
        .select('*, events(*)')
        .order('data', { ascending: true })
      if (error) throw error
      return (data || []) as any[]
    },
  })

  /* ─── Mutations ─── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('routine_messages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine_messages'] })
      toast.success('Mensagem removida!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  /* ─── Filtered ─── */
  const filtered = useMemo(() => {
    return messages.filter((m: any) => {
      if (filterComunidade !== 'todas' && m.comunidade !== filterComunidade) return false
      if (filterCanal !== 'todos' && m.canal !== filterCanal) return false
      return true
    })
  }, [messages, filterComunidade, filterCanal])

  /* ─── Week filtered ─── */
  const weekMessages = useMemo(() => {
    const mondayStr = toDateStr(monday)
    const fridayStr = toDateStr(friday)
    return filtered.filter((m: any) => m.data && m.data >= mondayStr && m.data <= fridayStr)
  }, [filtered, monday, friday])

  /* ─── Stories filtered ─── */
  const storiesMessages = useMemo(() => {
    return filtered.filter((m: any) => m.canal === 'stories')
  }, [filtered])

  /* ─── KPIs ─── */
  const kpiSemana = weekMessages.length
  const kpiEnviadas = filtered.filter((m: any) => m.status === 'enviado').length
  const kpiPendentes = filtered.filter((m: any) => m.status !== 'enviado').length
  const kpiStories = filtered.filter((m: any) => m.canal === 'stories').length

  /* ─── Week days ─── */
  const weekDays = useMemo(() => {
    const days: Array<{ date: Date; dateStr: string; label: string; messages: any[] }> = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = toDateStr(d)
      days.push({
        date: d,
        dateStr,
        label: WEEKDAY_LABELS[i],
        messages: weekMessages.filter((m: any) => m.data === dateStr),
      })
    }
    return days
  }, [monday, weekMessages])

  const weekLabel = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${friday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  /* ─── Nav ─── */
  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }
  const todayWeek = () => setWeekBase(new Date())

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mensagens & Comunicacao</h1>
        <p className="text-sm text-muted-foreground mt-1">Planejamento semanal de mensagens para comunidades</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Mensagens Semana" value={kpiSemana} icon={MessageSquare} accentColor="#4A9FE0" />
        <KPICard label="Enviadas" value={kpiEnviadas} icon={Send} accentColor="#AFC040" />
        <KPICard label="Pendentes" value={kpiPendentes} icon={Clock} accentColor="#E8A43C" />
        <KPICard label="Stories" value={kpiStories} icon={Camera} accentColor="#E8684A" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterComunidade} onValueChange={setFilterComunidade}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Comunidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Comunidades</SelectItem>
            <SelectItem value="gratuita">Gratuita</SelectItem>
            <SelectItem value="academy">Academy</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="stories">Stories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="semanal">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'semanal', l: 'Semanal' }, { v: 'todas', l: 'Todas' }, { v: 'stories', l: 'Stories' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab: Semanal ─── */}
        <TabsContent value="semanal" className="mt-4 space-y-4">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium capitalize">{weekLabel}</span>
              <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={todayWeek}>Hoje</Button>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {weekDays.map(day => {
              const isToday = toDateStr(new Date()) === day.dateStr
              return (
                <div key={day.dateStr} className={`rounded-lg border ${isToday ? 'border-[#AFC040]' : 'border-[var(--c-border)]'}`}>
                  <div className={`px-3 py-2 rounded-t-lg text-sm font-semibold ${isToday ? 'bg-[#AFC040]/10 text-[#AFC040]' : 'bg-[var(--c-raised)]'}`}>
                    {day.label} - {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <div className="p-2 space-y-2 min-h-[120px]">
                    {day.messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Sem mensagens</p>
                    )}
                    {day.messages.map((msg: any) => {
                      const isExpanded = expandedId === msg.id
                      return (
                        <div key={msg.id} className="border border-[var(--c-border)] rounded-md p-2 space-y-1.5 bg-[var(--c-card)]">
                          {/* Time + Community */}
                          <div className="flex flex-wrap gap-1">
                            {msg.horario && (
                              <Badge variant="secondary" className="text-[10px] font-mono">{msg.horario.slice(0, 5)}</Badge>
                            )}
                            {msg.comunidade && (
                              <Badge className="text-[10px]" style={{ backgroundColor: `${COMUNIDADE_COLORS[msg.comunidade] || '#7A8460'}22`, color: COMUNIDADE_COLORS[msg.comunidade] || '#7A8460' }}>
                                {msg.comunidade}
                              </Badge>
                            )}
                          </div>
                          {/* Title */}
                          <p className="text-xs font-medium leading-tight">{msg.titulo || 'Sem titulo'}</p>
                          {/* Expandable copy */}
                          {msg.copy_text && (
                            <>
                              <p
                                className={`text-[11px] text-muted-foreground cursor-pointer ${isExpanded ? '' : 'line-clamp-2'}`}
                                onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                              >
                                {msg.copy_text}
                              </p>
                            </>
                          )}
                          {/* Actions */}
                          <div className="flex gap-1 pt-0.5">
                            {msg.copy_text && (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => copyToClipboard(msg.copy_text)}>
                                <Copy className="h-3 w-3" /> Copiar
                              </Button>
                            )}
                            {msg.canal === 'whatsapp' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] gap-1 text-[#2CBBA6]"
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(msg.copy_text || msg.titulo || '')}`, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" /> WhatsApp
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── Tab: Todas ─── */}
        <TabsContent value="todas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead>Titulo</TableHead>
                      <TableHead>Comunidade</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {isLoading ? 'Carregando...' : 'Nenhuma mensagem encontrada'}
                        </TableCell>
                      </TableRow>
                    ) : filtered.map((msg: any) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{msg.titulo || '—'}</TableCell>
                        <TableCell>
                          {msg.comunidade ? (
                            <Badge className="text-[10px]" style={{ backgroundColor: `${COMUNIDADE_COLORS[msg.comunidade] || '#7A8460'}22`, color: COMUNIDADE_COLORS[msg.comunidade] || '#7A8460' }}>
                              {msg.comunidade}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {msg.canal ? (
                            <Badge className="text-[10px]" style={{ backgroundColor: `${CANAL_COLORS[msg.canal] || '#7A8460'}22`, color: CANAL_COLORS[msg.canal] || '#7A8460' }}>
                              {msg.canal}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(msg.data)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{msg.horario ? msg.horario.slice(0, 5) : '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${STATUS_CLASSES[msg.status] || 'bg-muted text-muted-foreground'}`}>
                            {msg.status || 'rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                          {msg.events?.nome || msg.evento || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]"
                            onClick={() => { if (window.confirm('Remover mensagem?')) deleteMutation.mutate(msg.id) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Stories ─── */}
        <TabsContent value="stories" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Framework Diario de Stories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {STORIES_SLOTS.map(slot => {
                  const slotStory = storiesMessages.find((m: any) => {
                    const h = m.horario ? m.horario.slice(0, 5) : ''
                    return h === slot.time
                  })
                  return (
                    <div key={slot.slot} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-card)]">
                      {/* Time + label */}
                      <div className="flex flex-col items-center min-w-[70px]">
                        <Badge variant="secondary" className="font-mono text-xs">{slot.time}</Badge>
                        <span className="text-[10px] text-muted-foreground mt-1 font-semibold">{slot.label}</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {slotStory ? (
                          <>
                            <p className="text-sm font-medium">{slotStory.titulo || slot.label}</p>
                            {slotStory.roteiro && (
                              <p className="text-xs text-muted-foreground mt-1">{slotStory.roteiro}</p>
                            )}
                            {slotStory.copy_text && !slotStory.roteiro && (
                              <p className="text-xs text-muted-foreground mt-1">{slotStory.copy_text}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Nenhum story programado para este slot</p>
                        )}
                      </div>
                      {/* Copy */}
                      {slotStory && (slotStory.roteiro || slotStory.copy_text) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-[#AFC040]"
                          onClick={() => copyToClipboard(slotStory.roteiro || slotStory.copy_text)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* All stories list */}
          {storiesMessages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Todos os Stories ({storiesMessages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {storiesMessages.map((s: any) => (
                    <div key={s.id} className="flex items-start justify-between p-3 rounded-lg border border-[var(--c-border)]">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1">
                          <Badge variant="secondary" className="text-[10px] font-mono">{s.horario ? s.horario.slice(0, 5) : '—'}</Badge>
                          {s.comunidade && (
                            <Badge className="text-[10px]" style={{ backgroundColor: `${COMUNIDADE_COLORS[s.comunidade] || '#7A8460'}22`, color: COMUNIDADE_COLORS[s.comunidade] || '#7A8460' }}>
                              {s.comunidade}
                            </Badge>
                          )}
                          <Badge className={`text-[10px] ${STATUS_CLASSES[s.status] || 'bg-muted text-muted-foreground'}`}>
                            {s.status || 'rascunho'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{s.titulo || 'Sem titulo'}</p>
                        {(s.roteiro || s.copy_text) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.roteiro || s.copy_text}</p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {(s.roteiro || s.copy_text) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-[#AFC040]"
                            onClick={() => copyToClipboard(s.roteiro || s.copy_text)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
