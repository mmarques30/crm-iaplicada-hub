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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Rocket, MessageSquare, Mail, Camera, Plus, Trash2, Copy, Loader2, Layers, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

/* ─── Constants ─── */

const PHASE_COLORS = ['#AFC040', '#4A9FE0', '#2CBBA6', '#E8A43C', '#E8684A']

const CANAL_COLORS: Record<string, string> = {
  whatsapp: '#2CBBA6',
  email: '#4A9FE0',
  stories: '#E8684A',
}

const STATUS_CLASSES: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  ativo: 'bg-[#141A04] text-[#AFC040]',
  concluido: 'bg-[#031411] text-[#2CBBA6]',
  pausado: 'bg-[#1A1206] text-[#E8A43C]',
}

/* ─── Helpers ─── */

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Texto copiado!')).catch(() => toast.error('Erro ao copiar'))
}

function getPhaseColor(index: number) {
  return PHASE_COLORS[index % PHASE_COLORS.length]
}

/* ─── Component ─── */

export default function ConteudoLancamentos() {
  const queryClient = useQueryClient()

  /* ─── State ─── */
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [phaseOpen, setPhaseOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [filterPhase, setFilterPhase] = useState('todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generatingEmailId, setGeneratingEmailId] = useState<string | null>(null)
  const [generatingAllEmails, setGeneratingAllEmails] = useState(false)

  const [campaignForm, setCampaignForm] = useState({
    nome: '', big_idea: '', inimigo: '', metodo: '', oferta: '',
    data_inicio: '', data_fim: '', status: 'rascunho',
  })
  const [phaseForm, setPhaseForm] = useState({
    nome: '', emocao_chave: '', objetivo: '', data_inicio: '', data_fim: '', ordem: 1,
    campaign_id: '',
  })
  const [messageForm, setMessageForm] = useState({
    canal: 'whatsapp', titulo: '', copy_text: '', subject_line: '', roteiro: '',
    data: '', phase_id: '', story_type: '',
  })

  /* ─── Queries ─── */
  const { data: campaigns = [] } = useQuery({
    queryKey: ['launch_campaigns'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('launch_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
  })

  const activeCampaign = campaigns.find((c: any) => c.status === 'ativo') || campaigns[0] || null

  const { data: phases = [] } = useQuery({
    queryKey: ['launch_phases', activeCampaign?.id],
    enabled: !!activeCampaign,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('launch_phases')
        .select('*')
        .eq('campaign_id', activeCampaign.id)
        .order('ordem', { ascending: true })
      if (error) throw error
      return (data || []) as any[]
    },
  })

  const { data: allMessages = [] } = useQuery({
    queryKey: ['launch_messages', activeCampaign?.id],
    enabled: !!activeCampaign,
    queryFn: async () => {
      const phaseIds = phases.map((p: any) => p.id)
      if (phaseIds.length === 0) {
        // Fetch all messages for this campaign via phases
        const { data: ph } = await (supabase as any)
          .from('launch_phases')
          .select('id')
          .eq('campaign_id', activeCampaign.id)
        const ids = (ph || []).map((p: any) => p.id)
        if (ids.length === 0) return []
        const { data, error } = await (supabase as any)
          .from('launch_messages')
          .select('*')
          .in('phase_id', ids)
          .order('data', { ascending: true })
        if (error) throw error
        return (data || []) as any[]
      }
      const { data, error } = await (supabase as any)
        .from('launch_messages')
        .select('*')
        .in('phase_id', phaseIds)
        .order('data', { ascending: true })
      if (error) throw error
      return (data || []) as any[]
    },
  })

  /* ─── Mutations ─── */
  const createCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('launch_campaigns').insert(campaignForm)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch_campaigns'] })
      setCampaignOpen(false)
      setCampaignForm({ nome: '', big_idea: '', inimigo: '', metodo: '', oferta: '', data_inicio: '', data_fim: '', status: 'rascunho' })
      toast.success('Campanha criada!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const createPhase = useMutation({
    mutationFn: async () => {
      const payload = { ...phaseForm, campaign_id: activeCampaign?.id }
      const { error } = await (supabase as any).from('launch_phases').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch_phases'] })
      setPhaseOpen(false)
      setPhaseForm({ nome: '', emocao_chave: '', objetivo: '', data_inicio: '', data_fim: '', ordem: phases.length + 1, campaign_id: '' })
      toast.success('Fase criada!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const createMessage = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('launch_messages').insert(messageForm)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch_messages'] })
      setMessageOpen(false)
      setMessageForm({ canal: 'whatsapp', titulo: '', copy_text: '', subject_line: '', roteiro: '', data: '', phase_id: '', story_type: '' })
      toast.success('Mensagem criada!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('launch_campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch_campaigns'] })
      toast.success('Campanha removida!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('launch_phases').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch_phases'] })
      queryClient.invalidateQueries({ queryKey: ['launch_messages'] })
      toast.success('Fase removida!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('launch_messages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch_messages'] })
      toast.success('Mensagem removida!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await (supabase as any).from('launch_messages').update({ done }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['launch_messages'] }),
    onError: (e: any) => toast.error(e.message),
  })

  // Generate email copy with Claude
  const generateEmailCopy = async (msgId: string, titulo: string, subjectLine: string, phase: any) => {
    setGeneratingEmailId(msgId)
    try {
      const campaign = campaigns[0]
      const prompt = `Você é copywriter da IAplicada. Gere o corpo de um EMAIL de lançamento.

CAMPANHA: ${campaign?.nome || 'IAplicada Recorrência'}
BIG IDEA: ${campaign?.big_idea || ''}
INIMIGO: ${campaign?.inimigo_narrativo || ''}
MÉTODO: ${campaign?.metodo || 'APLICA'}
OFERTA: ${campaign?.oferta || 'R$147/mês'}

FASE: ${phase?.nome || ''} — Emoção: ${phase?.emocao_chave || ''}
OBJETIVO DA FASE: ${phase?.objetivo || ''}

TÍTULO DO EMAIL: ${titulo}
SUBJECT LINE: ${subjectLine}

REGRAS:
- Escreva em português brasileiro
- Tom pessoal, como se fosse da Mariana (fundadora)
- Parágrafos curtos (2-3 linhas máx)
- Use storytelling quando fizer sentido
- Inclua CTA claro no final
- Não use "Sem dúvida", "Com certeza", "Excelente"
- Emojis: apenas 🤓 e ✱, com moderação
- O email deve ser coerente com a emoção da fase (${phase?.emocao_chave || ''})
- Entre 200-400 palavras

Retorne APENAS o corpo do email, sem subject line, sem saudação "Olá [nome]".`

      const { data, error } = await supabase.functions.invoke('rapid-task', {
        body: { action: 'generate_cadence_message', prompt },
      })
      if (error || !data?.message) throw new Error('Falha na geração')

      // Update the message with generated copy
      const { error: updateErr } = await (supabase as any)
        .from('launch_messages')
        .update({ copy_text: data.message })
        .eq('id', msgId)
      if (updateErr) throw updateErr

      queryClient.invalidateQueries({ queryKey: ['launch_messages'] })
      toast.success('Email gerado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao gerar: ' + (err.message || 'tente novamente'))
    } finally {
      setGeneratingEmailId(null)
    }
  }

  // Generate ALL emails without copy
  const generateAllEmails = async () => {
    const emailsWithoutCopy = allMessages.filter((m: any) => m.canal === 'email' && !m.copy_text)
    if (emailsWithoutCopy.length === 0) { toast.info('Todos os emails já têm conteúdo'); return }
    setGeneratingAllEmails(true)
    let generated = 0
    for (const msg of emailsWithoutCopy) {
      const phase = phases.find((p: any) => p.id === msg.phase_id)
      try {
        await generateEmailCopy(msg.id, msg.titulo, msg.subject_line || '', phase)
        generated++
      } catch { /* continue to next */ }
    }
    setGeneratingAllEmails(false)
    toast.success(`${generated} de ${emailsWithoutCopy.length} emails gerados`)
  }

  /* ─── Derived ─── */
  const kpiFases = phases.length
  const kpiTotal = allMessages.length
  const kpiWhatsapp = allMessages.filter((m: any) => m.canal === 'whatsapp').length
  const kpiEmail = allMessages.filter((m: any) => m.canal === 'email').length

  const phaseMap = useMemo(() => {
    const map: Record<string, any> = {}
    phases.forEach((p: any) => { map[p.id] = p })
    return map
  }, [phases])

  const getMessagesForCanal = (canal: string) => {
    let msgs = allMessages.filter((m: any) => m.canal === canal)
    if (filterPhase !== 'todas') msgs = msgs.filter((m: any) => m.phase_id === filterPhase)
    return msgs
  }

  const messagesByPhase = (canal: string) => {
    const msgs = getMessagesForCanal(canal)
    const grouped: Record<string, any[]> = {}
    for (const m of msgs) {
      const pid = m.phase_id || 'sem_fase'
      if (!grouped[pid]) grouped[pid] = []
      grouped[pid].push(m)
    }
    return grouped
  }

  /* ─── Phase timeline ─── */
  const renderTimeline = () => {
    if (phases.length === 0) return null
    const today = new Date().toISOString().slice(0, 10)
    return (
      <div className="space-y-3">
        {/* Bar */}
        <div className="flex rounded-full overflow-hidden h-3">
          {phases.map((p: any, i: number) => {
            const color = getPhaseColor(i)
            const isCurrent = p.data_inicio && p.data_fim && today >= p.data_inicio && today <= p.data_fim
            return (
              <div
                key={p.id}
                className={`flex-1 ${isCurrent ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--c-card)]' : 'opacity-60'}`}
                style={{ backgroundColor: color }}
                title={p.nome}
              />
            )
          })}
        </div>
        {/* Labels */}
        <div className="flex">
          {phases.map((p: any, i: number) => {
            const color = getPhaseColor(i)
            const phaseMsgs = allMessages.filter((m: any) => m.phase_id === p.id)
            const done = phaseMsgs.filter((m: any) => m.done).length
            return (
              <div key={p.id} className="flex-1 text-center">
                <p className="text-xs font-semibold" style={{ color }}>{p.nome}</p>
                <p className="text-[10px] text-muted-foreground">{done}/{phaseMsgs.length} mensagens</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── Message card renderer ─── */
  const renderMessageCard = (msg: any, canal: string) => {
    const isExpanded = expandedId === msg.id
    return (
      <div key={msg.id} className={`border border-[var(--c-border)] rounded-lg p-3 space-y-2 bg-[var(--c-card)] ${msg.done ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Checkbox
              checked={!!msg.done}
              onCheckedChange={(checked) => toggleDone.mutate({ id: msg.id, done: !!checked })}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium leading-tight ${msg.done ? 'line-through' : ''}`}>{msg.titulo || 'Sem titulo'}</p>
              {canal === 'email' && msg.subject_line && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Assunto: {msg.subject_line}</p>
              )}
              {canal === 'stories' && msg.story_type && (
                <Badge variant="secondary" className="text-[10px] mt-1">{msg.story_type}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {(msg.copy_text || msg.roteiro) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-[#AFC040]"
                onClick={() => copyToClipboard(msg.roteiro || msg.copy_text)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]"
              onClick={() => { if (window.confirm('Remover mensagem?')) deleteMessage.mutate(msg.id) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Generate email with AI if no copy */}
        {canal === 'email' && !msg.copy_text && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs w-full"
            disabled={generatingEmailId === msg.id}
            onClick={() => {
              const phase = phaseMap[msg.phase_id]
              generateEmailCopy(msg.id, msg.titulo, msg.subject_line || '', phase)
            }}
          >
            {generatingEmailId === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-[#E8A43C]" />}
            {generatingEmailId === msg.id ? 'Gerando com Claude...' : 'Gerar Conteúdo do Email com IA'}
          </Button>
        )}

        {/* Copy text / Roteiro */}
        {(msg.copy_text || msg.roteiro) && (
          <div>
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setExpandedId(isExpanded ? null : msg.id)}
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {isExpanded ? 'Recolher' : 'Ver texto'}
            </button>
            {isExpanded && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                {canal === 'stories' ? (msg.roteiro || msg.copy_text) : msg.copy_text}
              </p>
            )}
          </div>
        )}

        {/* Date */}
        {msg.data && (
          <p className="text-[10px] text-muted-foreground">{formatDate(msg.data)}</p>
        )}
      </div>
    )
  }

  /* ─── Canal tab content ─── */
  const renderCanalTab = (canal: string) => {
    const grouped = messagesByPhase(canal)
    const keys = Object.keys(grouped)

    if (keys.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhuma mensagem de {canal} encontrada</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {keys.map(phaseId => {
          const phase = phaseMap[phaseId]
          const phaseIndex = phases.findIndex((p: any) => p.id === phaseId)
          const color = phaseIndex >= 0 ? getPhaseColor(phaseIndex) : '#7A8460'
          const msgs = grouped[phaseId]

          return (
            <div key={phaseId}>
              {/* Phase header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <h3 className="text-sm font-semibold">{phase?.nome || 'Sem fase'}</h3>
                {phase?.emocao_chave && (
                  <Badge className="text-[10px]" style={{ backgroundColor: `${color}22`, color }}>
                    {phase.emocao_chave}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">{msgs.length}</Badge>
              </div>
              {/* Messages */}
              <div className="space-y-2 ml-5">
                {msgs.map((m: any) => renderMessageCard(m, canal))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Campanhas de Lancamento</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestao de campanhas e mensagens de lancamento</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
          onClick={() => setCampaignOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Nova Campanha
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Fases" value={kpiFases} icon={Layers} accentColor="#4A9FE0" />
        <KPICard label="Mensagens Total" value={kpiTotal} icon={MessageSquare} accentColor="#AFC040" />
        <KPICard label="WhatsApp" value={kpiWhatsapp} icon={MessageSquare} accentColor="#2CBBA6" />
        <KPICard label="Email" value={kpiEmail} icon={Mail} accentColor="#E8A43C" />
      </div>

      {/* Empty state or campaign content */}
      {!activeCampaign ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nenhuma campanha ativa</h2>
            <p className="text-sm text-muted-foreground mb-6">Crie uma nova campanha de lancamento para comecar.</p>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
              onClick={() => setCampaignOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Nova Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <Tabs defaultValue="dashboard">
            <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
              {[
                { v: 'dashboard', l: 'Dashboard' },
                { v: 'whatsapp', l: 'WhatsApp' },
                { v: 'email', l: 'Email' },
                { v: 'stories', l: 'Stories' },
              ].map(t => (
                <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
              ))}
            </TabsList>

            {/* ─── Tab: Dashboard ─── */}
            <TabsContent value="dashboard" className="mt-4 space-y-4">
              {/* Hero card */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{activeCampaign.nome}</h2>
                      <Badge className={`text-[10px] mt-1 ${STATUS_CLASSES[activeCampaign.status] || 'bg-muted text-muted-foreground'}`}>
                        {activeCampaign.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setPhaseOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Nova Fase
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                        setMessageForm(f => ({ ...f, phase_id: phases[0]?.id || '' }))
                        setMessageOpen(true)
                      }}>
                        <Plus className="h-3.5 w-3.5" /> Nova Mensagem
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-[#E8684A]"
                        onClick={() => { if (window.confirm('Remover campanha? Isso tambem removera fases e mensagens.')) deleteCampaign.mutate(activeCampaign.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Campaign details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {activeCampaign.big_idea && (
                      <div className="p-3 rounded-lg bg-[var(--c-raised)]">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Big Idea</p>
                        <p className="text-sm">{activeCampaign.big_idea}</p>
                      </div>
                    )}
                    {activeCampaign.inimigo && (
                      <div className="p-3 rounded-lg bg-[var(--c-raised)]">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Inimigo</p>
                        <p className="text-sm">{activeCampaign.inimigo}</p>
                      </div>
                    )}
                    {activeCampaign.metodo && (
                      <div className="p-3 rounded-lg bg-[var(--c-raised)]">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Metodo</p>
                        <p className="text-sm">{activeCampaign.metodo}</p>
                      </div>
                    )}
                    {activeCampaign.oferta && (
                      <div className="p-3 rounded-lg bg-[var(--c-raised)]">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Oferta</p>
                        <p className="text-sm">{activeCampaign.oferta}</p>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  {(activeCampaign.data_inicio || activeCampaign.data_fim) && (
                    <div className="flex gap-4 text-xs text-muted-foreground mb-6">
                      {activeCampaign.data_inicio && <span>Inicio: {formatDate(activeCampaign.data_inicio)}</span>}
                      {activeCampaign.data_fim && <span>Fim: {formatDate(activeCampaign.data_fim)}</span>}
                    </div>
                  )}

                  {/* Phase timeline */}
                  {renderTimeline()}
                </CardContent>
              </Card>

              {/* Phases detail cards */}
              {phases.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {phases.map((p: any, i: number) => {
                    const color = getPhaseColor(i)
                    const phaseMsgs = allMessages.filter((m: any) => m.phase_id === p.id)
                    const done = phaseMsgs.filter((m: any) => m.done).length
                    const pending = phaseMsgs.length - done
                    return (
                      <Card key={p.id} style={{ borderLeft: `3px solid ${color}` }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold">{p.nome}</p>
                              {p.emocao_chave && (
                                <Badge className="text-[10px] mt-1" style={{ backgroundColor: `${color}22`, color }}>
                                  {p.emocao_chave}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-[#E8684A]"
                              onClick={() => { if (window.confirm('Remover fase?')) deletePhase.mutate(p.id) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {p.objetivo && <p className="text-xs text-muted-foreground mt-2">{p.objetivo}</p>}
                          <div className="flex gap-3 mt-3 text-xs">
                            <span className="text-muted-foreground">Total: <strong>{phaseMsgs.length}</strong></span>
                            <span style={{ color: '#AFC040' }}>Feitas: <strong>{done}</strong></span>
                            <span style={{ color: '#E8A43C' }}>Pendentes: <strong>{pending}</strong></span>
                          </div>
                          {(p.data_inicio || p.data_fim) && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {p.data_inicio && formatDate(p.data_inicio)} {p.data_inicio && p.data_fim && '—'} {p.data_fim && formatDate(p.data_fim)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─── Tab: WhatsApp ─── */}
            <TabsContent value="whatsapp" className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Select value={filterPhase} onValueChange={setFilterPhase}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar fase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Fases</SelectItem>
                    {phases.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {renderCanalTab('whatsapp')}
            </TabsContent>

            {/* ─── Tab: Email ─── */}
            <TabsContent value="email" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Select value={filterPhase} onValueChange={setFilterPhase}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar fase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Fases</SelectItem>
                    {phases.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  className="gap-1.5 bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                  size="sm"
                  disabled={generatingAllEmails}
                  onClick={generateAllEmails}
                >
                  {generatingAllEmails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generatingAllEmails ? 'Gerando...' : 'Gerar Todos os Emails com IA'}
                </Button>
              </div>
              {renderCanalTab('email')}
            </TabsContent>

            {/* ─── Tab: Stories ─── */}
            <TabsContent value="stories" className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Select value={filterPhase} onValueChange={setFilterPhase}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar fase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Fases</SelectItem>
                    {phases.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {renderCanalTab('stories')}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ─── Dialog: Nova Campanha ─── */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nova Campanha de Lancamento</DialogTitle>
            <DialogDescription>Configure os elementos centrais da campanha</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={campaignForm.nome} onChange={e => setCampaignForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da campanha" />
            </div>
            <div className="space-y-1.5">
              <Label>Big Idea</Label>
              <Textarea value={campaignForm.big_idea} onChange={e => setCampaignForm(f => ({ ...f, big_idea: e.target.value }))} placeholder="A grande ideia por tras do lancamento" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inimigo</Label>
                <Input value={campaignForm.inimigo} onChange={e => setCampaignForm(f => ({ ...f, inimigo: e.target.value }))} placeholder="O inimigo comum" />
              </div>
              <div className="space-y-1.5">
                <Label>Metodo</Label>
                <Input value={campaignForm.metodo} onChange={e => setCampaignForm(f => ({ ...f, metodo: e.target.value }))} placeholder="O metodo/solucao" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Oferta</Label>
              <Textarea value={campaignForm.oferta} onChange={e => setCampaignForm(f => ({ ...f, oferta: e.target.value }))} placeholder="Descricao da oferta" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Inicio</Label>
                <Input type="date" value={campaignForm.data_inicio} onChange={e => setCampaignForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim</Label>
                <Input type="date" value={campaignForm.data_fim} onChange={e => setCampaignForm(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
              disabled={!campaignForm.nome || createCampaign.isPending}
              onClick={() => createCampaign.mutate()}
            >
              {createCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Nova Fase ─── */}
      <Dialog open={phaseOpen} onOpenChange={setPhaseOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nova Fase</DialogTitle>
            <DialogDescription>Adicione uma fase a campanha {activeCampaign?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Fase *</Label>
              <Input value={phaseForm.nome} onChange={e => setPhaseForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Pre-lancamento, Abertura, Carrinho" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Emocao-Chave</Label>
                <Input value={phaseForm.emocao_chave} onChange={e => setPhaseForm(f => ({ ...f, emocao_chave: e.target.value }))} placeholder="Ex: Curiosidade, Urgencia" />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input type="number" value={phaseForm.ordem} onChange={e => setPhaseForm(f => ({ ...f, ordem: parseInt(e.target.value) || 1 }))} min={1} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Textarea value={phaseForm.objetivo} onChange={e => setPhaseForm(f => ({ ...f, objetivo: e.target.value }))} placeholder="Objetivo desta fase" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Inicio</Label>
                <Input type="date" value={phaseForm.data_inicio} onChange={e => setPhaseForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim</Label>
                <Input type="date" value={phaseForm.data_fim} onChange={e => setPhaseForm(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
              disabled={!phaseForm.nome || createPhase.isPending}
              onClick={() => createPhase.mutate()}
            >
              {createPhase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Fase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Nova Mensagem ─── */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nova Mensagem</DialogTitle>
            <DialogDescription>Adicione uma mensagem a uma fase da campanha</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <Select value={messageForm.canal} onValueChange={v => setMessageForm(f => ({ ...f, canal: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="stories">Stories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fase *</Label>
                <Select value={messageForm.phase_id} onValueChange={v => setMessageForm(f => ({ ...f, phase_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {phases.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Titulo *</Label>
              <Input value={messageForm.titulo} onChange={e => setMessageForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Titulo da mensagem" />
            </div>
            <div className="space-y-1.5">
              <Label>Texto / Copy</Label>
              <Textarea value={messageForm.copy_text} onChange={e => setMessageForm(f => ({ ...f, copy_text: e.target.value }))} placeholder="Texto da mensagem" rows={4} />
            </div>
            {messageForm.canal === 'email' && (
              <div className="space-y-1.5">
                <Label>Linha de Assunto</Label>
                <Input value={messageForm.subject_line} onChange={e => setMessageForm(f => ({ ...f, subject_line: e.target.value }))} placeholder="Subject line do email" />
              </div>
            )}
            {messageForm.canal === 'stories' && (
              <>
                <div className="space-y-1.5">
                  <Label>Roteiro</Label>
                  <Textarea value={messageForm.roteiro} onChange={e => setMessageForm(f => ({ ...f, roteiro: e.target.value }))} placeholder="Roteiro do story" rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Story</Label>
                  <Select value={messageForm.story_type} onValueChange={v => setMessageForm(f => ({ ...f, story_type: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hook">Hook</SelectItem>
                      <SelectItem value="valor">Valor</SelectItem>
                      <SelectItem value="conexao">Conexao</SelectItem>
                      <SelectItem value="engajamento">Engajamento</SelectItem>
                      <SelectItem value="cta">CTA</SelectItem>
                      <SelectItem value="depoimento">Depoimento</SelectItem>
                      <SelectItem value="bastidor">Bastidor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={messageForm.data} onChange={e => setMessageForm(f => ({ ...f, data: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
              disabled={!messageForm.titulo || !messageForm.phase_id || createMessage.isPending}
              onClick={() => createMessage.mutate()}
            >
              {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Mensagem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
