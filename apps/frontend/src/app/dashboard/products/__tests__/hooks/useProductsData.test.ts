import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProductsData } from '../../hooks/useProductsData';

// Mock dependencies
vi.mock('@/hooks/useSecureProducts', () => ({
  useSecureProducts: vi.fn(() => ({
    products: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    total: 0,
    hasMore: false,
    loadMore: vi.fn(),
    metrics: [],
    cacheMetrics: vi.fn(),
    clearCache: vi.fn()
  }))
}));

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    getCategories: vi.fn().mockResolvedValue({ data: [], error: null })
  })
}));

vi.mock('@/store/products-store', () => ({
  useProductsStore: vi.fn((selector) => {
    const state = { categories: [], products: [] };
    return selector ? selector(state) : state;
  })
}));

vi.mock('@/lib/env', () => ({
  getStockThresholds: () => ({ low: 10, critical: 5 })
}));

describe('useProductsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useProductsData());
    
    expect(result.current.isLoading).toBe(true);
  });

  it('should load categories on mount', async () => {
    const { result } = renderHook(() => useProductsData());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should calculate dashboard stats correctly', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Product 1',
        stock_quantity: 5,
        sale_price: 10000,
        cost_price: 5000,
        category_id: 'cat1',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Product 2',
        stock_quantity: 0,
        sale_price: 15000,
        cost_price: 7500,
        category_id: 'cat1',
        created_at: new Date().toISOString()
      }
    ];

    const { useSecureProducts } = await import('@/hooks/useSecureProducts');
    (useSecureProducts as any).mockReturnValue({
      products: mockProducts,
      loading: false,
      error: null,
      refetch: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      total: 2,
      hasMore: false,
      loadMore: vi.fn(),
      metrics: [],
      cacheMetrics: vi.fn(),
      clearCache: vi.fn()
    });

    const { result } = renderHook(() => useProductsData());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dashboardStats.totalProducts).toBe(2);
    expect(result.current.dashboardStats.outOfStockProducts).toBe(1);
    expect(result.current.dashboardStats.lowStockProducts).toBe(1);
  });

  it('should cache categories in localStorage', async () => {
    const mockCategories = [
      { id: '1', name: 'Category 1' },
      { id: '2', name: 'Category 2' }
    ];

    const { useSupabase } = await import('@/hooks/use-supabase');
    (useSupabase as any).mockReturnValue({
      getCategories: vi.fn().mockResolvedValue({ 
        data: mockCategories, 
        error: null 
      })
    });

    renderHook(() => useProductsData());
    
    await waitFor(() => {
      const cached = localStorage.getItem('products-categories-cache');
      expect(cached).toBeTruthy();
    });
  });

  it('should use cached categories when available', async () => {
    const cachedData = {
      ts: Date.now(),
      data: [{ id: '1', name: 'Cached Category' }]
    };
    
    localStorage.setItem('products-categories-cache', JSON.stringify(cachedData));

    const { result } = renderHook(() => useProductsData());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle errors gracefully', async () => {
    const { useSecureProducts } = await import('@/hooks/useSecureProducts');
    (useSecureProducts as any).mockReturnValue({
      products: [],
      loading: false,
      error: 'Failed to load products',
      refetch: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      total: 0,
      hasMore: false,
      loadMore: vi.fn(),
      metrics: [],
      cacheMetrics: vi.fn(),
      clearCache: vi.fn()
    });

    const { result } = renderHook(() => useProductsData());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.productsError).toBe('Failed to load products');
    });
  });
});
