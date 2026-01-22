import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import type { CashMovement } from '@/types/cash';
import type { CashFilterState, CashSummary } from '../types/cash.types';
import { calculateMovementSummary } from '../movements/utils/movementCalculations';

interface UseMovementsOptions {
    sessionId?: string;
    enabled?: boolean;
    includeUser?: boolean;
    createdByMe?: boolean;
}

interface UseMovementsReturn {
    movements: CashMovement[];
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    summary: CashSummary;
    refetch: () => Promise<any>;
}

export function useMovements(options: UseMovementsOptions = {}): UseMovementsReturn {
    const { sessionId, enabled = true, includeUser = true, createdByMe = false } = options;
    const { toast } = useToast();
    const [movements, setMovements] = useState<CashMovement[]>([]);

    const {
        data: movementsRes,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useQuery({
        queryKey: ['cashMovements', sessionId],
        enabled: enabled && !!sessionId,
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (sessionId) params.sessionId = sessionId;
            if (includeUser) params.include = 'user';
            if (createdByMe) params.createdByMe = '1';

            const res = await api.get('/cash/movements', { params });
            return res.data;
        },
        refetchOnWindowFocus: false,
        staleTime: 10_000, // Reduced from 60s to 10s for more responsive updates
    });

    useEffect(() => {
        if (movementsRes?.movements) {
            setMovements(movementsRes.movements || []);
        }
    }, [movementsRes]);

    useEffect(() => {
        if (error) {
            toast({
                description: (error as any)?.message || 'Error cargando movimientos',
                variant: 'destructive',
            });
        }
    }, [error, toast]);

    const summary = useMemo<CashSummary>(() => {
        return calculateMovementSummary(movements);
    }, [movements]);

    return {
        movements,
        isLoading,
        isFetching,
        error: error as Error | null,
        summary,
        refetch,
    };
}
