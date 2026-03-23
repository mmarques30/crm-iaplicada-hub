// Edge Function: Webhook para responder comentários do Instagram e enviar DM
// Funciona como o ManyChat — cadastra automações por post, responde comentários e envia DM com link

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

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
    }
  }>
}

interface WebhookBody {
  object: string
  entry: WebhookEntry[]
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Webhook verification (GET) — Meta envia um challenge para verificar o endpoint
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    const verifyToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN')

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified')
      return new Response(challenge, { status: 200, headers: corsHeaders })
    }
    return new Response('Forbidden', { status: 403, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body: WebhookBody = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Buscar token do vault via RPC, com fallback para env var
    let accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || null
    try {
      const { data, error } = await supabase.rpc('get_secret', { secret_name: 'INSTAGRAM_ACCESS_TOKEN' })
      if (!error && data) accessToken = data
    } catch (err) {
      console.warn('Failed to get token from vault, using env var:', err)
    }

    if (!accessToken) {
      console.error('INSTAGRAM_ACCESS_TOKEN not configured (neither vault nor env)')
      return new Response(JSON.stringify({ error: 'Token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Processar cada entry do webhook
    for (const entry of body.entry) {
      if (!entry.changes) continue

      for (const change of entry.changes) {
        // Só processar comentários novos
        if (change.field !== 'comments' || change.value.verb !== 'add') continue
        if (change.value.item !== 'comment') continue

        const { comment_id, from, media, text } = change.value
        const mediaId = media.id

        console.log(`New comment from @${from.username}: "${text}" on media ${mediaId}`)

        // Verificar se já respondemos este comentário
        const { data: existingLog } = await supabase
          .from('instagram_comment_logs')
          .select('id')
          .eq('comment_id', comment_id)
          .single()

        if (existingLog) {
          console.log(`Comment ${comment_id} already processed, skipping`)
          continue
        }

        // Buscar automações ativas para este media
        const { data: automations } = await supabase
          .from('instagram_automations')
          .select('*')
          .eq('is_active', true)

        if (!automations || automations.length === 0) {
          console.log('No active automations found')
          continue
        }

        // Encontrar automação correspondente (por post_id ou keyword match)
        let matchedAutomation = null

        for (const auto of automations) {
          // Match por post_id (media_id do Instagram)
          if (auto.post_id && auto.post_id === mediaId) {
            // Se tem keyword, verificar se o comentário contém a keyword
            if (auto.keyword && auto.keyword.trim() !== '') {
              const keywords = auto.keyword.toLowerCase().split(',').map((k: string) => k.trim())
              const commentLower = text.toLowerCase()
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

          // Match por URL do post (fallback)
          if (!auto.post_id && auto.post_url) {
            // Se tem keyword, verificar
            if (auto.keyword && auto.keyword.trim() !== '') {
              const keywords = auto.keyword.toLowerCase().split(',').map((k: string) => k.trim())
              const commentLower = text.toLowerCase()
              if (keywords.some((kw: string) => commentLower.includes(kw))) {
                matchedAutomation = auto
                break
              }
            }
          }
        }

        if (!matchedAutomation) {
          console.log(`No matching automation for comment "${text}" on media ${mediaId}`)
          continue
        }

        console.log(`Matched automation: ${matchedAutomation.id}`)

        // 1. Responder o comentário
        try {
          const replyResponse = await fetch(
            `https://graph.instagram.com/v21.0/${comment_id}/replies`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: matchedAutomation.comment_reply,
                access_token: accessToken,
              }),
            }
          )
          const replyData = await replyResponse.json()
          console.log('Comment reply result:', JSON.stringify(replyData))
        } catch (err) {
          console.error('Error replying to comment:', err)
        }

        // 2. Enviar DM com o link/mensagem
        let dmSent = false
        try {
          // Montar mensagem da DM
          let dmText = matchedAutomation.dm_message
          if (matchedAutomation.dm_link) {
            dmText += `\n\n${matchedAutomation.dm_link}`
          }

          const dmResponse = await fetch(
            `https://graph.instagram.com/v21.0/me/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: from.id },
                message: { text: dmText },
                access_token: accessToken,
              }),
            }
          )
          const dmData = await dmResponse.json()
          console.log('DM result:', JSON.stringify(dmData))
          dmSent = !dmData.error
        } catch (err) {
          console.error('Error sending DM:', err)
        }

        // 3. Registrar no log
        await supabase.from('instagram_comment_logs').insert({
          automation_id: matchedAutomation.id,
          comment_id,
          commenter_username: from.username,
          commenter_ig_id: from.id,
          comment_text: text,
          dm_sent: dmSent,
        })

        // 4. Incrementar contador de replies
        await supabase.rpc('increment_replies_count', { automation_uuid: matchedAutomation.id })
          .then(() => {})
          .catch(async () => {
            // Fallback: update manual
            await supabase
              .from('instagram_automations')
              .update({ replies_count: (matchedAutomation.replies_count || 0) + 1 })
              .eq('id', matchedAutomation.id)
          })

        // 5. Criar contato no CRM (se não existir)
        try {
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('manychat_id', `ig_${from.id}`)
            .single()

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
            // Registrar atividade na timeline
            await supabase.from('activities').insert({
              contact_id: contactId,
              type: 'note',
              direction: 'inbound',
              subject: `Comentário no Instagram`,
              body: text,
              metadata: {
                source: 'instagram',
                comment_id,
                media_id: mediaId,
                username: from.username,
                dm_sent: dmSent,
              },
            })

            // Atualizar log com contact_id
            await supabase
              .from('instagram_comment_logs')
              .update({ contact_id: contactId })
              .eq('comment_id', comment_id)
          }
        } catch (err) {
          console.error('Error creating contact:', err)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
