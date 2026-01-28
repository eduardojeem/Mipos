import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';
import { OrganizationFilters } from './useAdminFilters';
import { useToast } from '@/components/ui/use-toast';

interface UseOrganizationsOptions {
    filters?: OrganizationFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
}

export function useOrganizations(options: UseOrganizationsOptions = {}) {
    const {
        filters,
        sortBy = 'created_at',
        sortOrder = 'desc',
        pageSize = 50,
    } = options;

    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [updating, setUpdating] = useState<string | null>(null);

    const supabase = createClient();
    const { toast } = useToast();

    const fetchOrganizations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('organizations')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters) {
                // Search filter
                if (filters.search) {
                    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
                }

                // Plan filter
                if (filters.plan && filters.plan.length > 0) {
                    query = query.in('subscription_plan', filters.plan);
                }

                // Status filter
                if (filters.status && filters.status.length > 0) {
                    query = query.in('subscription_status', filters.status);
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

            // Apply client-side filters if needed
            let filteredData = data || [];

            if (filters?.revenueMin !== null || filters?.revenueMax !== null) {
                filteredData = filteredData.filter(org => {
                    const revenue = calculateOrgRevenue(org);
                    if (filters.revenueMin !== null && revenue < filters.revenueMin) return false;
                    if (filters.revenueMax !== null && revenue > filters.revenueMax) return false;
                    return true;
                });
            }

            setOrganizations(filteredData);
            setTotalCount(count || 0);
        } catch (err: any) {
            console.error('Error fetching organizations:', err);
            const errorMessage = err.message || 'Error al cargar organizaciones';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [supabase, filters, sortBy, sortOrder, page, pageSize, toast]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    // Calculate revenue for an organization
    const calculateOrgRevenue = (org: Organization): number => {
        if (org.subscription_status !== 'ACTIVE') return 0;
        if (org.subscription_plan === 'PRO') return 29;
        if (org.subscription_plan === 'ENTERPRISE') return 99;
        return 0;
    };

    // Update organization with optimistic update
    const updateOrganization = useCallback(async (
        id: string,
        updates: Partial<Organization>
    ) => {
        setUpdating(id);
        
        // Optimistic update
        const previousOrgs = [...organizations];
        setOrganizations(orgs => 
            orgs.map(org => org.id === id ? { ...org, ...updates } : org)
        );

        try {
            const { error: updateError } = await supabase
                .from('organizations')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;

            toast({
                title: 'Actualización exitosa',
                description: 'La organización se actualizó correctamente.',
            });

            // Refresh to get latest data
            await fetchOrganizations();
            return { success: true };
        } catch (err: any) {
            console.error('Error updating organization:', err);
            
            // Revert optimistic update
            setOrganizations(previousOrgs);
            
            const errorMessage = err.message || 'Error al actualizar organización';
            toast({
                title: 'Error al actualizar',
                description: errorMessage,
                variant: 'destructive',
            });
            
            return { success: false, error: errorMessage };
        } finally {
            setUpdating(null);
        }
    }, [supabase, organizations, fetchOrganizations, toast]);

    // Delete organization with confirmation
    const deleteOrganization = useCallback(async (id: string) => {
        setUpdating(id);
        
        // Optimistic update
        const previousOrgs = [...organizations];
        setOrganizations(orgs => orgs.filter(org => org.id !== id));

        try {
            const { error: deleteError } = await supabase
                .from('organizations')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            toast({
                title: 'Eliminación exitosa',
                description: 'La organización se eliminó correctamente.',
            });

            // Refresh to update counts
            await fetchOrganizations();
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting organization:', err);
            
            // Revert optimistic update
            setOrganizations(previousOrgs);
            
            const errorMessage = err.message || 'Error al eliminar organización';
            toast({
                title: 'Error al eliminar',
                description: errorMessage,
                variant: 'destructive',
            });
            
            return { success: false, error: errorMessage };
        } finally {
            setUpdating(null);
        }
    }, [supabase, organizations, fetchOrganizations, toast]);

    // Suspend organization
    const suspendOrganization = useCallback(async (id: string) => {
        const result = await updateOrganization(id, { subscription_status: 'SUSPENDED' });
        if (result.success) {
            toast({
                title: 'Organización suspendida',
                description: 'La organización ha sido suspendida exitosamente.',
                variant: 'default',
            });
        }
        return result;
    }, [updateOrganization, toast]);

    // Activate organization
    const activateOrganization = useCallback(async (id: string) => {
        const result = await updateOrganization(id, { subscription_status: 'ACTIVE' });
        if (result.success) {
            toast({
                title: 'Organización activada',
                description: 'La organización ha sido activada exitosamente.',
                variant: 'default',
            });
        }
        return result;
    }, [updateOrganization, toast]);

    // Change subscription plan
    const changeSubscriptionPlan = useCallback(async (
        id: string,
        plan: string
    ) => {
        const result = await updateOrganization(id, { subscription_plan: plan });
        if (result.success) {
            toast({
                title: 'Plan actualizado',
                description: `El plan se cambió a ${plan} exitosamente.`,
            });
        }
        return result;
    }, [updateOrganization, toast]);

    return {
        organizations,
        loading,
        error,
        totalCount,
        page,
        setPage,
        pageSize,
        updating,
        refresh: fetchOrganizations,
        updateOrganization,
        deleteOrganization,
        suspendOrganization,
        activateOrganization,
        changeSubscriptionPlan,
    };
}
