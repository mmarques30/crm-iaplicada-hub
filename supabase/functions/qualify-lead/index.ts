// Edge Function: Qualificar lead automaticamente
// Recebe contact_id e product, retorna qualification_status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { contact_id, product } = await req.json()
    if (!contact_id || !product) {
      return new Response(JSON.stringify({ error: 'contact_id and product are required' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Chamar funcao SQL de qualificacao
    const { data, error } = await supabase.rpc('qualify_contact', {
      p_contact_id: contact_id,
      p_product: product,
    })

    if (error) throw error

    return new Response(JSON.stringify({
      contact_id,
      product,
      qualification_status: data,
    }))
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
