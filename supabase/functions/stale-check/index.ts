// Edge Function: Verificacao de leads parados (executar via cron diario)
// Cria notificacoes quando deals ficam parados em um estagio alem do threshold

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Buscar configuracoes de alerta ativas
    const { data: configs, error: configError } = await supabase
      .from('stale_alert_configs')
      .select('*, stages(name), pipelines(name, product)')
      .eq('is_active', true)

    if (configError) throw configError
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma configuracao de alerta ativa' }))
    }

    let alertsCreated = 0

    for (const config of configs) {
      // Buscar deals parados neste estagio alem do threshold
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() - config.threshold_days)

      const { data: staleDeals, error: dealsError } = await supabase
        .from('deals')
        .select('id, name, owner_id, contact_id, stage_entered_at')
        .eq('stage_id', config.stage_id)
        .is('is_won', null)
        .lt('stage_entered_at', thresholdDate.toISOString())

      if (dealsError) throw dealsError
      if (!staleDeals || staleDeals.length === 0) continue

      // Criar notificacoes para cada deal parado
      const notifications = staleDeals.map((deal) => ({
        user_id: deal.owner_id,
        title: `Lead parado: ${deal.name}`,
        message: `O deal "${deal.name}" está há mais de ${config.threshold_days} dias no estágio "${(config as Record<string, unknown>).stages ? ((config as Record<string, unknown>).stages as Record<string, string>).name : 'desconhecido'}". Considere fazer follow-up.`,
        type: 'warning' as const,
        related_deal_id: deal.id,
        related_contact_id: deal.contact_id,
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) throw notifError
      alertsCreated += notifications.length
    }

    return new Response(JSON.stringify({
      success: true,
      alerts_created: alertsCreated,
      timestamp: new Date().toISOString(),
    }))
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
