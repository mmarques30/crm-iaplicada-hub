import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Clock, Users, AlertTriangle, CheckCircle, MessageSquare, ChevronRight, TrendingDown, Pause } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const CADENCE_STEPS = [
  { id: 'msg1_abertura', label: 'Abertura', day: 0 },
  { id: 'msg2_followup', label: 'Follow-up', day: 1 },
  { id: 'msg3_qualificacao', label: 'Qualificação', day: 2 },
  { id: 'msg4_agendamento', label: 'Agendamento', day: 3 },
  { id: 'msg5_confirmacao', label: 'Confirmação', day: 4 },
  { id: 'msg6_lembrete', label: 'Lembrete', day: 5 },
  { id: 'msg7_pos_call', label: 'Pós-Call', day: 7 },
  { id: 'msg8_proposta', label: 'Proposta', day: 8 },
  { id: 'msg9_followup_proposta', label: 'Follow-up Proposta', day: 11 },
  { id: 'msg10_fechamento', label: 'Fechamento', day: 14 },
]

const STAGE_TO_STEP: Record<string, number> = {
  'Lead Capturado': 0, 'MQL': 0, 'Contato Iniciado': 2, 'Conectado': 3,
  'SQL': 3, 'Reunião Agendada': 4, 'Reunião Realizada': 6, 'Inscrito': 6,
  'Negociação': 7, 'Contrato Enviado': 8,
}

// Research-based conversion rates by response time
// Source: Harvard Business Review, InsideSales.com, Drift
const CONVERSION_BY_DELAY: Array<{ maxDays: number; rate: string; color: string; label: string }> = [
  { maxDays: 0, rate: '~78%', color: '#AFC040', label: 'Resposta no mesmo dia: ~78% de chance de qualificar' },
  { maxDays: 1, rate: '~60%', color: '#2CBBA6', label: '1 dia: ~60% de chance. Ainda ótimo.' },
  { maxDays: 2, rate: '~40%', color: '#E8A43C', label: '2 dias: ~40%. Cada hora conta.' },
  { maxDays: 5, rate: '~20%', color: '#E8A43C', label: '3-5 dias: ~20%. Lead esfriando.' },
  { maxDays: 7, rate: '~10%', color: '#E8684A', label: '1 semana: ~10%. Lead frio.' },
  { maxDays: 14, rate: '~5%', color: '#E8684A', label: '2 semanas: ~5%. Quase perdido.' },
  { maxDays: 999, rate: '<2%', color: '#7A8460', label: '2+ semanas: <2%. Considere descarte.' },
]

function getConversionInfo(daysIdle: number) {
  return CONVERSION_BY_DELAY.find(c => daysIdle <= c.maxDays) || CONVERSION_BY_DELAY[CONVERSION_BY_DELAY.length - 1]
}

interface LeadTask {
  dealId: string
  dealName: string
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  product: string
  stageName: string
  stageOrder: number
  currentStep: number
  lastMessageDate: string | null
  lastMessageStep: string | null
  nextStep: typeof CADENCE_STEPS[number]
  nextStepDate: string
  urgency: 'overdue' | 'today' | 'upcoming' | 'done'
  daysOverdue: number
  daysIdle: number // days since last message or creation
  conversionRate: string
  conversionColor: string
  priority: number // calculated priority score (higher = more urgent)
}

export default function CadenciaLeads() {
  const navigate = useNavigate()
  const [filterProduct, setFilterProduct] = useState('todos')
  const [filterUrgency, setFilterUrgency] = useState('todos')
  const [filterPriority, setFilterPriority] = useState('todos')
  const [sortBy, setSortBy] = useState<'priority' | 'daysIdle' | 'conversion' | 'stage'>('priority')

  const { data: deals } = useQuery({
    queryKey: ['cadence_deals'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('deals_full')
        .select('id, name, product, stage_name, stage_order, is_won, contact_id, contact_first_name, contact_last_name, contact_phone, contact_email, created_at, stage_entered_at')
        .is('is_won', null)
      return (data || []) as any[]
    },
    staleTime: 30_000,
  })

  const { data: sentMessages } = useQuery({
    queryKey: ['cadence_activities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('contact_id, deal_id, subject, created_at')
        .eq('type', 'whatsapp')
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
      return (data || []) as any[]
    },
    staleTime: 30_000,
  })

  const tasks = useMemo<LeadTask[]>(() => {
    if (!deals) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return deals.map((deal: any) => {
      const contactId = deal.contact_id
      const dealMessages = (sentMessages || []).filter((m: any) =>
        m.deal_id === deal.id || m.contact_id === contactId
      )

      let lastStepIndex = -1
      let lastMessageDate: string | null = null
      for (const msg of dealMessages) {
        const stepIndex = CADENCE_STEPS.findIndex(s => s.label === msg.subject)
        if (stepIndex > lastStepIndex) {
          lastStepIndex = stepIndex
          lastMessageDate = msg.created_at
        }
      }

      const stageStep = STAGE_TO_STEP[deal.stage_name] ?? 0
      const currentStep = Math.max(lastStepIndex, stageStep)
      const nextStepIndex = Math.min(currentStep + (lastStepIndex >= currentStep ? 1 : 0), CADENCE_STEPS.length - 1)
      const nextStep = CADENCE_STEPS[nextStepIndex]

      const baseDate = lastMessageDate ? new Date(lastMessageDate) : new Date(deal.created_at)
      baseDate.setHours(0, 0, 0, 0)
      const nextDate = new Date(baseDate)
      nextDate.setDate(nextDate.getDate() + (nextStep.day - (CADENCE_STEPS[currentStep]?.day || 0) || 1))

      const diffDays = Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))

      // Days idle = days since last message or deal creation
      const lastActivity = lastMessageDate || deal.stage_entered_at || deal.created_at
      const daysIdle = Math.max(0, Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)))

      const convInfo = getConversionInfo(daysIdle)

      let urgency: LeadTask['urgency'] = 'upcoming'
      if (nextStepIndex >= CADENCE_STEPS.length) urgency = 'done'
      else if (diffDays > 0) urgency = 'overdue'
      else if (diffDays === 0) urgency = 'today'

      // Priority score: higher = needs attention sooner
      // Formula: (days overdue * 10) + (days idle * 5) + (stage weight * 3) + (no messages penalty)
      const stageWeight = deal.stage_order || 0
      const noMessagePenalty = lastStepIndex < 0 ? 20 : 0
      const priority = Math.max(0, diffDays) * 10 + daysIdle * 5 + stageWeight * 3 + noMessagePenalty

      return {
        dealId: deal.id,
        dealName: deal.name,
        contactName: `${deal.contact_first_name || deal.name} ${deal.contact_last_name || ''}`.trim(),
        contactPhone: deal.contact_phone,
        contactEmail: deal.contact_email,
        product: deal.product,
        stageName: deal.stage_name,
        stageOrder: deal.stage_order || 0,
        currentStep,
        lastMessageDate,
        lastMessageStep: lastStepIndex >= 0 ? CADENCE_STEPS[lastStepIndex].label : null,
        nextStep,
        nextStepDate: nextDate.toISOString().split('T')[0],
        urgency,
        daysOverdue: Math.max(0, diffDays),
        daysIdle,
        conversionRate: convInfo.rate,
        conversionColor: convInfo.color,
        priority,
      }
    })
  }, [deals, sentMessages])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...tasks]
    switch (sortBy) {
      case 'priority': return arr.sort((a, b) => b.priority - a.priority)
      case 'daysIdle': return arr.sort((a, b) => b.daysIdle - a.daysIdle)
      case 'conversion': return arr.sort((a, b) => b.daysIdle - a.daysIdle) // worse conversion first
      case 'stage': return arr.sort((a, b) => b.stageOrder - a.stageOrder) // later stages first
      default: return arr
    }
  }, [tasks, sortBy])

  // Filter
  const filtered = useMemo(() => {
    return sorted.filter(t => {
      if (filterProduct !== 'todos' && t.product !== filterProduct) return false
      if (filterUrgency !== 'todos' && t.urgency !== filterUrgency) return false
      if (filterPriority === 'critica' && t.daysIdle < 5) return false
      if (filterPriority === 'alta' && (t.daysIdle < 2 || t.daysIdle >= 5)) return false
      if (filterPriority === 'normal' && t.daysIdle >= 2) return false
      if (filterPriority === 'sem_msg' && t.lastMessageStep !== null) return false
      return true
    })
  }, [sorted, filterProduct, filterUrgency, filterPriority])

  const overdue = tasks.filter(t => t.urgency === 'overdue').length
  const todayCount = tasks.filter(t => t.urgency === 'today').length
  const stalled = tasks.filter(t => t.daysIdle >= 5).length
  const totalActive = tasks.length

  // Conversion health summary
  const avgDaysIdle = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.daysIdle, 0) / tasks.length) : 0
  const noMessageCount = tasks.filter(t => !t.lastMessageStep).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Cadência de Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">Priorize quem abordar primeiro — cada hora conta na conversão</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Atrasados" value={overdue} icon={AlertTriangle} accentColor="#E8684A" onClick={() => setFilterUrgency(filterUrgency === 'overdue' ? 'todos' : 'overdue')} />
        <KPICard label="Pra Hoje" value={todayCount} icon={Clock} accentColor="#E8A43C" onClick={() => setFilterUrgency(filterUrgency === 'today' ? 'todos' : 'today')} />
        <KPICard label="Parados 5d+" value={stalled} icon={Pause} accentColor="#E8684A" sub={`Média: ${avgDaysIdle}d parado`} onClick={() => setFilterPriority(filterPriority === 'critica' ? 'todos' : 'critica')} />
        <KPICard label="Sem Mensagem" value={noMessageCount} icon={MessageSquare} accentColor="#4A9FE0" sub={`${totalActive} leads ativos`} onClick={() => setFilterPriority(filterPriority === 'sem_msg' ? 'todos' : 'sem_msg')} />
      </div>

      {/* Conversion research banner */}
      <Card className="border-[#E8A43C]/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-4 w-4 text-[#E8A43C] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium" style={{ color: '#E8A43C' }}>Taxa de conversão cai drasticamente com o tempo de resposta</p>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {CONVERSION_BY_DELAY.slice(0, 5).map(c => (
                  <span key={c.maxDays} className="text-[10px]" style={{ color: c.color }}>
                    {c.maxDays === 0 ? 'Mesmo dia' : c.maxDays === 1 ? '1 dia' : c.maxDays <= 5 ? `${c.maxDays}d` : c.maxDays <= 7 ? '1 sem' : '2 sem'}: <strong>{c.rate}</strong>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Fonte: Harvard Business Review, InsideSales.com, Drift — "Speed to Lead"</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="academy">Academy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Urgência</SelectItem>
            <SelectItem value="overdue">Atrasados</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="upcoming">Próximos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Prioridade</SelectItem>
            <SelectItem value="critica">Crítica (5d+ parado)</SelectItem>
            <SelectItem value="alta">Alta (2-5d parado)</SelectItem>
            <SelectItem value="normal">Normal ({'<'}2d)</SelectItem>
            <SelectItem value="sem_msg">Sem nenhuma msg</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Ordenar: Prioridade</SelectItem>
            <SelectItem value="daysIdle">Ordenar: Dias Parado</SelectItem>
            <SelectItem value="conversion">Ordenar: Conversão</SelectItem>
            <SelectItem value="stage">Ordenar: Estágio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma ação pendente</p>
            <p className="text-xs mt-1">Todos os leads estão em dia!</p>
          </CardContent></Card>
        ) : (
          filtered.map(task => {
            const convInfo = getConversionInfo(task.daysIdle)
            return (
              <Card
                key={task.dealId}
                className="cursor-pointer hover:border-[var(--c-border-h)] transition-colors"
                onClick={() => navigate(`/deals/${task.dealId}`)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    {/* Urgency bar */}
                    <div className={`w-1.5 self-stretch rounded-full shrink-0 ${
                      task.urgency === 'overdue' ? 'bg-[#E8684A]' :
                      task.urgency === 'today' ? 'bg-[#E8A43C]' :
                      'bg-[#AFC040]'
                    }`} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">{task.contactName}</span>
                        <Badge className={`text-[10px] ${task.product === 'business' ? 'bg-[#141A04] text-[#AFC040]' : 'bg-[#040E1A] text-[#4A9FE0]'}`}>{task.product}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{task.stageName}</Badge>

                        {/* Days idle tag */}
                        <Badge className="text-[10px]" style={{ backgroundColor: `${convInfo.color}22`, color: convInfo.color }}>
                          <Pause className="h-2.5 w-2.5 mr-0.5" />
                          {task.daysIdle}d parado
                        </Badge>

                        {/* Overdue tag */}
                        {task.urgency === 'overdue' && task.daysOverdue > 0 && (
                          <Badge className="text-[10px] bg-[#1A0604] text-[#E8684A]">
                            {task.daysOverdue}d atrasado
                          </Badge>
                        )}
                        {task.urgency === 'today' && (
                          <Badge className="text-[10px] bg-[#1A1206] text-[#E8A43C]">Hoje</Badge>
                        )}
                        {!task.lastMessageStep && (
                          <Badge className="text-[10px] bg-[#040E1A] text-[#4A9FE0]">Sem msg</Badge>
                        )}
                      </div>

                      {/* Contact info + conversion */}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {task.contactEmail && <span className="truncate max-w-[180px]">{task.contactEmail}</span>}
                        {task.contactPhone && <span className="whitespace-nowrap">{task.contactPhone}</span>}
                        <span style={{ color: convInfo.color }} className="font-medium whitespace-nowrap">
                          Conv: {task.conversionRate}
                        </span>
                      </div>
                    </div>

                    {/* Next action */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="flex items-center gap-1.5 justify-end">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{task.nextStep.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {task.lastMessageStep ? `Última: ${task.lastMessageStep}` : 'Nenhuma msg enviada'}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
