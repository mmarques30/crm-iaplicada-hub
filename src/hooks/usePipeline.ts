import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Pipeline, Stage } from '@/lib/types'

export function usePipelines() {
  const [data, setData] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPipelines() {
      setLoading(true)
      setError(null)

      const { data: pipelines, error: err } = await supabase
        .from('pipelines')
        .select('*')
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
      } else {
        setData((pipelines ?? []) as Pipeline[])
      }

      setLoading(false)
    }

    fetchPipelines()
  }, [])

  return { data, loading, error }
}

export function useStages(pipelineId: string) {
  const [data, setData] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pipelineId) {
      setData([])
      setLoading(false)
      return
    }

    async function fetchStages() {
      setLoading(true)
      setError(null)

      const { data: stages, error: err } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('display_order', { ascending: true })

      if (err) {
        setError(err.message)
      } else {
        setData((stages ?? []) as Stage[])
      }

      setLoading(false)
    }

    fetchStages()
  }, [pipelineId])

  return { data, loading, error }
}
