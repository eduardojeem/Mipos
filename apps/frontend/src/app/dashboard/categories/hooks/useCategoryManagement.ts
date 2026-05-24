import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/api';
import type { Category } from '@/types';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import api from '@/lib/api';

export interface CategoryWithCount extends Category {
  _count?: {
    products: number;
  };
}

export type SortField = 'name' | 'created_at' | 'products' | 'is_active';
export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'all' | 'active' | 'inactive';

interface SupabaseProductCount {
  count: number;
}

interface SupabaseCategoryRow extends Category {
  products?: SupabaseProductCount[] | { count: number };
}

const PAGE_SIZE = 500;

function normalizeCategory(row: SupabaseCategoryRow): CategoryWithCount {
  let count = 0;

  if (Array.isArray(row.products) && row.products.length > 0) {
    count = row.products[0].count;
  } else if (row.products && !Array.isArray(row.products) && typeof row.products.count === 'number') {
    count = row.products.count;
  }

  return {
    ...row,
    _count: { products: count },
  };
}

export function useCategoryManagement() {
  const { toast } = useToast();
  const { organizationId } = useOrganizationContext();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const getOrgId = useCallback(() => {
    if (organizationId) return organizationId;
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem('selected_organization');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id || parsed?.organization_id || null;
    } catch {
      return null;
    }
  }, [organizationId]);

  const loadCategories = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true);
      const orgId = getOrgId();

      if (!orgId) {
        setCategories([]);
        toast({
          title: 'Organización requerida',
          description: 'Selecciona una organización para ver las categorías.',
          variant: 'destructive',
        });
        return;
      }

      const loaded: SupabaseCategoryRow[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await api.get('/categories', { params: { page, limit: PAGE_SIZE } });
        const rawData = ((res.data?.categories || res.data?.data || []) as unknown) as SupabaseCategoryRow[];
        loaded.push(...rawData);
        totalPages = Number(res.data?.pagination?.totalPages || 1);
        page += 1;
      } while (page <= totalPages);

      setCategories(loaded.map(normalizeCategory));
    } catch (error) {
      console.error('Error loading categories:', error && typeof error === 'object' ? JSON.stringify(error) : error, getErrorMessage(error));
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [getOrgId, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const orgId = getOrgId();
    if (!orgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`categories_changes_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          loadCategories({ silent: true });
          if (payload.eventType === 'INSERT') {
            toast({ title: 'Nueva categoría creada' });
          } else if (payload.eventType === 'DELETE') {
            toast({ title: 'Categoría eliminada' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getOrgId, loadCategories, toast]);

  const getFilteredAndSorted = useCallback((
    searchQuery: string,
    statusFilter: StatusFilter,
    sortField: SortField,
    sortDirection: SortDirection
  ) => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = categories.filter((category) => {
      const matchesSearch = !query ||
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && category.is_active) ||
        (statusFilter === 'inactive' && !category.is_active);

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'products':
          aValue = a._count?.products || 0;
          bValue = b._count?.products || 0;
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [categories]);

  const toggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const orgId = getOrgId();
      if (!orgId) throw new Error('No organization selected');

      const res = await api.put(`/categories/${categoryId}`, { is_active: !currentStatus });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'No se pudo actualizar la categoría');
      }

      setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, is_active: !currentStatus } : c));
      toast({ title: `Categoría ${!currentStatus ? 'activada' : 'desactivada'}` });
    } catch (error) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const productCount = category?._count?.products || 0;

    if (productCount > 0) {
      toast({ title: 'No se puede eliminar', description: `Tiene ${productCount} productos asociados`, variant: 'destructive' });
      return false;
    }

    try {
      const orgId = getOrgId();
      if (!orgId) throw new Error('No organization selected');

      const res = await api.delete(`/categories/${categoryId}`);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'No se pudo eliminar la categoría');
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      toast({ title: 'Categoría eliminada' });
      return true;
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
      return false;
    }
  };

  const bulkAction = async (selectedIds: Set<string>, action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.size === 0) return false;
    const selectedArray = Array.from(selectedIds);

    if (action === 'delete') {
      const categoriesWithProducts = selectedArray.filter((id) => {
        const category = categories.find((c) => c.id === id);
        return (category?._count?.products || 0) > 0;
      });

      if (categoriesWithProducts.length > 0) {
        toast({ title: 'No se puede eliminar', description: `${categoriesWithProducts.length} categoría(s) con productos`, variant: 'destructive' });
        return false;
      }
    }

    setBulkActionLoading(true);

    try {
      const res = await api.post('/categories/bulk', { ids: selectedArray, action });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'No se pudo aplicar la acción masiva');
      }

      if (action === 'delete') {
        setCategories((prev) => prev.filter((c) => !selectedArray.includes(c.id)));
      } else {
        const isActive = action === 'activate';
        setCategories((prev) => prev.map((c) => selectedArray.includes(c.id) ? { ...c, is_active: isActive } : c));
      }

      toast({ title: `${selectedArray.length} categoría(s) procesadas` });
      return true;
    } catch (error) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
      return false;
    } finally {
      setBulkActionLoading(false);
    }
  };

  return {
    categories,
    loading,
    bulkActionLoading,
    getOrgId,
    loadCategories,
    getFilteredAndSorted,
    toggleStatus,
    deleteCategory,
    bulkAction,
  };
}
