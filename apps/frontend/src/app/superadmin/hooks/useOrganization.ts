import { useState, useEffect, useCallback } from 'react';
import { Organization } from './useAdminData';
import { useToast } from '@/components/ui/use-toast';

export function useOrganization(id: string) {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    const { toast } = useToast();

    const fetchOrganization = useCallback(async () => {
        if (!id) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`/api/superadmin/organizations/${id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar la organización');
            }

            const data = await response.json();
            setOrganization(data.organization);
        } catch (err: unknown) {
            console.error('Error fetching organization:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al cargar la organización';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    const updateOrganization = useCallback(async (updates: Partial<Organization>) => {
        if (!id) return { success: false, error: 'No ID provided' };

        setUpdating(true);
        
        try {
            const response = await fetch(`/api/superadmin/organizations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar organización');
            }

            const data = await response.json();
            setOrganization(data.organization);

            toast({
                title: 'Actualización exitosa',
                description: 'La organización se actualizó correctamente.',
            });

            return { success: true };
        } catch (err: unknown) {
            console.error('Error updating organization:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar organización';
            toast({
                title: 'Error al actualizar',
                description: errorMessage,
                variant: 'destructive',
            });
            return { success: false, error: errorMessage };
        } finally {
            setUpdating(false);
        }
    }, [id, toast]);

    return {
        organization,
        loading,
        error,
        updating,
        refresh: fetchOrganization,
        updateOrganization,
    };
}
