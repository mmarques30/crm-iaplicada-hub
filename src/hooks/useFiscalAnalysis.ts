import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export type FiscalAction = 'generate_nf_data' | 'validate_fiscal' | 'analyze_installments'

interface FiscalAnalysisParams {
  action: FiscalAction
  data: Record<string, unknown>
}

export function useFiscalAnalysis() {
  return useMutation({
    mutationFn: async ({ action, data }: FiscalAnalysisParams) => {
      const { data: result, error } = await supabase.functions.invoke('fiscal-analysis', {
        body: { action, data },
      })

      if (error) throw new Error(error.message || 'Erro na análise fiscal')
      if (result?.error) throw new Error(result.error)

      return result?.result
    },
  })
}
