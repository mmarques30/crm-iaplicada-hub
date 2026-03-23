// Edge Function: Webhook para responder comentários do Instagram e enviar DM
// v12: Corrige matching, API endpoints, resolve post_id, logging robusto

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const GRAPH_API = 'https://graph.facebook.com/v21.0'

interface WebhookEntry {
  id: string
  time: number
  messaging?: Array<{
    sender: { id: string }
    recipient: { id: string }
    message?: { text: string }
  }>
  changes?: Array<{
    field: string
    value: {
      item: string
      comment_id: string
      from: { id: string; username: string }
      media: { id: string; media_product_type: string }
      text: string
      verb: string
      parent_id?: string
    }
  }>
}

interface WebhookBody {
  object: string
  entry: WebhookEntry[]
}

async function getAccessToken(supabase: any): Promise<string | null> {
  try {
    const { data } = await supabase.rpc('get_secret', { secret_name: 'INSTAGRAM_ACCESS_TOKEN' })
    if (data) return data
  } catch {}
  return Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || null
}

// Extrair shortcode da URL do Instagram
function extractShortcode(url: string): string | null {
  const match = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

// Resolver post_url para media_id via Instagram API
async function resolvePostId(postUrl: string, accessToken: string, igAccountId: string): Promise<string | null> {
  const shortcode = extractShortcode(postUrl)
  if (!shortcode) return null

  try {
    // Buscar media do IG account e encontrar pelo shortcode
    let after = ''
    for (let page = 0; page < 5; page++) {
      const url = `${GRAPH_API}/${igAccountId}/media?fields=id,shortcode&limit=50${after ? `&after=${after}` : ''}&access_token=${accessToken}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error || !data.data) break

      const found = data.data.find((m: any) => m.shortcode === shortcode)
      if (found) return found.id

      after = data.paging?.cursors?.after
      if (!after) break
    }
  } catch (err) {
    console.error('Error resolving post_id:', err)
  }
  return null
}

// Responder um comentário no Instagram
async function replyToComment(commentId: string, message: string, accessToken: string): Promise<{ success: boolean; data: any }> {
  try {
    const res = await fetch(`${GRAPH_API}/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message, access_token: accessToken }).toString(),
    })
    const data = await res.json()
    console.log('Comment reply result:', JSON.stringify(data))
    return { success: !data.error, data }
  } catch (err) {
    console.error('Error replying to comment:', err)
    return { success: false, data: { error: String(err) } }
  }
}

// Enviar DM no Instagram
async function sendDM(recipientId: string, message: string, accessToken: string, igAccountId: string): Promise<{ success: boolean; data: any }> {
  try {
    const res = await fetch(`${GRAPH_API}/${igAccountId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken,
      }),
    })
    const data = await res.json()
    console.log('DM result:', JSON.stringify(data))
    return { success: !data.error, data }
  } catch (err) {
    console.error('Error sending DM:', err)
    return { success: false, data: { error: String(err) } }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Webhook verification (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    const verifyToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN')

    console.log(`Webhook verify: mode=${mode}, token_match=${token === verifyToken}`)

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified OK')
      return new Response(challenge, { status: 200, headers: corsHeaders })
    }
    return new Response('Forbidden', { status: 403, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    console.log('Webhook POST received:', rawBody.substring(0, 500))

    const body: WebhookBody = JSON.parse(rawBody)

    // Instagram webhooks devem ter object = "instagram"
    if (body.object !== 'instagram') {
      console.log(`Ignoring non-instagram webhook: ${body.object}`)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const accessToken = await getAccessToken(supabase)
    if (!accessToken) {
      console.error('INSTAGRAM_ACCESS_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'Token not configured' }), {
        status: 200, // Return 200 to avoid Meta retrying
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get IG Account ID for DM sending
    let igAccountId = Deno.env.get('META_IG_ACCOUNT_ID') || null
    try {
      const { data } = await supabase.rpc('get_secret', { secret_name: 'META_IG_ACCOUNT_ID' })
      if (data) igAccountId = data
    } catch {}

    for (const entry of body.entry) {
      // Processar changes (comentários)
      if (entry.changes) {
        for (const change of entry.changes) {
          console.log(`Change: field=${change.field}, verb=${change.value?.verb}, item=${change.value?.item}`)

          // Só processar novos comentários (não replies a replies, não edits/removes)
          if (change.field !== 'comments') continue
          if (change.value.verb !== 'add') continue
          if (change.value.item !== 'comment') continue

          // Ignorar replies a replies (parent_id presente = é uma resposta a outro comentário)
          if (change.value.parent_id) {
            console.log(`Skipping reply-to-reply (parent_id: ${change.value.parent_id})`)
            continue
          }

          const { comment_id, from, media, text } = change.value
          const mediaId = media?.id

          console.log(`>>> New comment from @${from.username}: "${text}" on media ${mediaId}`)

          // Verificar se já respondemos
          const { data: existingLog } = await supabase
            .from('instagram_comment_logs')
            .select('id')
            .eq('comment_id', comment_id)
            .maybeSingle()

          if (existingLog) {
            console.log(`Comment ${comment_id} already processed, skipping`)
            continue
          }

          // Buscar automações ativas
          const { data: automations } = await supabase
            .from('instagram_automations')
            .select('*')
            .eq('is_active', true)

          if (!automations || automations.length === 0) {
            console.log('No active automations found')
            continue
          }

          // Encontrar automação correspondente
          let matchedAutomation = null
          const commentLower = text.toLowerCase().trim()

          for (const auto of automations) {
            let postMatch = false

            // Match por post_id (direto)
            if (auto.post_id && mediaId && auto.post_id === mediaId) {
              postMatch = true
            }

            // Match por shortcode na URL (fallback se post_id não bateu)
            if (!postMatch && auto.post_url && mediaId) {
              // Se não tem post_id, tentar resolver e salvar
              if (!auto.post_id && igAccountId) {
                const resolvedId = await resolvePostId(auto.post_url, accessToken, igAccountId)
                if (resolvedId) {
                  console.log(`Resolved post_id: ${resolvedId} for URL ${auto.post_url}`)
                  await supabase.from('instagram_automations').update({ post_id: resolvedId }).eq('id', auto.id)
                  if (resolvedId === mediaId) postMatch = true
                }
              }
            }

            if (!postMatch) continue

            // Se tem keyword, verificar match
            if (auto.keyword && auto.keyword.trim() !== '') {
              const keywords = auto.keyword.toLowerCase().split(',').map((k: string) => k.trim()).filter((k: string) => k)
              if (keywords.some((kw: string) => commentLower.includes(kw))) {
                matchedAutomation = auto
                break
              }
            } else {
              // Sem keyword — responde a todos os comentários neste post
              matchedAutomation = auto
              break
            }
          }

          if (!matchedAutomation) {
            console.log(`No matching automation for "${text}" on media ${mediaId}`)
            continue
          }

          console.log(`Matched automation: ${matchedAutomation.id} (keyword: ${matchedAutomation.keyword})`)

          // 1. Responder o comentário
          const replyResult = await replyToComment(comment_id, matchedAutomation.comment_reply, accessToken)

          // 2. Enviar DM
          let dmSent = false
          if (matchedAutomation.dm_message && igAccountId) {
            let dmText = matchedAutomation.dm_message
            if (matchedAutomation.dm_link) {
              dmText += `\n\n${matchedAutomation.dm_link}`
            }
            const dmResult = await sendDM(from.id, dmText, accessToken, igAccountId)
            dmSent = dmResult.success
          }

          // 3. Registrar log
          await supabase.from('instagram_comment_logs').insert({
            automation_id: matchedAutomation.id,
            comment_id,
            commenter_username: from.username,
            commenter_ig_id: from.id,
            comment_text: text,
            dm_sent: dmSent,
          })

          // 4. Incrementar contador
          await supabase
            .from('instagram_automations')
            .update({ replies_count: (matchedAutomation.replies_count || 0) + 1 })
            .eq('id', matchedAutomation.id)

          // 5. Criar/atualizar contato no CRM
          try {
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('manychat_id', `ig_${from.id}`)
              .maybeSingle()

            let contactId = existingContact?.id

            if (!contactId) {
              const { data: newContact } = await supabase
                .from('contacts')
                .insert({
                  first_name: from.username,
                  manychat_id: `ig_${from.id}`,
                  utm_source: 'instagram',
                  utm_medium: 'comment',
                })
                .select('id')
                .single()
              contactId = newContact?.id
            }

            if (contactId) {
              await supabase.from('activities').insert({
                contact_id: contactId,
                type: 'note',
                direction: 'inbound',
                subject: 'Comentário no Instagram',
                body: text,
                metadata: {
                  source: 'instagram',
                  comment_id,
                  media_id: mediaId,
                  username: from.username,
                  dm_sent: dmSent,
                  reply_success: replyResult.success,
                },
              })

              await supabase
                .from('instagram_comment_logs')
                .update({ contact_id: contactId })
                .eq('comment_id', comment_id)
            }
          } catch (err) {
            console.error('Error creating contact:', err)
          }

          console.log(`>>> Processed: reply=${replyResult.success}, dm=${dmSent}`)
        }
      }
    }

    // Sempre retornar 200 para o Meta não ficar reenviando
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    // Retorna 200 mesmo com erro para o Meta não desativar o webhook
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
