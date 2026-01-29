import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';
import { useToast } from '@/components/ui/use-toast';

export function useOrganization(id: string) {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    const supabase = createClient();
    const { toast } = useToast();

    const fetchOrganization = useCallback(async () => {
        if (!id) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const { data, error: fetchError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            setOrganization(data);
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
    }, [supabase, id, toast]);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    const updateOrganization = useCallback(async (updates: Partial<Organization>) => {
        if (!id) return { success: false, error: 'No ID provided' };

        setUpdating(true);
        
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await supabase
                .from('organizations')
                .update(updates as any)
                .eq('id', id);

            if (updateError) throw updateError;

            toast({
                title: 'Actualización exitosa',
                description: 'La organización se actualizó correctamente.',
            });

            await fetchOrganization();
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
    }, [supabase, id, fetchOrganization, toast]);

    return {
        organization,
        loading,
        error,
        updating,
        refresh: fetchOrganization,
        updateOrganization,
    };
}
