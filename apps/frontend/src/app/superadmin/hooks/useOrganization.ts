import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Organization } from './useAdminData';

export interface OrganizationSubscriptionDetail {
    id: string;
    organizationId: string;
    plan: {
        id: string;
        name: string;
        slug: string;
        priceMonthly: number;
        priceYearly: number;
        features: string[];
        limits: {
            maxUsers: number;
            maxProducts: number;
            maxTransactionsPerMonth: number;
            maxLocations: number;
        };
        description?: string | null;
        currency: string;
        trialDays: number;
    };
    status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'suspended';
    billingCycle: 'monthly' | 'yearly';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    daysUntilRenewal: number;
    createdAt: string;
}

export interface OrganizationUsageDetail {
    users: number;
    products: number;
    locations: number;
    transactions: number;
}

export interface OrganizationDetail extends Organization {
    subscription?: OrganizationSubscriptionDetail | null;
    usage?: OrganizationUsageDetail | null;
}

export function useOrganization(id: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

    const queryKey = useMemo(() => ['admin', 'organization', id], [id]);

    const {
        data,
        isLoading: loading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!id) return null;
            const response = await fetch(`/api/superadmin/organizations/${id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar la organizacion');
            }
            const result = await response.json();
            return result.organization as OrganizationDetail;
        },
        enabled: Boolean(id),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (!id) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        };

        const channel = supabase
            .channel(`superadmin-organization-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations', filter: `id=eq.${id}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_members', filter: `organization_id=eq.${id}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'saas_subscriptions', filter: `organization_id=eq.${id}` }, invalidate)
            .subscribe((status) => {
                setIsRealtimeConnected(status === 'SUBSCRIBED');
            });

        return () => {
            setIsRealtimeConnected(false);
            void supabase.removeChannel(channel);
        };
    }, [id, queryClient, queryKey, supabase]);

    const organization = data || null;
    const error = queryError instanceof Error ? queryError.message : null;

    const updateMutation = useMutation({
        mutationFn: async (updates: Partial<OrganizationDetail> & { billingCycle?: 'monthly' | 'yearly' }) => {
            if (!id) throw new Error('No ID provided');
            const response = await fetch(`/api/superadmin/organizations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar organizacion');
            }

            const result = await response.json();
            return result.organization as OrganizationDetail;
        },
        onMutate: async (updates) => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<OrganizationDetail>(queryKey);

            if (previousData) {
                queryClient.setQueryData<OrganizationDetail>(queryKey, {
                    ...previousData,
                    ...updates,
                });
            }

            return { previousData };
        },
        onError: (err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            toast({
                title: 'Error al actualizar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            });
        },
        onSuccess: (updatedOrganization) => {
            queryClient.setQueryData(queryKey, updatedOrganization);
            toast({
                title: 'Actualizacion exitosa',
                description: 'La organizacion se actualizo correctamente.',
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
        },
    });

    const updateOrganization = useCallback(async (updates: Partial<OrganizationDetail> & { billingCycle?: 'monthly' | 'yearly' }) => {
        return updateMutation.mutateAsync(updates);
    }, [updateMutation]);

    return {
        organization,
        loading,
        isFetching,
        isRealtimeConnected,
        error,
        updating: updateMutation.isPending,
        refresh: refetch,
        updateOrganization,
    };
}
