import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const DEBOUNCE_MS = 3_000;

export function useMovementRealtime(
  organizationId: string | null | undefined,
  sessionId?: string,
  enabled = false,
) {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!organizationId || !enabled) return;

    function invalidate() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['cashMovements'] });
        queryClient.invalidateQueries({ queryKey: ['cashMovementsAll'] });
      }, DEBOUNCE_MS);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`cash_movements_${organizationId}${sessionId ? `_${sessionId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cash_movements',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: any) => {
          if (!sessionId || payload.new?.session_id === sessionId) {
            invalidate();
          }
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [organizationId, sessionId, enabled, queryClient]);
}
