'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import type { Product, Category } from '@/types';
import { useHybridProducts } from '../hooks/useHybridProducts';

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
  hasImages?: boolean;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ProductsContextValue {
  // Data
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  
  // State
  filters: ProductFilters;
  pagination: PaginationState;
  activeTab: string;
  selectedProducts: string[];
  
  // Dashboard stats
  dashboardStats: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
    recentlyAdded: number;
    topCategory: string;
  };
  
  // Actions
  actions: {
    // Data actions
    refetch: () => Promise<void>;
    loadMore: () => Promise<void>;
    clearCache: () => void;
    
    // CRUD actions
    createProduct: (data: any) => Promise<boolean>;
    updateProduct: (id: string, data: any) => Promise<boolean>;
    deleteProduct: (id: string, name: string) => Promise<boolean>;
    bulkDelete: (ids: string[]) => Promise<boolean>;
    bulkUpdate: (ids: string[], updates: Partial<Product>) => Promise<boolean>;
    
    // State actions
    updateFilters: (filters: Partial<ProductFilters>) => void;
    setActiveTab: (tab: string) => void;
    setPage: (page: number) => void;
    setItemsPerPage: (limit: number) => void;
    
    // Selection actions
    selectProduct: (id: string) => void;
    deselectProduct: (id: string) => void;
    selectAllProducts: (ids: string[]) => void;
    clearSelection: () => void;
    
    // Navigation actions
    viewProduct: (id: string) => void;
    editProduct: (product: Product) => void;
    
    // Mode control
    switchToMockData: () => void;
    switchToSupabase: () => void;
  };
  
  // Mode info
  isMockMode: boolean;
  canRetrySupabase: boolean;
  
  // Computed values
  computed: {
    filteredProducts: Product[];
    paginatedProducts: Product[];
    hasActiveFilters: boolean;
    selectedCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

interface ProductsProviderProps {
  children: ReactNode;
  initialFilters?: Partial<ProductFilters>;
}

export function ProductsProvider({ children, initialFilters = {} }: ProductsProviderProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(() => initialFilters);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = React.useMemo(() => filters, [
    filters.search,
    filters.categoryId,
    filters.supplierId,
    filters.minPrice,
    filters.maxPrice,
    filters.minStock,
    filters.maxStock,
    filters.isActive,
    filters.dateFrom,
    filters.dateTo,
    filters.stockStatus,
    filters.sortBy,
    filters.sortOrder
  ]);

  const {
    isLoading,
    dashboardStats,
    categories,
    products,
    error: productsError,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    total,
    hasMore,
    loadMore,
    clearCache,
    pagination,
    isMockMode,
    switchToMockData,
    switchToSupabase,
    canRetrySupabase
  } = useHybridProducts({ filters: memoizedFilters, enableRealtime: true, pageSize: 25, page: 1 });
  
  // Simple actions to avoid loops
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    // Don't auto-refetch to avoid infinite loops - let the hook handle it
  }, []);
  
  const selectProduct = useCallback((id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev : [...prev, id]);
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
  
  const pg = pagination ?? { page: 1, pageSize: 25, total: total ?? 0 } as any;
  
  const actions = React.useMemo(() => ({
    refetch: async () => { await refetch(); },
    loadMore: async () => { loadMore(); },
    clearCache: () => { clearCache(); },
    createProduct: async (data: any) => { const r = await createProduct(data as any); return Boolean(r); },
    updateProduct: async (id: string, data: any) => { const r = await updateProduct(id, data as any); return Boolean(r); },
    deleteProduct: async (id: string, name: string) => { const r = await deleteProduct(id); return Boolean(r); },
    bulkDelete: async (ids: string[]) => { await Promise.all(ids.map(id => deleteProduct(id))); clearSelection(); return true; },
    bulkUpdate: async (ids: string[], updates: Partial<Product>) => { await Promise.all(ids.map(id => updateProduct(id, updates as any))); clearSelection(); return true; },
    updateFilters,
    setActiveTab,
    setPage: (page: number) => { /* Let the hook handle pagination */ },
    setItemsPerPage: (limit: number) => { /* Let the hook handle page size changes */ },
    selectProduct,
    deselectProduct,
    selectAllProducts,
    clearSelection,
    viewProduct: (id: string) => { /* navigation can be added */ },
    editProduct: (product: Product) => { /* open edit drawer */ },
    switchToMockData,
    switchToSupabase
  }), [
    refetch, loadMore, clearCache, createProduct, updateProduct, deleteProduct,
    updateFilters, setActiveTab, selectProduct, deselectProduct, selectAllProducts,
    clearSelection, switchToMockData, switchToSupabase
  ]);
  
  // Computed values with real data
  const computed = React.useMemo(() => ({
    filteredProducts: products as Product[],
    paginatedProducts: products as Product[],
    hasActiveFilters: Object.keys(memoizedFilters).some(key => 
      memoizedFilters[key as keyof ProductFilters] !== undefined && 
      memoizedFilters[key as keyof ProductFilters] !== ''
    ),
    selectedCount: selectedProducts.length,
    totalPages: Math.ceil((pg.total ?? products.length) / (pg.pageSize ?? 25)),
    hasMore: Boolean(hasMore)
  }), [products, memoizedFilters, selectedProducts.length, pg.total, pg.pageSize, hasMore]);
  
  const paginationMemo = React.useMemo(() => ({
    page: (pg.page ?? 1) as number,
    limit: (pg.pageSize ?? 25) as number,
    total: (pg.total ?? products.length) as number,
    hasNext: Boolean(hasMore),
    hasPrev: ((pg.page ?? 1) as number) > 1
  }), [pg.page, pg.pageSize, pg.total, products.length, hasMore]);

  const value: ProductsContextValue = React.useMemo(() => ({
    products: products as Product[],
    categories,
    loading: isLoading,
    error: productsError,
    
    // State
    filters: memoizedFilters,
    pagination: paginationMemo,
    activeTab,
    selectedProducts,
    dashboardStats,
    
    // Actions and computed
    actions,
    computed,
    
    // Mode info
    isMockMode,
    canRetrySupabase
  }), [
    products, categories, isLoading, productsError, memoizedFilters, paginationMemo,
    activeTab, selectedProducts, dashboardStats, actions, computed,
    isMockMode, canRetrySupabase
  ]);
  
  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
}

export type { ProductFilters, PaginationState, ProductsContextValue };
