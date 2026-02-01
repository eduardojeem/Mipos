import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { SupplierWithStats } from '@/types/suppliers';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseActive } from '@/lib/env';

// Helper to get current organization ID
const getOrganizationId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return null;
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      return parsed?.id || parsed?.organization_id || null;
    }
    return raw;
  } catch {
    return null;
  }
};

export function useSuppliers(params?: { page?: number; limit?: number; search?: string }) {
  const { page = 1, limit = 10, search = '' } = params || {};

  return useQuery({
    queryKey: ['suppliers', page, limit, search],
    queryFn: async () => {
      if (isSupabaseActive()) {
        const supabase = createClient();
        const orgId = getOrganizationId();
        
        let query = supabase
          .from('suppliers')
          .select('*, _count:purchase_orders(count)', { count: 'exact' }); // Mocking count logic via join if needed or separate

        // Note: _count for purchase_orders needs proper setup or separate query.
        // For simplicity, we fetch basic supplier data.
        
        if (orgId) {
          query = query.eq('organization_id', orgId);
        }

        if (search) {
          query = query.ilike('name', `%${search}%`);
        }
        
        const { data, count, error } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Transform to match API structure
        return {
          suppliers: data,
          total: count || 0,
          page,
          totalPages: Math.ceil((count || 0) / limit)
        };
      }
      
      const { data } = await api.get('/suppliers', { params: { page, limit, search } });
      return data;
    },
    placeholderData: (prev: any) => prev,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierData: any) => {
      if (isSupabaseActive()) {
        const supabase = createClient();
        const orgId = getOrganizationId();
        
        if (!orgId) throw new Error('No hay organización seleccionada');

        const { data, error } = await supabase
          .from('suppliers')
          .insert({ ...supplierData, organization_id: orgId })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }

      const { data } = await api.post('/suppliers', supplierData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor creado correctamente' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Error al crear el proveedor',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (isSupabaseActive()) {
        const supabase = createClient();
        const orgId = getOrganizationId();
        
        if (!orgId) throw new Error('No hay organización seleccionada');

        const { data: updated, error } = await supabase
          .from('suppliers')
          .update({ ...data, organization_id: orgId }) // Keep orgId
          .eq('id', id)
          .eq('organization_id', orgId) // Security check
          .select()
          .single();
          
        if (error) throw error;
        return updated;
      }

      const { data: response } = await api.put(`/suppliers/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor actualizado correctamente' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Error al actualizar el proveedor',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isSupabaseActive()) {
        const supabase = createClient();
        const orgId = getOrganizationId();
        
        if (!orgId) throw new Error('No hay organización seleccionada');

        const { error } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', id)
          .eq('organization_id', orgId);
          
        if (error) throw error;
        return;
      }

      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor eliminado correctamente' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Error al eliminar el proveedor',
        variant: 'destructive',
      });
    },
  });
}
