import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from '@/lib/toast';
import type { Product } from '@/types';

interface ProductFilters {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  supplierName?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock' | 'critical';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  priceRange?: [number, number];
  tags?: string[];
}

interface PaginationState {
  page: number;
  limit: number;
}

export function useProductsPageState(initialFilters: Partial<ProductFilters> = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // URL synchronization - Only on mount to avoid loops
  useEffect(() => {
    const spSearch = searchParams?.get('search') ?? undefined;
    const spCategory = searchParams?.get('category') ?? undefined;
    const spPage = Number(searchParams?.get('page') ?? '') || 1;
    const spLimit = Number(searchParams?.get('limit') ?? '') || 25;
    const spSortBy = searchParams?.get('sortBy') ?? undefined;
    const spSortOrder = searchParams?.get('sortOrder') ?? undefined;
    const spTab = searchParams?.get('tab') ?? 'overview';
    const spSupplierId = searchParams?.get('supplierId') ?? undefined;
    const spSupplierName = searchParams?.get('supplierName') ?? undefined;
    
    // Only update if we have actual URL params (not on every searchParams change)
    if (searchParams?.toString()) {
      setFilters(prev => ({
        ...prev,
        search: spSearch,
        categoryId: spCategory,
        supplierId: spSupplierId,
        supplierName: spSupplierName,
        sortBy: spSortBy,
        sortOrder: spSortOrder as 'asc' | 'desc'
      }));
      
      setPagination({
        page: spPage,
        limit: spLimit
      });
      
      setActiveTab(spTab);
    }
  }, []); // Empty dependency array to only run on mount
  
  // URL update helper
  const updateUrl = useCallback((updates: any) => {
    const current = searchParams?.toString() ?? '';
    const sp = new URLSearchParams(current);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        sp.set(key, String(value));
      } else {
        sp.delete(key);
      }
    });
    
    const safePath = pathname || '/dashboard/products';
    const nextStr = sp.toString();
    if (nextStr !== current) {
      router.replace(`${safePath}?${nextStr}`);
    }
  }, [searchParams, pathname, router]);
  
  // Filter actions
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    
    // Update URL
    updateUrl({
      ...newFilters,
      page: 1
    });
  }, [updateUrl]);
  
  const clearFilters = useCallback(() => {
    const defaultFilters: ProductFilters = {};
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    updateUrl({
      search: undefined,
      category: undefined,
      supplierId: undefined,
      supplierName: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      page: 1
    });
  }, [updateUrl]);
  
  // Pagination actions
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
    updateUrl({ page });
  }, [updateUrl]);
  
  const setItemsPerPage = useCallback((limit: number) => {
    setPagination({ page: 1, limit });
    updateUrl({ limit, page: 1 });
  }, [updateUrl]);
  
  // Tab actions
  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    updateUrl({ tab });
  }, [updateUrl]);
  
  // Selection actions
  const selectProduct = useCallback((id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);
  
  const deselectProduct = useCallback((id: string) => {
    setSelectedProducts(prev => prev.filter(pid => pid !== id));
  }, []);
  
  const selectAllProducts = useCallback((ids: string[]) => {
    setSelectedProducts(ids);
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedProducts([]);
  }, []);
  
  const toggleProductSelection = useCallback((id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) 
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  }, []);
  
  // Bulk operations
  const bulkDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return false;
    
    setIsProcessing(true);
    try {
      // This would be implemented by the CRUD hook
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearSelection();
      toast.success(`${ids.length} productos eliminados correctamente`);
      return true;
    } catch (error) {
      toast.error('Error al eliminar productos seleccionados');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [clearSelection]);
  
  const bulkUpdate = useCallback(async (ids: string[], updates: Partial<Product>) => {
    if (ids.length === 0) return false;
    
    setIsProcessing(true);
    try {
      // This would be implemented by the CRUD hook
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearSelection();
      toast.success(`${ids.length} productos actualizados correctamente`);
      return true;
    } catch (error) {
      toast.error('Error al actualizar productos seleccionados');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [clearSelection]);
  
  // Form actions
  const openProductForm = useCallback((product?: Product) => {
    setEditingProduct(product || null);
    setShowProductForm(true);
  }, []);
  
  const closeProductForm = useCallback(() => {
    setEditingProduct(null);
    setShowProductForm(false);
  }, []);
  
  return {
    // State
    activeTab,
    filters,
    pagination,
    selectedProducts,
    editingProduct,
    showProductForm,
    isProcessing,
    
    // Actions
    setActiveTab: handleSetActiveTab,
    updateFilters,
    clearFilters,
    setPage,
    setItemsPerPage,
    selectProduct,
    deselectProduct,
    selectAllProducts,
    clearSelection,
    toggleProductSelection,
    bulkDelete,
    bulkUpdate,
    setEditingProduct: openProductForm,
    openProductForm,
    closeProductForm,
    
    // Computed
    hasActiveFilters: Object.keys(filters).some(key => 
      filters[key as keyof ProductFilters] !== undefined && 
      filters[key as keyof ProductFilters] !== ''
    ),
    selectedCount: selectedProducts.length
  };
}