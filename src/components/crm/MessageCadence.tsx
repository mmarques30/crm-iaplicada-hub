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

// ─── BUSINESS CADENCE: objetivo = agendar call → fechar proposta ───
// ─── ACADEMY CADENCE: objetivo = converter direto no WhatsApp ───

const CADENCE_STEPS = [
  // FASE 1: ABERTURA (Lead novo, nunca falou)
  { id: 'msg1_abertura', label: 'Msg 1 — Abertura', desc: 'Vi sua inscrição + propor conversa', day: 0, phase: 'abertura' },
  { id: 'msg2_followup', label: 'Msg 2 — Follow-up', desc: 'Reforço de valor, perguntar se viu', day: 2, phase: 'abertura' },
  { id: 'msg3_qualificacao', label: 'Msg 3 — Qualificação', desc: 'Perguntas de triagem', day: 4, phase: 'abertura' },
  // FASE 2: AGENDAMENTO (Lead respondeu, qualificado)
  { id: 'msg4_agendamento', label: 'Msg 4 — Agendamento', desc: 'Propor 2 horários para call', day: 0, phase: 'agendamento' },
  { id: 'msg5_confirmacao', label: 'Msg 5 — Confirmação', desc: 'Confirmar data + link Meet', day: 0, phase: 'agendamento' },
  { id: 'msg6_lembrete', label: 'Msg 6 — Lembrete', desc: 'Lembrete 24h antes', day: 0, phase: 'agendamento' },
  // FASE 3: PÓS-REUNIÃO (Call realizada, enviar proposta)
  { id: 'msg7_pos_call', label: 'Msg 7 — Pós-Reunião', desc: 'Agradecer + resumo do que discutiu', day: 0, phase: 'pos_reuniao' },
  { id: 'msg8_proposta', label: 'Msg 8 — Proposta Enviada', desc: 'Avisar que enviou proposta por email', day: 2, phase: 'pos_reuniao' },
  // FASE 4: FECHAMENTO (Proposta enviada, decisão pendente)
  { id: 'msg9_followup_proposta', label: 'Msg 9 — Follow-up Proposta', desc: 'Perguntar se analisou a proposta', day: 3, phase: 'fechamento' },
  { id: 'msg10_fechamento', label: 'Msg 10 — Decisão Final', desc: 'Urgência + facilitar decisão', day: 5, phase: 'fechamento' },
]

const STAGE_TO_STEPS: Record<string, string[]> = {
  // Leads novos → fase abertura
  'Lead Capturado': ['msg1_abertura', 'msg2_followup', 'msg3_qualificacao'],
  'MQL': ['msg1_abertura', 'msg2_followup', 'msg3_qualificacao'],
  // Lead respondeu → fase agendamento
  'Contato Iniciado': ['msg3_qualificacao', 'msg4_agendamento'],
  'Conectado': ['msg4_agendamento', 'msg5_confirmacao', 'msg6_lembrete'],
  'SQL': ['msg4_agendamento', 'msg5_confirmacao', 'msg6_lembrete'],
  'Reunião Agendada': ['msg5_confirmacao', 'msg6_lembrete'],
  // Pós-reunião → proposta
  'Reunião Realizada': ['msg7_pos_call', 'msg8_proposta'],
  'Inscrito': ['msg7_pos_call', 'msg8_proposta'],
  // Fechamento → decisão
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

  const [showAllSteps, setShowAllSteps] = useState(false)

  // Determine which steps to show based on deal stage
  const relevantSteps = useMemo(() => {
    if (showAllSteps) return CADENCE_STEPS
    if (deal?.stage_name && STAGE_TO_STEPS[deal.stage_name]) {
      return CADENCE_STEPS.filter(s => STAGE_TO_STEPS[deal.stage_name!]?.includes(s.id))
    }
    return CADENCE_STEPS.slice(0, 4)
  }, [deal?.stage_name, showAllSteps])

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

      const productType = product || deal?.product || 'business'
      const isBusiness = productType === 'business'

      const prompt = isBusiness
        ? `Você é a Mariana, consultora comercial da IAplicada. Gere UMA mensagem de WhatsApp para o passo "${step.label}" (${step.desc}) da cadência de vendas do IAplicada Business.

CONTEXTO DO LEAD:
${leadContext}

OBJETIVO DO BUSINESS: Agendar um Diagnóstico Estratégico (call de 45min). NÃO vender no chat. Vender o VALOR DA REUNIÃO.
ENTREGA DA REUNIÃO: Mapa Estratégico de Implementação de IA feito pro cenário do lead.

REGRAS:
- Mensagem pronta pra copiar e colar no WhatsApp
- Tom informal mas profissional (como alguém digitando no celular)
- Frases curtas, máximo 4-5 linhas por bloco
- Use "pra", "vc", "tbm" naturalmente
- Emojis permitidos: 🤓 e ✱ apenas
- Pontuação correta (acentos obrigatórios)
- NUNCA use: "Sem dúvida", "Com certeza", "Excelente", "Personalizado", "Próximo passo", "Estou à disposição"
- Na msg1: diga que viu a inscrição, mencione o que o lead respondeu no formulário, fale do Mapa Estratégico e já proponha agendar
- Nas msgs seguintes: reforce o valor da reunião/Mapa, não venda o produto
- Se agendamento: ofereça 2 horários (manhã e tarde)
- Se pós-call: agradeça e envie resumo
- Apenas a mensagem, sem explicações`
        : `Você é a Mariana, da IAplicada Academy. Gere UMA mensagem de WhatsApp para o passo "${step.label}" (${step.desc}) da cadência de conversão do IAplicada Academy.

CONTEXTO DO LEAD:
${leadContext}

OBJETIVO DO ACADEMY: Converter o lead em assinante DIRETO no WhatsApp. R$147/mês. SEM call. A venda acontece na conversa.
O lead já se inscreveu pra aulas gratuitas de IA. O objetivo é mostrar valor e converter pra Academy.

REGRAS:
- Mensagem pronta pra copiar e colar no WhatsApp
- Tom acolhedor, educacional, prático
- Frases curtas, máximo 4-5 linhas por bloco
- Use "pra", "vc", "tbm" naturalmente
- Emojis permitidos: 🤓 e ✱ apenas
- Pontuação correta (acentos obrigatórios)
- NUNCA use: "Sem dúvida", "Com certeza", "Excelente", "Personalizado", "Próximo passo", "Estou à disposição"
- Na msg1: agradeça a inscrição, mencione o que ele respondeu, mostre valor das aulas
- Nas msgs seguintes: compartilhe resultado de alunos, dicas práticas de IA, e convide pra Academy
- NÃO proponha call/reunião. Converta direto no chat
- Se fechamento: ofereça o link de inscrição Academy (R$147/mês)
- Apenas a mensagem, sem explicações`

      // Call Claude API via generate-content Edge Function
      const { data, error } = await supabase.functions.invoke('generate-content', {
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
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setShowAllSteps(!showAllSteps)}
        >
          {showAllSteps ? 'Mostrar apenas passos do estágio' : `Ver todos os ${CADENCE_STEPS.length} passos da cadência`}
        </Button>
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
  const isBusiness = (product || deal?.product || 'business') === 'business'

  if (isBusiness) {
    // ─── BUSINESS: Abertura → Agendamento → Pós-Reunião → Fechamento ───
    switch (stepId) {
      // FASE ABERTURA: Lead nunca falou. Objetivo: iniciar conversa + propor call.
      case 'msg1_abertura':
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓

Tava olhando os cadastros e vi sua inscrição.${motivo ? ` Vi que você mencionou: "${motivo.substring(0, 80)}". Isso faz total sentido pra gente conversar.` : ''}

Eu faço um Diagnóstico Estratégico de IA pro cenário de cada empresa. É uma call de 45 min onde monto um Mapa de Implementação específico pra ${empresa}.

Consigo encaixar essa semana. Amanhã às 09h ou quinta às 15h, qual funciona?`

      case 'msg2_followup':
        return `${nome}, tudo certo? 🤓

Vi que ainda não conseguimos marcar. Sem pressa, mas queria garantir que você viu minha mensagem.

A call é rápida (45 min) e eu já chego com sugestões práticas pro cenário de ${empresa}. Sem compromisso.

Qual dia funciona melhor pra você essa semana?`

      case 'msg3_qualificacao':
        return `${nome}, pra eu já chegar na call com o Mapa direcionado, me tira duas dúvidas?

• Hoje você tem equipe rodando os processos ou depende 100% de você?

• O que te fez buscar IA agora? Teve algum gatilho específico?`

      // FASE AGENDAMENTO: Lead respondeu e quer marcar. Objetivo: confirmar horário.
      case 'msg4_agendamento':
        return `${nome}, vamos marcar então 🤓

Tenho horário amanhã às 09h ou quinta às 15h.

Na call eu vou te apresentar o Mapa Estratégico já direcionado pra ${empresa}. Você sai com um plano claro de por onde começar.

Qual horário funciona?`

      case 'msg5_confirmacao':
        return `Fechado, ${nome}! ✱

Reunião confirmada. Vou te mandar o link do Meet.

Dura 45 minutos. Vou te mostrar o Mapa com as prioridades de IA pra ${empresa}.

Se precisar remarcar, é só avisar aqui.`

      case 'msg6_lembrete':
        return `${nome}, só lembrando da nossa reunião amanhã 🤓

Tô preparando o Mapa com base no que você me contou. Vai ser bem prático.

Nos vemos lá!`

      // FASE PÓS-REUNIÃO: Call já aconteceu. Objetivo: enviar proposta e acompanhar.
      case 'msg7_pos_call':
        return `${nome}, obrigada pela conversa de hoje! 🤓

Foi muito boa. Gostei do que discutimos sobre ${empresa}.

Vou organizar tudo num documento e te mando a proposta nos próximos 2 dias. Com módulos, cronograma e investimento.

Se lembrar de alguma dúvida, manda aqui.`

      case 'msg8_proposta':
        return `${nome}, tudo certo? 🤓

Acabei de enviar a proposta por email. Dá uma olhada quando puder.

Organizei com base no que conversamos:
• Os módulos que fazem sentido pra ${empresa}
• Cronograma de 30 dias
• Investimento e condições

Me fala o que achou quando ver.`

      // FASE FECHAMENTO: Proposta enviada. Objetivo: facilitar decisão.
      case 'msg9_followup_proposta':
        return `${nome}, conseguiu analisar a proposta? 🤓

Tem algum ponto que quer ajustar ou alguma dúvida?

Tô aqui pra facilitar.`

      case 'msg10_fechamento':
        return `${nome}, passando aqui pra entender como está a análise da proposta.

Se tiver algum ponto que precisa revisar ou uma dúvida sobre o investimento, me fala que a gente resolve.

Quanto antes fecharmos, antes ${empresa} começa a ver resultado — a implementação leva 30 dias a partir da assinatura.`

      default:
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓`
    }
  } else {
    // ─── ACADEMY: Converter direto no WhatsApp, sem call ───
    switch (stepId) {
      // FASE ABERTURA: Lead se inscreveu nas aulas. Objetivo: engajar.
      case 'msg1_abertura':
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓

Vi que você se inscreveu pras aulas de IA.${motivo ? ` Você mencionou que quer "${motivo.substring(0, 80)}" — é exatamente isso que a gente faz na prática.` : ''}

Toda semana tem aula ao vivo sobre uma ferramenta diferente. Zero teoria, só prática.

Já assistiu alguma? Me conta o que mais te interessa.`

      case 'msg2_followup':
        return `${nome}, tudo bem? 🤓

Essa semana tem aula ao vivo de uma ferramenta nova de IA.

Se ainda não assistiu nenhuma, começa pela próxima — é ao vivo, gratuita e bem prática.

Quer que eu te avise quando começar?`

      case 'msg3_qualificacao':
        return `${nome}, uma dúvida rápida 🤓

Você já tá usando IA no dia a dia ou ainda tá na fase de "quero usar mas não sei por onde começar"?

Pergunto porque tenho caminhos diferentes dependendo de onde você tá.`

      // FASE AGENDAMENTO (Academy = apresentar oferta)
      case 'msg4_agendamento':
        return `${nome}, se você quer ir além das aulas gratuitas, o Academy é o caminho 🤓

R$147/mês. Sem fidelidade.

✱ 4 aulas ao vivo por mês
✱ Conteúdo novo todo dia
✱ Comunidade exclusiva
✱ Método APLICA no SEU trabalho

Quer saber mais? Me responde aqui.`

      case 'msg5_confirmacao':
        return `${nome}, boa escolha! 🤓

Vou te mandar o link de inscrição.

R$147/mês. Na hora que entrar, já acessa tudo: aulas, comunidade, conteúdo diário.

Semana que vem já vai estar nas aulas ao vivo.`

      case 'msg6_lembrete':
        return `${nome}, aula ao vivo hoje às 19:30 🤓

Se tá pensando no Academy, essa aula é perfeita pra sentir como funciona.

Te vejo lá!`

      // FASE PÓS (Academy = pós-aula, reforçar valor)
      case 'msg7_pos_call':
        return `${nome}, o que achou da aula? 🤓

Se curtiu, imagina ter isso toda semana + comunidade + conteúdo diário.

É o Academy. R$147/mês, sem fidelidade.

Me responde aqui que eu mando o link.`

      case 'msg8_proposta':
        return `${nome}, recapitulando o Academy:

✱ Aulas ao vivo semanais comigo
✱ Método APLICA
✱ Comunidade de profissionais
✱ R$147/mês, cancela quando quiser

Tem alguma dúvida? Me fala aqui.`

      // FASE FECHAMENTO (Academy = urgência)
      case 'msg9_followup_proposta':
        return `${nome}, tá pensando no Academy? 🤓

Pensa assim: você gasta 5h por semana em tarefas que IA faz em minutos.

R$147/mês pra economizar 20h por mês. Faz sentido, né?`

      case 'msg10_fechamento':
        return `${nome}, última chamada 🤓

Se você quer usar IA de verdade no trabalho — não só saber sobre IA — esse é o momento.

R$147/mês. Me responde "QUERO" que eu te mando o link.`

      default:
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓`
    }
  }
}
