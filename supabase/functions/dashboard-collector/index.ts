// Edge Function: Coleta dados do Instagram, Facebook Ads e HubSpot
// Armazena snapshots no banco para consumo pelo frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper para buscar secrets do vault via RPC
async function getSecret(supabase: any, name: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_secret', { secret_name: name })
    if (!error && data) return data
    console.warn(`get_secret RPC failed for ${name}:`, error?.message)
  } catch (err) {
    console.warn(`get_secret RPC exception for ${name}:`, err)
  }
  // Fallback: variável de ambiente da edge function
  return Deno.env.get(name) || null
}

// ============ INSTAGRAM COLLECTOR ============
async function collectInstagram(accessToken: string, igAccountId: string) {
  const baseUrl = 'https://graph.facebook.com/v21.0'

  // Auto-descobrir IG Business Account via Pages do token
  let resolvedIgId = igAccountId
  try {
    const pagesRes = await fetch(
      `${baseUrl}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    )
    const pagesData = await pagesRes.json()
    if (pagesData.data) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account?.id) {
          resolvedIgId = page.instagram_business_account.id
          console.log(`Auto-discovered IG account: ${resolvedIgId} from page "${page.name}" (${page.id})`)
          break
        }
      }
    }
  } catch (err) {
    console.warn('Failed to auto-discover IG account, using stored ID:', err)
  }

  // 1. Perfil
  const profileRes = await fetch(
    `${baseUrl}/${resolvedIgId}?fields=id,username,name,followers_count,media_count&access_token=${accessToken}`
  )
  const profile = await profileRes.json()
  if (profile.error) throw new Error(`Instagram profile: ${profile.error.message}`)

  // 2. Insights diários (últimos 28 dias)
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const until = new Date().toISOString().split('T')[0]

  const dailyRes = await fetch(
    `${baseUrl}/${resolvedIgId}/insights?metric=reach,follower_count&period=day&metric_type=time_series&since=${since}&until=${until}&access_token=${accessToken}`
  )
  const dailyInsights = await dailyRes.json()

  // 3. Insights totais
  const totalRes = await fetch(
    `${baseUrl}/${resolvedIgId}/insights?metric=profile_views,accounts_engaged,total_interactions,reach&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${accessToken}`
  )
  const totalInsights = await totalRes.json()

  // 4. Últimos 25 posts
  const mediaRes = await fetch(
    `${baseUrl}/${resolvedIgId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=25&access_token=${accessToken}`
  )
  const mediaData = await mediaRes.json()
  const posts = mediaData.data || []

  // 5. Insights por post (com rate limiting)
  const postsWithInsights = []
  for (const post of posts.slice(0, 15)) { // Limitar a 15 para evitar rate limit
    try {
      const metrics = post.media_type === 'VIDEO'
        ? 'reach,saved,shares,plays'
        : 'reach,saved,shares'

      const postRes = await fetch(
        `${baseUrl}/${post.id}/insights?metric=${metrics}&access_token=${accessToken}`
      )
      const postInsights = await postRes.json()

      const insightsMap: Record<string, number> = {}
      if (postInsights.data) {
        for (const metric of postInsights.data) {
          insightsMap[metric.name] = metric.values?.[0]?.value || 0
        }
      }

      postsWithInsights.push({
        ...post,
        reach: insightsMap.reach || 0,
        saved: insightsMap.saved || 0,
        shares: insightsMap.shares || 0,
        plays: insightsMap.plays || 0,
      })
    } catch {
      postsWithInsights.push({ ...post, reach: 0, saved: 0, shares: 0, plays: 0 })
    }
    // Rate limiting: 200ms entre requests
    await new Promise(r => setTimeout(r, 200))
  }

  // Extrair insights diários
  const dailyReach = dailyInsights.data?.find((d: any) => d.name === 'reach')?.values || []
  const dailyFollowers = dailyInsights.data?.find((d: any) => d.name === 'follower_count')?.values || []

  // Extrair totais
  const totals: Record<string, number> = {}
  if (totalInsights.data) {
    for (const metric of totalInsights.data) {
      totals[metric.name] = metric.total_value?.value || 0
    }
  }

  // Calcular métricas agregadas
  const totalLikes = postsWithInsights.reduce((s, p) => s + (p.like_count || 0), 0)
  const totalComments = postsWithInsights.reduce((s, p) => s + (p.comments_count || 0), 0)
  const totalReach = postsWithInsights.reduce((s, p) => s + (p.reach || 0), 0)
  const totalSaved = postsWithInsights.reduce((s, p) => s + (p.saved || 0), 0)
  const totalShares = postsWithInsights.reduce((s, p) => s + (p.shares || 0), 0)
  const totalViews = postsWithInsights.reduce((s, p) => s + (p.plays || 0), 0)
  const avgEngagement = postsWithInsights.length > 0
    ? ((totalLikes + totalComments) / postsWithInsights.length / (profile.followers_count || 1) * 100)
    : 0

  return {
    profile: {
      username: profile.username,
      name: profile.name,
      followers: profile.followers_count,
      mediaCount: profile.media_count,
    },
    metrics: {
      followers: profile.followers_count || 0,
      totalReach,
      totalViews,
      totalSaved,
      totalShares,
      totalLikes,
      totalComments,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      profileViews: totals.profile_views || 0,
      accountsEngaged: totals.accounts_engaged || 0,
    },
    posts: postsWithInsights,
    dailyReach,
    dailyFollowers,
  }
}

// ============ FACEBOOK ADS COLLECTOR ============
async function collectFacebookAds(adsToken: string, adAccountId: string) {
  const baseUrl = 'https://graph.facebook.com/v21.0'

  // 1. Campanhas
  const campaignsRes = await fetch(
    `${baseUrl}/${adAccountId}/campaigns?fields=id,name,status,objective&limit=50&access_token=${adsToken}`
  )
  const campaignsData = await campaignsRes.json()
  if (campaignsData.error) throw new Error(`FB Ads campaigns: ${campaignsData.error.message}`)
  const campaigns = campaignsData.data || []

  // 2. Insights por campanha (últimos 30 dias)
  const insightsRes = await fetch(
    `${baseUrl}/${adAccountId}/insights?fields=campaign_name,campaign_id,spend,impressions,reach,clicks,ctr,actions,cost_per_action_type&date_preset=last_30d&level=campaign&limit=50&access_token=${adsToken}`
  )
  const insightsData = await insightsRes.json()
  const insights = insightsData.data || []

  // Mapear insights por campanha
  const campaignsWithInsights = campaigns.map((c: any) => {
    const insight = insights.find((i: any) => i.campaign_id === c.id) || {}
    const actions = insight.actions || []
    const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0
    const costPerLead = insight.cost_per_action_type?.find((a: any) => a.action_type === 'lead')?.value || 0

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spend: parseFloat(insight.spend || '0'),
      impressions: parseInt(insight.impressions || '0'),
      reach: parseInt(insight.reach || '0'),
      clicks: parseInt(insight.clicks || '0'),
      ctr: parseFloat(insight.ctr || '0'),
      leads: parseInt(leads),
      costPerLead: parseFloat(costPerLead),
    }
  })

  // Totais
  const totalSpend = campaignsWithInsights.reduce((s: number, c: any) => s + c.spend, 0)
  const totalImpressions = campaignsWithInsights.reduce((s: number, c: any) => s + c.impressions, 0)
  const totalReach = campaignsWithInsights.reduce((s: number, c: any) => s + c.reach, 0)
  const totalClicks = campaignsWithInsights.reduce((s: number, c: any) => s + c.clicks, 0)
  const totalLeads = campaignsWithInsights.reduce((s: number, c: any) => s + c.leads, 0)
  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0

  return {
    campaigns: campaignsWithInsights,
    metrics: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalImpressions,
      totalReach,
      totalClicks,
      totalLeads,
      avgCPL: Math.round(avgCPL * 100) / 100,
      avgCTR: Math.round(avgCTR * 100) / 100,
    },
  }
}

// ============ HUBSPOT COLLECTOR ============
async function collectHubspot(accessToken: string) {
  const baseUrl = 'https://api.hubapi.com'
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  // 1. Contatos com propriedades
  const allContacts: any[] = []
  let after: string | undefined
  do {
    const url = `${baseUrl}/crm/v3/objects/contacts?limit=100&properties=lifecyclestage,hs_analytics_source,createdate,email,firstname,lastname,phone,company${after ? `&after=${after}` : ''}`
    const res = await fetch(url, { headers })
    const data = await res.json()
    if (data.status === 'error') throw new Error(`HubSpot contacts: ${data.message}`)
    allContacts.push(...(data.results || []))
    after = data.paging?.next?.after
    await new Promise(r => setTimeout(r, 150))
  } while (after)

  // 2. Deals
  const dealsRes = await fetch(
    `${baseUrl}/crm/v3/objects/deals?limit=100&properties=dealstage,amount,closedate,pipeline,dealname`,
    { headers }
  )
  const dealsData = await dealsRes.json()
  const deals = dealsData.results || []

  // Agregar por lifecycle stage
  const byStage: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  for (const contact of allContacts) {
    const stage = contact.properties?.lifecyclestage || 'unknown'
    byStage[stage] = (byStage[stage] || 0) + 1
    const source = contact.properties?.hs_analytics_source || 'unknown'
    bySource[source] = (bySource[source] || 0) + 1
  }

  // Deals metrics
  const wonDeals = deals.filter((d: any) => d.properties?.dealstage === 'closedwon')
  const lostDeals = deals.filter((d: any) => d.properties?.dealstage === 'closedlost')
  const activeDeals = deals.filter((d: any) =>
    d.properties?.dealstage !== 'closedwon' && d.properties?.dealstage !== 'closedlost'
  )
  const totalDealValue = wonDeals.reduce((s: number, d: any) => s + parseFloat(d.properties?.amount || '0'), 0)
  const winRate = (wonDeals.length + lostDeals.length) > 0
    ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100)
    : 0

  return {
    contacts: allContacts.map((c: any) => ({
      id: c.id,
      email: c.properties?.email,
      firstname: c.properties?.firstname,
      lastname: c.properties?.lastname,
      phone: c.properties?.phone,
      company: c.properties?.company,
      lifecyclestage: c.properties?.lifecyclestage,
      source: c.properties?.hs_analytics_source,
      createdate: c.properties?.createdate,
    })),
    metrics: {
      totalContacts: allContacts.length,
      leads: byStage['lead'] || 0,
      subscribers: byStage['subscriber'] || 0,
      opportunities: byStage['opportunity'] || 0,
      customers: byStage['customer'] || 0,
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      winRate: Math.round(winRate * 10) / 10,
      totalDealValue: Math.round(totalDealValue * 100) / 100,
    },
    byStage,
    bySource,
    deals: deals.map((d: any) => ({
      id: d.id,
      name: d.properties?.dealname,
      stage: d.properties?.dealstage,
      amount: parseFloat(d.properties?.amount || '0'),
      closedate: d.properties?.closedate,
    })),
  }
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { source = 'all' } = await req.json().catch(() => ({ source: 'all' }))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Buscar tokens do vault via RPC
    const [igToken, igAccountId, adAccountId, hubspotToken] = await Promise.all([
      getSecret(supabase, 'INSTAGRAM_ACCESS_TOKEN'),
      getSecret(supabase, 'META_IG_ACCOUNT_ID'),
      getSecret(supabase, 'META_AD_ACCOUNT_ID'),
      getSecret(supabase, 'HUBSPOT_ACCESS_TOKEN'),
    ])

    console.log('Tokens loaded:', {
      igToken: igToken ? `${igToken.substring(0, 10)}...(${igToken.length} chars)` : 'NOT FOUND',
      igAccountId: igAccountId || 'NOT FOUND',
      adAccountId: adAccountId || 'NOT FOUND',
      hubspotToken: hubspotToken ? 'SET' : 'NOT FOUND',
    })

    const results: Record<string, any> = {}
    const errors: string[] = []

    // Coletar Instagram (igAccountId é opcional — auto-discover via me/accounts)
    if ((source === 'all' || source === 'instagram') && igToken) {
      try {
        results.instagram = await collectInstagram(igToken, igAccountId || '')
        console.log('Instagram collected successfully')
      } catch (err) {
        errors.push(`Instagram: ${String(err)}`)
        console.error('Instagram error:', err)
      }
    } else if (source === 'all' || source === 'instagram') {
      errors.push('Instagram: access token not configured')
    }

    // Coletar Facebook Ads (usa o mesmo token do Instagram como fallback)
    if ((source === 'all' || source === 'facebook_ads') && igToken && adAccountId) {
      try {
        // Facebook Ads precisa de User Token, mas vamos tentar com o Page Token
        // Se falhar, registrar erro
        results.facebook_ads = await collectFacebookAds(igToken, adAccountId)
        console.log('Facebook Ads collected successfully')
      } catch (err) {
        errors.push(`Facebook Ads: ${String(err)}`)
        console.error('Facebook Ads error:', err)
      }
    } else if (source === 'all' || source === 'facebook_ads') {
      errors.push('Facebook Ads: tokens not configured')
    }

    // Coletar HubSpot
    if ((source === 'all' || source === 'hubspot') && hubspotToken) {
      try {
        results.hubspot = await collectHubspot(hubspotToken)
        console.log('HubSpot collected successfully')

        // Importar contatos do HubSpot para a tabela contacts do CRM
        if (results.hubspot.contacts?.length > 0) {
          for (const contact of results.hubspot.contacts) {
            if (!contact.email && !contact.firstname) continue

            // Upsert por hubspot_id
            await supabase
              .from('contacts')
              .upsert({
                hubspot_id: parseInt(contact.id),
                first_name: contact.firstname || contact.email || 'HubSpot Lead',
                last_name: contact.lastname || null,
                email: contact.email || null,
                phone: contact.phone || null,
                company: contact.company || null,
                utm_source: contact.source || null,
              }, { onConflict: 'hubspot_id' })
          }
          console.log(`Imported ${results.hubspot.contacts.length} contacts from HubSpot`)
        }
      } catch (err) {
        errors.push(`HubSpot: ${String(err)}`)
        console.error('HubSpot error:', err)
      }
    } else if (source === 'all' || source === 'hubspot') {
      errors.push('HubSpot: token not configured')
    }

    // Salvar snapshot no banco
    const snapshot = {
      source,
      data: results,
      errors: errors.length > 0 ? errors : null,
      collected_at: new Date().toISOString(),
    }

    await supabase.from('dashboard_snapshots').insert(snapshot)

    return new Response(
      JSON.stringify({
        success: true,
        sources: Object.keys(results),
        errors,
        collected_at: snapshot.collected_at,
      }),
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
