

## Plano: Corrigir "Deals por Canal" para usar fonte do contato como fallback

### Problema
A maioria dos deals tem `canal_origem` nulo/vazio na tabela `deals`. O `normalizeChannel(null)` retorna "Não rastreado", resultando em quase todos os deals aparecendo como "Não rastreado: 123" no gráfico — tanto no PainelGeral quanto no FunnelTab do Facebook Ads.

O correto é: quando `canal_origem` do deal for nulo, usar o `utm_source` ou `fonte_registro` do contato associado como fallback.

### Alterações

#### 1. `src/pages/PainelGeral.tsx` — Query "dealsByChannel"

Alterar a query para buscar também o `contact_id` dos deals e, em paralelo, buscar os contatos com `utm_source`/`fonte_registro`. Usar o canal do contato como fallback:

```ts
const { data: dealsByChannel } = useQuery({
  queryKey: ['deals_by_channel'],
  queryFn: async () => {
    const { data: dealsData } = await supabase.from('deals').select('canal_origem, contact_id')
    const { data: contactsData } = await supabase.from('contacts').select('id, utm_source, fonte_registro')
    
    // Build contact source lookup
    const contactSource: Record<string, string> = {}
    for (const c of (contactsData || [])) {
      contactSource[c.id] = c.utm_source || c.fonte_registro || ''
    }
    
    // Normalize using deal canal_origem OR contact source as fallback
    const channels: Record<string, number> = {}
    for (const d of (dealsData || [])) {
      const raw = d.canal_origem || (d.contact_id ? contactSource[d.contact_id] : '') || ''
      const ch = normalizeChannel(raw)
      channels[ch] = (channels[ch] || 0) + 1
    }
    return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  },
})
```

#### 2. `src/pages/FacebookAdsPage.tsx` — FunnelTab

Mesma lógica: expandir a query de deals para incluir `contact_id`, e construir um mapa de fallback a partir dos contacts já carregados. Atualizar todos os `useMemo` que usam `normalizeChannel(d.canal_origem)` para usar a função com fallback.

Criar helper local:
```ts
const dealChannelMap = useMemo(() => {
  const contactSource: Record<string, string> = {}
  for (const c of contacts) {
    contactSource[c.id] = c.utm_source || c.fonte_registro || ''
  }
  return (d: any) => normalizeChannel(d.canal_origem || (d.contact_id ? contactSource[d.contact_id] : '') || '')
}, [contacts])
```

Expandir a query de `deals_full` para incluir `contact_id`:
```ts
select('canal_origem, stage_name, stage_order, is_won, qualification_status, created_at, motivo_perda, product, contact_id')
```

Substituir todas as ocorrências de `normalizeChannel(d.canal_origem || '')` por `dealChannelMap(d)` nos useMemos: `classifyDeals`, `conversionBySource`, `crossTabSources`, `sourceByProduct`, `productSummary`.

### Arquivos afetados
- `src/pages/PainelGeral.tsx` — query dealsByChannel com fallback
- `src/pages/FacebookAdsPage.tsx` — helper dealChannelMap + atualizar useMemos

