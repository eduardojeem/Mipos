import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Organization } from './useAdminData';
import { useToast } from '@/components/ui/use-toast';

export function useOrganization(id: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Query key for caching
    const queryKey = useMemo(() => ['admin', 'organization', id], [id]);

    // Fetch organization using React Query
    const {
        data,
        isLoading: loading,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!id) return null;
            const response = await fetch(`/api/superadmin/organizations/${id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar la organización');
            }
            const result = await response.json();
            return result.organization as Organization;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    const organization = data || null;
    const error = queryError instanceof Error ? queryError.message : null;

    // Mutation for updating the organization
    const updateMutation = useMutation({
        mutationFn: async (updates: Partial<Organization>) => {
            if (!id) throw new Error('No ID provided');
            const response = await fetch(`/api/superadmin/organizations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar organización');
            }

            const result = await response.json();
            return result.organization as Organization;
        },
        onMutate: async (updates) => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<Organization>(queryKey);

            if (previousData) {
                queryClient.setQueryData<Organization>(queryKey, {
                    ...previousData,
                    ...updates,
                });
            }

            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            toast({
                title: 'Error al actualizar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: (updatedOrg) => {
            queryClient.setQueryData(queryKey, updatedOrg);
            toast({
                title: 'Actualización exitosa',
                description: 'La organización se actualizó correctamente.',
            });
            // Also invalidate the list query to keep it in sync
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    const updateOrganization = useCallback(async (updates: Partial<Organization>) => {
        return updateMutation.mutateAsync(updates);
    }, [updateMutation]);

    return {
        organization,
        loading,
        error,
        updating: updateMutation.isPending,
        refresh: refetch,
        updateOrganization,
    };
}
