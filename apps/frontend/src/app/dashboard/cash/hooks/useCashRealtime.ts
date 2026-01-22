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
        queryClient.invalidateQueries({ queryKey: ['cashMovements', sessionId] });
        onUpdate?.();
    }, [queryClient, sessionId, onUpdate]);

    useEffect(() => {
        if (!sessionId || !enabled) return;

        let debounceTimer: NodeJS.Timeout;
        const scheduleRefetch = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                handleRealtimeUpdate();
            }, 300);
        };

        // Subscribe to movements
        const subMov = realtimeService.subscribeToCashMovementsBySession(sessionId, scheduleRefetch);

        // Subscribe to session
        const subSes = realtimeService.subscribeToCashSession(sessionId, scheduleRefetch);

        return () => {
            try {
                realtimeService.unsubscribe(`cash_movements:${sessionId}`);
            } catch (error) {
                console.error('Error unsubscribing from movements:', error);
            }
            try {
                realtimeService.unsubscribe(`cash_session:${sessionId}`);
            } catch (error) {
                console.error('Error unsubscribing from session:', error);
            }
            clearTimeout(debounceTimer);
        };
    }, [sessionId, enabled, handleRealtimeUpdate]);

    return {
        enabled,
    };
}
