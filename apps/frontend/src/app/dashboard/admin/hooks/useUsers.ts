import { useState, useEffect, useCallback } from 'react';
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
    filters?: UserFilters;
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

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('users')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters) {
                // Search filter
                if (filters.search) {
                    query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`);
                }

                // Role filter
                if (filters.role && filters.role.length > 0) {
                    query = query.in('role', filters.role);
                }

                // Organization filter
                if (filters.organization && filters.organization.length > 0) {
                    query = query.in('organization_id', filters.organization);
                }

                // Date range filter
                if (filters.dateFrom) {
                    query = query.gte('created_at', filters.dateFrom);
                }
                if (filters.dateTo) {
                    query = query.lte('created_at', filters.dateTo);
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
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [supabase, filters, sortBy, sortOrder, page, pageSize]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Update user
    const updateUser = useCallback(async (
        id: string,
        updates: Partial<AdminUser>
    ) => {
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;

            // Refresh data
            await fetchUsers();
            return { success: true };
        } catch (err: any) {
            console.error('Error updating user:', err);
            return { success: false, error: err.message };
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
        } catch (err: any) {
            console.error('Error deleting user:', err);
            return { success: false, error: err.message };
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
