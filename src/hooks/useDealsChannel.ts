import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

/**
 * Derives the channel/source from a contact's data.
 * Since deals.canal_origem is almost always NULL (not set by HubSpot import),
 * we derive it from the associated contact's utm_source, fonte_registro, etc.
 */
export function deriveChannel(contact: {
  utm_source?: string | null
  fonte_registro?: string | null
  first_conversion?: string | null
  hubspot_id?: number | null
  manychat_id?: string | null
  whatsapp_opt_in?: boolean | null
  instagram_opt_in?: boolean | null
} | null, dealCanalOrigem?: string | null): string {
  // If deal has explicit canal_origem, use it
  if (dealCanalOrigem) return dealCanalOrigem

  if (!contact) return 'Não rastreado'

  const fonte = (contact.fonte_registro || '').toUpperCase()
  const utm = (contact.utm_source || '').toLowerCase()

  // Paid sources
  if (fonte === 'PAID_SOCIAL' || fonte === 'PAID_SEARCH' || utm === 'paid' || utm === 'facebook_ads' || utm === 'fb_ads') return 'Facebook Ads'

  // Social / Instagram
  if (fonte === 'SOCIAL_MEDIA' || utm === 'instagram' || utm === 'ig' || contact.instagram_opt_in) return 'Instagram Orgânico'

  // WhatsApp / ManyChat
  if (contact.whatsapp_opt_in || contact.manychat_id) return 'WhatsApp'

  // Direct traffic
  if (fonte === 'DIRECT_TRAFFIC' || utm === 'direct') return 'Tráfego Direto'

  // Organic search
  if (fonte === 'ORGANIC_SEARCH' || utm === 'google' || utm === 'organic') return 'Busca Orgânica'

  // Other campaigns
  if (fonte === 'OTHER_CAMPAIGNS' || fonte === 'EMAIL_MARKETING') return 'Campanhas / Email'

  // Offline
  if (fonte === 'OFFLINE') return 'Offline'

  // Form submission (has hubspot_id or first_conversion but no clear source)
  if (contact.first_conversion || contact.hubspot_id) return 'Formulário'

  return 'Não rastreado'
}

export interface DealWithChannel {
  id: string
  name: string
  amount: number | null
  product: string
  is_won: boolean | null
  canal: string
  contact_id: string | null
  stage_id: string | null
  stage_name?: string
  created_at: string | null
}

/**
 * Fetches all deals with their derived channel from contact data.
 * This replaces the broken `deals_full.canal_origem` which is always NULL.
 */
export function useDealsWithChannel() {
  return useQuery({
    queryKey: ['deals_with_channel'],
    queryFn: async () => {
      // Fetch deals with contact info in one query
      const { data: deals } = await supabase
        .from('deals')
        .select('id, name, amount, product, is_won, canal_origem, contact_id, stage_id, created_at, stage_entered_at, contacts(utm_source, fonte_registro, first_conversion, hubspot_id, manychat_id, whatsapp_opt_in, instagram_opt_in)')

      if (!deals) return []

      return deals.map((d: any) => ({
        id: d.id,
        name: d.name,
        amount: d.amount,
        product: d.product,
        is_won: d.is_won,
        canal: deriveChannel(d.contacts, d.canal_origem),
        contact_id: d.contact_id,
        stage_id: d.stage_id,
        created_at: d.created_at,
        stage_entered_at: d.stage_entered_at,
      })) as DealWithChannel[]
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Returns deals grouped by derived channel with counts.
 */
export function useDealsByChannel() {
  const { data: deals, ...rest } = useDealsWithChannel()

  const channelData = (deals || []).reduce((acc, d) => {
    acc[d.canal] = (acc[d.canal] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sorted = Object.entries(channelData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return { data: sorted, deals: deals || [], ...rest }
}
