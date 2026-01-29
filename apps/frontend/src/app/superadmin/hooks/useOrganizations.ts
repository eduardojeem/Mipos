import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';
import { OrganizationFilters } from './useAdminFilters';
import { useToast } from '@/components/ui/use-toast';

interface UseOrganizationsOptions {
    filters?: Partial<OrganizationFilters>;
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
    
    // Refs for stable dependencies
    const filtersRef = useRef(filters);
    const optionsRef = useRef({ sortBy, sortOrder, pageSize });
    const toastRef = useRef(toast);

    useEffect(() => {
        filtersRef.current = filters;
        optionsRef.current = { sortBy, sortOrder, pageSize };
        toastRef.current = toast;
    }, [filters, sortBy, sortOrder, pageSize, toast]);

    const fetchOrganizations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const currentFilters = filtersRef.current;
            const { sortBy, sortOrder, pageSize } = optionsRef.current;

            let query = supabase
                .from('organizations')
                .select('*', { count: 'exact' });

            // Apply filters
            if (currentFilters) {
                // Search filter
                if (currentFilters.search) {
                    query = query.or(`name.ilike.%${currentFilters.search}%,slug.ilike.%${currentFilters.search}%`);
                }

                // Plan filter
                if (currentFilters.plan && currentFilters.plan.length > 0) {
                    query = query.in('subscription_plan', currentFilters.plan);
                }

                // Status filter
                if (currentFilters.status && currentFilters.status.length > 0) {
                    query = query.in('subscription_status', currentFilters.status);
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

            // Apply client-side filters if needed
            let filteredData = data || [];

            if (currentFilters?.revenueMin !== null || currentFilters?.revenueMax !== null) {
                filteredData = filteredData.filter(org => {
                    const revenue = calculateOrgRevenue(org);
                    if (currentFilters?.revenueMin !== null && currentFilters?.revenueMin !== undefined && revenue < currentFilters.revenueMin) return false;
                    if (currentFilters?.revenueMax !== null && currentFilters?.revenueMax !== undefined && revenue > currentFilters.revenueMax) return false;
                    return true;
                });
            }

            setOrganizations(filteredData);
            setTotalCount(count || 0);
        } catch (err: unknown) {
            console.error('Error fetching organizations:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al cargar organizaciones';
            setError(errorMessage);
            toastRef.current({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [supabase, page]); // Only depend on page and supabase

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await supabase
                .from('organizations')
                .update(updates as any)
                .eq('id', id);

            if (updateError) throw updateError;

            toastRef.current({
                title: 'Actualización exitosa',
                description: 'La organización se actualizó correctamente.',
            });

            // Refresh to get latest data
            await fetchOrganizations();
            return { success: true };
        } catch (err: unknown) {
            console.error('Error updating organization:', err);
            
            // Revert optimistic update
            setOrganizations(previousOrgs);
            
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar organización';
            toastRef.current({
                title: 'Error al actualizar',
                description: errorMessage,
                variant: 'destructive',
            });
            
            return { success: false, error: errorMessage };
        } finally {
            setUpdating(null);
        }
    }, [supabase, organizations, fetchOrganizations]);

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

            toastRef.current({
                title: 'Eliminación exitosa',
                description: 'La organización se eliminó correctamente.',
            });

            // Refresh to update counts
            await fetchOrganizations();
            return { success: true };
        } catch (err: unknown) {
            console.error('Error deleting organization:', err);
            
            // Revert optimistic update
            setOrganizations(previousOrgs);
            
            const errorMessage = err instanceof Error ? err.message : 'Error al eliminar organización';
            toastRef.current({
                title: 'Error al eliminar',
                description: errorMessage,
                variant: 'destructive',
            });
            
            return { success: false, error: errorMessage };
        } finally {
            setUpdating(null);
        }
    }, [supabase, organizations, fetchOrganizations]);

    // Suspend organization
    const suspendOrganization = useCallback(async (id: string) => {
        const result = await updateOrganization(id, { subscription_status: 'SUSPENDED' });
        if (result.success) {
            toastRef.current({
                title: 'Organización suspendida',
                description: 'La organización ha sido suspendida exitosamente.',
                variant: 'default',
            });
        }
        return result;
    }, [updateOrganization]);

    // Activate organization
    const activateOrganization = useCallback(async (id: string) => {
        const result = await updateOrganization(id, { subscription_status: 'ACTIVE' });
        if (result.success) {
            toastRef.current({
                title: 'Organización activada',
                description: 'La organización ha sido activada exitosamente.',
                variant: 'default',
            });
        }
        return result;
    }, [updateOrganization]);

    // Change subscription plan
    const changeSubscriptionPlan = useCallback(async (
        id: string,
        plan: string
    ) => {
        const result = await updateOrganization(id, { subscription_plan: plan });
        if (result.success) {
            toastRef.current({
                title: 'Plan actualizado',
                description: `El plan se cambió a ${plan} exitosamente.`,
            });
        }
        return result;
    }, [updateOrganization]);

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
