// Edge Function: Coleta dados do Instagram, Facebook Ads e HubSpot
// Otimizado para rodar dentro do timeout de 150s do Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function getSecret(supabase: any, name: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_secret', { secret_name: name })
    if (!error && data) return data
  } catch {}
  return Deno.env.get(name) || null
}

// ============ INSTAGRAM COLLECTOR (otimizado — sem insights por post) ============
// Usa Page Token (permanente) + IG Account ID direto
async function collectInstagram(accessToken: string, igAccountId: string) {
  const baseUrl = 'https://graph.facebook.com/v21.0'

  if (!igAccountId) throw new Error('META_IG_ACCOUNT_ID not configured')
  console.log(`Collecting Instagram for IG ID: ${igAccountId}`)

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const until = new Date().toISOString().split('T')[0]

  // Fetch profile, insights e media em PARALELO
  const [profileRes, dailyRes, totalRes, mediaRes] = await Promise.all([
    fetch(`${baseUrl}/${igAccountId}?fields=id,username,name,followers_count,media_count&access_token=${accessToken}`),
    fetch(`${baseUrl}/${igAccountId}/insights?metric=reach,follower_count&period=day&metric_type=time_series&since=${since}&until=${until}&access_token=${accessToken}`),
    fetch(`${baseUrl}/${igAccountId}/insights?metric=profile_views,accounts_engaged,total_interactions,reach&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${accessToken}`),
    fetch(`${baseUrl}/${igAccountId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=25&access_token=${accessToken}`),
  ])

  const [profile, dailyInsights, totalInsights, mediaData] = await Promise.all([
    profileRes.json(), dailyRes.json(), totalRes.json(), mediaRes.json(),
  ])

  if (profile.error) throw new Error(`Instagram profile: ${profile.error.message}`)

  const posts = (mediaData.data || []).map((p: any) => ({
    ...p, reach: 0, saved: 0, shares: 0, plays: 0,
  }))

  const dailyReach = dailyInsights.data?.find((d: any) => d.name === 'reach')?.values || []
  const dailyFollowers = dailyInsights.data?.find((d: any) => d.name === 'follower_count')?.values || []

  const totals: Record<string, number> = {}
  if (totalInsights.data) {
    for (const m of totalInsights.data) totals[m.name] = m.total_value?.value || 0
  }

  const totalLikes = posts.reduce((s: number, p: any) => s + (p.like_count || 0), 0)
  const totalComments = posts.reduce((s: number, p: any) => s + (p.comments_count || 0), 0)
  const avgEngagement = posts.length > 0
    ? ((totalLikes + totalComments) / posts.length / (profile.followers_count || 1) * 100) : 0

  return {
    profile: { username: profile.username, name: profile.name, followers: profile.followers_count, mediaCount: profile.media_count },
    metrics: {
      followers: profile.followers_count || 0, totalReach: totals.reach || 0, totalViews: 0,
      totalSaved: 0, totalShares: 0, totalLikes, totalComments,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      profileViews: totals.profile_views || 0, accountsEngaged: totals.accounts_engaged || 0,
    },
    posts, dailyReach, dailyFollowers,
  }
}

// ============ FACEBOOK ADS COLLECTOR (COMPLETO) ============
async function collectFacebookAds(adsToken: string, adAccountId: string) {
  const baseUrl = 'https://graph.facebook.com/v21.0'

  // Use date_preset=maximum to get ALL historical data (not just 30/90 days)
  // This ensures paused campaigns from months ago still show their spend/leads
  const since = '2025-01-01' // Start from beginning of operations
  const until = new Date().toISOString().split('T')[0]
  const timeRange = JSON.stringify({ since, until })

  // Helper: paginate through all pages of a FB API endpoint
  async function fetchAllPages(url: string): Promise<any[]> {
    const all: any[] = []
    let nextUrl: string | null = url
    while (nextUrl) {
      const res = await fetch(nextUrl)
      const data = await res.json()
      if (data.error) throw new Error(`FB Ads: ${data.error.message}`)
      all.push(...(data.data || []))
      nextUrl = data.paging?.next || null
    }
    return all
  }

  // Fetch all data with pagination (campaigns, insights, ads) + daily in parallel
  const [campaigns, insights, dailyRes, ads] = await Promise.all([
    fetchAllPages(`${baseUrl}/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=100&access_token=${adsToken}`),
    fetchAllPages(`${baseUrl}/${adAccountId}/insights?fields=campaign_name,campaign_id,spend,impressions,reach,clicks,ctr,actions,cost_per_action_type&date_preset=maximum&level=campaign&limit=100&access_token=${adsToken}`),
    fetch(`${baseUrl}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,ctr,actions&time_range=${encodeURIComponent(timeRange)}&time_increment=1&limit=500&access_token=${adsToken}`),
    fetchAllPages(`${baseUrl}/${adAccountId}/ads?fields=id,name,status,campaign_id,adset_id,creative{id,name,thumbnail_url,effective_object_story_id},insights.fields(spend,impressions,reach,clicks,ctr,actions,cost_per_action_type).date_preset(maximum)&limit=100&access_token=${adsToken}`),
  ])

  const dailyData = await dailyRes.json()
  if (dailyData.error) throw new Error(`FB Ads daily: ${dailyData.error.message}`)

  const dailyInsights = dailyData.data || []

  // Parse campaign-level data
  const campaignsWithInsights = campaigns.map((c: any) => {
    const insight = insights.find((i: any) => i.campaign_id === c.id) || {}
    const leads = (insight.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0
    const costPerLead = (insight.cost_per_action_type || []).find((a: any) => a.action_type === 'lead')?.value || 0
    return {
      id: c.id, name: c.name, status: c.status, objective: c.objective,
      start_time: c.start_time || null, stop_time: c.stop_time || null,
      daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      spend: parseFloat(insight.spend || '0'), impressions: parseInt(insight.impressions || '0'),
      reach: parseInt(insight.reach || '0'), clicks: parseInt(insight.clicks || '0'),
      ctr: parseFloat(insight.ctr || '0'), leads: parseInt(leads), costPerLead: parseFloat(costPerLead),
    }
  })

  // Parse daily data for evolution charts
  const daily = dailyInsights.map((d: any) => {
    const leads = (d.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0
    return {
      date: d.date_start,
      spend: parseFloat(d.spend || '0'),
      impressions: parseInt(d.impressions || '0'),
      reach: parseInt(d.reach || '0'),
      clicks: parseInt(d.clicks || '0'),
      ctr: parseFloat(d.ctr || '0'),
      leads: parseInt(leads),
    }
  })

  // Parse ads-level data (individual ads within campaigns)
  const ads = (adsData.data || []).map((ad: any) => {
    const adInsight = ad.insights?.data?.[0] || {}
    const leads = (adInsight.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0
    return {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      campaign_id: ad.campaign_id,
      adset_id: ad.adset_id,
      creative_name: ad.creative?.name || null,
      thumbnail_url: ad.creative?.thumbnail_url || null,
      spend: parseFloat(adInsight.spend || '0'),
      impressions: parseInt(adInsight.impressions || '0'),
      reach: parseInt(adInsight.reach || '0'),
      clicks: parseInt(adInsight.clicks || '0'),
      ctr: parseFloat(adInsight.ctr || '0'),
      leads: parseInt(leads),
    }
  }).filter((ad: any) => ad.spend > 0 || ad.impressions > 0)

  // Calculate totals
  const totalSpend = campaignsWithInsights.reduce((s: number, c: any) => s + c.spend, 0)
  const totalImpressions = campaignsWithInsights.reduce((s: number, c: any) => s + c.impressions, 0)
  const totalReach = campaignsWithInsights.reduce((s: number, c: any) => s + c.reach, 0)
  const totalClicks = campaignsWithInsights.reduce((s: number, c: any) => s + c.clicks, 0)
  const totalLeads = campaignsWithInsights.reduce((s: number, c: any) => s + c.leads, 0)

  // Sort daily data chronologically
  daily.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))

  console.log(`FB Ads: ${campaigns.length} campaigns, ${daily.length} daily points, ${ads.length} ads`)

  return {
    campaigns: campaignsWithInsights,
    dailyInsights: daily, // Keep backward compat with Lovable's key name
    daily,                // Also expose as 'daily'
    ads,                  // Individual ads within campaigns
    metrics: {
      totalSpend: Math.round(totalSpend * 100) / 100, totalImpressions, totalReach, totalClicks, totalLeads,
      avgCPL: Math.round((totalLeads > 0 ? totalSpend / totalLeads : 0) * 100) / 100,
      avgCTR: Math.round((totalImpressions > 0 ? totalClicks / totalImpressions * 100 : 0) * 100) / 100,
    },
    period: { since, until },
  }
}

// ============ HUBSPOT COLLECTOR ============
const STAGE_MAP: Record<string, Record<string, string>> = {
  business: {
    appointmentscheduled: 'b1000000-0000-0000-0000-000000000001', '1241627963': 'b1000000-0000-0000-0000-000000000002',
    qualifiedtobuy: 'b1000000-0000-0000-0000-000000000003', '1248846720': 'b1000000-0000-0000-0000-000000000004',
    '1241627964': 'b1000000-0000-0000-0000-000000000005', '1241627965': 'b1000000-0000-0000-0000-000000000006',
    presentationscheduled: 'b1000000-0000-0000-0000-000000000007', '1241627966': 'b1000000-0000-0000-0000-000000000008',
    closedwon: 'b1000000-0000-0000-0000-000000000009', closedlost: 'b1000000-0000-0000-0000-000000000010',
  },
  skills: {
    appointmentscheduled: 'b2000000-0000-0000-0000-000000000001', '1241627963': 'b2000000-0000-0000-0000-000000000002',
    qualifiedtobuy: 'b2000000-0000-0000-0000-000000000003', '1248846720': 'b2000000-0000-0000-0000-000000000004',
    '1241627964': 'b2000000-0000-0000-0000-000000000005', '1241627965': 'b2000000-0000-0000-0000-000000000006',
    presentationscheduled: 'b2000000-0000-0000-0000-000000000008', '1241627966': 'b2000000-0000-0000-0000-000000000007',
    closedwon: 'b2000000-0000-0000-0000-000000000009', closedlost: 'b2000000-0000-0000-0000-000000000010',
  },
  academy: {
    appointmentscheduled: 'b3000000-0000-0000-0000-000000000002', '1241627963': 'b3000000-0000-0000-0000-000000000004',
    qualifiedtobuy: 'b3000000-0000-0000-0000-000000000005', '1248846720': 'b3000000-0000-0000-0000-000000000003',
    '1241627964': 'b3000000-0000-0000-0000-000000000006', '1241627965': 'b3000000-0000-0000-0000-000000000006',
    presentationscheduled: 'b3000000-0000-0000-0000-000000000006', '1241627966': 'b3000000-0000-0000-0000-000000000006',
    closedwon: 'b3000000-0000-0000-0000-000000000007', closedlost: 'b3000000-0000-0000-0000-000000000008',
  },
}
const PIPELINE_MAP: Record<string, string> = {
  Business: 'a1000000-0000-0000-0000-000000000001',
  Skills: 'a1000000-0000-0000-0000-000000000002',
  Academy: 'a1000000-0000-0000-0000-000000000003',
}

async function collectAndImportHubspot(supabase: any, accessToken: string) {
  const baseUrl = 'https://api.hubapi.com'
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  // Fetch contacts e deals em PARALELO
  const contactProps = 'lifecyclestage,hs_lead_status,hs_marketable_status,hs_analytics_source,createdate,email,firstname,lastname,phone,company,cargo,numero_de_liderados,faixa_de_faturamento,renda_mensal,utm_source,utm_medium,utm_campaign,utm_term,mobilephone,hs_whatsapp_phone_number,city,state,address,zip,country,website,hs_linkedin_url,area_de_atuacao,notes_last_updated,hs_analytics_first_timestamp,first_conversion_event_name,first_conversion_date,hubspot_owner_id,por_qual_motivo_voce_quer_aprender_ia,qual_o_seu_objetivo_ao_participar_da_comunidade'
  const dealProps = 'dealname,dealstage,amount,tipo_do_produto,pipeline,closedate'

  // Fetch all contacts (paginated)
  const allContacts: any[] = []
  let after: string | undefined
  do {
    const res = await fetch(`${baseUrl}/crm/v3/objects/contacts?limit=100&properties=${contactProps}${after ? `&after=${after}` : ''}`, { headers })
    const data = await res.json()
    if (data.status === 'error') throw new Error(`HubSpot contacts: ${data.message}`)
    allContacts.push(...(data.results || []))
    after = data.paging?.next?.after
  } while (after)

  // Fetch all deals (paginated)
  const allDeals: any[] = []
  let dealAfter: string | undefined
  do {
    const res = await fetch(`${baseUrl}/crm/v3/objects/deals?limit=100&properties=${dealProps}&associations=contacts${dealAfter ? `&after=${dealAfter}` : ''}`, { headers })
    const data = await res.json()
    if (data.status === 'error') throw new Error(`HubSpot deals: ${data.message}`)
    allDeals.push(...(data.results || []))
    dealAfter = data.paging?.next?.after
  } while (dealAfter)

  console.log(`Fetched ${allContacts.length} contacts, ${allDeals.length} deals from HubSpot`)

  // === BATCH IMPORT CONTACTS ===
  const contactBatch = allContacts
    .filter((c: any) => c.properties?.email || c.properties?.firstname)
    .map((c: any) => ({
      hubspot_id: parseInt(c.id),
      first_name: c.properties?.firstname || c.properties?.email || 'Sem nome',
      last_name: c.properties?.lastname || null,
      email: c.properties?.email || null,
      phone: c.properties?.phone || c.properties?.mobilephone || c.properties?.hs_whatsapp_phone_number || null,
      whatsapp: c.properties?.hs_whatsapp_phone_number || c.properties?.mobilephone || c.properties?.phone || null,
      company: c.properties?.company || null,
      cargo: c.properties?.cargo || null,
      numero_de_liderados: c.properties?.numero_de_liderados || null,
      faixa_de_faturamento: c.properties?.faixa_de_faturamento || null,
      renda_mensal: c.properties?.renda_mensal || null,
      motivo_para_aprender_ia: c.properties?.por_qual_motivo_voce_quer_aprender_ia || null,
      objetivo_com_a_comunidade: c.properties?.qual_o_seu_objetivo_ao_participar_da_comunidade || null,
      lifecycle_stage: c.properties?.lifecyclestage || 'subscriber',
      lead_status: c.properties?.hs_lead_status || null,
      marketing_status: c.properties?.hs_marketable_status || null,
      city: c.properties?.city || null,
      state: c.properties?.state || null,
      address: c.properties?.address || null,
      zip_code: c.properties?.zip || null,
      country: c.properties?.country || null,
      website_url: c.properties?.website || null,
      linkedin_url: c.properties?.hs_linkedin_url || null,
      area_atuacao: c.properties?.area_de_atuacao || null,
      fonte_registro: c.properties?.hs_analytics_source || null,
      first_conversion: c.properties?.first_conversion_event_name || null,
      first_conversion_date: c.properties?.first_conversion_date || null,
      last_activity_at: c.properties?.notes_last_updated || null,
      hubspot_owner: c.properties?.hubspot_owner_id || null,
      utm_source: c.properties?.utm_source || c.properties?.hs_analytics_source || null,
      utm_medium: c.properties?.utm_medium || null,
      utm_campaign: c.properties?.utm_campaign || null,
      utm_term: c.properties?.utm_term || null,
    }))

  // Upsert contacts em batches de 500 (muito mais rápido)
  for (let i = 0; i < contactBatch.length; i += 500) {
    await supabase.from('contacts').upsert(contactBatch.slice(i, i + 500), { onConflict: 'hubspot_id' })
  }
  console.log(`Imported ${contactBatch.length} contacts`)

  // === BUILD HUBSPOT_ID -> LOCAL_ID MAP ===
  const { data: contactMap } = await supabase.from('contacts').select('id, hubspot_id')
  const hsToLocal: Record<number, string> = {}
  if (contactMap) {
    for (const c of contactMap) {
      if (c.hubspot_id) hsToLocal[c.hubspot_id] = c.id
    }
  }

  // === BATCH IMPORT DEALS ===
  const dealBatch = allDeals.map((d: any) => {
    const product = (d.properties?.tipo_do_produto || 'Business').toLowerCase()
    const pipelineId = PIPELINE_MAP[d.properties?.tipo_do_produto || 'Business'] || PIPELINE_MAP.Business
    const stageMap = STAGE_MAP[product] || STAGE_MAP.business
    const stageId = stageMap[d.properties?.dealstage || 'appointmentscheduled'] || stageMap.appointmentscheduled
    const assocId = d.associations?.contacts?.results?.[0]?.id
    const contactId = assocId ? (hsToLocal[parseInt(assocId)] || null) : null
    const isWon = d.properties?.dealstage === 'closedwon' ? true :
                   d.properties?.dealstage === 'closedlost' ? false : null
    return {
      hubspot_id: parseInt(d.id),
      name: d.properties?.dealname || 'Sem nome',
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      product,
      amount: d.properties?.amount ? parseFloat(d.properties.amount) : null,
      is_won: isWon,
      closed_at: isWon !== null ? (d.properties?.closedate || new Date().toISOString()) : null,
    }
  })

  // Upsert deals em batches de 100
  for (let i = 0; i < dealBatch.length; i += 100) {
    await supabase.from('deals').upsert(dealBatch.slice(i, i + 100), { onConflict: 'hubspot_id' })
  }
  console.log(`Imported ${dealBatch.length} deals`)

  // === MÉTRICAS para snapshot ===
  const byStage: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  for (const c of allContacts) {
    byStage[c.properties?.lifecyclestage || 'unknown'] = (byStage[c.properties?.lifecyclestage || 'unknown'] || 0) + 1
    bySource[c.properties?.hs_analytics_source || 'unknown'] = (bySource[c.properties?.hs_analytics_source || 'unknown'] || 0) + 1
  }
  const wonDeals = allDeals.filter((d: any) => d.properties?.dealstage === 'closedwon')
  const lostDeals = allDeals.filter((d: any) => d.properties?.dealstage === 'closedlost')
  const activeDeals = allDeals.filter((d: any) => d.properties?.dealstage !== 'closedwon' && d.properties?.dealstage !== 'closedlost')
  const totalDealValue = wonDeals.reduce((s: number, d: any) => s + parseFloat(d.properties?.amount || '0'), 0)
  const winRate = (wonDeals.length + lostDeals.length) > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100) : 0

  return {
    metrics: {
      totalContacts: allContacts.length, leads: byStage['lead'] || 0, subscribers: byStage['subscriber'] || 0,
      opportunities: byStage['opportunity'] || 0, customers: byStage['customer'] || 0,
      activeDeals: activeDeals.length, wonDeals: wonDeals.length, lostDeals: lostDeals.length,
      winRate: Math.round(winRate * 10) / 10, totalDealValue: Math.round(totalDealValue * 100) / 100,
    },
    byStage, bySource,
  }
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const { source = 'all' } = await req.json().catch(() => ({ source: 'all' }))
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Instagram usa Page Token (permanente), Facebook Ads usa User Token (60 dias)
    const [igToken, adsToken, igAccountId, adAccountId, hubspotToken] = await Promise.all([
      getSecret(supabase, 'INSTAGRAM_ACCESS_TOKEN'),
      getSecret(supabase, 'META_ADS_TOKEN'),
      getSecret(supabase, 'META_IG_ACCOUNT_ID'),
      getSecret(supabase, 'META_AD_ACCOUNT_ID'),
      getSecret(supabase, 'HUBSPOT_ACCESS_TOKEN'),
    ])

    console.log('Tokens:', {
      ig: igToken ? 'SET' : 'MISSING', ads: adsToken ? 'SET' : 'MISSING',
      igId: igAccountId || 'MISSING', adId: adAccountId || 'MISSING',
      hs: hubspotToken ? 'SET' : 'MISSING',
    })

    const results: Record<string, any> = {}
    const errors: string[] = []

    // Rodar TODAS as coletas em PARALELO para não estourar timeout
    const tasks: Promise<void>[] = []

    if ((source === 'all' || source === 'instagram') && igToken) {
      tasks.push(
        collectInstagram(igToken, igAccountId || '').then(data => {
          results.instagram = data
          console.log('Instagram OK')
        }).catch(err => {
          errors.push(`Instagram: ${String(err)}`)
          console.error('Instagram error:', err)
        })
      )
    } else if (source === 'all' || source === 'instagram') {
      errors.push('Instagram: Token expirado ou não configurado. Gere um novo token no Meta Developer Portal.')
    }

    if ((source === 'all' || source === 'facebook_ads') && adsToken && adAccountId) {
      tasks.push(
        collectFacebookAds(adsToken, adAccountId).then(data => {
          results.facebook_ads = data
          console.log('FB Ads OK')
        }).catch(err => {
          errors.push(`Facebook Ads: ${String(err)}`)
          console.error('FB Ads error:', err)
        })
      )
    } else if (source === 'all' || source === 'facebook_ads') {
      errors.push('Facebook Ads: Token expirado ou não configurado. Gere um novo token no Meta Developer Portal.')
    }

    if ((source === 'all' || source === 'hubspot') && hubspotToken) {
      tasks.push(
        collectAndImportHubspot(supabase, hubspotToken).then(data => {
          results.hubspot = data
          console.log('HubSpot OK')
        }).catch(err => {
          errors.push(`HubSpot: ${String(err)}`)
          console.error('HubSpot error:', err)
        })
      )
    } else if (source === 'all' || source === 'hubspot') {
      errors.push('HubSpot: token not configured')
    }

    await Promise.all(tasks)

    // Salvar snapshot
    const collected_at = new Date().toISOString()
    await supabase.from('dashboard_snapshots').insert({
      source, data: results, errors: errors.length > 0 ? errors : null, collected_at,
    })

    return new Response(
      JSON.stringify({ success: true, sources: Object.keys(results), errors, collected_at }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Collector error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
