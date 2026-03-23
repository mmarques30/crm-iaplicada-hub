// Edge Function: Receber submissões de formulário da LP
// Fluxo completo: Validar → Criar/Atualizar Contato → Criar Deal → Qualificar → Notificar
//
// POST /functions/v1/form-submit
// Body: { form_slug: "academy", fields: { firstname: "...", email: "...", ... }, utm: { source, medium, campaign, term }, meta: { referrer, page_url, user_agent } }
//
// Também aceita form-urlencoded para compatibilidade com formulários HTML nativos
// POST /functions/v1/form-submit?slug=academy
// firstname=João&email=joao@email.com&utm_source=instagram&...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FormPayload {
  form_slug?: string
  fields?: Record<string, string>
  utm?: { source?: string; medium?: string; campaign?: string; term?: string }
  meta?: { referrer?: string; page_url?: string; user_agent?: string }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Parse body - support JSON and form-urlencoded
    let payload: FormPayload = {}
    const contentType = req.headers.get('content-type') || ''
    const url = new URL(req.url)

    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      // Form-urlencoded from native HTML forms
      const formData = await req.formData()
      const fields: Record<string, string> = {}
      const utm: Record<string, string> = {}

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('utm_')) {
          utm[key.replace('utm_', '')] = String(value)
        } else {
          fields[key] = String(value)
        }
      }

      payload = {
        form_slug: url.searchParams.get('slug') || fields['form_slug'] || '',
        fields,
        utm: { source: utm.source, medium: utm.medium, campaign: utm.campaign, term: utm.term },
        meta: {
          referrer: req.headers.get('referer') || '',
          user_agent: req.headers.get('user-agent') || '',
        },
      }
    }

    // Also check query params for slug
    const formSlug = payload.form_slug || url.searchParams.get('slug') || ''
    const fields = payload.fields || {}
    const utm = payload.utm || {}
    const meta = payload.meta || {}

    if (!formSlug) {
      return new Response(JSON.stringify({ error: 'form_slug é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Buscar formulário e seus campos
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('slug', formSlug)
      .eq('is_active', true)
      .single()

    if (formError || !form) {
      return new Response(JSON.stringify({ error: `Formulário "${formSlug}" não encontrado ou inativo` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: formFields } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', form.id)
      .order('display_order')

    // 2. Validar campos obrigatórios
    const requiredFields = (formFields || []).filter((f: any) => f.required && !f.is_hidden)
    const missingFields = requiredFields.filter((f: any) => !fields[f.field_name]?.trim())

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: 'Campos obrigatórios não preenchidos',
        missing: missingFields.map((f: any) => ({ field: f.field_name, label: f.label })),
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Mapear campos do form para campos do contato
    const contactData: Record<string, any> = {
      utm_source: utm.source || fields.utm_source || null,
      utm_medium: utm.medium || fields.utm_medium || null,
      utm_campaign: utm.campaign || fields.utm_campaign || null,
      utm_term: utm.term || fields.utm_term || null,
      first_conversion: form.name,
      first_conversion_date: new Date().toISOString(),
      lifecycle_stage: 'lead',
      marketing_status: 'marketing',
      fonte_registro: `form:${formSlug}`,
    }

    // Map form fields to contact columns using maps_to
    for (const field of (formFields || [])) {
      if (field.maps_to && fields[field.field_name] !== undefined) {
        contactData[field.maps_to] = fields[field.field_name]
      }
    }

    // Handle firstname → first_name split
    if (contactData.first_name && !contactData.last_name) {
      const parts = contactData.first_name.trim().split(/\s+/)
      if (parts.length > 1) {
        contactData.first_name = parts[0]
        contactData.last_name = parts.slice(1).join(' ')
      }
    }

    // Add product to produto_interesse
    contactData.produto_interesse = [form.product]

    // 4. Criar ou atualizar contato (upsert por email)
    let contact: any = null
    const email = contactData.email || fields.email

    if (email) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', email)
        .single()

      if (existing) {
        // Atualizar contato existente - merge produto_interesse
        const existingProducts = existing.produto_interesse || []
        const newProducts = Array.from(new Set([...existingProducts, form.product]))

        // Só atualizar campos que ainda não têm valor (não sobrescrever dados existentes)
        const updateData: Record<string, any> = {
          produto_interesse: newProducts,
          updated_at: new Date().toISOString(),
        }

        // Atualizar UTMs se não existiam
        if (!existing.utm_source && contactData.utm_source) updateData.utm_source = contactData.utm_source
        if (!existing.utm_medium && contactData.utm_medium) updateData.utm_medium = contactData.utm_medium
        if (!existing.utm_campaign && contactData.utm_campaign) updateData.utm_campaign = contactData.utm_campaign
        if (!existing.utm_term && contactData.utm_term) updateData.utm_term = contactData.utm_term

        // Atualizar dados do formulário se campo está vazio no contato
        for (const field of (formFields || [])) {
          if (field.maps_to && field.maps_to !== 'email' && fields[field.field_name]) {
            if (!existing[field.maps_to]) {
              updateData[field.maps_to] = fields[field.field_name]
            }
          }
        }

        // Se é a primeira conversão, registrar
        if (!existing.first_conversion) {
          updateData.first_conversion = form.name
          updateData.first_conversion_date = new Date().toISOString()
        }

        const { data: updated, error: updateError } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError
        contact = updated
      }
    }

    if (!contact) {
      // Criar novo contato
      if (!contactData.first_name) contactData.first_name = 'Lead'
      const { data: created, error: createError } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single()

      if (createError) throw createError
      contact = created
    }

    // 5. Criar Deal (Negócio) no pipeline do produto
    // Buscar pipeline e primeiro estágio
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('product', form.product)
      .single()

    let deal: any = null

    if (pipeline) {
      const { data: firstStage } = await supabase
        .from('stages')
        .select('id')
        .eq('pipeline_id', pipeline.id)
        .eq('is_won', false)
        .eq('is_lost', false)
        .order('display_order', { ascending: true })
        .limit(1)
        .single()

      if (firstStage) {
        // Verificar se já existe deal aberto para este contato neste pipeline
        const { data: existingDeal } = await supabase
          .from('deals')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('pipeline_id', pipeline.id)
          .is('is_won', null)
          .single()

        if (!existingDeal) {
          const dealName = `${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}`

          const { data: newDeal, error: dealError } = await supabase
            .from('deals')
            .insert({
              name: dealName,
              contact_id: contact.id,
              pipeline_id: pipeline.id,
              stage_id: firstStage.id,
              product: form.product,
              canal_origem: contactData.utm_source || 'formulario',
              qualification_status: 'lead',
            })
            .select()
            .single()

          if (dealError) throw dealError
          deal = newDeal

          // Qualificar o deal automaticamente
          const { data: qualResult } = await supabase.rpc('qualify_contact', {
            p_contact_id: contact.id,
            p_product: form.product,
          })

          if (qualResult && qualResult !== 'lead') {
            await supabase
              .from('deals')
              .update({ qualification_status: qualResult })
              .eq('id', deal.id)
          }

          // Propagar UTMs para o deal
          if (contactData.utm_source || contactData.utm_medium || contactData.utm_campaign) {
            await supabase
              .from('deals')
              .update({
                canal_origem: contactData.utm_source || 'formulario',
              })
              .eq('id', deal.id)
          }
        } else {
          deal = existingDeal
        }
      }
    }

    // 6. Registrar submissão
    const { data: submission } = await supabase
      .from('form_submissions')
      .insert({
        form_id: form.id,
        contact_id: contact.id,
        deal_id: deal?.id || null,
        utm_source: contactData.utm_source,
        utm_medium: contactData.utm_medium,
        utm_campaign: contactData.utm_campaign,
        utm_term: contactData.utm_term,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
        referrer: meta.referrer || req.headers.get('referer') || null,
        user_agent: meta.user_agent || req.headers.get('user-agent') || null,
        page_url: meta.page_url || null,
        raw_data: fields,
        qualification_result: deal ? 'processed' : 'no_pipeline',
      })
      .select()
      .single()

    // 7. Registrar atividade na timeline
    await supabase.from('activities').insert({
      contact_id: contact.id,
      deal_id: deal?.id || null,
      type: 'form_submission',
      direction: 'inbound',
      subject: `Formulário: ${form.name}`,
      body: `Lead preencheu o formulário "${form.name}" via ${contactData.utm_source || 'direto'}`,
      metadata: {
        form_id: form.id,
        form_slug: formSlug,
        submission_id: submission?.id,
        utm_source: contactData.utm_source,
        utm_medium: contactData.utm_medium,
        utm_campaign: contactData.utm_campaign,
      },
    })

    // 8. Enviar notificação por email (se configurado)
    if (form.notify_emails && form.notify_emails.length > 0) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: form.notify_emails,
            subject: `Novo lead: ${contact.first_name} ${contact.last_name || ''} - ${form.name}`,
            html: `
              <h2>Novo lead via ${form.name}</h2>
              <table style="border-collapse:collapse;width:100%">
                <tr><td><strong>Nome:</strong></td><td>${contact.first_name} ${contact.last_name || ''}</td></tr>
                <tr><td><strong>Email:</strong></td><td>${contact.email || '-'}</td></tr>
                <tr><td><strong>Telefone:</strong></td><td>${contact.phone || '-'}</td></tr>
                <tr><td><strong>Produto:</strong></td><td>${form.product}</td></tr>
                <tr><td><strong>UTM Source:</strong></td><td>${contactData.utm_source || '-'}</td></tr>
                <tr><td><strong>UTM Medium:</strong></td><td>${contactData.utm_medium || '-'}</td></tr>
                <tr><td><strong>UTM Campaign:</strong></td><td>${contactData.utm_campaign || '-'}</td></tr>
              </table>
              <p><a href="${Deno.env.get('SITE_URL') || ''}/contacts/${contact.id}">Ver contato no CRM</a></p>
            `,
          },
        })
      } catch (emailErr) {
        console.error('Erro ao enviar notificação:', emailErr)
        // Não falhar a submissão por erro de email
      }
    }

    // 9. Criar notificação no CRM
    await supabase.from('notifications').insert({
      title: `Novo lead: ${contact.first_name} ${contact.last_name || ''}`,
      message: `Formulário ${form.name} preenchido via ${contactData.utm_source || 'direto'}`,
      type: 'success',
      related_contact_id: contact.id,
      related_deal_id: deal?.id || null,
    })

    // 10. Retornar resposta
    const response = {
      success: true,
      contact_id: contact.id,
      deal_id: deal?.id || null,
      submission_id: submission?.id || null,
      redirect_url: form.redirect_url || null,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro no form-submit:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
