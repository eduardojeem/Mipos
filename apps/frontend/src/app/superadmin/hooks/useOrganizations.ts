import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Organization } from './useAdminData';
import { OrganizationFilters } from './useAdminFilters';
import { useToast } from '@/components/ui/use-toast';

interface UseOrganizationsOptions {
    filters?: Partial<OrganizationFilters>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
    page?: number;
}

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

    // Query key for caching
    const queryKey = useMemo(() => 
        ['admin', 'organizations', { filters, sortBy, sortOrder, pageSize, page }], 
        [filters, sortBy, sortOrder, pageSize, page]
    );

    // Fetch organizations using React Query
    const {
        data,
        isLoading: loading,
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

            if (filters?.search) params.append('search', filters.search);
            if (filters?.status && filters.status.length > 0) {
                params.append('status', filters.status[0]);
            }
            if (filters?.plan && filters.plan.length > 0) {
                params.append('plan', filters.plan[0]);
            }

            const response = await fetch(`/api/superadmin/organizations?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar organizaciones');
            }

            return await response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const organizations = data?.organizations || [];
    const totalCount = data?.total || 0;
    const error = queryError instanceof Error ? queryError.message : null;

    // Mutation for updating an organization
    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Organization> }) => {
            const response = await fetch('/api/superadmin/organizations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar organización');
            }

            return await response.json();
        },
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['admin', 'organizations'] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(queryKey);

            // Optimistically update to the new value
            queryClient.setQueryData(queryKey, (old: { organizations: Organization[]; total: number } | undefined) => ({
                ...old,
                organizations: old?.organizations?.map((org: Organization) => 
                    org.id === id ? { ...org, ...updates } : org
                ) || [],
                total: old?.total || 0,
            }));

            return { previousData };
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(queryKey, context?.previousData);
            toast({
                title: 'Error al actualizar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: () => {
            toast({
                title: 'Actualización exitosa',
                description: 'La organización se actualizó correctamente.',
            });
        },
        onSettled: () => {
            // Always refetch after error or success to ensure we have the correct data
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    // Mutation for deleting an organization
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/superadmin/organizations?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar organización');
            }

            return await response.json();
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'organizations'] });
            const previousData = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: { organizations: Organization[]; total: number } | undefined) => ({
                ...old,
                organizations: old?.organizations?.filter((org: Organization) => org.id !== id) || [],
                total: (old?.total || 0) - 1,
            }));

            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(queryKey, context?.previousData);
            toast({
                title: 'Error al eliminar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: () => {
            toast({
                title: 'Eliminación exitosa',
                description: 'La organización se eliminó correctamente.',
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    // Mutation for bulk updating organizations
    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Organization> }) => {
            const response = await fetch('/api/superadmin/organizations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, ...updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en actualización masiva');
            }

            return await response.json();
        },
        onSuccess: (_, { ids }) => {
            toast({
                title: 'Organizaciones actualizadas',
                description: `${ids.length} organizaciones han sido actualizadas.`,
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
        onError: (err) => {
            toast({
                title: 'Error masivo',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        }
    });

    // Mutation for bulk deleting organizations
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await fetch(`/api/superadmin/organizations?ids=${ids.join(',')}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en eliminación masiva');
            }

            return await response.json();
        },
        onSuccess: (_, ids) => {
            toast({
                title: 'Organizaciones eliminadas',
                description: `${ids.length} organizaciones han sido eliminadas.`,
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
        onError: (err) => {
            toast({
                title: 'Error masivo',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        }
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
        refresh: refetch,
        updating: updateMutation.isPending || deleteMutation.isPending || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending ? 'loading' : null,
        updateOrganization,
        deleteOrganization,
        bulkUpdateOrganizations,
        bulkDeleteOrganizations,
        suspendOrganization,
        activateOrganization,
        changeSubscriptionPlan,
    };
}
