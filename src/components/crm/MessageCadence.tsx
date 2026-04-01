import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Copy, ExternalLink, Loader2, Sparkles, Check, Send, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

const CADENCE_STEPS = [
  { id: 'msg1_abertura', label: 'Msg 1 — Abertura', desc: 'Primeira abordagem com gancho do Mapa Estratégico', day: 0 },
  { id: 'msg2_followup', label: 'Msg 2 — Follow-up', desc: 'Reforço de valor + pergunta de qualificação', day: 1 },
  { id: 'msg3_qualificacao', label: 'Msg 3 — Qualificação', desc: 'Perguntas de triagem (equipe, motivo IA)', day: 2 },
  { id: 'msg4_agendamento', label: 'Msg 4 — Agendamento', desc: 'CTA direto com 2 opções de horário', day: 3 },
  { id: 'msg5_confirmacao', label: 'Msg 5 — Confirmação', desc: 'Confirmar reunião + link Meet', day: 4 },
  { id: 'msg6_lembrete', label: 'Msg 6 — Lembrete', desc: 'Lembrete 24h antes da reunião', day: -1 },
  { id: 'msg7_pos_call', label: 'Msg 7 — Pós-Call', desc: 'Agradecer + próximos passos', day: 0 },
  { id: 'msg8_proposta', label: 'Msg 8 — Proposta', desc: 'Envio do resumo da proposta', day: 1 },
  { id: 'msg9_followup_proposta', label: 'Msg 9 — Follow-up Proposta', desc: 'Verificar se viu a proposta', day: 3 },
  { id: 'msg10_fechamento', label: 'Msg 10 — Fechamento', desc: 'Pergunta de decisão + urgência', day: 5 },
]

const STAGE_TO_STEPS: Record<string, string[]> = {
  'Lead Capturado': ['msg1_abertura', 'msg2_followup'],
  'MQL': ['msg1_abertura', 'msg2_followup', 'msg3_qualificacao'],
  'Contato Iniciado': ['msg3_qualificacao', 'msg4_agendamento'],
  'Conectado': ['msg4_agendamento', 'msg5_confirmacao'],
  'SQL': ['msg4_agendamento', 'msg5_confirmacao', 'msg6_lembrete'],
  'Reunião Agendada': ['msg5_confirmacao', 'msg6_lembrete'],
  'Reunião Realizada': ['msg7_pos_call', 'msg8_proposta'],
  'Inscrito': ['msg7_pos_call', 'msg8_proposta'],
  'Negociação': ['msg8_proposta', 'msg9_followup_proposta', 'msg10_fechamento'],
  'Contrato Enviado': ['msg9_followup_proposta', 'msg10_fechamento'],
}

interface CadenceProps {
  contact: {
    id: string
    first_name: string
    last_name?: string | null
    email?: string | null
    phone?: string | null
    company?: string | null
    cargo?: string | null
    faixa_de_faturamento?: string | null
    numero_de_liderados?: string | null
    motivo_para_aprender_ia?: string | null
    objetivo_com_a_comunidade?: string | null
  }
  deal?: {
    id: string
    name: string
    product: string
    stage_name?: string
    amount?: number | null
  } | null
  product?: string
}

export function MessageCadence({ contact, deal, product }: CadenceProps) {
  const queryClient = useQueryClient()
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [generatedMsgs, setGeneratedMsgs] = useState<Record<string, string>>({})
  const [editingMsg, setEditingMsg] = useState<Record<string, string>>({})
  const [copiedStep, setCopiedStep] = useState<string | null>(null)

  // Determine which steps to show based on deal stage
  const relevantSteps = useMemo(() => {
    if (deal?.stage_name && STAGE_TO_STEPS[deal.stage_name]) {
      return CADENCE_STEPS.filter(s => STAGE_TO_STEPS[deal.stage_name!]?.includes(s.id))
    }
    return CADENCE_STEPS.slice(0, 4) // Default: first 4 steps
  }, [deal?.stage_name])

  // Fetch sent messages for this contact
  const { data: sentMessages } = useQuery({
    queryKey: ['cadence_messages', contact.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('type', 'whatsapp')
        .order('created_at', { ascending: false })
      return (data || []) as any[]
    },
  })

  // Generate message with Claude API via Edge Function proxy
  const generateMsg = useMutation({
    mutationFn: async (stepId: string) => {
      const step = CADENCE_STEPS.find(s => s.id === stepId)
      if (!step) throw new Error('Step not found')

      const leadContext = `
Nome: ${contact.first_name} ${contact.last_name || ''}
Email: ${contact.email || 'não informado'}
Empresa: ${contact.company || 'não informada'}
Cargo: ${contact.cargo || 'não informado'}
Faturamento: ${contact.faixa_de_faturamento || 'não informado'}
Nº Liderados: ${contact.numero_de_liderados || 'não informado'}
Motivo IA: ${contact.motivo_para_aprender_ia || 'não informado'}
Objetivo: ${contact.objetivo_com_a_comunidade || 'não informado'}
Produto: ${product || deal?.product || 'business'}
Estágio: ${deal?.stage_name || 'Lead'}
Valor Deal: ${deal?.amount ? `R$ ${deal.amount}` : 'não definido'}
`.trim()

      const prompt = `Você é a Mariana, consultora comercial da IAplicada. Gere UMA mensagem de WhatsApp para o passo "${step.label}" (${step.desc}) da cadência de vendas do IAplicada Business.

CONTEXTO DO LEAD:
${leadContext}

REGRAS:
- Mensagem pronta pra copiar e colar no WhatsApp
- Tom informal mas profissional (como alguém digitando no celular)
- Frases curtas, máximo 4-5 linhas por bloco
- Use "pra", "vc", "tbm" naturalmente
- Emojis permitidos: 🤓 e ✱ apenas
- Pontuação correta (acentos obrigatórios)
- NUNCA use: "Sem dúvida", "Com certeza", "Excelente", "Personalizado", "Próximo passo", "Estou à disposição"
- Se msg1: mencione o Mapa Estratégico de IA
- Se agendamento: ofereça 2 horários (manhã e tarde)
- Se pós-call: agradeça e envie resumo
- Apenas a mensagem, sem explicações`

      // Call Claude API via generate-content Edge Function
      const { data, error } = await supabase.functions.invoke('rapid-task', {
        body: {
          action: 'generate_cadence_message',
          prompt,
          step: stepId,
          leadContext,
        },
      })

      if (!error && data?.message) {
        return data.message
      }

      // Fallback: generate locally based on templates
      return generateLocalMessage(stepId, contact, deal, product)
    },
    onSuccess: (msg, stepId) => {
      setGeneratedMsgs(prev => ({ ...prev, [stepId]: msg }))
      setEditingMsg(prev => ({ ...prev, [stepId]: msg }))
    },
    onError: (err: any) => {
      toast.error('Erro ao gerar mensagem: ' + (err.message || 'tente novamente'))
    },
  })

  // Log message as sent
  const logMessage = useMutation({
    mutationFn: async ({ stepId, message }: { stepId: string; message: string }) => {
      const step = CADENCE_STEPS.find(s => s.id === stepId)
      const { error } = await supabase.from('activities').insert({
        contact_id: contact.id,
        deal_id: deal?.id || null,
        type: 'whatsapp',
        direction: 'outbound',
        subject: step?.label || stepId,
        body: message,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadence_messages', contact.id] })
      queryClient.invalidateQueries({ queryKey: ['contact_activities', contact.id] })
      toast.success('Mensagem registrada no histórico')
    },
  })

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStep(stepId)
    setTimeout(() => setCopiedStep(null), 2000)
    toast.success('Mensagem copiada!')
  }

  const openWhatsApp = (text: string) => {
    let phone = (contact.phone || '').replace(/\D/g, '')
    if (!phone) {
      toast.error('Telefone do lead não cadastrado')
      return
    }
    // Ensure Brazilian format: if starts with local number, add 55
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone
    if (!phone.startsWith('55')) phone = '55' + phone
    const encoded = encodeURIComponent(text)
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
  }

  const wasSent = (stepId: string) => {
    return (sentMessages || []).some((m: any) => m.subject === CADENCE_STEPS.find(s => s.id === stepId)?.label)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#AFC040]" />
            Cadência de Mensagens
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {deal?.stage_name || 'Lead'} · {product || deal?.product || 'business'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {relevantSteps.map((step) => {
          const isExpanded = expandedStep === step.id
          const sent = wasSent(step.id)
          const msg = editingMsg[step.id] || generatedMsgs[step.id] || ''
          const isGenerating = generateMsg.isPending && generateMsg.variables === step.id

          return (
            <div key={step.id} className={`border rounded-lg overflow-hidden ${sent ? 'border-[#AFC040]/30 bg-[#141A04]' : 'border-[var(--c-border)]'}`}>
              {/* Step header */}
              <button
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--c-raised)] transition-colors"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    {sent && <Badge className="text-[9px] bg-[#141A04] text-[#AFC040]">Enviada</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {!isExpanded && !msg && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 text-xs"
                    disabled={isGenerating}
                    onClick={(e) => { e.stopPropagation(); generateMsg.mutate(step.id); setExpandedStep(step.id) }}
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Gerar
                  </Button>
                )}
              </button>

              {/* Expanded: message editor */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-[var(--c-border)]">
                  {!msg ? (
                    <div className="pt-3">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                        disabled={isGenerating}
                        onClick={() => generateMsg.mutate(step.id)}
                      >
                        {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {isGenerating ? 'Gerando com IA...' : 'Gerar Mensagem com IA'}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={msg}
                        onChange={(e) => setEditingMsg(prev => ({ ...prev, [step.id]: e.target.value }))}
                        className="min-h-[120px] text-sm mt-2"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => copyToClipboard(msg, step.id)}
                        >
                          {copiedStep === step.id ? <Check className="h-3 w-3 text-[#AFC040]" /> : <Copy className="h-3 w-3" />}
                          {copiedStep === step.id ? 'Copiada!' : 'Copiar'}
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 text-xs bg-[#2CBBA6] hover:bg-[#2CBBA6]/90 text-white"
                          onClick={() => { openWhatsApp(msg); logMessage.mutate({ stepId: step.id, message: msg }) }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs"
                          onClick={() => logMessage.mutate({ stepId: step.id, message: msg })}
                        >
                          <Send className="h-3 w-3" />
                          Marcar como Enviada
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs text-muted-foreground"
                          disabled={isGenerating}
                          onClick={() => generateMsg.mutate(step.id)}
                        >
                          <Sparkles className="h-3 w-3" />
                          Regenerar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Show all steps toggle */}
        {relevantSteps.length < CADENCE_STEPS.length && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => {
              // Toggle showing all steps
              const el = document.getElementById('all-cadence-steps')
              if (el) el.classList.toggle('hidden')
            }}
          >
            Ver todos os {CADENCE_STEPS.length} passos da cadência
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Local template-based message generation (fallback when AI is unavailable)
function generateLocalMessage(
  stepId: string,
  contact: CadenceProps['contact'],
  deal?: CadenceProps['deal'] | null,
  product?: string
): string {
  const nome = contact.first_name
  const empresa = contact.company || 'sua empresa'
  const motivo = contact.motivo_para_aprender_ia
  const faturamento = contact.faixa_de_faturamento

  switch (stepId) {
    case 'msg1_abertura':
      return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓

Tava olhando os cadastros que chegaram e vi que você se inscreveu pra conhecer como a IA pode ajudar ${empresa}.${motivo ? `\n\nVi que você mencionou: "${motivo.substring(0, 80)}". Isso é bem específico e faz total sentido.` : ''}

O que eu faço é montar um Mapa Estratégico de Implementação de IA, feito pro seu cenário. É um plano prático pra ${empresa} funcionar sem depender de você o tempo todo.

Me conta: hoje seu maior desafio é sair do operacional ou crescer as vendas?`

    case 'msg2_followup':
      return `${nome}, tudo certo? 🤓

Passei aqui pra reforçar: o Mapa que monto é bem direcionado pro seu caso. Não é curso nem consultoria genérica.

É um plano de implementação que mostra onde ${empresa} trava e como resolver com IA em até 30 dias.

Quer que eu te explique como funciona?`

    case 'msg3_qualificacao':
      return `${nome}, pra eu já chegar com o Mapa mais direcionado pro seu caso, me tira duas dúvidas?

• Hoje você tem equipe rodando os processos ou depende 100% de você?

• O que te fez buscar IA agora? Teve algum momento específico?`

    case 'msg4_agendamento':
      return `${nome}, com base no que você me contou, acho que faz muito sentido a gente conversar.

Na reunião eu vou te apresentar o Mapa Estratégico de IA, já direcionado pro cenário de ${empresa}.

Tenho horário amanhã às 09h ou quinta às 15h. Qual funciona melhor pra você?`

    case 'msg5_confirmacao':
      return `Fechado, ${nome}! ✱

Reunião confirmada. Vou te mandar o link do Meet aqui.

Dura em torno de 45 minutos. Vou te mostrar o Mapa com as prioridades de implementação pra ${empresa}.

Qualquer coisa antes, é só me chamar aqui.`

    case 'msg6_lembrete':
      return `Oi, ${nome}! Só passando pra lembrar da nossa reunião amanhã 🤓

Vou te apresentar o Mapa Estratégico com as prioridades de IA pra ${empresa}.

Nos vemos lá!`

    case 'msg7_pos_call':
      return `${nome}, obrigada pela conversa! Foi muito boa 🤓

Como combinamos, vou organizar tudo que discutimos e te mando o resumo com a proposta nos próximos dias.

Se surgir qualquer dúvida antes, pode me chamar.`

    case 'msg8_proposta':
      return `${nome}, tudo certo?

Organizei a proposta com base no nosso diagnóstico. Mandei por email com todos os detalhes.

Os pontos principais:
• Módulos que fazem sentido pro cenário de ${empresa}
• Cronograma de implementação
• Investimento e condições

Dá uma olhada e me fala o que achou.`

    case 'msg9_followup_proposta':
      return `${nome}, conseguiu olhar a proposta que te enviei?

Fico à disposição pra tirar qualquer dúvida ou ajustar algum ponto.

O que achou?`

    case 'msg10_fechamento':
      return `${nome}, passando aqui pra entender como está a decisão sobre o projeto.

Tem algo que eu possa esclarecer ou ajustar pra facilitar?

Lembra que a implementação leva 30 dias — quanto antes começarmos, antes ${empresa} vai estar rodando com IA.`

    default:
      return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓`
  }
}
