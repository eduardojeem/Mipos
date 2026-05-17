import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const DEBOUNCE_MS = 3_000

export function useSessionsRealtime(
  organizationId: string | null | undefined,
  enabled = false,
) {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!organizationId || !enabled) return

    function invalidate() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['cashSessions'] })
      }, DEBOUNCE_MS)
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`cash_sessions_${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cash_sessions',
        filter: `organization_id=eq.${organizationId}`,
      }, invalidate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cash_counts',
      }, invalidate)
      .subscribe()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [organizationId, enabled, queryClient])
}
