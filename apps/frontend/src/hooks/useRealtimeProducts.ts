import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeService, type ProductChangePayload } from '@/lib/supabase-realtime';
import { toast } from '@/lib/toast';
import type { Product } from '@/types/supabase';

interface UseRealtimeProductsOptions {
  enableRealtime?: boolean;
  showNotifications?: boolean;
  autoRefresh?: boolean;
  filters?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    cursorUpdatedAt?: string;
    sortBy?: 'name' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    isActive?: boolean;
    dateFrom?: string;
    dateTo?: string;
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
    fields?: string[];
    includeCategory?: boolean;
  };
}

interface UseRealtimeProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  createProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  isConnected: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  loadMore: () => Promise<void>;
}

export function useRealtimeProducts(options: UseRealtimeProductsOptions = {}): UseRealtimeProductsReturn {
  const {
    enableRealtime = true,
    showNotifications = true,
    autoRefresh = true,
    filters = {}
  } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  const subscriptionRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Función para cargar productos
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await realtimeService.getProducts(filters);
      
      if (mountedRef.current) {
        setProducts(result.products);
        setTotal(result.total);
        setHasMore(!!result.hasMore);
        setNextCursor(result.nextCursor || null);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      if (mountedRef.current) {
        const message = (err && typeof err === 'object' && 'message' in err)
          ? String((err as any).message)
          : (typeof err === 'string' ? err : 'Error desconocido');
        setError(message);
        if (showNotifications) {
          const info = (err && typeof err === 'object')
            ? [
                (err as any).code,
                (err as any).details
              ].filter(Boolean).join(' ')
            : '';
          toast.error(info ? `Error al cargar productos ${info}` : 'Error al cargar productos');
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters, showNotifications]);

  // Manejar cambios en tiempo real
  const handleRealtimeChange = useCallback((payload: ProductChangePayload) => {
    if (!mountedRef.current) return;

    console.log('Realtime change received:', payload);

    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new) {
          setProducts(prev => {
            // Evitar duplicados
            const exists = prev.some(p => p.id === payload.new!.id);
            if (exists) return prev;
            
            const newProducts = [payload.new as Product, ...prev];
            setTotal(prev => prev + 1);
            
            if (showNotifications) {
              toast.success(`Nuevo producto agregado: ${(payload.new as Product).name}`);
            }
            
            return newProducts;
          });
        }
        break;

      case 'UPDATE':
        if (payload.new) {
          setProducts(prev => 
            prev.map(product => 
              product.id === payload.new!.id 
                ? { ...product, ...payload.new } as Product
                : product
            )
          );
          
          if (showNotifications) {
            toast.info(`Producto actualizado: ${(payload.new as Product).name}`);
          }
        }
        break;

      case 'DELETE':
        if (payload.old) {
          setProducts(prev => {
            const filtered = prev.filter(product => product.id !== payload.old!.id);
            setTotal(prev => Math.max(0, prev - 1));
            return filtered;
          });
          
          if (showNotifications) {
            toast.warning(`Producto eliminado: ${payload.old.name}`);
          }
        }
        break;
    }
  }, [showNotifications]);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (!enableRealtime) return;

    try {
      subscriptionRef.current = realtimeService.subscribeToProducts(handleRealtimeChange);
      setIsConnected(true);
      
      console.log('Realtime subscription established for products');
    } catch (err) {
      console.error('Failed to establish realtime subscription:', err);
      setIsConnected(false);
    }

    return () => {
      if (subscriptionRef.current) {
        realtimeService.unsubscribe('products');
        subscriptionRef.current = null;
        setIsConnected(false);
      }
    };
  }, [enableRealtime, handleRealtimeChange]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Operaciones CRUD
  const createProduct = useCallback(async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await realtimeService.createProduct({
        ...productData,
        image_url: productData.image_url || undefined
      });
      
      if (showNotifications && newProduct) {
        toast.success(`Producto creado: ${newProduct.name}`);
      }
      
      return newProduct;
    } catch (err) {
      console.error('Error creating product:', err);
      if (showNotifications) {
        toast.error('Error al crear producto');
      }
      throw err;
    }
  }, [showNotifications]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await realtimeService.updateProduct(id, updates);
      
      if (showNotifications && updatedProduct) {
        toast.success(`Producto actualizado: ${updatedProduct.name}`);
      }
      
      return updatedProduct;
    } catch (err) {
      console.error('Error updating product:', err);
      if (showNotifications) {
        toast.error('Error al actualizar producto');
      }
      throw err;
    }
  }, [showNotifications]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const success = await realtimeService.deleteProduct(id);
      
      if (showNotifications && success) {
        toast.success('Producto eliminado correctamente');
      }
      
      return success;
    } catch (err) {
      console.error('Error deleting product:', err);
      if (showNotifications) {
        toast.error('Error al eliminar producto');
      }
      throw err;
    }
  }, [showNotifications]);

  const refetch = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  const loadMore = useCallback(async () => {
    const base = filters || {};
    const cursor = nextCursor || (products.length ? products[products.length - 1].updated_at as any : null);
    const limit = base.limit || 10;
    try {
      setLoading(true);
      const result = await realtimeService.getProducts({
        ...base,
        cursorUpdatedAt: cursor || undefined,
        limit
      });
      if (mountedRef.current) {
        const merged = [...products, ...(result.products || [])].filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
        setProducts(merged);
        setTotal(result.total);
        setHasMore(!!result.hasMore);
        setNextCursor(result.nextCursor || null);
      }
    } catch (err) {
      console.error('Error loading more products:', err);
      if (showNotifications) toast.error('Error al cargar más productos');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters, nextCursor, products, showNotifications]);

  return {
    products,
    loading,
    error,
    total,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    isConnected,
    hasMore,
    nextCursor,
    loadMore
  };
}
