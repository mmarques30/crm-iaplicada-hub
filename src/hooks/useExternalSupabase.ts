import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

/* ─── External Supabase Endpoints ─── */

const PRESENCA_URL = 'https://tloymnwbunkngkdqhzwi.supabase.co/functions/v1/get-unique-attendees'
const PRESENCA_TOKEN = 'sk_att_7Kx9mP2vLqR4wN8jF1hT3bY6cZ0dE5gA'

const VISITANTES_URL = 'https://ocwpsanqtfubixerjive.supabase.co/functions/v1/api-visitantes'
const VISITANTES_KEY = 'vsk_a7f3e9b2c4d1f8a6e5b3c7d9f2a4e6b8c1d3f5a7e9b2c4d6'

/* ─── Types ─── */

export interface PresencaAttendee {
  email: string
  firstAttendance: string
  weekIdentifier: string
  totalSubmissions: number
}

export interface PresencaData {
  attendees: PresencaAttendee[]
  totalUnique: number
}

export interface VisitantesResumo {
  totalAcessos: number
  uniqueUsers: number
  accessesLast7Days: number
  averagePerUser: number
}

export interface TopConteudo {
  id: string
  title: string
  count: number
  type: string
}

export interface VisitanteEngajamento {
  email: string
  totalAccesses: number
  lastAccess: string
  videoCount: number
  materialCount: number
  contentsList: string[]
}

export interface VisitantesData {
  resumo: VisitantesResumo
  topConteudos: TopConteudo[]
  engajamento: VisitanteEngajamento[]
}

/* ─── Crossed Types ─── */

export interface LeadAula {
  email: string
  name: string
  phone: string
  totalAulas: number
  firstAttendance: string
  score: number
  frequenciaLabel: string
  inCrm: boolean
  lifecycleStage: string | null
  company: string | null
  contactId: string | null
}

export interface LeadVisitante {
  email: string
  name: string
  phone: string
  totalAccesses: number
  videoCount: number
  materialCount: number
  lastAccess: string
  contentsList: string[]
  score: number
  inCrm: boolean
  lifecycleStage: string | null
  company: string | null
  contactId: string | null
}

/* ─── Score Logic ─── */

function calcAulaScore(totalAulas: number): { score: number; label: string } {
  if (totalAulas >= 10) return { score: 65, label: 'Muito Frequente (10+)' }
  if (totalAulas >= 5) return { score: 50, label: 'Frequente (5-9)' }
  if (totalAulas >= 3) return { score: 40, label: 'Regular (3-4)' }
  if (totalAulas >= 2) return { score: 20, label: 'Iniciante (2)' }
  return { score: 10, label: 'Novo (1)' }
}

function calcVisitanteScore(v: VisitanteEngajamento, maxScore: number): number {
  const raw = (v.videoCount * 10) + (v.materialCount * 5) + (v.totalAccesses * 2)
  return maxScore > 0 ? Math.round((raw / maxScore) * 100) : 0
}

/* ─── Hooks ─── */

export function usePresencaData() {
  return useQuery<PresencaData>({
    queryKey: ['external_presenca'],
    queryFn: async () => {
      const res = await fetch(`${PRESENCA_URL}?week=all`, {
        headers: { 'x-api-token': PRESENCA_TOKEN },
      })
      if (!res.ok) throw new Error(`Presença API error: ${res.status}`)
      const data = await res.json()

      const emails = data.emails || (Array.isArray(data) ? data : [])
      const attendees: PresencaAttendee[] = emails.map((a: any) => ({
        email: (a.email || '').toLowerCase().trim(),
        firstAttendance: a.first_attendance || '',
        weekIdentifier: a.week_identifier || '',
        totalSubmissions: a.total_presences || a.total_submissions || a.total_presencas || 1,
      }))

      return {
        attendees,
        totalUnique: data.count || attendees.length,
      }
    },
    staleTime: 5 * 60_000, // 5 min
    refetchOnWindowFocus: false,
  })
}

export function useVisitantesData() {
  return useQuery<VisitantesData>({
    queryKey: ['external_visitantes'],
    queryFn: async () => {
      const res = await fetch(VISITANTES_URL, {
        headers: { 'x-api-key': VISITANTES_KEY },
      })
      if (!res.ok) throw new Error(`Visitantes API error: ${res.status}`)
      const data = await res.json()

      const resumo: VisitantesResumo = {
        totalAcessos: data.resumo?.total_acessos ?? data.resumo?.totalAccesses ?? 0,
        uniqueUsers: data.resumo?.unicos ?? data.resumo?.uniqueUsers ?? 0,
        accessesLast7Days: data.resumo?.ultimos_7_dias ?? data.resumo?.accessesLast7Days ?? 0,
        averagePerUser: data.resumo?.media_por_usuario ?? data.resumo?.averagePerUser ?? 0,
      }

      const topConteudos: TopConteudo[] = (data.top_conteudos || data.topConteudos || []).map((tc: any) => ({
        id: tc.id || '',
        title: tc.titulo || tc.title || '',
        count: tc.acessos || tc.count || tc.views || 0,
        type: tc.type || tc.tipo || 'video',
      }))

      const engajamento: VisitanteEngajamento[] = (data.engajamento || []).map((e: any) => ({
        email: (e.email || '').toLowerCase().trim(),
        totalAccesses: e.totalAccesses || e.total_acessos || 0,
        lastAccess: e.lastAccess || e.ultimo_acesso || '',
        videoCount: e.videoCount || e.videos_assistidos || 0,
        materialCount: e.materialCount || e.materiais_baixados || 0,
        contentsList: e.contentsList || e.conteudos || [],
      }))

      return { resumo, topConteudos, engajamento }
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/* ─── Crossed Data Hooks ─── */

export function useLeadsAula() {
  const { data: presenca, isLoading: presencaLoading, error: presencaError } = usePresencaData()

  const emails = (presenca?.attendees || []).map(a => a.email).filter(Boolean)

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts_for_crossing', 'presenca', emails.length],
    enabled: emails.length > 0,
    queryFn: async () => {
      // Fetch all contacts from CRM to cross by email
      const { data } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name, phone, company')
      return (data || []) as Array<{
        id: string; email: string | null; first_name: string; last_name: string | null
        phone: string | null; company: string | null
      }>
    },
    staleTime: 60_000,
  })

  // Fetch deals to get qualification
  const { data: deals } = useQuery({
    queryKey: ['deals_for_crossing_presenca'],
    enabled: (contacts || []).length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('contact_id, qualification_status')
      return (data || []) as Array<{ contact_id: string | null; qualification_status: string | null }>
    },
    staleTime: 60_000,
  })

  const contactMap = new Map<string, typeof contacts extends (infer T)[] ? T : never>()
  for (const c of contacts || []) {
    if (c.email) contactMap.set(c.email.toLowerCase().trim(), c)
  }

  const qualMap = new Map<string, string>()
  const prio: Record<string, number> = { lead: 0, mql: 1, sql: 2 }
  for (const d of deals || []) {
    if (!d.contact_id || !d.qualification_status) continue
    const cur = qualMap.get(d.contact_id)
    if (!cur || (prio[d.qualification_status] ?? 0) > (prio[cur] ?? 0)) {
      qualMap.set(d.contact_id, d.qualification_status)
    }
  }

  const leads: LeadAula[] = (presenca?.attendees || []).map(a => {
    const contact = contactMap.get(a.email)
    const { score, label } = calcAulaScore(a.totalSubmissions)
    return {
      email: a.email,
      name: contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : a.email.split('@')[0],
      phone: contact?.phone || '',
      totalAulas: a.totalSubmissions,
      firstAttendance: a.firstAttendance,
      score,
      frequenciaLabel: label,
      inCrm: !!contact,
      lifecycleStage: contact ? (qualMap.get(contact.id) || 'lead') : null,
      company: contact?.company || null,
      contactId: contact?.id || null,
    }
  }).sort((a, b) => b.score - a.score || b.totalAulas - a.totalAulas)

  const leadsQuentes = leads.filter(l => l.totalAulas >= 3)
  const inCrmCount = leads.filter(l => l.inCrm).length
  const notInCrmCount = leads.filter(l => !l.inCrm).length

  // Frequency distribution
  const freqDist = [
    { label: '1 aula', count: leads.filter(l => l.totalAulas === 1).length },
    { label: '2 aulas', count: leads.filter(l => l.totalAulas === 2).length },
    { label: '3-4 aulas', count: leads.filter(l => l.totalAulas >= 3 && l.totalAulas <= 4).length },
    { label: '5-9 aulas', count: leads.filter(l => l.totalAulas >= 5 && l.totalAulas <= 9).length },
    { label: '10+ aulas', count: leads.filter(l => l.totalAulas >= 10).length },
  ]

  // Lifecycle distribution of hot leads
  const lifecycleDist: Record<string, number> = {}
  for (const l of leadsQuentes) {
    if (l.lifecycleStage) {
      lifecycleDist[l.lifecycleStage] = (lifecycleDist[l.lifecycleStage] || 0) + 1
    }
  }

  return {
    leads,
    leadsQuentes,
    totalUnique: presenca?.totalUnique || 0,
    inCrmCount,
    notInCrmCount,
    freqDist,
    lifecycleDist,
    isLoading: presencaLoading || contactsLoading,
    error: presencaError,
  }
}

export function useLeadsVisitantes() {
  const { data: visitantes, isLoading: visitantesLoading, error: visitantesError } = useVisitantesData()

  const emails = (visitantes?.engajamento || []).map(e => e.email).filter(Boolean)

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts_for_crossing', 'visitantes', emails.length],
    enabled: emails.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name, phone, company')
      return (data || []) as Array<{
        id: string; email: string | null; first_name: string; last_name: string | null
        phone: string | null; company: string | null
      }>
    },
    staleTime: 60_000,
  })

  const { data: deals } = useQuery({
    queryKey: ['deals_for_crossing_visitantes'],
    enabled: (contacts || []).length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('contact_id, qualification_status')
      return (data || []) as Array<{ contact_id: string | null; qualification_status: string | null }>
    },
    staleTime: 60_000,
  })

  const contactMap = new Map<string, any>()
  for (const c of contacts || []) {
    if (c.email) contactMap.set(c.email.toLowerCase().trim(), c)
  }

  const qualMap = new Map<string, string>()
  const prio: Record<string, number> = { lead: 0, mql: 1, sql: 2 }
  for (const d of deals || []) {
    if (!d.contact_id || !d.qualification_status) continue
    const cur = qualMap.get(d.contact_id)
    if (!cur || (prio[d.qualification_status] ?? 0) > (prio[cur] ?? 0)) {
      qualMap.set(d.contact_id, d.qualification_status)
    }
  }

  // Calculate max raw score for normalization
  const maxRaw = (visitantes?.engajamento || []).reduce((max, v) => {
    const raw = (v.videoCount * 10) + (v.materialCount * 5) + (v.totalAccesses * 2)
    return Math.max(max, raw)
  }, 1)

  const leads: LeadVisitante[] = (visitantes?.engajamento || []).map(v => {
    const contact = contactMap.get(v.email)
    return {
      email: v.email,
      name: contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : v.email.split('@')[0],
      phone: contact?.phone || '',
      totalAccesses: v.totalAccesses,
      videoCount: v.videoCount,
      materialCount: v.materialCount,
      lastAccess: v.lastAccess,
      contentsList: v.contentsList,
      score: calcVisitanteScore(v, maxRaw),
      inCrm: !!contact,
      lifecycleStage: contact ? (qualMap.get(contact.id) || 'lead') : null,
      company: contact?.company || null,
      contactId: contact?.id || null,
    }
  }).sort((a, b) => b.score - a.score)

  const inCrmCount = leads.filter(l => l.inCrm).length

  return {
    leads,
    resumo: visitantes?.resumo || { totalAcessos: 0, uniqueUsers: 0, accessesLast7Days: 0, averagePerUser: 0 },
    topConteudos: visitantes?.topConteudos || [],
    inCrmCount,
    isLoading: visitantesLoading || contactsLoading,
    error: visitantesError,
  }
}
