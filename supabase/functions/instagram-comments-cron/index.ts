// Edge Function: Polling de comentários do Instagram para processar automações
// Alternativa ao webhook — busca comentários recentes nos posts cadastrados via Graph API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Buscar token do Instagram (tenta múltiplas fontes)
    let accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || null
    try {
      const { data, error } = await supabase.rpc('get_secret', { secret_name: 'INSTAGRAM_ACCESS_TOKEN_V3' })
      if (!error && data) accessToken = data
    } catch (err) {
      console.warn('Failed to get token from vault, using env var:', err)
    }
    if (!accessToken) {
      try {
        const { data } = await supabase.rpc('get_secret', { secret_name: 'INSTAGRAM_ACCESS_TOKEN' })
        if (data) accessToken = data
      } catch {}
    }

    // Get IG Account ID for DM endpoint
    let igAccountId = Deno.env.get('META_IG_ACCOUNT_ID') || null
    if (!igAccountId) {
      try {
        const { data } = await supabase.rpc('get_secret', { secret_name: 'META_IG_ACCOUNT_ID' })
        if (data) igAccountId = data
      } catch {}
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'INSTAGRAM_ACCESS_TOKEN não configurado. Vá em Configurações > Instagram para adicionar o token.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar automações ativas
    const { data: automations, error: autoError } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('is_active', true)

    if (autoError) throw autoError

    if (!automations || automations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma automação ativa', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: any[] = []

    for (const auto of automations) {
      const mediaId = auto.post_id
      if (!mediaId) {
        results.push({ automation_id: auto.id, error: 'post_id (Media ID) não preenchido', processed: 0 })
        continue
      }

      try {
        // Buscar comentários recentes do post via Graph API
        const commentsUrl = `https://graph.instagram.com/v21.0/${mediaId}/comments?fields=id,text,from{id,username},timestamp&limit=50&access_token=${accessToken}`
        const commentsResp = await fetch(commentsUrl)
        const commentsData = await commentsResp.json()

        if (commentsData.error) {
          results.push({
            automation_id: auto.id,
            error: commentsData.error.message || 'Erro ao buscar comentários',
            processed: 0,
          })
          continue
        }

        const comments = commentsData.data || []
        let processed = 0

        for (const comment of comments) {
          const commentId = comment.id
          const from = comment.from
          const text = comment.text

          if (!from || !from.id || !from.username) continue

          // Verificar se já processamos este comentário
          const { data: existingLog } = await supabase
            .from('instagram_comment_logs')
            .select('id')
            .eq('comment_id', commentId)
            .single()

          if (existingLog) continue

          // Verificar keyword (se configurada)
          if (auto.keyword && auto.keyword.trim() !== '') {
            const keywords = auto.keyword.toLowerCase().split(',').map((k: string) => k.trim())
            const commentLower = text.toLowerCase()
            if (!keywords.some((kw: string) => commentLower.includes(kw))) continue
          }

          console.log(`Processing comment ${commentId} from @${from.username}: "${text}"`)

          // 1. Responder o comentário
          try {
            const replyResp = await fetch(
              `https://graph.instagram.com/v21.0/${commentId}/replies`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: auto.comment_reply,
                  access_token: accessToken,
                }),
              }
            )
            const replyData = await replyResp.json()
            console.log('Reply result:', JSON.stringify(replyData))
          } catch (err) {
            console.error('Error replying to comment:', err)
          }

          // 2. Enviar DM
          let dmSent = false
          let dmError = ''
          try {
            let dmText = auto.dm_message
            if (auto.dm_link) {
              dmText += `\n\n${auto.dm_link}`
            }

            // Use IG Account ID for Instagram DM endpoint
            const dmEndpoint = igAccountId
              ? `https://graph.instagram.com/v21.0/${igAccountId}/messages`
              : `https://graph.instagram.com/v21.0/me/messages`

            const dmResp = await fetch(
              dmEndpoint,
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
            const dmData = await dmResp.json()
            console.log('DM result:', JSON.stringify(dmData))
            if (dmData.error) {
              dmError = dmData.error.message || dmData.error.error_user_msg || JSON.stringify(dmData.error)
            } else if (dmData.error_message) {
              dmError = dmData.error_message
            } else if (dmResp.status >= 400) {
              dmError = `HTTP ${dmResp.status}: ${JSON.stringify(dmData)}`
            } else {
              dmSent = true
            }
          } catch (err) {
            dmError = String(err)
            console.error('Error sending DM:', err)
          }

          // 3. Registrar no log
          await supabase.from('instagram_comment_logs').insert({
            automation_id: auto.id,
            comment_id: commentId,
            commenter_username: from.username,
            commenter_ig_id: from.id,
            comment_text: text,
            dm_sent: dmSent,
            dm_error: dmError || null,
          })

          // 4. Incrementar contador atomicamente
          await supabase.rpc('increment_replies_count', { automation_uuid: auto.id })

          // 5. Criar/vincular contato no CRM
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
                  instagram_opt_in: true,
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
                  comment_id: commentId,
                  media_id: mediaId,
                  username: from.username,
                  dm_sent: dmSent,
                },
              })

              // Vincular log ao contato
              await supabase
                .from('instagram_comment_logs')
                .update({ contact_id: contactId })
                .eq('comment_id', commentId)
            }
          } catch (err) {
            console.error('Error creating contact:', err)
          }

          processed++
        }

        results.push({ automation_id: auto.id, post_id: mediaId, processed })
      } catch (err) {
        results.push({ automation_id: auto.id, error: String(err), processed: 0 })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cron error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
