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
  weeksAttended: string[] // all weeks this person attended
}

export interface PresencaData {
  attendees: PresencaAttendee[]
  totalUnique: number
  weeklyAdherence: WeeklyAdherence[] // adherence per week/class
}

export interface WeeklyAdherence {
  week: string
  participants: number
  totalPresences: number
  avgPresencesPerParticipant: number
  retentionFromPrevious: number | null // % retained from previous week
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

/* ─── Query Keys ─── */

export const PRESENCA_QUERY_KEY = ['external_presenca']
export const VISITANTES_QUERY_KEY = ['external_visitantes']

/* ─── Hooks ─── */

export function usePresencaData() {
  return useQuery<PresencaData>({
    queryKey: PRESENCA_QUERY_KEY,
    queryFn: async () => {
      const fetchWeek = async (week: string) => {
        const res = await fetch(`${PRESENCA_URL}?week=${week}`, {
          headers: { 'x-api-token': PRESENCA_TOKEN },
        })
        if (!res.ok) throw new Error(`Presença API error: ${res.status}`)
        return res.json()
      }

      // 1. Fetch "all" for global total_submissions per email
      const baseData = await fetchWeek('all')
      const baseEmails: any[] = baseData.emails || []

      // Build global submissions map from "all" (most accurate per-person total)
      const globalSubs = new Map<string, number>()
      for (const a of baseEmails) {
        const email = (a.email || '').toLowerCase().trim()
        if (email) {
          globalSubs.set(email, a.total_presences || a.total_submissions || a.total_presencas || 1)
        }
      }

      // 2. Get known weeks from base + only recent weeks that might be missing
      const baseWeekSet = new Set(baseEmails.map((e: any) => e.week_identifier).filter(Boolean))

      // Only add last 8 recent weeks (not 30) to check for missing data
      const now = new Date()
      const recentWeeks = new Set<string>()
      for (let i = 0; i < 8; i++) {
        const d = new Date(now.getTime() - i * 7 * 86400000)
        recentWeeks.add(getISOWeek(d))
      }

      // Combine: all known weeks from base + recent weeks not in base
      const allKnownWeeks = new Set([...baseWeekSet, ...recentWeeks])

      // 3. Fetch EVERY week individually for accurate per-week participation
      const allWeeksSorted = Array.from(allKnownWeeks).sort()
      const weekResults = new Map<string, any[]>()

      const batch = 6
      for (let i = 0; i < allWeeksSorted.length; i += batch) {
        const chunk = allWeeksSorted.slice(i, i + batch)
        const results = await Promise.all(
          chunk.map(w => fetchWeek(w)
            .then(d => ({ week: w, emails: d.emails || [] }))
            .catch(() => ({ week: w, emails: [] as any[] }))
          )
        )
        for (const r of results) {
          if (r.emails.length > 0) {
            weekResults.set(r.week, r.emails)
          }
        }
      }

      // 4. Build per-week participation & aggregate attendees
      const weekParticipants = new Map<string, Set<string>>()
      const weekTotalSubs = new Map<string, number>()
      const emailMap = new Map<string, {
        email: string; firstAttendance: string; weekIdentifier: string
        totalSubmissions: number; weeksAttended: Set<string>
      }>()

      for (const [week, emails] of weekResults) {
        const weekSet = new Set<string>()
        let weekSubs = 0

        for (const a of emails) {
          const email = (a.email || '').toLowerCase().trim()
          if (!email) continue
          const subs = a.total_presences || a.total_submissions || a.total_presencas || 1

          weekSet.add(email)
          weekSubs += subs

          const existing = emailMap.get(email)
          if (existing) {
            existing.weeksAttended.add(week)
            if (a.first_attendance && a.first_attendance < existing.firstAttendance) {
              existing.firstAttendance = a.first_attendance
              existing.weekIdentifier = week
            }
          } else {
            emailMap.set(email, {
              email,
              firstAttendance: a.first_attendance || '',
              weekIdentifier: week,
              totalSubmissions: 0, // will set below
              weeksAttended: new Set([week]),
            })
          }
        }

        weekParticipants.set(week, weekSet)
        weekTotalSubs.set(week, weekSubs)
      }

      // Also add base-only emails that might not appear in per-week queries
      for (const a of baseEmails) {
        const email = (a.email || '').toLowerCase().trim()
        if (!email || emailMap.has(email)) continue
        emailMap.set(email, {
          email,
          firstAttendance: a.first_attendance || '',
          weekIdentifier: a.week_identifier || '',
          totalSubmissions: 0,
          weeksAttended: new Set(a.week_identifier ? [a.week_identifier] : []),
        })
      }

      // 5. Set totalSubmissions: prefer global "all" count, fallback to weeks attended
      for (const [email, entry] of emailMap) {
        const global = globalSubs.get(email)
        entry.totalSubmissions = global
          ? Math.max(global, entry.weeksAttended.size)
          : entry.weeksAttended.size
      }

      const attendees: PresencaAttendee[] = Array.from(emailMap.values()).map(e => ({
        email: e.email,
        firstAttendance: e.firstAttendance,
        weekIdentifier: e.weekIdentifier,
        totalSubmissions: e.totalSubmissions,
        weeksAttended: Array.from(e.weeksAttended).sort(),
      }))

      // 6. Build weekly adherence with retention
      const sortedWeeks = Array.from(weekParticipants.keys()).sort()
      const weeklyAdherence: WeeklyAdherence[] = sortedWeeks.map((week, i) => {
        const participants = weekParticipants.get(week)!.size
        const totalPresences = weekTotalSubs.get(week) || 0
        let retentionFromPrevious: number | null = null
        if (i > 0) {
          const prevSet = weekParticipants.get(sortedWeeks[i - 1])!
          const currentSet = weekParticipants.get(week)!
          const overlap = [...prevSet].filter(e => currentSet.has(e)).length
          retentionFromPrevious = prevSet.size > 0 ? Math.round((overlap / prevSet.size) * 100) : null
        }
        return {
          week,
          participants,
          totalPresences,
          avgPresencesPerParticipant: participants > 0 ? Math.round((totalPresences / participants) * 10) / 10 : 0,
          retentionFromPrevious,
        }
      })

      return {
        attendees,
        totalUnique: attendees.length,
        weeklyAdherence,
      }
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 5 * 60_000,
  })
}

function getISOWeek(date: Date): string {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function useVisitantesData() {
  return useQuery<VisitantesData>({
    queryKey: VISITANTES_QUERY_KEY,
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
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 5 * 60_000, // Auto-refresh every 5 min
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
    weeklyAdherence: presenca?.weeklyAdherence || [],
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
