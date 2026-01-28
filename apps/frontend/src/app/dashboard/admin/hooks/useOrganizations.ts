import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';
import { OrganizationFilters } from './useAdminFilters';

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

    const supabase = createClient();

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

                // Revenue filter - this is calculated, so we'll filter client-side
                // Member count filter - would need a join or separate query
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
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [supabase, filters, sortBy, sortOrder, page, pageSize]);

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

    // Update organization
    const updateOrganization = useCallback(async (
        id: string,
        updates: Partial<Organization>
    ) => {
        try {
            const { error: updateError } = await supabase
                .from('organizations')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;

            // Refresh data
            await fetchOrganizations();
            return { success: true };
        } catch (err: any) {
            console.error('Error updating organization:', err);
            return { success: false, error: err.message };
        }
    }, [supabase, fetchOrganizations]);

    // Delete organization
    const deleteOrganization = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('organizations')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Refresh data
            await fetchOrganizations();
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting organization:', err);
            return { success: false, error: err.message };
        }
    }, [supabase, fetchOrganizations]);

    // Suspend organization
    const suspendOrganization = useCallback(async (id: string) => {
        return updateOrganization(id, { subscription_status: 'SUSPENDED' });
    }, [updateOrganization]);

    // Activate organization
    const activateOrganization = useCallback(async (id: string) => {
        return updateOrganization(id, { subscription_status: 'ACTIVE' });
    }, [updateOrganization]);

    // Change subscription plan
    const changeSubscriptionPlan = useCallback(async (
        id: string,
        plan: string
    ) => {
        return updateOrganization(id, { subscription_plan: plan });
    }, [updateOrganization]);

    return {
        organizations,
        loading,
        error,
        totalCount,
        page,
        setPage,
        pageSize,
        refresh: fetchOrganizations,
        updateOrganization,
        deleteOrganization,
        suspendOrganization,
        activateOrganization,
        changeSubscriptionPlan,
    };
}
