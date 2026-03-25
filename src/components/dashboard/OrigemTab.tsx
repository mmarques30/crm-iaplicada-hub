import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Filter, Target } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { normalizeChannel } from '@/lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const CHANNEL_COLORS: Record<string, string> = {
  'Facebook Ads': '#4A9FE0',
  'Instagram Orgânico': '#E8684A',
  'Tráfego Direto': '#AFC040',
  'WhatsApp': '#2CBBA6',
  'Formulário / Orgânico': '#E8A43C',
  'Google Ads': '#7C5CFC',
  'Não rastreado': '#7A8460',
}
const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  'Facebook Ads': 'Contatos vindos de campanhas pagas no Facebook/Meta',
  'Instagram Orgânico': 'Contatos captados organicamente pelo Instagram',
  'Tráfego Direto': 'Acessos diretos sem UTM ou referência',
  'WhatsApp': 'Contatos originados via WhatsApp',
  'Formulário / Orgânico': 'Contatos via formulários ou busca orgânica',
  'Google Ads': 'Contatos vindos de campanhas pagas no Google',
  'Não rastreado': 'Contatos sem fonte de origem identificada',
}
const PRODUCT_COLORS: Record<string, string> = {
  'Academy': '#7C5CFC',
  'Business': '#E8A43C',
  'Skills': '#2CBBA6',
  'Offline/Importados': '#7A8460',
}
const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

export function OrigemTab() {
  const { data: contactsRes } = useQuery({
    queryKey: ['contacts_origem'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('id, utm_source, utm_medium, utm_campaign, fonte_registro, lifecycle_stage, created_at, produto_interesse, first_conversion')
      return data || []
    },
  })

  const { data: dealsRes } = useQuery({
    queryKey: ['deals_full_origem'],
    queryFn: async () => {
      const { data } = await supabase.from('deals_full').select('canal_origem, stage_name, stage_order, is_won, qualification_status, created_at, motivo_perda, product, contact_id')
      return data || []
    },
  })

  const { data: stagesRes } = useQuery({
    queryKey: ['stages_for_origem'],
    queryFn: async () => {
      const { data } = await supabase.from('stages').select('name, display_order').order('display_order')
      return data || []
    },
  })

  const contacts = contactsRes || []
  const deals = dealsRes || []
  const stages = stagesRes || []
  const uniqueStages = stages.map(s => s.name)

  const getDealChannel = useMemo(() => {
    const contactSource: Record<string, string> = {}
    for (const c of contacts) {
      contactSource[c.id] = c.utm_source || c.fonte_registro || ''
    }
    return (d: any) => normalizeChannel(d.canal_origem || (d.contact_id ? contactSource[d.contact_id] : '') || '')
  }, [contacts])

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

  const dealsByProductStage = useMemo(() => {
    const stageRows: { stage: string; Academy: number; Business: number; total: number }[] = []
    for (const stageName of uniqueStages) {
      const acad = deals.filter(d => d.stage_name === stageName && (d as any).product === 'academy' && !d.motivo_perda).length
      const biz = deals.filter(d => d.stage_name === stageName && (d as any).product === 'business' && !d.motivo_perda).length
      stageRows.push({ stage: stageName, Academy: acad, Business: biz, total: acad + biz })
    }
    const wonA = deals.filter(d => d.is_won === true && (d as any).product === 'academy').length
    const wonB = deals.filter(d => d.is_won === true && (d as any).product === 'business').length
    stageRows.push({ stage: 'Fechado Ganho', Academy: wonA, Business: wonB, total: wonA + wonB })
    const lostA = deals.filter(d => !!d.motivo_perda && (d as any).product === 'academy').length
    const lostB = deals.filter(d => !!d.motivo_perda && (d as any).product === 'business').length
    stageRows.push({ stage: 'Fechado Perdido', Academy: lostA, Business: lostB, total: lostA + lostB })
    return stageRows
  }, [deals, uniqueStages])

  const productSummary = useMemo(() => {
    const products = ['academy', 'business'] as const
    return products.map(p => {
      const pDeals = deals.filter(d => (d as any).product === p)
      const active = pDeals.filter(d => !d.is_won && !d.motivo_perda).length
      const won = pDeals.filter(d => d.is_won === true).length
      const lost = pDeals.filter(d => !!d.motivo_perda).length
      const total = pDeals.length
      const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0
      const srcMap: Record<string, number> = {}
      for (const d of pDeals) {
        const ch = getDealChannel(d)
        srcMap[ch] = (srcMap[ch] || 0) + 1
      }
      const topSrc = Object.entries(srcMap).sort((a, b) => b[1] - a[1])[0]
      return {
        product: p === 'academy' ? 'Academy' : 'Business',
        color: p === 'academy' ? '#7C5CFC' : '#E8A43C',
        total, active, won, lost, winRate,
        topSrcLabel: topSrc ? topSrc[0] : '—',
        topSrcPct: topSrc && total > 0 ? Math.round((topSrc[1] / total) * 100) : 0,
      }
    })
  }, [deals, getDealChannel])

  return (
    <div className="space-y-4">
      {/* Header: Origem por Produto */}
      <Card className="border-[#E8A43C]/20 bg-gradient-to-r from-[#1A1604]/60 to-[#141A04]/40">
        <CardContent className="py-5">
          <div className="text-center space-y-1 mb-4">
            <p className="text-xs uppercase tracking-widest text-[#E8A43C] font-semibold">ORIGEM POR PRODUTO</p>
            <p className="text-sm text-muted-foreground">Distribuição de contatos e deals por formulário de conversão — Academy, Business e Skills</p>
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
    </div>
  )
}
