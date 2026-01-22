import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { SupplierWithStats } from '@/types/suppliers';

export function useSuppliers(params?: { page?: number; limit?: number; search?: string }) {
  const { page = 1, limit = 10, search = '' } = params || {};

  return useQuery({
    queryKey: ['suppliers', page, limit, search],
    queryFn: async () => {
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
        description: error.response?.data?.message || 'Error al crear el proveedor',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
        description: error.response?.data?.message || 'Error al actualizar el proveedor',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor eliminado correctamente' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al eliminar el proveedor',
        variant: 'destructive',
      });
    },
  });
}
