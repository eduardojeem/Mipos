'use client';

import { useState, useCallback } from 'react';
import { useSupabaseProducts } from './useSupabaseProducts';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { useAdvancedCache } from './useAdvancedCache';
import { useOfflineManager } from './useOfflineManager';
import type { Product, Category } from '@/types';

interface UseHybridProductsOptions {
  filters?: any;
  enableRealtime?: boolean;
  pageSize?: number;
  page?: number;
  preferMockData?: boolean;
}

// Mock data as fallback
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Labial Rojo Intenso',
    sku: 'LAB-001',
    description: 'Labial de larga duración con acabado mate',
    cost_price: 15000,
    sale_price: 25000,
    stock_quantity: 50,
    min_stock: 5,
    category_id: 'cat-1',
    supplier_id: 'sup-1',
    is_active: true,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
    image_url: undefined,
    images: [],
    discount_percentage: 0,
    category: {
      id: 'cat-1',
      name: 'Maquillaje',
      description: 'Productos de maquillaje',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z'
    },
    supplier: {
      id: 'sup-1',
      name: 'Proveedor Beauty',
      email: 'contacto@beauty.com',
      phone: '+57 300 123 4567',
      address: 'Calle 123 #45-67',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z'
    }
  },
  {
    id: '2',
    name: 'Base Líquida Natural',
    sku: 'BASE-002',
    description: 'Base de maquillaje con cobertura natural',
    cost_price: 35000,
    sale_price: 55000,
    stock_quantity: 25,
    min_stock: 3,
    category_id: 'cat-1',
    supplier_id: 'sup-2',
    is_active: true,
    created_at: '2024-12-02T00:00:00Z',
    updated_at: '2024-12-02T00:00:00Z',
    image_url: undefined,
    images: [],
    discount_percentage: 0,
    category: {
      id: 'cat-1',
      name: 'Maquillaje',
      description: 'Productos de maquillaje',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z'
    },
    supplier: {
      id: 'sup-2',
      name: 'Cosmetics Pro',
      email: 'ventas@cosmeticspro.com',
      phone: '+57 301 987 6543',
      address: 'Carrera 45 #12-34',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z'
    }
  },
  {
    id: '3',
    name: 'Máscara de Pestañas',
    sku: 'MASC-003',
    description: 'Máscara para pestañas voluminosa',
    cost_price: 20000,
    sale_price: 35000,
    stock_quantity: 0,
    min_stock: 5,
    category_id: 'cat-1',
    supplier_id: 'sup-1',
    is_active: true,
    created_at: '2024-12-03T00:00:00Z',
    updated_at: '2024-12-03T00:00:00Z',
    image_url: undefined,
    images: [],
    discount_percentage: 0,
    category: {
      id: 'cat-1',
      name: 'Maquillaje',
      description: 'Productos de maquillaje',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z'
    },
    supplier: {
      id: 'sup-1',
      name: 'Proveedor Beauty',
      email: 'contacto@beauty.com',
      phone: '+57 300 123 4567',
      address: 'Calle 123 #45-67',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z'
    }
  }
];

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Maquillaje',
    description: 'Productos de maquillaje',
    is_active: true,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z'
  },
  {
    id: 'cat-2',
    name: 'Cuidado de la Piel',
    description: 'Productos para el cuidado facial y corporal',
    is_active: true,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z'
  }
];

export function useHybridProducts(options: UseHybridProductsOptions = {}) {
  const [useMockData, setUseMockData] = useState(options.preferMockData || false);
  
  // Performance monitoring
  const { recordApiCall, recordInteraction } = usePerformanceMonitor();
  const { getOrSet } = useAdvancedCache();
  const { executeAction, cacheForOffline } = useOfflineManager();
  
  // Try Supabase first
  const supabaseResult = useSupabaseProducts({
    ...options,
    enableRealtime: !useMockData && options.enableRealtime
  });

  // Mock data calculations
  const calculateMockStats = useCallback(() => {
    const totalValue = mockProducts.reduce((sum, p) => 
      sum + (p.stock_quantity || 0) * (p.cost_price || p.sale_price || 0), 0
    );
    
    const lowStockProducts = mockProducts.filter(p => 
      (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_stock || 5)
    ).length;
    
    const outOfStockProducts = mockProducts.filter(p => 
      (p.stock_quantity || 0) === 0
    ).length;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyAdded = mockProducts.filter(p => 
      new Date(p.created_at || 0).getTime() >= weekAgo
    ).length;

    return {
      totalProducts: mockProducts.length,
      lowStockProducts,
      outOfStockProducts,
      totalValue: Math.round(totalValue),
      recentlyAdded,
      topCategory: 'Maquillaje'
    };
  }, []);

  // Mock CRUD operations with performance monitoring
  const mockCreateProduct = useCallback(async (data: any) => {
    const startTime = performance.now();
    recordInteraction?.('create_product_mock');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Queue for offline sync if needed
    await executeAction?.({
      type: 'create',
      entity: 'product',
      data
    });
    
    const duration = performance.now() - startTime;
    recordApiCall?.('mock/products', duration, true);
    
    console.log('Mock create product:', data);
    return true;
  }, [recordInteraction, recordApiCall, executeAction]);

  const mockUpdateProduct = useCallback(async (id: string, data: any) => {
    const startTime = performance.now();
    recordInteraction?.('update_product_mock');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await executeAction?.({
      type: 'update',
      entity: 'product',
      data: { id, ...data }
    });
    
    const duration = performance.now() - startTime;
    recordApiCall?.('mock/products/' + id, duration, true);
    
    console.log('Mock update product:', id, data);
    return true;
  }, [recordInteraction, recordApiCall, executeAction]);

  const mockDeleteProduct = useCallback(async (id: string) => {
    const startTime = performance.now();
    recordInteraction?.('delete_product_mock');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await executeAction?.({
      type: 'delete',
      entity: 'product',
      data: { id }
    });
    
    const duration = performance.now() - startTime;
    recordApiCall?.('mock/products/' + id, duration, true);
    
    console.log('Mock delete product:', id);
    return true;
  }, [recordInteraction, recordApiCall, executeAction]);

  const mockRefetch = useCallback(async () => {
    const startTime = performance.now();
    recordInteraction?.('refetch_products_mock');
    
    // Cache products for offline access
    await cacheForOffline?.('products', mockProducts);
    await cacheForOffline?.('categories', mockCategories);
    
    const duration = performance.now() - startTime;
    recordApiCall?.('mock/products/refetch', duration, true);
    
    console.log('Mock refetch');
  }, [recordInteraction, recordApiCall, cacheForOffline]);

  const mockLoadMore = useCallback(async () => {
    const startTime = performance.now();
    recordInteraction?.('load_more_products_mock');
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const duration = performance.now() - startTime;
    recordApiCall?.('mock/products/load-more', duration, true);
    
    console.log('Mock load more');
  }, [recordInteraction, recordApiCall]);

  const mockClearCache = useCallback(() => {
    console.log('Mock clear cache');
  }, []);

  // Switch to mock data
  const switchToMockData = useCallback(() => {
    setUseMockData(true);
  }, []);

  // Switch back to Supabase
  const switchToSupabase = useCallback(() => {
    setUseMockData(false);
  }, []);

  // Return appropriate data based on mode
  if (useMockData || (supabaseResult.error && !supabaseResult.isLoading)) {
    return {
      // Mock data
      products: mockProducts,
      categories: mockCategories,
      isLoading: false,
      error: useMockData ? null : supabaseResult.error,
      total: mockProducts.length,
      hasMore: false,
      dashboardStats: calculateMockStats(),
      pagination: {
        page: 1,
        pageSize: 25,
        total: mockProducts.length
      },

      // Mock actions
      refetch: mockRefetch,
      loadMore: mockLoadMore,
      createProduct: mockCreateProduct,
      updateProduct: mockUpdateProduct,
      deleteProduct: mockDeleteProduct,
      clearCache: mockClearCache,

      // Mode control
      isMockMode: true,
      switchToMockData,
      switchToSupabase,
      canRetrySupabase: !useMockData
    };
  }

  // Return Supabase data
  return {
    ...supabaseResult,
    
    // Mode control
    isMockMode: false,
    switchToMockData,
    switchToSupabase,
    canRetrySupabase: true
  };
}