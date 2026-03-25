import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Insight } from '@/components/dashboard/InsightsTable'

interface UseInsightsOptions {
  context: 'instagram' | 'facebook_ads' | 'crm' | 'financeiro' | 'painel' | 'fiscal' | 'parcelas'
  data: Record<string, unknown> | null
  enabled?: boolean
}

export function useInsights({ context, data, enabled = true }: UseInsightsOptions) {
  const dataKey = data ? JSON.stringify(data).substring(0, 200) : ''

  return useQuery({
    queryKey: ['insights', context, dataKey],
    queryFn: async (): Promise<Insight[]> => {
      const { data: result, error } = await supabase.functions.invoke('generate-insights', {
        body: { context, data },
      })

      if (error) throw new Error(error.message || 'Erro ao gerar insights')

      if (result?.error) {
        throw new Error(result.error)
      }

      return result?.insights || []
    },
    enabled: enabled && !!data && Object.keys(data).length > 0,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 dias
    gcTime: 8 * 24 * 60 * 60 * 1000, // 8 dias
    retry: 1,
  })
}
