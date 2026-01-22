import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CashSession } from '@/types/cash';
import type { CashSessionState } from '../types/cash.types';

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
    const [session, setSession] = useState<CashSession | null>(null);
    const [error, setError] = useState<any>(null);

    const {
        data: sessionRes,
        isLoading,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: ['cashSession'],
        queryFn: async () => {
            const res = await api.get('/cash/session/current');
            return res.data;
        },
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (sessionRes?.session !== undefined) {
            setSession(sessionRes.session || null);
        }
    }, [sessionRes]);

    useEffect(() => {
        if (queryError) {
            setError(queryError);
        }
    }, [queryError]);

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ['cashSession'] });
    };

    return {
        session,
        isLoading,
        error,
        refetch,
        invalidate,
    };
}
