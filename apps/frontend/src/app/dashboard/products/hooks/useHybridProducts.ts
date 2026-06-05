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
  /**
   * Forzar modo demo/desarrollo con datos locales.
   * NO se activa automáticamente en errores de producción.
   */
  preferMockData?: boolean;
}

// Datos de demo — solo se usan cuando preferMockData=true (desarrollo explícito)
const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
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
      updated_at: '2024-12-01T00:00:00Z',
    },
    supplier: {
      id: 'sup-1',
      name: 'Proveedor Beauty',
      email: 'contacto@beauty.com',
      phone: '+57 300 123 4567',
      address: 'Calle 123 #45-67',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z',
    },
  },
  {
    id: 'demo-2',
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
      updated_at: '2024-12-01T00:00:00Z',
    },
    supplier: {
      id: 'sup-2',
      name: 'Cosmetics Pro',
      email: 'ventas@cosmeticspro.com',
      phone: '+57 301 987 6543',
      address: 'Carrera 45 #12-34',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z',
    },
  },
  {
    id: 'demo-3',
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
      updated_at: '2024-12-01T00:00:00Z',
    },
    supplier: {
      id: 'sup-1',
      name: 'Proveedor Beauty',
      email: 'contacto@beauty.com',
      phone: '+57 300 123 4567',
      address: 'Calle 123 #45-67',
      is_active: true,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z',
    },
  },
];

const DEMO_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Maquillaje',
    description: 'Productos de maquillaje',
    is_active: true,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Cuidado de la Piel',
    description: 'Productos para el cuidado facial y corporal',
    is_active: true,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
];

function calculateDemoStats(products: Product[]) {
  const totalValue = products.reduce(
    (sum, p) => sum + (p.stock_quantity || 0) * (p.cost_price || p.sale_price || 0),
    0,
  );
  const lowStockProducts = products.filter(
    (p) => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_stock || 5),
  ).length;
  const outOfStockProducts = products.filter((p) => (p.stock_quantity || 0) === 0).length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyAdded = products.filter(
    (p) => new Date(p.created_at || 0).getTime() >= weekAgo,
  ).length;

  return {
    totalProducts: products.length,
    lowStockProducts,
    outOfStockProducts,
    totalValue: Math.round(totalValue),
    recentlyAdded,
    topCategory: 'Maquillaje',
  };
}

export function useHybridProducts(options: UseHybridProductsOptions = {}) {
  // Solo modo demo cuando se solicita explícitamente (desarrollo/testing)
  const [useDemoData, setUseDemoData] = useState(options.preferMockData === true);

  const { recordApiCall, recordInteraction } = usePerformanceMonitor();
  const { getOrSet } = useAdvancedCache();
  const { executeAction, cacheForOffline } = useOfflineManager();

  const supabaseResult = useSupabaseProducts({
    ...options,
    enableRealtime: !useDemoData && options.enableRealtime,
  });

  // Acciones de demo (desarrollo/testing explícito)
  const demoCreate = useCallback(async (_data: any) => {
    recordInteraction?.('create_product_demo');
    await new Promise((r) => setTimeout(r, 300));
    recordApiCall?.('demo/products', 300, true);
    return true;
  }, [recordInteraction, recordApiCall]);

  const demoUpdate = useCallback(async (_id: string, _data: any) => {
    recordInteraction?.('update_product_demo');
    await new Promise((r) => setTimeout(r, 200));
    recordApiCall?.('demo/products/update', 200, true);
    return true;
  }, [recordInteraction, recordApiCall]);

  const demoDelete = useCallback(async (_id: string) => {
    recordInteraction?.('delete_product_demo');
    await new Promise((r) => setTimeout(r, 150));
    recordApiCall?.('demo/products/delete', 150, true);
    return true;
  }, [recordInteraction, recordApiCall]);

  const demoRefetch = useCallback(async () => {
    await cacheForOffline?.('products', DEMO_PRODUCTS);
    await cacheForOffline?.('categories', DEMO_CATEGORIES);
  }, [cacheForOffline]);

  const demoLoadMore = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 200));
  }, []);

  const demoClearCache = useCallback(() => {}, []);

  const switchToMockData = useCallback(() => setUseDemoData(true), []);
  const switchToSupabase = useCallback(() => setUseDemoData(false), []);

  // ── Modo demo explícito (solo con preferMockData=true) ──
  if (useDemoData) {
    return {
      products: DEMO_PRODUCTS,
      categories: DEMO_CATEGORIES,
      isLoading: false,
      error: null,
      total: DEMO_PRODUCTS.length,
      hasMore: false,
      dashboardStats: calculateDemoStats(DEMO_PRODUCTS),
      pagination: { page: 1, pageSize: 25, total: DEMO_PRODUCTS.length },
      refetch: demoRefetch,
      loadMore: demoLoadMore,
      createProduct: demoCreate,
      updateProduct: demoUpdate,
      deleteProduct: demoDelete,
      clearCache: demoClearCache,
      isMockMode: true,
      switchToMockData,
      switchToSupabase,
      canRetrySupabase: true,
    };
  }

  // ── Modo producción: delegar a Supabase, propagar errores reales ──
  // Si supabaseResult.error !== null el componente consumidor recibe el error
  // y puede mostrarlo al usuario. NO se reemplaza con datos de demo.
  return {
    ...supabaseResult,
    isMockMode: false,
    switchToMockData,
    switchToSupabase,
    canRetrySupabase: true,
  };
}
