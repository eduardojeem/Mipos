import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import type { CashMovement } from '@/types/cash';
import type { CashSummary } from '../types/cash.types';
import { calculateMovementSummary } from '../movements/utils/movementCalculations';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

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
    refetch: () => Promise<unknown>;
}

export function useMovements(options: UseMovementsOptions = {}): UseMovementsReturn {
    const { sessionId, enabled = true, includeUser = true, createdByMe = false } = options;
    const { toast } = useToast();
    const organizationId = useCurrentOrganizationId();

    const {
        data,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useQuery({
        queryKey: [
            'cashMovements',
            organizationId ?? 'no-org',
            sessionId ?? null,
            includeUser ? 'with-user' : 'plain',
            createdByMe ? 'mine' : 'all',
        ],
        enabled: enabled && !!organizationId && !!sessionId,
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (sessionId) params.sessionId = sessionId;
            if (includeUser) params.include = 'user';
            if (createdByMe) params.createdByMe = '1';

            const res = await api.get('/cash/movements', { params });
            return res.data;
        },
        refetchOnWindowFocus: false,
        staleTime: 60_000, // Increased to 60s to prevent constant background refetching
    });

    useEffect(() => {
        if (error) {
            toast({
                description: (error as Error)?.message || 'Error cargando movimientos',
                variant: 'destructive',
            });
        }
    }, [error, toast]);

    const movements = useMemo<CashMovement[]>(() => {
        return Array.isArray(data?.movements) ? data.movements : [];
    }, [data?.movements]);

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
