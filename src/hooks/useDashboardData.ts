import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface DashboardSnapshot {
  id: string
  source: string
  data: {
    instagram?: {
      profile: { username: string; name: string; followers: number; mediaCount: number }
      metrics: {
        followers: number; totalReach: number; totalViews: number
        totalSaved: number; totalShares: number; totalLikes: number
        totalComments: number; avgEngagement: number
        profileViews: number; accountsEngaged: number
      }
      posts: Array<{
        id: string; caption: string; media_type: string; permalink: string
        timestamp: string; like_count: number; comments_count: number
        reach: number; saved: number; shares: number; plays: number
      }>
      dailyReach: Array<{ end_time: string; value: number }>
      dailyFollowers: Array<{ end_time: string; value: number }>
    }
    facebook_ads?: {
      campaigns: Array<{
        id: string; name: string; status: string; objective: string
        spend: number; impressions: number; reach: number; clicks: number
        ctr: number; leads: number; costPerLead: number
      }>
      metrics: {
        totalSpend: number; totalImpressions: number; totalReach: number
        totalClicks: number; totalLeads: number; avgCPL: number; avgCTR: number
      }
    }
    hubspot?: {
      contacts: Array<{
        id: string; email: string; firstname: string; lastname: string
        phone: string; company: string; lifecyclestage: string
        source: string; createdate: string
      }>
      metrics: {
        totalContacts: number; leads: number; subscribers: number
        opportunities: number; customers: number; activeDeals: number
        wonDeals: number; lostDeals: number; winRate: number; totalDealValue: number
      }
      byStage: Record<string, number>
      bySource: Record<string, number>
      deals: Array<{
        id: string; name: string; stage: string; amount: number; closedate: string
      }>
    }
  }
  errors: string[] | null
  collected_at: string
}

export function useDashboardSnapshot() {
  return useQuery({
    queryKey: ['dashboard_snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_snapshots')
        .select('*')
        .eq('source', 'all')
        .order('collected_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return (data as unknown as DashboardSnapshot) || null
    },
    staleTime: 30_000,
  })
}

export function useCollectDashboardData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (source: string = 'all') => {
      const { data, error } = await supabase.functions.invoke('dashboard-collector', {
        body: { source },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_snapshot'] })
    },
  })
}
