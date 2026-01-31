import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { UserFilters } from './useAdminFilters';
import { useToast } from '@/components/ui/use-toast';

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
    page?: number;
}

export function useUsers(options: UseUsersOptions = {}) {
    const {
        filters,
        sortBy = 'created_at',
        sortOrder = 'desc',
        pageSize = 50,
        page = 1,
    } = options;

    const queryClient = useQueryClient();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    // Query key for caching
    const queryKey = useMemo(() => 
        ['admin', 'users', { filters, sortBy, sortOrder, pageSize, page }], 
        [filters, sortBy, sortOrder, pageSize, page]
    );

    // Fetch users using React Query
    const {
        data,
        isLoading: loading,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters) {
                if (filters.search) {
                    query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`);
                }
                if (filters.role && filters.role.length > 0) {
                    query = query.in('role', filters.role);
                }
                if (filters.organization && filters.organization.length > 0) {
                    query = query.in('organization_id', filters.organization);
                }
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

            const { data: userData, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            return {
                users: userData || [],
                total: count || 0,
            };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    const users = data?.users || [];
    const totalCount = data?.total || 0;
    const error = queryError instanceof Error ? queryError.message : null;

    // Mutation for updating a user
    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdminUser> }) => {
            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;
            return { id, updates };
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
            const previousData = queryClient.getQueryData<{ users: AdminUser[]; total: number }>(queryKey);

            queryClient.setQueryData<{ users: AdminUser[]; total: number }>(queryKey, (old) => {
                if (!old) return previousData || { users: [], total: 0 };
                return {
                    ...old,
                    users: old.users?.map((user: AdminUser) => 
                        user.id === id ? { ...user, ...updates } : user
                    ) || [],
                    total: old.total || 0,
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(queryKey, context?.previousData);
            toast({
                title: 'Error al actualizar usuario',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: () => {
            toast({
                title: 'Usuario actualizado',
                description: 'Los cambios se guardaron correctamente.',
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });

    // Mutation for deleting a user
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            return id;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
            const previousData = queryClient.getQueryData<{ users: AdminUser[]; total: number }>(queryKey);

            queryClient.setQueryData<{ users: AdminUser[]; total: number }>(queryKey, (old) => {
                if (!old) return previousData || { users: [], total: 0 };
                return {
                    ...old,
                    users: old.users?.filter((user: AdminUser) => user.id !== id) || [],
                    total: (old.total || 0) - 1,
                };
            });

            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(queryKey, context?.previousData);
            toast({
                title: 'Error al eliminar usuario',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: () => {
            toast({
                title: 'Usuario eliminado',
                description: 'El usuario ha sido eliminado permanentemente.',
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });

    const updateUser = useCallback(async (id: string, updates: Partial<AdminUser>) => {
        return updateMutation.mutateAsync({ id, updates });
    }, [updateMutation]);

    const deleteUser = useCallback(async (id: string) => {
        return deleteMutation.mutateAsync(id);
    }, [deleteMutation]);

    const changeUserRole = useCallback(async (id: string, role: string) => {
        return updateUser(id, { role });
    }, [updateUser]);

    const deactivateUser = useCallback(async (id: string) => {
        return updateUser(id, { is_active: false });
    }, [updateUser]);

    const activateUser = useCallback(async (id: string) => {
        return updateUser(id, { is_active: true });
    }, [updateUser]);

    return {
        users,
        loading,
        error,
        totalCount,
        refresh: refetch,
        updating: updateMutation.isPending || deleteMutation.isPending,
        updateUser,
        deleteUser,
        changeUserRole,
        deactivateUser,
        activateUser,
    };
}
