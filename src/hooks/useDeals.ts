import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Deal, DealWithRelations } from '@/lib/types'
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types'

type DealInsert = TablesInsert<'deals'>
type DealUpdate = TablesUpdate<'deals'>

export function useDeals(pipelineId: string) {
  const [data, setData] = useState<DealWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pipelineId) {
      setData([])
      setLoading(false)
      return
    }

    async function fetchDeals() {
      setLoading(true)
      setError(null)

      const { data: deals, error: err } = await supabase
        .from('deals')
        .select('*, contact:contacts(*), stage:stages(*)')
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
      } else {
        setData((deals ?? []) as unknown as DealWithRelations[])
      }

      setLoading(false)
    }

    fetchDeals()
  }, [pipelineId])

  return { data, loading, error }
}

export function useDeal(id: string) {
  const [data, setData] = useState<DealWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }

    async function fetchDeal() {
      setLoading(true)
      setError(null)

      const { data: deal, error: err } = await supabase
        .from('deals')
        .select('*, contact:contacts(*), stage:stages(*)')
        .eq('id', id)
        .single()

      if (err) {
        setError(err.message)
      } else {
        setData(deal as unknown as DealWithRelations)
      }

      setLoading(false)
    }

    fetchDeal()
  }, [id])

  return { data, loading, error }
}

export function useCreateDeal() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createDeal = useCallback(async (deal: DealInsert) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('deals')
      .insert(deal)
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data as Deal
  }, [])

  return { createDeal, loading, error }
}

export function useUpdateDeal() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateDeal = useCallback(async (id: string, updates: DealUpdate) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data as Deal
  }, [])

  return { updateDeal, loading, error }
}

export function useMoveDeal() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveDeal = useCallback(async (dealId: string, stageId: string) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('deals')
      .update({
        stage_id: stageId,
        stage_entered_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data as Deal
  }, [])

  return { moveDeal, loading, error }
}
