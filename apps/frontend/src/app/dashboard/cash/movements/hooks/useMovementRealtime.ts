import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

export function useMovementRealtime(sessionId?: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const handleNewMovement = useCallback((payload: any) => {
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['cashMovements'] });
        queryClient.invalidateQueries({ queryKey: ['cashMovementsAll'] });

        // Show toast notification
        toast({
            title: 'Nuevo movimiento',
            description: `Se registró un movimiento de ${payload.new.type}`,
            duration: 3000,
        });
    }, [queryClient, toast]);

    useEffect(() => {
        const supabase = createClient();

        // Subscribe to cash_movements table
        const channel = supabase
            .channel('cash_movements_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'cash_movements',
                },
                (payload: any) => {
                    // Only notify if it's for the current session or no session filter
                    if (!sessionId || payload.new.session_id === sessionId) {
                        handleNewMovement(payload);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, handleNewMovement]);
}
