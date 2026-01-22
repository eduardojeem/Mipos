import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useSessionsRealtime(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    const supabase = createClient()
    const channel = supabase.channel('cash_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cashSessions'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_counts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cashSessions'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, enabled])
}

