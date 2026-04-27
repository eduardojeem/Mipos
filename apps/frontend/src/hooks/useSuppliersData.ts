import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { SupplierWithStats } from '@/types/suppliers';
import { CreateSupplierFormData } from '@/lib/validation-schemas';

export interface SuppliersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  category?: string;
  sortBy?: 'name' | 'totalPurchases' | 'totalOrders' | 'lastPurchase' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

function getSelectedOrganizationId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.id || '').trim();
  } catch {
    return '';
  }
}

const defaultStats = {
  totalSuppliers: 0,
  newThisMonth: 0,
  activeSuppliers: 0,
  totalPurchases: 0,
  totalOrders: 0,
};

export function useSuppliers(params?: SuppliersQueryParams) {
  const organizationId = getSelectedOrganizationId();
  const {
    page = 1,
    limit = 25,
    search = '',
    status = 'all',
    category = 'all',
    sortBy = 'name',
    sortOrder = 'asc'
  } = params || {};

  return useQuery({
    queryKey: ['suppliers', organizationId, page, limit, search, status, category, sortBy, sortOrder],
    queryFn: async () => {
      if (!organizationId) {
        return {
          suppliers: [] as SupplierWithStats[],
          pagination: { page, limit, total: 0, pages: 0 },
          stats: defaultStats,
        };
      }

      const res = await api.get('/suppliers', {
        params: {
          page,
          limit,
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
          category: category !== 'all' ? category : undefined,
          sortBy,
          sortOrder,
        },
      });

      return {
        suppliers: (res.data?.suppliers || []) as SupplierWithStats[],
        pagination: res.data?.pagination || { page, limit, total: 0, pages: 0 },
        stats: res.data?.stats || defaultStats,
      };
    },
    placeholderData: (prev) => prev,
    enabled: !!organizationId, // Only fetch when we have an organization
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierData: CreateSupplierFormData) => {
      const res = await api.post('/suppliers', supplierData);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Error al crear el proveedor');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor creado correctamente' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear el proveedor',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSupplierFormData> }) => {
      const res = await api.put(`/suppliers/${id}`, data);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Error al actualizar el proveedor');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor actualizado correctamente' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el proveedor',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/suppliers/${id}`);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Error al eliminar el proveedor');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Éxito', description: 'Proveedor eliminado correctamente' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar el proveedor',
        variant: 'destructive',
      });
    },
  });
}
