import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Filter } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { normalizeChannel, humanizeCampaignName } from '@/lib/format'



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





export function FunnelTab() {
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

  const getDealChannel = useMemo(() => {
    const contactSource: Record<string, string> = {}
    for (const c of contacts) {
      contactSource[c.id] = c.utm_source || c.fonte_registro || ''
    }
    return (d: any) => normalizeChannel(d.canal_origem || (d.contact_id ? contactSource[d.contact_id] : '') || '')
  }, [contacts])

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

  const classifyDeals = useMemo(() => {
    const igOrganic = deals.filter(d => META_SOURCES.isInstagramOrganic(getDealChannel(d)))
    const fbAds = deals.filter(d => META_SOURCES.isFacebookAds(getDealChannel(d)))
    const metaCampaign = deals.filter(d => META_SOURCES.isMetaCampaign(d.canal_origem || '') && !META_SOURCES.isInstagramOrganic(getDealChannel(d)) && !META_SOURCES.isFacebookAds(getDealChannel(d)))
    return { igOrganic, fbAds, metaCampaign }
  }, [deals, getDealChannel])

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
  const ecosystemDeals = deals.filter(d => META_SOURCES.isMetaEcosystem(getDealChannel(d), d.canal_origem || '')).length
  const ecosystemPct = contacts.length > 0 ? ((ecosystemTotal / contacts.length) * 100).toFixed(1) : '0'




  const uniqueStages = stages.map(s => s.name)
  const crossTabSources = useMemo(() => {
    const sourceMap: Record<string, Record<string, number>> = {}
    for (const d of deals) {
      const source = getDealChannel(d)
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
  }, [deals, getDealChannel])

  const allColumns = [...uniqueStages, 'NEGÓCIO PERDIDO']


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
