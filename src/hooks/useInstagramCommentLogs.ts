import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface InstagramCommentLog {
  id: string
  automation_id: string
  comment_id: string
  commenter_username: string
  commenter_ig_id: string
  comment_text: string
  dm_sent: boolean
  contact_id: string | null
  replied_at: string
}

export function useInstagramCommentLogs(automationId?: string) {
  return useQuery({
    queryKey: ['instagram_comment_logs', automationId],
    queryFn: async () => {
      let q = supabase
        .from('instagram_comment_logs')
        .select('*')
        .order('replied_at', { ascending: false })
        .limit(100)

      if (automationId) {
        q = q.eq('automation_id', automationId)
      }

      const { data, error } = await q
      if (error) throw error
      return data as InstagramCommentLog[]
    },
  })
}
