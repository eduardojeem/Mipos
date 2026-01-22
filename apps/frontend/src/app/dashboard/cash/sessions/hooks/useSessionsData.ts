import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseActive, isMockAuthEnabled } from '@/lib/env';
import api from '@/lib/api';
import type { CashSession } from '@/types/cash';

export interface SessionsFilters {
    status?: string;
    from?: string;
    to?: string;
    userId?: string;
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
    source: 'supabase' | 'api';
}

/**
 * Hook for fetching cash sessions with server-side filtering
 * Optimizes performance by filtering data at the database level
 */
export function useSessionsData(options: UseSessionsDataOptions = {}): UseSessionsDataReturn {
    const { filters = {}, page = 1, limit = 20, enabled = true, orderBy = 'openedAt', orderDir = 'desc' } = options;

    const queryKey = ['cashSessions', { filters, page, limit, orderBy, orderDir }];

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters.status) params.set('status', filters.status)
            if (filters.from) params.set('from', filters.from)
            if (filters.to) params.set('to', filters.to)
            if (filters.userId) params.set('userId', filters.userId)
            params.set('page', String(page))
            params.set('limit', String(limit))
            params.set('orderBy', orderBy)
            params.set('orderDir', orderDir)
            if (!filters.showHistory && !filters.from) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                params.set('from', thirtyDaysAgo.toISOString().split('T')[0])
            }

            if (!isSupabaseActive()) {
                const res = await api.get(`/cash/sessions?${params.toString()}`)
                return { ...res.data, source: 'api' } as any
            }

            try {
                const supabase = createClient();

                let query = supabase
                    .from('cash_sessions')
                    .select(`
          id,status,opening_time,closing_time,opening_amount,closing_amount,expected_amount,discrepancy_amount,notes,opened_by,closed_by,
          opened_by_user:opened_by(id,email,full_name),
          closed_by_user:closed_by(id,email,full_name),
          counts:cash_counts!cash_counts_session_id_fkey(denomination,quantity,total)
        `, { count: 'planned' })
                    .order(orderBy === 'closedAt' ? 'closing_time' : (orderBy === 'status' ? 'status' : 'opening_time'), { ascending: orderDir === 'asc' });

                if (filters.status && filters.status !== 'all') {
                    query = query.or(`status.eq.${filters.status},session_status.eq.${String(filters.status).toLowerCase()}`);
                }
                if (filters.from) {
                    query = query.gte('opening_time', filters.from);
                }
                if (filters.to) {
                    const toDate = new Date(filters.to);
                    toDate.setHours(23, 59, 59, 999);
                    query = query.lte('opening_time', toDate.toISOString());
                }
                if (filters.userId && filters.userId !== 'all') {
                    query = query.or(`opened_by.eq.${filters.userId},closed_by.eq.${filters.userId},user_id.eq.${filters.userId}`);
                }
                if (!filters.showHistory && !filters.from) {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    query = query.gte('opening_time', thirtyDaysAgo.toISOString());
                }

                const start = (page - 1) * limit;
                const end = start + limit - 1;
                query = query.range(start, end);

                const { data: sessions, error, count } = await query;
                if (error) {
                    throw new Error(error.message);
                }

                if ((!sessions || sessions.length === 0) && isMockAuthEnabled()) {
                    const res = await api.get(`/cash/sessions?${params.toString()}`, { headers: { 'X-Env-Mode': 'mock', Authorization: 'Bearer mock-token' } })
                    return { ...res.data, source: 'api' } as any
                }

                const total = typeof count === 'number' ? count : (sessions || []).length;
                const pages = Math.max(1, Math.ceil(total / limit));
                const pagination = { page, limit, total, pages };

                const base = (sessions || []).map((s: any) => ({
                    id: s.id,
                    status: s.status || 'UNKNOWN',
                    openingAmount: Number(s.opening_amount) || 0,
                    closingAmount: s.closing_amount != null ? Number(s.closing_amount) : null,
                    systemExpected: s.expected_amount != null ? Number(s.expected_amount) : null,
                    discrepancyAmount: s.discrepancy_amount != null ? Number(s.discrepancy_amount) : null,
                    openedAt: s.opening_time,
                    closedAt: s.closing_time ?? null,
                    notes: s.notes ?? null,
                    openedByUser: s.opened_by_user ? {
                        id: s.opened_by_user.id,
                        email: s.opened_by_user.email,
                        fullName: s.opened_by_user.full_name || null
                    } : null,
                    closedByUser: s.closed_by_user ? {
                        id: s.closed_by_user.id,
                        email: s.closed_by_user.email,
                        fullName: s.closed_by_user.full_name || null
                    } : null,
                    counts: Array.isArray(s.counts) ? s.counts.map((c: any) => ({
                        denomination: Number(c.denomination),
                        quantity: Number(c.quantity),
                        total: Number(c.total)
                    })) : undefined,
                })) as CashSession[];

                const ids = base.map(s => s.id);
                if (ids.length === 0) return { sessions: base, pagination } as any;

                const { data: mvts } = await supabase
                    .from('cash_movements')
                    .select('session_id,type,amount')
                    .in('session_id', ids);

                const netBySession: Record<string, number> = {};
                ids.forEach(id => netBySession[id] = 0);
                (mvts || []).forEach((m: any) => {
                    const sid = m.session_id as string;
                    const amt = Number(m.amount) || 0;
                    const t = String(m.type || '').toUpperCase();
                    if (!(sid in netBySession)) return;
                    if (t === 'IN') netBySession[sid] += Math.abs(amt);
                    else if (t === 'OUT') netBySession[sid] -= Math.abs(amt);
                    else if (t === 'SALE') netBySession[sid] += Math.abs(amt);
                    else if (t === 'RETURN') netBySession[sid] -= Math.abs(amt);
                    else if (t === 'ADJUSTMENT') netBySession[sid] += amt;
                });

                const mapped = base.map((s) => {
                    const net = netBySession[s.id] || 0;
                    const expected = s.openingAmount + net;
                    const discrepancy = s.closingAmount != null ? (s.closingAmount - expected) : null;
                    return { ...s, systemExpected: expected, discrepancyAmount: discrepancy };
                });

                return { sessions: mapped, pagination, source: 'supabase' } as any;
            } catch {
                const res = await api.get(`/cash/sessions?${params.toString()}`, { headers: { 'X-Env-Mode': 'mock', Authorization: 'Bearer mock-token' } })
                return { ...res.data, source: 'api' } as any
            }
        },
        enabled,
        staleTime: 30_000,
        gcTime: 300_000,
        placeholderData: (prev) => prev,
        refetchOnWindowFocus: false,
    });

    const sessions = Array.isArray((data as any)?.sessions) ? (data as any).sessions as CashSession[] : ((data as any) || []);
    const server = (data as any)?.pagination as { page: number; limit: number; total: number; pages: number } | undefined;
    const source = ((data as any)?.source as 'supabase' | 'api') || 'supabase';

    const pagination = useMemo(() => {
        return server ?? { page, limit, total: sessions.length, pages: Math.max(1, Math.ceil(sessions.length / limit)) };
    }, [server, page, limit, sessions.length]);

    return {
        sessions,
        isLoading,
        isFetching,
        error: error as Error | null,
        refetch,
        pagination,
        source,
    };
}
