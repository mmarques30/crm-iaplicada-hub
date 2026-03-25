import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { normalizeChannel } from '@/lib/format'

const CHANNEL_COLORS: Record<string, string> = {
  'Offline': '#7A8460',
  'Instagram': '#E8684A',
  'Tráfego Direto': '#AFC040',
  'Ads': '#4A9FE0',
  'TikTok': '#FF004F',
  'YouTube': '#FF0000',
  'Não rastreado': '#555',
}
const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  'Offline': 'Contatos captados presencialmente ou por indicação',
  'Instagram': 'Contatos captados organicamente pelo Instagram',
  'Tráfego Direto': 'Acessos diretos, orgânicos ou via formulários',
  'Ads': 'Contatos vindos de campanhas pagas (Meta, Google, etc.)',
  'TikTok': 'Contatos originados via TikTok',
  'YouTube': 'Contatos originados via YouTube',
  'Não rastreado': 'Contatos sem fonte de origem identificada',
}

export function OrigemTab() {
  const { data: contactsRes } = useQuery({
    queryKey: ['contacts_origem'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('id, utm_source, utm_medium, utm_campaign, fonte_registro, lifecycle_stage, created_at, produto_interesse, first_conversion')
      return data || []
    },
  })

  const contacts = contactsRes || []

  const ALLOWED_CHANNELS = ['Offline', 'Instagram', 'Tráfego Direto', 'Ads', 'TikTok', 'YouTube']

  const channelData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const ch of ALLOWED_CHANNELS) counts[ch] = 0
    for (const c of contacts) {
      let ch = normalizeChannel(c.utm_source || c.fonte_registro || '')
      if (!ALLOWED_CHANNELS.includes(ch)) ch = 'Offline'
      counts[ch] = (counts[ch] || 0) + 1
    }
    return ALLOWED_CHANNELS
      .map(name => ({ name, count: counts[name] || 0 }))
      .sort((a, b) => b.count - a.count)
  }, [contacts])

  return (
    <div className="space-y-4">
      <Card className="border-[#E8A43C]/20 bg-gradient-to-r from-[#1A1604]/60 to-[#141A04]/40">
        <CardContent className="py-5">
          <div className="text-center space-y-1 mb-4">
            <p className="text-xs uppercase tracking-widest text-[#E8A43C] font-semibold">ORIGEM POR CANAL</p>
            <p className="text-sm text-muted-foreground">Distribuição de contatos por canal de aquisição — utm_source e fonte de registro</p>
            <p className="text-3xl font-bold font-mono">{contacts.length} <span className="text-base font-normal text-muted-foreground">contatos totais</span></p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {channelData.map(({ name, count }) => {
              const pct = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0
              const color = CHANNEL_COLORS[name] || '#7A8460'
              return (
                <div key={name} className="rounded-lg border border-white/[0.06] bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${color}20`, color }}>
                      {name[0]}
                    </span>
                    <span className="text-sm font-medium truncate">{name}</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">{count}</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{pct}% do total</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{CHANNEL_DESCRIPTIONS[name] || `Contatos originados de ${name}`}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
