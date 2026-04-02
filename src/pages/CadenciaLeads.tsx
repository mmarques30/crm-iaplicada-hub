import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Bell, Clock, Users, AlertTriangle, CheckCircle, MessageSquare, Phone, Calendar, ChevronRight, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/format'
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
  'Lead Capturado': 0,
  'MQL': 0,
  'Contato Iniciado': 2,
  'Conectado': 3,
  'SQL': 3,
  'Reunião Agendada': 4,
  'Reunião Realizada': 6,
  'Inscrito': 6,
  'Negociação': 7,
  'Contrato Enviado': 8,
}

const URGENCY_COLORS = {
  overdue: 'bg-[#1A0604] text-[#E8684A] border-[#E8684A]/30',
  today: 'bg-[#1A1206] text-[#E8A43C] border-[#E8A43C]/30',
  upcoming: 'bg-[#141A04] text-[#AFC040] border-[#AFC040]/30',
  done: 'bg-muted text-muted-foreground border-transparent',
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
}

export default function CadenciaLeads() {
  const navigate = useNavigate()
  const [filterProduct, setFilterProduct] = useState('todos')
  const [filterUrgency, setFilterUrgency] = useState('todos')

  // Fetch all active deals with contacts
  const { data: deals } = useQuery({
    queryKey: ['cadence_deals'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('deals_full')
        .select('id, name, product, stage_name, stage_order, is_won, contact_id, contact_first_name, contact_last_name, contact_phone, contact_email, created_at')
        .is('is_won', null) // Only active deals (not won/lost)
      return (data || []) as any[]
    },
    staleTime: 30_000,
  })

  // Fetch all whatsapp activities (sent messages) for all contacts
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

  // Build lead tasks
  const tasks = useMemo<LeadTask[]>(() => {
    if (!deals) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return deals.map((deal: any) => {
      const contactId = deal.contact_id
      const dealMessages = (sentMessages || []).filter((m: any) =>
        m.deal_id === deal.id || m.contact_id === contactId
      )

      // Find which step was last sent
      let lastStepIndex = -1
      let lastMessageDate: string | null = null
      for (const msg of dealMessages) {
        const stepIndex = CADENCE_STEPS.findIndex(s => s.label === msg.subject)
        if (stepIndex > lastStepIndex) {
          lastStepIndex = stepIndex
          lastMessageDate = msg.created_at
        }
      }

      // Determine expected step based on stage
      const stageStep = STAGE_TO_STEP[deal.stage_name] ?? 0
      const currentStep = Math.max(lastStepIndex, stageStep)
      const nextStepIndex = Math.min(currentStep + (lastStepIndex >= currentStep ? 1 : 0), CADENCE_STEPS.length - 1)
      const nextStep = CADENCE_STEPS[nextStepIndex]

      // Calculate next step date
      const baseDate = lastMessageDate ? new Date(lastMessageDate) : new Date(deal.created_at)
      baseDate.setHours(0, 0, 0, 0)
      const nextDate = new Date(baseDate)
      nextDate.setDate(nextDate.getDate() + (nextStep.day - (CADENCE_STEPS[currentStep]?.day || 0) || 1))

      const diffDays = Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))

      let urgency: LeadTask['urgency'] = 'upcoming'
      if (nextStepIndex >= CADENCE_STEPS.length) urgency = 'done'
      else if (diffDays > 0) urgency = 'overdue'
      else if (diffDays === 0) urgency = 'today'

      return {
        dealId: deal.id,
        dealName: deal.name,
        contactName: `${deal.contact_first_name || deal.name} ${deal.contact_last_name || ''}`.trim(),
        contactPhone: deal.contact_phone,
        contactEmail: deal.contact_email,
        product: deal.product,
        stageName: deal.stage_name,
        stageOrder: deal.stage_order || 0,
        currentStep: currentStep,
        lastMessageDate,
        lastMessageStep: lastStepIndex >= 0 ? CADENCE_STEPS[lastStepIndex].label : null,
        nextStep,
        nextStepDate: nextDate.toISOString().split('T')[0],
        urgency,
        daysOverdue: Math.max(0, diffDays),
      }
    }).sort((a: LeadTask, b: LeadTask) => {
      // Sort: overdue first, then today, then upcoming
      const urgencyOrder = { overdue: 0, today: 1, upcoming: 2, done: 3 }
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (diff !== 0) return diff
      return b.daysOverdue - a.daysOverdue
    })
  }, [deals, sentMessages])

  // Filter
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterProduct !== 'todos' && t.product !== filterProduct) return false
      if (filterUrgency !== 'todos' && t.urgency !== filterUrgency) return false
      return true
    })
  }, [tasks, filterProduct, filterUrgency])

  // KPIs
  const overdue = tasks.filter(t => t.urgency === 'overdue').length
  const todayCount = tasks.filter(t => t.urgency === 'today').length
  const upcoming = tasks.filter(t => t.urgency === 'upcoming').length
  const totalActive = tasks.length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Cadência de Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">Lembretes automáticos para não perder nenhum lead</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Atrasados" value={overdue} icon={AlertTriangle} accentColor="#E8684A" onClick={() => setFilterUrgency(filterUrgency === 'overdue' ? 'todos' : 'overdue')} />
        <KPICard label="Pra Hoje" value={todayCount} icon={Clock} accentColor="#E8A43C" onClick={() => setFilterUrgency(filterUrgency === 'today' ? 'todos' : 'today')} />
        <KPICard label="Próximos" value={upcoming} icon={Bell} accentColor="#AFC040" onClick={() => setFilterUrgency(filterUrgency === 'upcoming' ? 'todos' : 'upcoming')} />
        <KPICard label="Leads Ativos" value={totalActive} icon={Users} accentColor="#4A9FE0" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="academy">Academy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="overdue">Atrasados</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="upcoming">Próximos</SelectItem>
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
          filtered.map(task => (
            <Card
              key={task.dealId}
              className={`cursor-pointer hover:border-[var(--c-border-h)] transition-colors border ${URGENCY_COLORS[task.urgency].split(' ').find(c => c.startsWith('border-')) || ''}`}
              onClick={() => navigate(`/deals/${task.dealId}`)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Urgency indicator */}
                  <div className={`w-2 h-12 rounded-full shrink-0 ${
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
                      {task.urgency === 'overdue' && (
                        <Badge className="text-[10px] bg-[#1A0604] text-[#E8684A]">
                          {task.daysOverdue}d atrasado
                        </Badge>
                      )}
                      {task.urgency === 'today' && (
                        <Badge className="text-[10px] bg-[#1A1206] text-[#E8A43C]">Hoje</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {task.contactEmail && <span className="truncate max-w-[200px]">{task.contactEmail}</span>}
                      {task.contactPhone && <span>{task.contactPhone}</span>}
                    </div>
                  </div>

                  {/* Next action */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5">
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
          ))
        )}
      </div>
    </div>
  )
}
