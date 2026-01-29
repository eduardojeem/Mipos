import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserFilters } from './useAdminFilters';

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    organization_id: string | null;
    organization_name?: string;
    created_at: string;
    last_sign_in_at: string | null;
    is_active: boolean;
}

interface UseUsersOptions {
    filters?: Partial<UserFilters>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
}

export function useUsers(options: UseUsersOptions = {}) {
    const {
        filters,
        sortBy = 'created_at',
        sortOrder = 'desc',
        pageSize = 50,
    } = options;

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);

    const supabase = createClient();
    
    // Refs for stable dependencies
    const filtersRef = useRef(filters);
    const optionsRef = useRef({ sortBy, sortOrder, pageSize });

    useEffect(() => {
        filtersRef.current = filters;
        optionsRef.current = { sortBy, sortOrder, pageSize };
    }, [filters, sortBy, sortOrder, pageSize]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const currentFilters = filtersRef.current;
            const { sortBy, sortOrder, pageSize } = optionsRef.current;

            let query = supabase
                .from('users')
                .select('*', { count: 'exact' });

            // Apply filters
            if (currentFilters) {
                // Search filter
                if (currentFilters.search) {
                    query = query.or(`email.ilike.%${currentFilters.search}%,full_name.ilike.%${currentFilters.search}%`);
                }

                // Role filter
                if (currentFilters.role && currentFilters.role.length > 0) {
                    query = query.in('role', currentFilters.role);
                }

                // Organization filter
                if (currentFilters.organization && currentFilters.organization.length > 0) {
                    query = query.in('organization_id', currentFilters.organization);
                }

                // Date range filter
                if (currentFilters.dateFrom) {
                    query = query.gte('created_at', currentFilters.dateFrom);
                }
                if (currentFilters.dateTo) {
                    query = query.lte('created_at', currentFilters.dateTo);
                }
            }

            // Apply sorting
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            // Apply pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            setUsers(data || []);
            setTotalCount(count || 0);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [supabase, page]); // Only depend on page and supabase

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Update user
    const updateUser = useCallback(async (
        id: string,
        updates: Partial<AdminUser>
    ) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await supabase
                .from('users')
                .update(updates as any)
                .eq('id', id);

            if (updateError) throw updateError;

            // Refresh data
            await fetchUsers();
            return { success: true };
        } catch (err: unknown) {
            console.error('Error updating user:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }, [supabase, fetchUsers]);

    // Delete user
    const deleteUser = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Refresh data
            await fetchUsers();
            return { success: true };
        } catch (err: unknown) {
            console.error('Error deleting user:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }, [supabase, fetchUsers]);

    // Change user role
    const changeUserRole = useCallback(async (
        id: string,
        role: string
    ) => {
        return updateUser(id, { role });
    }, [updateUser]);

    // Deactivate user
    const deactivateUser = useCallback(async (id: string) => {
        return updateUser(id, { is_active: false });
    }, [updateUser]);

    // Activate user
    const activateUser = useCallback(async (id: string) => {
        return updateUser(id, { is_active: true });
    }, [updateUser]);

    return {
        users,
        loading,
        error,
        totalCount,
        page,
        setPage,
        pageSize,
        refresh: fetchUsers,
        updateUser,
        deleteUser,
        changeUserRole,
        deactivateUser,
        activateUser,
    };
}
