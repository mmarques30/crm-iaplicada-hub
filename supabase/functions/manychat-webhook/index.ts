// Edge Function: Webhook para receber eventos do ManyChat
// Registra mensagens WhatsApp na timeline do contato e pode avancar estagio do deal

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ManyChatEvent {
  subscriber_id: string
  phone?: string
  email?: string
  first_name?: string
  last_name?: string
  message?: string
  flow_name?: string
  custom_fields?: Record<string, string>
}

Deno.serve(async (req) => {
  // Verificar metodo
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verificar API key
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = Deno.env.get('MANYCHAT_WEBHOOK_SECRET')
  if (expectedKey && apiKey !== expectedKey) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const event: ManyChatEvent = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Buscar contato por telefone, email ou manychat_id
    let contact = null

    if (event.subscriber_id) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('manychat_id', event.subscriber_id)
        .single()
      contact = data
    }

    if (!contact && event.phone) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone', event.phone)
        .single()
      contact = data
    }

    if (!contact && event.email) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', event.email)
        .single()
      contact = data
    }

    // Se contato nao existe, criar um novo
    if (!contact) {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          first_name: event.first_name || 'WhatsApp Lead',
          last_name: event.last_name || null,
          phone: event.phone || null,
          email: event.email || null,
          manychat_id: event.subscriber_id,
          whatsapp_opt_in: true,
        })
        .select()
        .single()

      if (error) throw error
      contact = data
    } else {
      // Atualizar manychat_id e opt-in se necessario
      await supabase
        .from('contacts')
        .update({
          manychat_id: event.subscriber_id,
          whatsapp_opt_in: true,
        })
        .eq('id', contact.id)
    }

    // Registrar atividade na timeline
    await supabase.from('activities').insert({
      contact_id: contact.id,
      type: 'whatsapp',
      direction: 'inbound',
      subject: event.flow_name || 'Mensagem WhatsApp',
      body: event.message || null,
      metadata: {
        subscriber_id: event.subscriber_id,
        flow_name: event.flow_name,
        custom_fields: event.custom_fields,
      },
    })

    // Verificar se tem deal em "Contato Iniciado" e avancar para "Conectado"
    const { data: deals } = await supabase
      .from('deals')
      .select('id, stage_id, pipeline_id')
      .eq('contact_id', contact.id)
      .is('is_won', null)

    if (deals && deals.length > 0) {
      for (const deal of deals) {
        // Buscar estagio "Contato Iniciado" do pipeline
        const { data: contatoIniciadoStage } = await supabase
          .from('stages')
          .select('id')
          .eq('pipeline_id', deal.pipeline_id)
          .eq('name', 'Contato Iniciado')
          .single()

        if (contatoIniciadoStage && deal.stage_id === contatoIniciadoStage.id) {
          // Buscar estagio "Conectado" do pipeline
          const { data: conectadoStage } = await supabase
            .from('stages')
            .select('id')
            .eq('pipeline_id', deal.pipeline_id)
            .eq('name', 'Conectado')
            .single()

          if (conectadoStage) {
            await supabase
              .from('deals')
              .update({
                stage_id: conectadoStage.id,
                stage_entered_at: new Date().toISOString(),
                ultimo_contato: new Date().toISOString(),
              })
              .eq('id', deal.id)
          }
        }

        // Atualizar ultimo_contato em qualquer caso
        await supabase
          .from('deals')
          .update({ ultimo_contato: new Date().toISOString() })
          .eq('id', deal.id)

        // Vincular atividade ao deal
        await supabase
          .from('activities')
          .update({ deal_id: deal.id })
          .eq('contact_id', contact.id)
          .eq('type', 'whatsapp')
          .is('deal_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      contact_id: contact.id,
      message: 'Evento processado com sucesso',
    }))
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
