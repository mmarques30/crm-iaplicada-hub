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
  const isBusiness = (product || deal?.product || 'business') === 'business'

  if (isBusiness) {
    // ─── BUSINESS: objetivo é agendar call / Diagnóstico Estratégico ───
    switch (stepId) {
      case 'msg1_abertura':
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓

Tava olhando os cadastros e vi sua inscrição.${motivo ? ` Vi que você mencionou: "${motivo.substring(0, 80)}". Isso é bem específico e faz total sentido pra gente conversar.` : ''}

Eu monto um Mapa Estratégico de Implementação de IA pro cenário de cada empresa. É um plano prático que mostra onde ${empresa} pode ganhar tempo e resultado com IA em 30 dias.

Queria te propor uma call rápida de 45 min pra te mostrar como isso funcionaria pra ${empresa}. Tenho horário amanhã às 09h ou quinta às 15h. Qual funciona melhor?`

      case 'msg2_followup':
        return `${nome}, tudo certo? 🤓

Passando aqui pra reforçar sobre aquela call. Na reunião eu monto o Mapa direcionado pro cenário de ${empresa}.

Não é curso nem consultoria genérica. É diagnóstico + plano prático.

Consegue um horário essa semana? Me fala que eu encaixo.`

      case 'msg3_qualificacao':
        return `${nome}, pra eu já chegar na call com o Mapa mais direcionado pro seu caso, me tira duas dúvidas?

• Hoje você tem equipe rodando os processos ou depende 100% de você?

• O que te fez buscar IA agora? Teve algum momento específico?`

      case 'msg4_agendamento':
        return `${nome}, com base no que você me contou, faz muito sentido a gente conversar.

Na reunião eu vou te apresentar o Mapa Estratégico de IA, já direcionado pro cenário de ${empresa}.

Tenho horário amanhã às 09h ou quinta às 15h. Qual funciona melhor?`

      case 'msg5_confirmacao':
        return `Fechado, ${nome}! ✱

Reunião confirmada. Vou te mandar o link do Meet aqui.

Dura em torno de 45 minutos. Vou te mostrar o Mapa com as prioridades de implementação pra ${empresa}.

Qualquer coisa antes, é só me chamar.`

      case 'msg6_lembrete':
        return `Oi, ${nome}! Só passando pra lembrar da nossa reunião amanhã 🤓

Vou te apresentar o Mapa Estratégico com as prioridades de IA pra ${empresa}.

Nos vemos lá!`

      case 'msg7_pos_call':
        return `${nome}, obrigada pela conversa! Foi muito boa 🤓

Vou organizar tudo que discutimos e te mando o resumo com a proposta nos próximos dias.

Se surgir qualquer dúvida antes, pode me chamar.`

      case 'msg8_proposta':
        return `${nome}, tudo certo?

Organizei a proposta com base no nosso diagnóstico. Mandei por email.

Os pontos principais:
• Módulos que fazem sentido pro cenário de ${empresa}
• Cronograma de implementação em 30 dias
• Investimento e condições

Dá uma olhada e me fala o que achou.`

      case 'msg9_followup_proposta':
        return `${nome}, conseguiu olhar a proposta?

Tem alguma dúvida ou ponto que precisa ajustar?

Tô aqui pra isso.`

      case 'msg10_fechamento':
        return `${nome}, passando aqui pra entender como está a decisão.

Tem algo que eu possa esclarecer pra facilitar?

Lembra que a implementação leva 30 dias — quanto antes começarmos, antes ${empresa} vai estar rodando com IA.`

      default:
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓`
    }
  } else {
    // ─── ACADEMY: objetivo é converter direto no WhatsApp, sem call ───
    switch (stepId) {
      case 'msg1_abertura':
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓

Vi que você se inscreveu pras aulas de IA.${motivo ? ` Você mencionou que quer "${motivo.substring(0, 80)}" — adorei, é exatamente o que a gente trabalha.` : ''}

Toda semana tem aula ao vivo sobre uma ferramenta de IA diferente. Prática pura, sem enrolação.

Já assistiu alguma? Me conta o que mais te interessa que eu te direciono.`

      case 'msg2_followup':
        return `${nome}, tudo bem? 🤓

Passando pra lembrar: essa semana tem aula ao vivo de uma ferramenta nova de IA.

Se você ainda não assistiu nenhuma, começa pela de ChatGPT — é a mais prática pra quem tá começando.

Quer que eu te mande o link direto?`

      case 'msg3_qualificacao':
        return `${nome}, uma dúvida rápida 🤓

Você tá usando IA no dia a dia ou ainda tá naquela fase de "quero usar mas não sei por onde começar"?

Pergunto porque dependendo da sua resposta, tenho um caminho diferente pra te sugerir.`

      case 'msg4_agendamento':
        return `${nome}, se você quer ir além das aulas gratuitas, o Academy é o caminho.

R$147/mês. Sem fidelidade. Cancela quando quiser.

O que você recebe:
✱ 4 aulas ao vivo por mês comigo
✱ Conteúdo novo todo dia
✱ Comunidade exclusiva
✱ Método APLICA aplicado no SEU trabalho

Quer saber mais? Me responde aqui.`

      case 'msg5_confirmacao':
        return `${nome}, boa escolha! 🤓

Vou te mandar o link de inscrição do Academy aqui.

R$147/mês. Na hora que você entrar, já tem acesso a tudo: aulas, comunidade, conteúdo diário.

Semana que vem já vai estar dentro das aulas ao vivo comigo.`

      case 'msg6_lembrete':
        return `Oi, ${nome}! 🤓

Lembrando que a aula ao vivo é hoje às 19:30.

Se você tá pensando no Academy, essa aula é uma boa pra sentir como funciona na prática.

Te vejo lá!`

      case 'msg7_pos_call':
        return `${nome}, o que achou da aula? 🤓

Se curtiu, imagina ter isso toda semana + comunidade + conteúdo diário.

É o Academy. R$147/mês, sem fidelidade.

Quer entrar? Me responde aqui que eu mando o link.`

      case 'msg8_proposta':
        return `${nome}, já te mandei os detalhes do Academy.

Recapitulando:
✱ Aulas ao vivo semanais
✱ Método APLICA
✱ Comunidade de profissionais
✱ R$147/mês, cancela quando quiser

Tem alguma dúvida? Me fala aqui.`

      case 'msg9_followup_proposta':
        return `${nome}, tá pensando no Academy? 🤓

Se a dúvida é "será que vale pra mim?", pensa assim: você gasta 5h por semana em tarefas que IA resolve em minutos.

R$147/mês pra economizar 20h por mês. Faz sentido, né?`

      case 'msg10_fechamento':
        return `${nome}, última chamada 🤓

As inscrições do Academy fecham essa semana.

Se você quer usar IA de verdade no trabalho e não só "saber sobre IA", esse é o momento.

R$147/mês. Link aqui. Me responde "QUERO" que eu te mando.`

      default:
        return `Oi, ${nome}! Aqui é a Mariana, da IAplicada 🤓`
    }
  }
}
