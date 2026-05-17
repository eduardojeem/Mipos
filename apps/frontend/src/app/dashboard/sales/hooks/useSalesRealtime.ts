'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// How long to wait after the last event before actually refetching.
// A busy POS may ring 5 sales in 3 s — we fire one refresh, not five.
const DEBOUNCE_MS = 3_000;

/**
 * Subscribes to INSERT/UPDATE events on `sales` for the given org and
 * invalidates KPI queries with a debounce so bursts of sales cause at most
 * one refresh per DEBOUNCE_MS window instead of one per sale.
 *
 * Cost model:
 *  - 1 Supabase Realtime connection per open dashboard tab (not per sale)
 *  - Messages received: 1 per sale event (filtered server-side by org)
 *  - Backend refetches: capped at 1 per DEBOUNCE_MS regardless of sale volume
 */
export function useSalesRealtime(
  organizationId: string | null | undefined,
  enabled = false,
) {
  const queryClient = useQueryClient();
  const kpisTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!organizationId || !enabled) return;

    function invalidateKpis() {
      if (kpisTimer.current) clearTimeout(kpisTimer.current);
      kpisTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['sales-trend'] });
        queryClient.invalidateQueries({ queryKey: ['sales-breakdown'] });
      }, DEBOUNCE_MS);
    }

    function invalidateRecent() {
      if (recentTimer.current) clearTimeout(recentTimer.current);
      recentTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
      }, DEBOUNCE_MS);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`sales_realtime_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          invalidateKpis();
          invalidateRecent();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          invalidateKpis();
          invalidateRecent();
        },
      )
      .subscribe();

    return () => {
      if (kpisTimer.current)   clearTimeout(kpisTimer.current);
      if (recentTimer.current) clearTimeout(recentTimer.current);
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, queryClient]);
}
