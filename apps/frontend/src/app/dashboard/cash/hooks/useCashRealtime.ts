import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeService } from '@/lib/supabase-realtime';

interface UseCashRealtimeOptions {
    sessionId?: string;
    enabled?: boolean;
    onUpdate?: () => void;
}

/**
 * Hook for managing realtime subscriptions to cash data
 * Subscribes to session and movement changes
 */
export function useCashRealtime(options: UseCashRealtimeOptions = {}) {
    const { sessionId, enabled = true, onUpdate } = options;
    const queryClient = useQueryClient();

    const handleRealtimeUpdate = useCallback(() => {
        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['cashSession'] });
        queryClient.invalidateQueries({ queryKey: ['cashMovements'] });
        queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
        onUpdate?.();
    }, [queryClient, onUpdate]);

    useEffect(() => {
        if (!sessionId || !enabled) return;

        let debounceTimer: NodeJS.Timeout;
        const scheduleRefetch = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                handleRealtimeUpdate();
            }, 2000);
        };

        // Subscribe to movements
        realtimeService.subscribeToCashMovementsBySession(sessionId, scheduleRefetch);

        // Subscribe to session
        realtimeService.subscribeToCashSession(sessionId, scheduleRefetch);

        return () => {
            // Cleanup is best-effort — the realtime service may already have
            // dropped the channel (e.g. on network teardown). We only log
            // when the failure is something other than "channel not found",
            // which is the common "already gone" case.
            const safeUnsubscribe = (key: string) => {
                try {
                    realtimeService.unsubscribe(key);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (/not found|no.*channel|undefined/i.test(msg)) return;
                    console.warn(`[useCashRealtime] unsubscribe(${key}) failed:`, msg);
                }
            };
            safeUnsubscribe(`cash_movements:${sessionId}`);
            safeUnsubscribe(`cash_session:${sessionId}`);
            clearTimeout(debounceTimer);
        };
    }, [sessionId, enabled, handleRealtimeUpdate]);

    return {
        enabled,
    };
}
