import { useState, useEffect, useCallback, useRef } from 'react';
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

            // Build query params
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                sortBy,
                sortOrder,
            });

            if (currentFilters?.search) params.append('search', currentFilters.search);
            if (currentFilters?.status && currentFilters.status.length > 0) {
                params.append('status', currentFilters.status[0]); // API currently supports single status from URL
            }
            if (currentFilters?.plan && currentFilters.plan.length > 0) {
                params.append('plan', currentFilters.plan[0]);
            }

            const response = await fetch(`/api/superadmin/organizations?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar organizaciones');
            }

            const data = await response.json();
            setOrganizations(data.organizations || []);
            setTotalCount(data.total || 0);
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
    }, [page]); // Only depend on page

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);


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
            const response = await fetch('/api/superadmin/organizations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar organización');
            }

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
    }, [organizations, fetchOrganizations]);

    // Delete organization with confirmation
    const deleteOrganization = useCallback(async (id: string) => {
        setUpdating(id);
        
        // Optimistic update
        const previousOrgs = [...organizations];
        setOrganizations(orgs => orgs.filter(org => org.id !== id));

        try {
            const response = await fetch(`/api/superadmin/organizations?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar organización');
            }

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
    }, [organizations, fetchOrganizations]);

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
