import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/supabase';
import { createClient } from '@/lib/supabase/client';
import { UserFilters } from './useAdminFilters';
import { useToast } from '@/components/ui/use-toast';

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    organization_id: string | null;
    organization?: {
        name: string;
    } | null;
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

type UsersQueryResponse = {
    users: Array<Record<string, unknown>>;
    total: number;
};

function normalizeAdminUser(raw: Record<string, unknown>, fallbackOrganizationId?: string): AdminUser {
    const organizationName = raw.organization && typeof raw.organization === 'object'
        ? String((raw.organization as { name?: string }).name || '')
        : String(raw.organizationName || '');
    const status = String(raw.status || '').toUpperCase();

    return {
        id: String(raw.id || ''),
        email: String(raw.email || ''),
        full_name: raw.full_name ? String(raw.full_name) : raw.name ? String(raw.name) : null,
        role: String(raw.role || 'USER').toUpperCase(),
        organization_id: raw.organization_id ? String(raw.organization_id) : raw.organizationId ? String(raw.organizationId) : fallbackOrganizationId || null,
        organization: organizationName ? { name: organizationName } : null,
        created_at: String(raw.created_at || raw.createdAt || new Date().toISOString()),
        last_sign_in_at: raw.last_sign_in_at
            ? String(raw.last_sign_in_at)
            : raw.last_login
                ? String(raw.last_login)
                : raw.lastLogin
                    ? String(raw.lastLogin)
                    : null,
        is_active: typeof raw.is_active === 'boolean'
            ? raw.is_active
            : status === '' || status === 'ACTIVE',
    };
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
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
    const searchFilter = String(filters?.search || '');
    const organizationFilter = filters?.organization?.[0] || '';

    const queryKey = useMemo(
        () => ['admin', 'users', searchFilter, organizationFilter, sortBy, sortOrder, pageSize, page],
        [searchFilter, organizationFilter, sortBy, sortOrder, pageSize, page]
    );

    const {
        data,
        isLoading: loading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery<UsersQueryResponse>({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(pageSize));
            if (searchFilter) params.set('search', searchFilter);
            if (organizationFilter) params.set('organizationId', organizationFilter);
            const res = await fetch(`/api/superadmin/users?${params.toString()}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Error al obtener usuarios');
            return {
                users: json.users || [],
                total: json.total || 0,
            };
        },
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
    });

    useEffect(() => {
        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        };

        const membersChannel = organizationFilter
            ? supabase
                .channel(`superadmin-users-${organizationFilter}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_members', filter: `organization_id=eq.${organizationFilter}` }, invalidate)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, invalidate)
            : supabase
                .channel('superadmin-users')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, invalidate);

        const channel = membersChannel.subscribe((status) => {
            setIsRealtimeConnected(status === 'SUBSCRIBED');
        });

        return () => {
            setIsRealtimeConnected(false);
            void supabase.removeChannel(channel);
        };
    }, [organizationFilter, queryClient, supabase]);

    const users = (data?.users || []).map((user) => normalizeAdminUser(user, organizationFilter));
    const totalCount = data?.total || 0;
    const error = queryError instanceof Error ? queryError.message : null;

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdminUser> }) => {
            const writableUpdates = { ...updates } as Record<string, unknown>;
            delete writableUpdates.organization;
            const dbUpdates = writableUpdates as unknown as Database['public']['Tables']['users']['Update'];
            const res = await fetch(`/api/superadmin/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbUpdates),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Error al actualizar usuario');
            return { id, updates };
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
            const previousData = queryClient.getQueryData<UsersQueryResponse>(queryKey);

            queryClient.setQueryData<UsersQueryResponse>(queryKey, (old) => {
                if (!old) return previousData || { users: [], total: 0 };
                return {
                    ...old,
                    users: old.users.map((user) => (
                        String(user.id) === id ? { ...user, ...updates } : user
                    )),
                    total: old.total || 0,
                };
            });

            return { previousData };
        },
        onError: (err, _variables, context) => {
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

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/superadmin/users/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Error al eliminar usuario');
            return id;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
            const previousData = queryClient.getQueryData<UsersQueryResponse>(queryKey);

            queryClient.setQueryData<UsersQueryResponse>(queryKey, (old) => {
                if (!old) return previousData || { users: [], total: 0 };
                return {
                    ...old,
                    users: old.users.filter((user) => String(user.id) !== id),
                    total: Math.max(0, (old.total || 0) - 1),
                };
            });

            return { previousData };
        },
        onError: (err, _id, context) => {
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

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<AdminUser> }) => {
            const writableUpdates = { ...updates } as Record<string, unknown>;
            delete writableUpdates.organization;
            const dbUpdates = writableUpdates as unknown as Database['public']['Tables']['users']['Update'];
            const res = await fetch('/api/superadmin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'update', ids, updates: dbUpdates }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Error en actualizacion masiva');
            return { ids, updates };
        },
        onSuccess: (_, { ids }) => {
            toast({
                title: 'Usuarios actualizados',
                description: `${ids.length} usuarios han sido actualizados.`,
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (err) => {
            toast({
                title: 'Error en actualizacion masiva',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const res = await fetch('/api/superadmin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'delete', ids }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Error en eliminacion masiva');
            return ids;
        },
        onSuccess: (_, ids) => {
            toast({
                title: 'Usuarios eliminados',
                description: `${ids.length} usuarios han sido eliminados.`,
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (err) => {
            toast({
                title: 'Error en eliminacion masiva',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        }
    });

    const updateUser = useCallback(async (id: string, updates: Partial<AdminUser>) => {
        return updateMutation.mutateAsync({ id, updates });
    }, [updateMutation]);

    const deleteUser = useCallback(async (id: string) => {
        return deleteMutation.mutateAsync(id);
    }, [deleteMutation]);

    const bulkUpdateUsers = useCallback(async (ids: string[], updates: Partial<AdminUser>) => {
        return bulkUpdateMutation.mutateAsync({ ids, updates });
    }, [bulkUpdateMutation]);

    const bulkDeleteUsers = useCallback(async (ids: string[]) => {
        return bulkDeleteMutation.mutateAsync(ids);
    }, [bulkDeleteMutation]);

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
        isFetching,
        isRealtimeConnected,
        error,
        totalCount,
        refresh: refetch,
        updating: updateMutation.isPending || deleteMutation.isPending || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending,
        updateUser,
        deleteUser,
        bulkUpdateUsers,
        bulkDeleteUsers,
        changeUserRole,
        deactivateUser,
        activateUser,
    };
}
