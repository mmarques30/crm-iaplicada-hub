import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface InstagramAutomation {
  id: string
  post_url: string
  post_id: string | null
  keyword: string
  comment_reply: string
  dm_message: string
  dm_link: string | null
  is_active: boolean
  replies_count: number
  created_at: string
  updated_at: string
}

export type InstagramAutomationInsert = Omit<InstagramAutomation, 'id' | 'replies_count' | 'created_at' | 'updated_at'>

export function useInstagramAutomations() {
  return useQuery({
    queryKey: ['instagram_automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_automations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as InstagramAutomation[]
    },
  })
}

export function useCreateInstagramAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (automation: InstagramAutomationInsert) => {
      const { data, error } = await supabase
        .from('instagram_automations')
        .insert(automation)
        .select()
        .single()

      if (error) throw error
      return data as InstagramAutomation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram_automations'] })
    },
  })
}

export function useUpdateInstagramAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InstagramAutomation> & { id: string }) => {
      const { data, error } = await supabase
        .from('instagram_automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as InstagramAutomation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram_automations'] })
    },
  })
}

export function useDeleteInstagramAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('instagram_automations')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram_automations'] })
    },
  })
}
