import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { formatCurrency, humanizeCampaignName, mapFbObjective, normalizeChannel } from '@/lib/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, Eye, MousePointer, Target, TrendingUp, BarChart3, Percent, ExternalLink, Users, Filter, FileText } from 'lucide-react'

import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area, AreaChart,
} from 'recharts'

const SEMANTIC_COLORS = ['#AFC040', '#4A9FE0', '#2CBBA6', '#E8A43C', '#E8684A', '#7A8460']
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

// ─── Helper: Meta/IG source classification ───
const META_SOURCES = {
  isInstagramOrganic: (ch: string) => ch === 'Instagram Orgânico',
  isFacebookAds: (ch: string) => ch === 'Facebook Ads',
  isMetaCampaign: (raw: string) => {
    const v = (raw || '').toLowerCase()
    return v.includes('meta') || v.includes('campanha') || v.includes('link na bio') || v.includes('aula') || v.includes('tiktok')
  },
  isMetaEcosystem: (ch: string, raw: string) =>
    META_SOURCES.isInstagramOrganic(ch) || META_SOURCES.isFacebookAds(ch) || META_SOURCES.isMetaCampaign(raw),
}

const SOURCE_COLORS: Record<string, string> = {
  'Instagram Orgânico': '#E8684A',
  'Facebook Ads': '#4A9FE0',
  'Tráfego Direto': '#E8A43C',
  'WhatsApp': '#2CBBA6',
  'Formulário / Orgânico': '#AFC040',
  'Offline': '#7A8460',
  'Não rastreado': '#555',
}
const getSourceColor = (s: string) => SOURCE_COLORS[s] || SEMANTIC_COLORS[Object.keys(SOURCE_COLORS).length % SEMANTIC_COLORS.length]

function FunnelTab() {
  const { data: dealsRes } = useQuery({
    queryKey: ['deals_full_fb_funnel'],
    queryFn: async () => {
      const { data } = await supabase.from('deals_full').select('canal_origem, stage_name, stage_order, is_won, qualification_status, created_at, motivo_perda, product, contact_id')
      return data || []
    },
  })

  const { data: contactsRes } = useQuery({
    queryKey: ['contacts_meta_sources'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('id, utm_source, utm_medium, utm_campaign, fonte_registro, lifecycle_stage, created_at, produto_interesse, first_conversion')
      return data || []
    },
  })

  const { data: stagesRes } = useQuery({
    queryKey: ['stages_for_funnel'],
    queryFn: async () => {
      const { data } = await supabase.from('stages').select('name, display_order').order('display_order')
      return data || []
    },
  })

  const deals = dealsRes || []
  const contacts = contactsRes || []
  const stages = stagesRes || []

  // Helper: resolve deal channel using contact source as fallback
  const getDealChannel = useMemo(() => {
    const contactSource: Record<string, string> = {}
    for (const c of contacts) {
      contactSource[c.id] = c.utm_source || c.fonte_registro || ''
    }
    return (d: any) => normalizeChannel(d.canal_origem || (d.contact_id ? contactSource[d.contact_id] : '') || '')
  }, [contacts])

  // Classify contacts into meta categories
  const classified = useMemo(() => {
    const igOrganic: typeof contacts = []
    const fbAds: typeof contacts = []
    const metaCampaign: typeof contacts = []

    for (const c of contacts) {
      const raw = c.utm_source || c.fonte_registro || ''
      const ch = normalizeChannel(raw)
      if (META_SOURCES.isInstagramOrganic(ch)) igOrganic.push(c)
      else if (META_SOURCES.isFacebookAds(ch)) fbAds.push(c)
      else if (META_SOURCES.isMetaCampaign(raw) || META_SOURCES.isMetaCampaign(c.utm_campaign || '') || META_SOURCES.isMetaCampaign(c.utm_medium || '')) metaCampaign.push(c)
    }

    return { igOrganic, fbAds, metaCampaign }
  }, [contacts])

  // Deal classification helper
  const classifyDeals = useMemo(() => {
    const igOrganic = deals.filter(d => META_SOURCES.isInstagramOrganic(getDealChannel(d)))
    const fbAds = deals.filter(d => META_SOURCES.isFacebookAds(getDealChannel(d)))
    const metaCampaign = deals.filter(d => META_SOURCES.isMetaCampaign(d.canal_origem || '') && !META_SOURCES.isInstagramOrganic(getDealChannel(d)) && !META_SOURCES.isFacebookAds(getDealChannel(d)))
    return { igOrganic, fbAds, metaCampaign }
  }, [deals, getDealChannel])

  // Source card builder
  const buildSourceCard = (label: string, contactList: typeof contacts, dealList: typeof deals) => {
    const total = contactList.length
    const leads = contactList.filter(c => c.lifecycle_stage === 'subscriber' || c.lifecycle_stage === 'lead' || !c.lifecycle_stage).length
    const opportunities = dealList.filter(d => (d.stage_order ?? 0) >= 2 && !d.is_won && !d.motivo_perda).length
    const customers = dealList.filter(d => d.is_won === true).length
    const convRate = total > 0 ? ((opportunities + customers) / total * 100) : 0

    const subSources: Record<string, number> = {}
    for (const c of contactList) {
      const key = c.utm_campaign || c.utm_medium || c.utm_source || 'Direto'
      subSources[key] = (subSources[key] || 0) + 1
    }
    const topSources = Object.entries(subSources).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { label, total, leads, opportunities, customers, convRate, topSources }
  }

  const sourceCards = [
    buildSourceCard('Instagram Orgânico', classified.igOrganic, classifyDeals.igOrganic),
    buildSourceCard('Facebook/Instagram Ads', classified.fbAds, classifyDeals.fbAds),
    buildSourceCard('Campanhas (Meta Ads)', classified.metaCampaign, classifyDeals.metaCampaign),
  ]

  const ecosystemTotal = sourceCards.reduce((s, c) => s + c.total, 0)
  const ecosystemOpportunities = sourceCards.reduce((s, c) => s + c.opportunities, 0)
  const ecosystemCustomers = sourceCards.reduce((s, c) => s + c.customers, 0)
  const ecosystemDeals = deals.filter(d => META_SOURCES.isMetaEcosystem(normalizeChannel(d.canal_origem || ''), d.canal_origem || '')).length
  const ecosystemPct = contacts.length > 0 ? ((ecosystemTotal / contacts.length) * 100).toFixed(1) : '0'

  // ─── Chart data: Contatos por Fonte ───
  const contactsBySource = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contacts) {
      const ch = normalizeChannel(c.utm_source || c.fonte_registro || '')
      map[ch] = (map[ch] || 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, contatos]) => ({ name, contatos, fill: getSourceColor(name) }))
  }, [contacts])

  // ─── Chart data: Taxa de Conversão por Fonte ───
  const conversionBySource = useMemo(() => {
    const sourceContacts: Record<string, number> = {}
    const sourceOpps: Record<string, number> = {}
    const sourceCust: Record<string, number> = {}

    for (const c of contacts) {
      const ch = normalizeChannel(c.utm_source || c.fonte_registro || '')
      sourceContacts[ch] = (sourceContacts[ch] || 0) + 1
    }
    for (const d of deals) {
      const ch = normalizeChannel(d.canal_origem || '')
      const isOpp = (d.stage_order ?? 0) >= 2
      const isCust = d.is_won === true
      if (isOpp) sourceOpps[ch] = (sourceOpps[ch] || 0) + 1
      if (isCust) sourceCust[ch] = (sourceCust[ch] || 0) + 1
    }

    return Object.entries(sourceContacts)
      .filter(([, v]) => v >= 3)
      .map(([name, total]) => {
        const opps = sourceOpps[name] || 0
        const cust = sourceCust[name] || 0
        return {
          name,
          'Lead→Opp': total > 0 ? Math.round((opps / total) * 1000) / 10 : 0,
          'Opp→Customer': opps > 0 ? Math.round((cust / opps) * 1000) / 10 : 0,
        }
      })
      .sort((a, b) => b['Lead→Opp'] - a['Lead→Opp'])
  }, [contacts, deals])

  // ─── Chart data: Evolução Mensal ───
  const monthlyEvolution = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    const allSources = new Set<string>()

    for (const c of contacts) {
      const ch = normalizeChannel(c.utm_source || c.fonte_registro || '')
      if (ch === 'Offline') continue
      allSources.add(ch)
      const d = new Date(c.created_at || '')
      if (isNaN(d.getTime())) continue
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[monthKey]) map[monthKey] = {}
      map[monthKey][ch] = (map[monthKey][ch] || 0) + 1
    }

    const months = Object.keys(map).sort()
    const formatMonth = (k: string) => {
      const [y, m] = k.split('-')
      const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${names[parseInt(m) - 1]}/${y}`
    }

    return {
      data: months.map(m => ({ month: formatMonth(m), ...map[m] })),
      sources: Array.from(allSources),
    }
  }, [contacts])

  // Cross-tab: Deals by Source × Stage
  const uniqueStages = stages.map(s => s.name)
  const crossTabSources = useMemo(() => {
    const sourceMap: Record<string, Record<string, number>> = {}
    for (const d of deals) {
      const source = normalizeChannel(d.canal_origem || '')
      if (!sourceMap[source]) sourceMap[source] = {}
      const col = d.motivo_perda ? 'NEGÓCIO PERDIDO' : (d.stage_name || 'Desconhecido')
      sourceMap[source][col] = (sourceMap[source][col] || 0) + 1
    }
    return Object.entries(sourceMap)
      .map(([source, stages]) => {
        const total = Object.values(stages).reduce((s, v) => s + v, 0)
        return { source, stages, total }
      })
      .sort((a, b) => b.total - a.total)
  }, [deals])

  const allColumns = [...uniqueStages, 'NEGÓCIO PERDIDO']

  // ─── Product classification ───
  const PRODUCT_COLORS: Record<string, string> = {
    'Academy': '#7C5CFC',
    'Business': '#E8A43C',
    'Skills': '#2CBBA6',
    'Offline/Importados': '#7A8460',
  }

  const productData = useMemo(() => {
    const counts: Record<string, number> = { Academy: 0, Business: 0, Skills: 0, 'Offline/Importados': 0 }
    for (const c of contacts) {
      const pi = (c.produto_interesse as string[] | null) || []
      const lower = pi.map(p => (p || '').toLowerCase())
      if (lower.includes('academy')) counts.Academy++
      else if (lower.includes('business')) counts.Business++
      else if (lower.includes('skills')) counts.Skills++
      else counts['Offline/Importados']++
    }
    return counts
  }, [contacts])

  const productDescriptions: Record<string, string> = {
    Academy: 'Contatos interessados em Academy (cursos e comunidade)',
    Business: 'Contatos interessados em Business (consultoria empresarial)',
    Skills: 'Contatos interessados em Skills (liderança)',
    'Offline/Importados': 'Contatos sem produto de interesse definido',
  }

  // ─── Formulários de Conversão ───
  const formConversion = useMemo(() => {
    const map: Record<string, { total: number; products: Record<string, number> }> = {}
    for (const c of contacts) {
      const form = (c.first_conversion as string) || 'Sem formulário'
      if (!map[form]) map[form] = { total: 0, products: {} }
      map[form].total++
      const pi = (c.produto_interesse as string[] | null) || []
      const lower = pi.map(p => (p || '').toLowerCase())
      let prod = 'Outros'
      if (lower.includes('academy')) prod = 'Academy'
      else if (lower.includes('business')) prod = 'Business'
      else if (lower.includes('skills')) prod = 'Skills'
      map[form].products[prod] = (map[form].products[prod] || 0) + 1
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [contacts])

  const maxFormCount = formConversion.length > 0 ? formConversion[0].total : 1

  // ─── Fonte × Produto chart ───
  const sourceByProduct = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const c of contacts) {
      const ch = normalizeChannel(c.utm_source || c.fonte_registro || '')
      if (ch === 'Offline') continue
      if (!map[ch]) map[ch] = {}
      const pi = (c.produto_interesse as string[] | null) || []
      const lower = pi.map(p => (p || '').toLowerCase())
      let prod = 'Outros'
      if (lower.includes('academy')) prod = 'Academy'
      else if (lower.includes('business')) prod = 'Business'
      map[ch][prod] = (map[ch][prod] || 0) + 1
    }
    return Object.entries(map)
      .map(([name, prods]) => ({ name, Academy: prods.Academy || 0, Business: prods.Business || 0, Outros: prods.Outros || 0 }))
      .sort((a, b) => (b.Academy + b.Business + b.Outros) - (a.Academy + a.Business + a.Outros))
  }, [contacts])

  // ─── Deals por Produto × Estágio ───
  const dealsByProductStage = useMemo(() => {
    const stageRows: { stage: string; Academy: number; Business: number; total: number }[] = []
    const stageList = [...uniqueStages]
    // Add won/lost
    const wonLabel = 'Fechado Ganho'
    const lostLabel = 'Fechado Perdido'

    for (const stageName of stageList) {
      const acad = deals.filter(d => d.stage_name === stageName && (d as any).product === 'academy' && !d.motivo_perda).length
      const biz = deals.filter(d => d.stage_name === stageName && (d as any).product === 'business' && !d.motivo_perda).length
      stageRows.push({ stage: stageName, Academy: acad, Business: biz, total: acad + biz })
    }
    const wonA = deals.filter(d => d.is_won === true && (d as any).product === 'academy').length
    const wonB = deals.filter(d => d.is_won === true && (d as any).product === 'business').length
    stageRows.push({ stage: wonLabel, Academy: wonA, Business: wonB, total: wonA + wonB })
    const lostA = deals.filter(d => !!d.motivo_perda && (d as any).product === 'academy').length
    const lostB = deals.filter(d => !!d.motivo_perda && (d as any).product === 'business').length
    stageRows.push({ stage: lostLabel, Academy: lostA, Business: lostB, total: lostA + lostB })

    return stageRows
  }, [deals, uniqueStages])

  // ─── Product summary cards ───
  const productSummary = useMemo(() => {
    const products = ['academy', 'business'] as const
    return products.map(p => {
      const pDeals = deals.filter(d => (d as any).product === p)
      const active = pDeals.filter(d => !d.is_won && !d.motivo_perda).length
      const won = pDeals.filter(d => d.is_won === true).length
      const lost = pDeals.filter(d => !!d.motivo_perda).length
      const total = pDeals.length
      const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0

      // Most common source
      const srcMap: Record<string, number> = {}
      for (const d of pDeals) {
        const ch = normalizeChannel(d.canal_origem || '')
        srcMap[ch] = (srcMap[ch] || 0) + 1
      }
      const topSrc = Object.entries(srcMap).sort((a, b) => b[1] - a[1])[0]
      const topSrcLabel = topSrc ? topSrc[0] : '—'
      const topSrcPct = topSrc && total > 0 ? Math.round((topSrc[1] / total) * 100) : 0

      return {
        product: p === 'academy' ? 'Academy' : 'Business',
        color: p === 'academy' ? '#7C5CFC' : '#E8A43C',
        total, active, won, lost, winRate, topSrcLabel, topSrcPct,
      }
    })
  }, [deals])

  return (
    <>
      {/* Source cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sourceCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4A9FE0]" />
                {card.label}
              </CardTitle>
              <p className="text-2xl font-bold font-mono">{card.total} <span className="text-sm font-normal text-muted-foreground">contatos</span></p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                {[
                  { label: 'Leads', value: card.leads, color: '#2CBBA6' },
                  { label: 'Opportunities', value: card.opportunities, color: '#4A9FE0' },
                  { label: 'Customers', value: card.customers, color: '#AFC040' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">→ {row.label}</span>
                    <span className="font-mono font-medium" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conv. Rate</span>
                  <span className="font-mono font-bold text-[#E8A43C]">{card.convRate.toFixed(1)}%</span>
                </div>
              </div>
              {card.topSources.length > 0 && (
                <div className="pt-2 border-t border-white/[0.06] space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sub-fontes</p>
                  {card.topSources.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[160px]">{humanizeCampaignName(name, 22)}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ecosystem Banner */}
      <Card className="border-[#AFC040]/20 bg-[#141A04]/50">
        <CardContent className="py-5">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-widest text-[#AFC040] font-semibold">TOTAL ECOSSISTEMA META/INSTAGRAM</p>
            <p className="text-3xl font-bold font-mono">{ecosystemTotal} <span className="text-base font-normal text-muted-foreground">contatos ({ecosystemPct}% do total)</span></p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <span><strong className="font-mono text-[#4A9FE0]">{ecosystemOpportunities}</strong> <span className="text-muted-foreground">Opportunities</span></span>
              <span><strong className="font-mono text-[#AFC040]">{ecosystemCustomers}</strong> <span className="text-muted-foreground">Customers</span></span>
              <span><strong className="font-mono text-[#E8A43C]">{ecosystemDeals}</strong> <span className="text-muted-foreground">Deals</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Charts: Fontes ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contatos por Fonte */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contatos por Fonte de Aquisição</CardTitle></CardHeader>
          <CardContent>
            {contactsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(contactsBySource.length * 38, 200)}>
                <BarChart data={contactsBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} contatos`, 'Quantidade']} />
                  <Bar dataKey="contatos" radius={[0, 4, 4, 0]}>
                    {contactsBySource.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Taxa de Conversão por Fonte */}
        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de Conversão por Fonte</CardTitle></CardHeader>
          <CardContent>
            {conversionBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(conversionBySource.length * 38, 200)}>
                <BarChart data={conversionBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Lead→Opp" stackId="a" fill="#4A9FE0" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Opp→Customer" stackId="a" fill="#2CBBA6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Evolução Mensal */}
      <Card>
        <CardHeader><CardTitle className="text-base">Evolução Mensal de Novos Contatos (excl. Offline)</CardTitle></CardHeader>
        <CardContent>
          {monthlyEvolution.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={monthlyEvolution.data}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {monthlyEvolution.sources.map((src, i) => (
                  <Area
                    key={src}
                    type="monotone"
                    dataKey={src}
                    stackId="1"
                    stroke={getSourceColor(src)}
                    fill={getSourceColor(src)}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
        </CardContent>
      </Card>

      {/* ─── SEÇÃO PRODUTOS ─── */}

      {/* Banner: Origem por Produto */}
      <Card className="border-[#E8A43C]/20 bg-gradient-to-r from-[#1A1604]/60 to-[#141A04]/40">
        <CardContent className="py-5">
          <div className="text-center space-y-1 mb-4">
            <p className="text-xs uppercase tracking-widest text-[#E8A43C] font-semibold">ORIGEM POR PRODUTO</p>
            <p className="text-sm text-muted-foreground">Distribuição de contatos por produto de interesse</p>
            <p className="text-3xl font-bold font-mono">{contacts.length} <span className="text-base font-normal text-muted-foreground">contatos totais</span></p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(productData).map(([product, count]) => {
              const pct = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0
              const color = PRODUCT_COLORS[product]
              return (
                <div key={product} className="rounded-lg border border-white/[0.06] bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${color}20`, color }}>
                      {product[0]}
                    </span>
                    <span className="text-sm font-medium">{product}</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">{count}</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{pct}% do total</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{productDescriptions[product]}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Formulários de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Formulários de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {formConversion.length > 0 ? formConversion.map(form => (
            <div key={form.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[300px]">{form.name}</span>
                <div className="flex items-center gap-2">
                  {Object.entries(form.products).filter(([, v]) => v > 0).map(([prod]) => (
                    <Badge key={prod} variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: PRODUCT_COLORS[prod] || '#7A8460', color: PRODUCT_COLORS[prod] || '#7A8460' }}>
                      {prod}
                    </Badge>
                  ))}
                  <span className="font-mono font-bold text-sm min-w-[40px] text-right">{form.total}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#7C5CFC] transition-all" style={{ width: `${(form.total / maxFormCount) * 100}%` }} />
              </div>
            </div>
          )) : <p className="text-center text-muted-foreground py-8">Sem dados de formulários</p>}
        </CardContent>
      </Card>

      {/* Fonte de Origem × Produto */}
      <Card>
        <CardHeader><CardTitle className="text-base">Fonte de Origem × Produto</CardTitle></CardHeader>
        <CardContent>
          {sourceByProduct.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(sourceByProduct.length * 38, 200)}>
              <BarChart data={sourceByProduct} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Academy" stackId="a" fill="#7C5CFC" />
                <Bar dataKey="Business" stackId="a" fill="#E8A43C" />
                <Bar dataKey="Outros" stackId="a" fill="#7A8460" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
        </CardContent>
      </Card>

      {/* Deals por Produto × Estágio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Deals por Produto × Estágio do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--c-raised)]">
                  <TableHead className="font-bold min-w-[160px]">ESTÁGIO</TableHead>
                  <TableHead className="text-center min-w-[80px]" style={{ color: '#7C5CFC' }}>ACADEMY</TableHead>
                  <TableHead className="text-center min-w-[80px]" style={{ color: '#E8A43C' }}>BUSINESS</TableHead>
                  <TableHead className="text-center font-bold min-w-[70px]">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealsByProductStage.map(row => {
                  const isWon = row.stage === 'Fechado Ganho'
                  const isLost = row.stage === 'Fechado Perdido'
                  return (
                    <TableRow key={row.stage} className={isWon ? 'bg-[#141A04]/30' : isLost ? 'bg-[#1A0604]/30' : ''}>
                      <TableCell className={`font-medium text-sm ${isWon ? 'text-[#AFC040]' : isLost ? 'text-[#E8684A]' : ''}`}>{row.stage}</TableCell>
                      <TableCell className="text-center">
                        {row.Academy > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold" style={{ backgroundColor: '#7C5CFC20', color: '#7C5CFC' }}>{row.Academy}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.Business > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold" style={{ backgroundColor: '#E8A43C20', color: '#E8A43C' }}>{row.Business}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">{row.total}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {productSummary.map(ps => (
          <Card key={ps.product} className="relative overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: ps.color }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${ps.color}20`, color: ps.color }}>{ps.product[0]}</span>
                {ps.product}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Deals</p>
                  <p className="text-xl font-bold font-mono">{ps.total}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativos</p>
                  <p className="text-xl font-bold font-mono" style={{ color: ps.color }}>{ps.active}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-bold font-mono text-[#AFC040]">{ps.winRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perdidos</p>
                  <p className="text-xl font-bold font-mono text-[#E8684A]">{ps.lost}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Principal fonte</p>
                <p className="text-sm font-medium">{ps.topSrcLabel} <span className="text-muted-foreground">({ps.topSrcPct}%)</span></p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cross-tab table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Deals por Fonte × Estágio do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--c-raised)]">
                  <TableHead className="font-bold min-w-[140px]">FONTE</TableHead>
                  {allColumns.map(col => (
                    <TableHead key={col} className={`text-center text-xs min-w-[70px] ${col === 'NEGÓCIO PERDIDO' ? 'text-[#E8684A]' : ''}`}>
                      {col === 'NEGÓCIO PERDIDO' ? 'PERDIDO' : col.length > 12 ? col.substring(0, 10) + '…' : col}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold text-xs">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crossTabSources.map(row => (
                  <TableRow key={row.source}>
                    <TableCell className="font-medium text-sm">{row.source}</TableCell>
                    {allColumns.map(col => {
                      const val = row.stages[col] || 0
                      const isLost = col === 'NEGÓCIO PERDIDO'
                      return (
                        <TableCell key={col} className="text-center">
                          {val > 0 ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${isLost ? 'bg-[#1A0604] text-[#E8684A]' : 'bg-[#141A04] text-[#AFC040]'}`}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-mono font-bold">{row.total}</TableCell>
                  </TableRow>
                ))}
                {crossTabSources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={allColumns.length + 2} className="text-center py-8 text-muted-foreground">Sem dados de deals</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function FacebookAdsPage() {
  const { data: snapshot } = useDashboardSnapshot()
  const fb = snapshot?.data?.facebook_ads
  const campaigns = fb?.campaigns || []
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE')
  const pausedCampaigns = campaigns.filter(c => c.status !== 'ACTIVE')
  const hasData = campaigns.length > 0

  // FIX Bug #1: Calculate totals from campaign data (single source of truth)
  const totals = useMemo(() => {
    const t = campaigns.reduce((acc, c) => ({
      spend: acc.spend + (c.spend || 0),
      impressions: acc.impressions + (c.impressions || 0),
      reach: acc.reach + (c.reach || 0),
      clicks: acc.clicks + (c.clicks || 0),
      leads: acc.leads + (c.leads || 0),
    }), { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 })
    return {
      ...t,
      ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
      cpl: t.leads > 0 ? t.spend / t.leads : 0,
    }
  }, [campaigns])

  // FIX Bug #2: Use totals.leads (from campaigns) consistently
  // Landing page views estimate (clicks * avg landing rate)
  const landingViews = fb?.metrics?.totalClicks ? Math.round((fb.metrics.totalClicks || 0) * 0.47) : Math.round(totals.clicks * 0.47)

  // Charts data
  const spendByCampaign = campaigns.filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 8)
  const cplByCampaign = campaigns.filter(c => c.spend > 0).map(c => ({ ...c, cplCalc: c.leads > 0 ? c.spend / c.leads : c.spend })).sort((a, b) => a.cplCalc - b.cplCalc).slice(0, 8)

  // FIX Bug #3: Pie chart by objective - group campaigns properly
  const spendByObjective = useMemo(() => {
    const obj: Record<string, number> = {}
    for (const c of campaigns) {
      const label = mapFbObjective(c.objective, c.name)
      obj[label] = (obj[label] || 0) + (c.spend || 0)
    }
    return Object.entries(obj).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  }, [campaigns])

  // CTR by campaign
  const ctrByCampaign = campaigns.filter(c => c.ctr > 0).sort((a, b) => b.ctr - a.ctr).slice(0, 8)

  // Best/worst CPL
  const bestCPL = cplByCampaign[0] || null
  const worstCPL = cplByCampaign.length > 1 ? cplByCampaign[cplByCampaign.length - 1] : null

  // Active campaign % of spend
  const activeSpendPct = totals.spend > 0 ? Math.round(activeCampaigns.reduce((s, c) => s + (c.spend || 0), 0) / totals.spend * 100) : 0

  // Insights data - FIX Bug #8: use consistent calculated values
  const insightsData = hasData ? {
    totalSpend: totals.spend, totalImpressions: totals.impressions, totalReach: totals.reach,
    totalClicks: totals.clicks, totalLeads: totals.leads, avgCPL: totals.cpl, avgCTR: totals.ctr,
    activeCampaigns: activeCampaigns.length, totalCampaigns: campaigns.length,
    activeSpendPct,
    campaigns: campaigns.slice(0, 8).map(c => ({ name: c.name.substring(0, 40), status: c.status, spend: c.spend, leads: c.leads, cpl: c.costPerLead, ctr: c.ctr })),
    bestCPL: bestCPL ? { name: bestCPL.name, cpl: bestCPL.costPerLead } : null,
    worstCPL: worstCPL ? { name: worstCPL.name, cpl: worstCPL.costPerLead } : null,
  } : null

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'facebook_ads', data: insightsData, enabled: hasData })

  // FIX Bug #7: Campaign name formatter with tooltip
  const shortName = (name: string, maxLen = 25) => humanizeCampaignName(name, maxLen)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Facebook Ads</h1>
          <Badge className="bg-[#141A04] text-[#AFC040]">{activeCampaigns.length} Ativa{activeCampaigns.length !== 1 ? 's' : ''}</Badge>
          <Badge variant="secondary">{pausedCampaigns.length} Pausada{pausedCampaigns.length !== 1 ? 's' : ''}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise de campanhas — todas as campanhas consolidadas</p>
      </div>

      {/* FIX Bug #1: KPIs from campaign totals, not API metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Total Investido" value={hasData ? formatCurrency(totals.spend) : '—'} icon={DollarSign} accentColor="#E8A43C" />
        <KPICard label="Impressões" value={hasData ? totals.impressions.toLocaleString('pt-BR') : '—'} icon={Eye} accentColor="#4A9FE0" />
        <KPICard label="Alcance" value={hasData ? totals.reach.toLocaleString('pt-BR') : '—'} icon={BarChart3} accentColor="#4A9FE0" />
        <KPICard label="Total Leads" value={hasData ? totals.leads : '—'} icon={Target} accentColor="#AFC040" sub={`${campaigns.length} campanhas`} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Total Cliques" value={hasData ? totals.clicks.toLocaleString('pt-BR') : '—'} icon={MousePointer} accentColor="#2CBBA6" />
        <KPICard label="CTR Médio" value={hasData ? `${totals.ctr.toFixed(2)}%` : '—'} icon={Percent} accentColor="#2CBBA6" />
        <KPICard label="CPL Médio" value={hasData && totals.cpl > 0 ? formatCurrency(totals.cpl) : '—'} icon={TrendingUp} accentColor="#E8684A" sub={totals.leads > 0 ? `R$${(totals.spend / totals.leads).toFixed(2)}/lead` : ''} />
        <KPICard label="Landing Views" value={hasData ? landingViews.toLocaleString('pt-BR') : '—'} icon={ExternalLink} accentColor="#2CBBA6" sub="~47% dos cliques" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'overview', l: 'Visão Geral' }, { v: 'campaigns', l: 'Campanhas' }, { v: 'evolution', l: 'Evolução' }, { v: 'funnel', l: 'Funil de Vendas' }, { v: 'insights', l: 'Insights' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Visão Geral ─── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FIX Bug #7: Tooltip with full campaign name */}
            <Card>
              <CardHeader><CardTitle className="text-base">Investimento por Campanha</CardTitle></CardHeader>
              <CardContent>
                {spendByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={spendByCampaign.map(c => ({ name: shortName(c.name), fullName: c.name, investimento: c.spend }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 300 }}><p className="text-xs font-medium" style={{ color: '#E8EDD8' }}>{d.fullName}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>Investimento: <strong>{formatCurrency(d.investimento)}</strong></p></div>)
                      }} />
                      <Bar dataKey="investimento" name="Investimento" fill="#E8A43C" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CPL por Campanha</CardTitle>
                {bestCPL && <p className="text-xs text-muted-foreground">Melhor: <strong className="text-[#AFC040]">{formatCurrency(bestCPL.cplCalc)}</strong> · Pior: <strong className="text-[#E8684A]">{formatCurrency(worstCPL?.cplCalc || 0)}</strong></p>}
              </CardHeader>
              <CardContent>
                {cplByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={cplByCampaign.map(c => ({ name: shortName(c.name), fullName: c.name, cpl: c.cplCalc }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 300 }}><p className="text-xs font-medium" style={{ color: '#E8EDD8' }}>{d.fullName}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>CPL: <strong>{formatCurrency(d.cpl)}</strong></p></div>)
                      }} />
                      <Bar dataKey="cpl" name="CPL" radius={[0, 4, 4, 0]}>
                        {cplByCampaign.map((c, i) => (
                          <Cell key={i} fill={c.cplCalc <= totals.cpl ? '#AFC040' : '#E8684A'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
                {/* Melhor / Pior CPL cards */}
                {bestCPL && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 rounded-lg bg-[#031411] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Melhor CPL</p>
                      <p className="text-xl font-bold font-mono" style={{ color: '#AFC040' }}>{formatCurrency(bestCPL.cplCalc)}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{shortName(bestCPL.name, 30)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1A0604] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pior CPL</p>
                      <p className="text-xl font-bold font-mono" style={{ color: '#E8684A' }}>{formatCurrency(worstCPL?.cplCalc || 0)}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{shortName(worstCPL?.name || '', 30)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Investimento por Objetivo</CardTitle></CardHeader>
              <CardContent>
                {spendByObjective.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={spendByObjective} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                        {spendByObjective.map((_, i) => <Cell key={i} fill={SEMANTIC_COLORS[i % SEMANTIC_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">CTR por Campanha (%)</CardTitle></CardHeader>
              <CardContent>
                {ctrByCampaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ctrByCampaign.map(c => ({ name: shortName(c.name, 18), fullName: c.name, ctr: Math.round(c.ctr * 100) / 100 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, ...AXIS_TICK }} interval={0} height={60} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 300 }}><p className="text-xs font-medium" style={{ color: '#E8EDD8' }}>{d.fullName}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>CTR: <strong>{d.ctr}%</strong></p></div>)
                      }} />
                      <Bar dataKey="ctr" name="CTR %" radius={[4, 4, 0, 0]}>
                        {ctrByCampaign.map((_, i) => <Cell key={i} fill={SEMANTIC_COLORS[i % SEMANTIC_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Campanhas ─── */}
        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as Campanhas ({campaigns.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--c-raised)]">
                      <TableHead>Campanha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">Alcance</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">CPL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-[250px]" title={c.name}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEMANTIC_COLORS[campaigns.indexOf(c) % SEMANTIC_COLORS.length] }} />
                            <p className="text-sm truncate">{c.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${c.status === 'ACTIVE' ? 'bg-[#141A04] text-[#AFC040]' : 'bg-muted text-muted-foreground'}`}>
                            {c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(c.spend || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{(c.impressions || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(c.reach || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(c.clicks || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(c.ctr || 0).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono">{c.leads || 0}</TableCell>
                        <TableCell className="text-right font-mono" style={{ color: c.costPerLead > 0 && c.costPerLead <= totals.cpl ? '#AFC040' : c.costPerLead > totals.cpl ? '#E8684A' : '#7A8460' }}>
                          {c.costPerLead > 0 ? formatCurrency(c.costPerLead) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    {campaigns.length > 0 && (
                      <TableRow className="bg-[var(--c-raised)] font-bold">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{campaigns.length} campanhas</Badge></TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: '#E8A43C' }}>{formatCurrency(totals.spend)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.impressions.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.reach.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.clicks.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{totals.ctr.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: '#AFC040' }}>{totals.leads}</TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: '#E8684A' }}>{totals.cpl > 0 ? formatCurrency(totals.cpl) : '—'}</TableCell>
                      </TableRow>
                    )}
                    {campaigns.length === 0 && (<TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Sem dados de campanhas</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Evolução (dados diários reais) ─── */}
        <TabsContent value="evolution" className="space-y-4 mt-4">
          {(() => {
            const dailyInsights = fb?.dailyInsights || []
            if (dailyInsights.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Atualize os dados para ver a evolução diária.</p>
                    <p className="text-xs text-muted-foreground mt-1">Clique em "Atualizar dados" no Painel Geral para coletar dados diários dos últimos 90 dias.</p>
                  </CardContent>
                </Card>
              )
            }

            const fmtDate = (d: string) => {
              const parts = d.split('-')
              return `${parts[2]}/${parts[1]}`
            }

            // Weekly summary
            const weeklyData = (() => {
              const weeks: Record<string, { gasto: number; leads: number }> = {}
              dailyInsights.forEach((d, i) => {
                const weekIdx = Math.floor(i / 7)
                const key = `Sem ${weekIdx + 1}`
                if (!weeks[key]) weeks[key] = { gasto: 0, leads: 0 }
                weeks[key].gasto += d.spend
                weeks[key].leads += d.leads
              })
              return Object.entries(weeks).map(([name, v]) => ({
                name,
                gasto: Math.round(v.gasto * 100) / 100,
                leads: v.leads,
              }))
            })()

            return (
              <>
                {/* Investimento Diário */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Investimento Diário (Últimos 90 dias)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyInsights.map(d => ({ date: fmtDate(d.date), spend: d.spend }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, ...AXIS_TICK }} interval={Math.max(Math.floor(dailyInsights.length / 12), 1)} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Data: ${l}`} />
                        <Area type="monotone" dataKey="spend" name="Investimento" stroke="#E8684A" fill="#E8684A" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Impressões e Cliques */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Impressões e Cliques</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={dailyInsights.map(d => ({ date: fmtDate(d.date), impressoes: d.impressions, cliques: d.clicks }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, ...AXIS_TICK }} interval={Math.max(Math.floor(dailyInsights.length / 8), 1)} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="impressoes" name="Impressões" stroke="#4A9FE0" strokeWidth={2} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="cliques" name="Cliques" stroke="#E8684A" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* CTR Diário */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">CTR Diário (%)</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={dailyInsights.map(d => ({ date: fmtDate(d.date), ctr: Math.round(d.ctr * 100) / 100 }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, ...AXIS_TICK }} interval={Math.max(Math.floor(dailyInsights.length / 8), 1)} axisLine={false} tickLine={false} />
                          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                          <Area type="monotone" dataKey="ctr" name="CTR" stroke="#4A9FE0" fill="#4A9FE0" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumo Semanal */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Resumo Semanal</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                        <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="gasto" name="Gasto (R$)" fill="#E8684A" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="leads" name="Leads" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Eixo esquerdo: gasto (R$) · Eixo direito: leads</p>
                  </CardContent>
                </Card>
              </>
            )
          })()}
        </TabsContent>

        {/* ─── Funil de Vendas ─── */}
        <TabsContent value="funnel" className="space-y-4 mt-4">
          <FunnelTab />
        </TabsContent>

        {/* ─── Insights ─── */}
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights do Facebook Ads" subtitle={`${campaigns.length} campanhas · CPL médio ${totals.cpl > 0 ? formatCurrency(totals.cpl) : '—'} · ${activeSpendPct}% do orçamento na campanha ativa`} context="facebook_ads" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
