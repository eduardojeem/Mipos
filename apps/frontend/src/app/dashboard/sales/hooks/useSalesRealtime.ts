'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribes to INSERT/UPDATE events on the `sales` table for the given org.
 * Invalidates sales-kpis, sales-trend, sales-breakdown, and recent-sales
 * so all dashboard KPIs refresh instantly when a sale is recorded — without
 * polling every 5 minutes.
 */
export function useSalesRealtime(organizationId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;

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
          queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['sales-trend'] });
          queryClient.invalidateQueries({ queryKey: ['sales-breakdown'] });
          queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
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
          queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);
}
