import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CashSession } from '@/types/cash';
import type { CashSessionState } from '../types/cash.types';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

interface UseCashSessionReturn extends CashSessionState {
    refetch: () => Promise<any>;
    invalidate: () => Promise<void>;
}

/**
 * Hook for managing cash session state
 * Handles fetching current session and provides invalidation
 */
export function useCashSession(): UseCashSessionReturn {
    const queryClient = useQueryClient();
    const organizationId = useCurrentOrganizationId();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['cashSession', organizationId ?? 'no-org'],
        enabled: Boolean(organizationId),
        queryFn: async () => {
            const res = await api.get('/cash/session/current');
            return res.data;
        },
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ['cashSession'] });
    };

    return {
        session: (data?.session as CashSession | null | undefined) ?? null,
        isLoading,
        error: error as any,
        refetch,
        invalidate,
    };
}
