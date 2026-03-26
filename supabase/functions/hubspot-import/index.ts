// Edge Function: Importar dados do HubSpot para o CRM
// Mapeia contatos e deals do HubSpot para o schema local

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HUBSPOT_BASE_URL = 'https://api.hubapi.com'

// Mapeamento de dealstage do HubSpot para stage IDs locais
const STAGE_MAP: Record<string, Record<string, string>> = {
  business: {
    appointmentscheduled: 'b1000000-0000-0000-0000-000000000001',
    '1241627963': 'b1000000-0000-0000-0000-000000000002',
    qualifiedtobuy: 'b1000000-0000-0000-0000-000000000003',
    '1248846720': 'b1000000-0000-0000-0000-000000000004',
    '1241627964': 'b1000000-0000-0000-0000-000000000005',
    '1241627965': 'b1000000-0000-0000-0000-000000000006',
    presentationscheduled: 'b1000000-0000-0000-0000-000000000007',
    '1241627966': 'b1000000-0000-0000-0000-000000000008',
    closedwon: 'b1000000-0000-0000-0000-000000000009',
    closedlost: 'b1000000-0000-0000-0000-000000000010',
  },
  skills: {
    appointmentscheduled: 'b2000000-0000-0000-0000-000000000001',
    '1241627963': 'b2000000-0000-0000-0000-000000000002',
    qualifiedtobuy: 'b2000000-0000-0000-0000-000000000003',
    '1248846720': 'b2000000-0000-0000-0000-000000000004',
    '1241627964': 'b2000000-0000-0000-0000-000000000005',
    '1241627965': 'b2000000-0000-0000-0000-000000000006',
    presentationscheduled: 'b2000000-0000-0000-0000-000000000008',
    '1241627966': 'b2000000-0000-0000-0000-000000000007',
    closedwon: 'b2000000-0000-0000-0000-000000000009',
    closedlost: 'b2000000-0000-0000-0000-000000000010',
  },
  academy: {
    appointmentscheduled: 'b3000000-0000-0000-0000-000000000002',
    '1241627963': 'b3000000-0000-0000-0000-000000000004',
    qualifiedtobuy: 'b3000000-0000-0000-0000-000000000005',
    '1248846720': 'b3000000-0000-0000-0000-000000000003',
    '1241627964': 'b3000000-0000-0000-0000-000000000006',
    '1241627965': 'b3000000-0000-0000-0000-000000000006',
    presentationscheduled: 'b3000000-0000-0000-0000-000000000006',
    '1241627966': 'b3000000-0000-0000-0000-000000000006',
    closedwon: 'b3000000-0000-0000-0000-000000000007',
    closedlost: 'b3000000-0000-0000-0000-000000000008',
  },
}

const PIPELINE_MAP: Record<string, string> = {
  Business: 'a1000000-0000-0000-0000-000000000001',
  Skills: 'a1000000-0000-0000-0000-000000000002',
  Academy: 'a1000000-0000-0000-0000-000000000003',
}

interface HubSpotContact {
  id: string
  properties: Record<string, string | null>
}

interface HubSpotDeal {
  id: string
  properties: Record<string, string | null>
}

async function fetchHubSpot(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`HubSpot API error: ${res.status} ${await res.text()}`)
  return res.json()
}

// deno-lint-ignore no-explicit-any
async function importContacts(supabase: any, token: string) {
  const properties = [
    'firstname', 'lastname', 'email', 'phone', 'company',
    'cargo', 'numero_de_liderados', 'faixa_de_faturamento',
    'renda_mensal', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
  ].join(',')

  let after: string | undefined
  let totalImported = 0

  do {
    const url = `/crm/v3/objects/contacts?limit=100&properties=${properties}${after ? `&after=${after}` : ''}`
    const data = await fetchHubSpot(url, token) as {
      results: HubSpotContact[]
      paging?: { next?: { after: string } }
    }

    const contacts = data.results.map((c) => ({
      hubspot_id: parseInt(c.id),
      first_name: c.properties.firstname || (c.properties.email ? c.properties.email.split('@')[0].replace(/[._]/g, ' ') : 'Sem nome'),
      last_name: c.properties.lastname || null,
      email: c.properties.email || null,
      phone: c.properties.phone || null,
      company: c.properties.company || null,
      cargo: c.properties.cargo || null,
      numero_de_liderados: c.properties.numero_de_liderados || null,
      faixa_de_faturamento: c.properties.faixa_de_faturamento || null,
      renda_mensal: c.properties.renda_mensal || null,
      utm_source: c.properties.utm_source || null,
      utm_medium: c.properties.utm_medium || null,
      utm_campaign: c.properties.utm_campaign || null,
      utm_term: c.properties.utm_term || null,
    }))

    const { error } = await supabase.from('contacts').upsert(contacts, { onConflict: 'hubspot_id' })
    if (error) throw error

    totalImported += contacts.length
    after = data.paging?.next?.after
  } while (after)

  return totalImported
}

// deno-lint-ignore no-explicit-any
async function importDeals(supabase: any, token: string) {
  const properties = [
    'dealname', 'dealstage', 'amount', 'hubspot_owner_id',
    'tipo_do_produto', 'pipeline',
  ].join(',')

  let after: string | undefined
  let totalImported = 0

  do {
    const url = `/crm/v3/objects/deals?limit=100&properties=${properties}&associations=contacts${after ? `&after=${after}` : ''}`
    const data = await fetchHubSpot(url, token) as {
      results: (HubSpotDeal & { associations?: { contacts?: { results: Array<{ id: string }> } } })[]
      paging?: { next?: { after: string } }
    }

    for (const d of data.results) {
      const product = (d.properties.tipo_do_produto || 'Business').toLowerCase() as 'business' | 'skills' | 'academy'
      const pipelineId = PIPELINE_MAP[d.properties.tipo_do_produto || 'Business'] || PIPELINE_MAP.Business
      const stageMap = STAGE_MAP[product] || STAGE_MAP.business
      const stageId = stageMap[d.properties.dealstage || 'appointmentscheduled'] || stageMap.appointmentscheduled

      // Find associated contact
      let contactId: string | null = null
      const associatedContactHubspotId = d.associations?.contacts?.results?.[0]?.id
      if (associatedContactHubspotId) {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('id')
          .eq('hubspot_id', parseInt(associatedContactHubspotId))
          .single()
        if (contactData) contactId = (contactData as { id: string }).id
      }

      const isWon = d.properties.dealstage === 'closedwon' ? true :
                     d.properties.dealstage === 'closedlost' ? false : null

      const { error } = await supabase.from('deals').upsert({
        hubspot_id: parseInt(d.id),
        name: d.properties.dealname || 'Sem nome',
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stageId,
        product: product,
        amount: d.properties.amount ? parseFloat(d.properties.amount) : null,
        is_won: isWon,
        closed_at: isWon !== null ? new Date().toISOString() : null,
      }, { onConflict: 'hubspot_id' })

      if (error) throw error
      totalImported++
    }

    after = data.paging?.next?.after
  } while (after)

  return totalImported
}

Deno.serve(async (req) => {
  try {
    const { hubspot_token } = await req.json()
    if (!hubspot_token) {
      return new Response(JSON.stringify({ error: 'hubspot_token is required' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const contactsImported = await importContacts(supabase, hubspot_token)
    const dealsImported = await importDeals(supabase, hubspot_token)

    return new Response(JSON.stringify({
      success: true,
      contacts_imported: contactsImported,
      deals_imported: dealsImported,
    }))
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
