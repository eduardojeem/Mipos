import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CashSession } from '@/types/cash';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface SessionsFilters {
    status?: string;
    from?: string;
    to?: string;
    userId?: string;
    search?: string;
    showHistory?: boolean;
}

export interface UseSessionsDataOptions {
    filters?: SessionsFilters;
    page?: number;
    limit?: number;
    enabled?: boolean;
    orderBy?: 'openedAt' | 'closedAt' | 'status';
    orderDir?: 'asc' | 'desc';
}

export interface UseSessionsDataReturn {
    sessions: CashSession[];
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => void;
    pagination: { page: number; limit: number; total: number; pages: number };
    source: 'api';
}

export function useSessionsData(options: UseSessionsDataOptions = {}): UseSessionsDataReturn {
    const { filters = {}, page = 1, limit = 20, enabled = true, orderBy = 'openedAt', orderDir = 'desc' } = options;
    const organizationId = useCurrentOrganizationId();

    const queryKey = ['cashSessions', organizationId ?? 'no-org', { filters, page, limit, orderBy, orderDir }];

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            if (filters.userId) params.set('userId', filters.userId);
            if (filters.search) params.set('search', filters.search);
            params.set('page', String(page));
            params.set('limit', String(limit));
            params.set('orderBy', orderBy);
            params.set('orderDir', orderDir);

            if (!filters.showHistory && !filters.from) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                params.set('from', thirtyDaysAgo.toISOString().split('T')[0]);
            }

            const response = await api.get(`/cash/sessions?${params.toString()}`);
            return {
                sessions: Array.isArray(response.data?.sessions) ? response.data.sessions : [],
                pagination: response.data?.pagination ?? { page, limit, total: 0, pages: 1 },
                source: 'api' as const,
            };
        },
        enabled: enabled && Boolean(organizationId),
        staleTime: 120_000,
        gcTime: 600_000,
        placeholderData: (previous) => previous,
        refetchOnWindowFocus: false,
    });

    const sessions = Array.isArray(data?.sessions) ? (data.sessions as CashSession[]) : [];
    const serverPagination = data?.pagination;

    const pagination = useMemo(() => {
        return serverPagination ?? {
            page,
            limit,
            total: sessions.length,
            pages: Math.max(1, Math.ceil(sessions.length / limit)),
        };
    }, [serverPagination, page, limit, sessions.length]);

    return {
        sessions,
        isLoading,
        isFetching,
        error: error as Error | null,
        refetch,
        pagination,
        source: 'api',
    };
}
