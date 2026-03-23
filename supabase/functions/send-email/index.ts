// Edge Function: Enviar email via Gmail API
// Usado para nurturing sequences e emails individuais

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SendEmailRequest {
  to: string
  subject: string
  body_html: string
  contact_id?: string
  deal_id?: string
}

Deno.serve(async (req) => {
  try {
    const payload: SendEmailRequest = await req.json()
    if (!payload.to || !payload.subject || !payload.body_html) {
      return new Response(JSON.stringify({ error: 'to, subject, and body_html are required' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Enviar email via Gmail API
    const googleAccessToken = Deno.env.get('GOOGLE_ACCESS_TOKEN')
    if (!googleAccessToken) {
      return new Response(JSON.stringify({ error: 'Gmail not configured' }), { status: 503 })
    }

    // Construir mensagem RFC 2822
    const message = [
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      payload.body_html,
    ].join('\r\n')

    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    })

    if (!gmailRes.ok) {
      const error = await gmailRes.text()
      throw new Error(`Gmail API error: ${error}`)
    }

    const gmailData = await gmailRes.json()

    // Registrar atividade no CRM
    if (payload.contact_id || payload.deal_id) {
      await supabase.from('activities').insert({
        contact_id: payload.contact_id || null,
        deal_id: payload.deal_id || null,
        type: 'email',
        direction: 'outbound',
        subject: payload.subject,
        body: payload.body_html,
        metadata: { gmail_message_id: gmailData.id },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      gmail_message_id: gmailData.id,
    }))
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
