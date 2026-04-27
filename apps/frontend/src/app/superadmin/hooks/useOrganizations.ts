import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';
import { OrganizationFilters } from './useAdminFilters';

interface UseOrganizationsOptions {
    filters?: Partial<OrganizationFilters>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
    page?: number;
}

type QuerySnapshot = {
    organizations: Organization[];
    total: number;
};

export function useOrganizations(options: UseOrganizationsOptions = {}) {
    const {
        filters,
        sortBy = 'created_at',
        sortOrder = 'desc',
        pageSize = 100,
        page = 1,
    } = options;

    const queryClient = useQueryClient();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const invalidateTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [updatingTarget, setUpdatingTarget] = useState<string | 'bulk' | null>(null);
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
    const searchFilter = filters?.search ?? '';
    const statusFilter = filters?.status?.[0] ?? '';
    const planFilter = filters?.plan?.[0] ?? '';

    const queryKey = useMemo(
        () => ['admin', 'organizations', searchFilter, statusFilter, planFilter, sortBy, sortOrder, pageSize, page],
        [searchFilter, statusFilter, planFilter, sortBy, sortOrder, pageSize, page]
    );

    const {
        data,
        isLoading: loading,
        isFetching,
        dataUpdatedAt,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                sortBy,
                sortOrder,
            });

            if (searchFilter) params.append('search', searchFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (planFilter) params.append('plan', planFilter);

            const response = await fetch(`/api/superadmin/organizations?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar organizaciones');
            }

            return await response.json();
        },
        staleTime: 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchInterval: isRealtimeConnected ? false : 60 * 1000,
        refetchIntervalInBackground: true,
    });

    const organizations = data?.organizations || [];
    const totalCount = data?.total || 0;
    const metrics = data?.metrics || {
        total: totalCount,
        active: 0,
        trial: 0,
        suspended: 0,
    };
    const error = queryError instanceof Error ? queryError.message : null;

    useEffect(() => {
        const scheduleInvalidation = () => {
            if (invalidateTimerRef.current) {
                clearTimeout(invalidateTimerRef.current);
            }

            invalidateTimerRef.current = setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
            }, 250);
        };

        const channel = supabase
            .channel('superadmin-organizations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'organizations' },
                scheduleInvalidation
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'organization_members' },
                scheduleInvalidation
            )
            .subscribe((status) => {
                setIsRealtimeConnected(status === 'SUBSCRIBED');
            });

        return () => {
            setIsRealtimeConnected(false);
            if (invalidateTimerRef.current) {
                clearTimeout(invalidateTimerRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [queryClient, supabase]);

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Organization> }) => {
            const response = await fetch('/api/superadmin/organizations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar organizacion');
            }

            return await response.json();
        },
        onMutate: async ({ id, updates }) => {
            setUpdatingTarget(id);
            await queryClient.cancelQueries({ queryKey: ['admin', 'organizations'] });

            const previousData = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: QuerySnapshot | undefined) => ({
                ...old,
                organizations: old?.organizations?.map((org) =>
                    org.id === id ? { ...org, ...updates } : org
                ) || [],
                total: old?.total || 0,
            }));

            return { previousData };
        },
        onError: (err, _variables, context) => {
            queryClient.setQueryData(queryKey, context?.previousData);
            toast({
                title: 'Error al actualizar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: () => {
            toast({
                title: 'Actualizacion exitosa',
                description: 'La organizacion se actualizo correctamente.',
            });
        },
        onSettled: () => {
            setUpdatingTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/superadmin/organizations?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al archivar organizacion');
            }

            return await response.json();
        },
        onMutate: async (id) => {
            setUpdatingTarget(id);
            await queryClient.cancelQueries({ queryKey: ['admin', 'organizations'] });

            const previousData = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: QuerySnapshot | undefined) => ({
                ...old,
                organizations: old?.organizations?.map((org) =>
                    org.id === id ? { ...org, subscription_status: 'SUSPENDED' } : org
                ) || [],
                total: old?.total || 0,
            }));

            return { previousData };
        },
        onError: (err, _id, context) => {
            queryClient.setQueryData(queryKey, context?.previousData);
            toast({
                title: 'Error al archivar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: () => {
            toast({
                title: 'Organizacion archivada',
                description: 'La organizacion fue suspendida correctamente.',
            });
        },
        onSettled: () => {
            setUpdatingTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Organization> }) => {
            const response = await fetch('/api/superadmin/organizations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, ...updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en actualizacion masiva');
            }

            return await response.json();
        },
        onMutate: async () => {
            setUpdatingTarget('bulk');
            await queryClient.cancelQueries({ queryKey: ['admin', 'organizations'] });
        },
        onSuccess: (_, { ids }) => {
            toast({
                title: 'Organizaciones actualizadas',
                description: `${ids.length} organizaciones fueron actualizadas.`,
            });
        },
        onError: (err) => {
            toast({
                title: 'Error masivo',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSettled: () => {
            setUpdatingTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await fetch(`/api/superadmin/organizations?ids=${ids.join(',')}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en archivado masivo');
            }

            return await response.json();
        },
        onMutate: async () => {
            setUpdatingTarget('bulk');
            await queryClient.cancelQueries({ queryKey: ['admin', 'organizations'] });
        },
        onSuccess: (_, ids) => {
            toast({
                title: 'Organizaciones archivadas',
                description: `${ids.length} organizaciones fueron suspendidas correctamente.`,
            });
        },
        onError: (err) => {
            toast({
                title: 'Error masivo',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSettled: () => {
            setUpdatingTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    const updateOrganization = useCallback(async (id: string, updates: Partial<Organization>) => {
        return updateMutation.mutateAsync({ id, updates });
    }, [updateMutation]);

    const deleteOrganization = useCallback(async (id: string) => {
        return deleteMutation.mutateAsync(id);
    }, [deleteMutation]);

    const bulkUpdateOrganizations = useCallback(async (ids: string[], updates: Partial<Organization>) => {
        return bulkUpdateMutation.mutateAsync({ ids, updates });
    }, [bulkUpdateMutation]);

    const bulkDeleteOrganizations = useCallback(async (ids: string[]) => {
        return bulkDeleteMutation.mutateAsync(ids);
    }, [bulkDeleteMutation]);

    const suspendOrganization = useCallback(async (id: string) => {
        return updateOrganization(id, { subscription_status: 'SUSPENDED' });
    }, [updateOrganization]);

    const activateOrganization = useCallback(async (id: string) => {
        return updateOrganization(id, { subscription_status: 'ACTIVE' });
    }, [updateOrganization]);

    const changeSubscriptionPlan = useCallback(async (id: string, plan: string) => {
        return updateOrganization(id, { subscription_plan: plan });
    }, [updateOrganization]);

    return {
        organizations,
        loading,
        error,
        totalCount,
        metrics,
        refresh: refetch,
        isFetching,
        isRealtimeConnected,
        lastUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
        updating: updatingTarget,
        isUpdating: updateMutation.isPending || deleteMutation.isPending || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending,
        updateOrganization,
        deleteOrganization,
        bulkUpdateOrganizations,
        bulkDeleteOrganizations,
        suspendOrganization,
        activateOrganization,
        changeSubscriptionPlan,
    };
}
