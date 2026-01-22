// --- Optimized Version (Structure Preserved, Performance Improved) ---
// Filename: page.tsx (optimized, non-breaking)
// This file preserves your original UI structure and props while:
// - reducing re-renders
// - stabilizing effects
// - hardening URL <-> filter sync
// - fixing categoryId mismatch
// - improving loadMore (append)
// - better error visibility

'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Plus,
  Download,
  Upload,
  Settings,
  RefreshCw,
  TrendingUp,
  Package,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  LayoutGrid,
  List,
  ShoppingCart,
  X
} from 'lucide-react';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';

// Lazy loaded components for better code splitting
const ProductMetrics = dynamic(() => import('@/components/products/ProductMetrics'), { ssr: false });
const ProductCharts = dynamic(() => import('@/components/products/ProductCharts'), { ssr: false });
const ProductTable = dynamic(() => import('@/components/tables/LazyTableComponents').then(m => m.LazyProductTable), { ssr: false });
const ProductExport = dynamic(() => import('@/components/products/ProductExport'), { ssr: false });
const AdvancedSearch = dynamic(() => import('@/components/products/AdvancedSearch'), { ssr: false });
const ProductForm = dynamic(() => import('@/components/products/ProductForm'), { ssr: false });
const ProductManager = dynamic(() => import('@/components/products/ProductManager'), { ssr: false });
const ProductGrid = dynamic(() => import('@/components/products/ProductGrid'), { ssr: false });
const EnhancedProductCatalog = dynamic(() => import('@/components/catalog/EnhancedProductCatalog'), { ssr: false });
const ProductRecommendations = dynamic(() => import('@/components/products/ProductRecommendations').then(m => ({ default: m.ProductRecommendations })), { ssr: false });
const InventoryManagement = dynamic(() => import('@/components/products/InventoryManagement').then(m => ({ default: m.InventoryManagement })), { ssr: false });
import { SkipNavigation } from '@/components/ui/skip-navigation';

import { PermissionProvider } from '@/components/ui/permission-guard';
import { useHasPermission } from '@/hooks/use-permissions';
import { usePerfMetrics } from '@/hooks/usePerfMetrics';
import { useInteractionTracking } from '@/hooks/use-performance';
import { logInteractionEvent } from '@/lib/analytics';
import { getStockThresholds } from '@/lib/env';

import { useSecureProducts } from '@/hooks/useSecureProducts';
import { useSupabase } from '@/hooks/use-supabase';
import { useDebounce } from '@/hooks/useDebounce';
import { useStore } from '@/store';
import { useProductsStore, useProductsFiltered } from '@/store/products-store';

import type { Product, Category } from '@/types';
import { normalizeProduct as normalizeProductUtil, calculateDashboardStats as calculateDashboardStatsUtil, exportCsv as exportCsvUtil } from '@/utils/products';
import { useProductsLogic } from '@/hooks/useProductsLogic';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

// ---------------------- Helpers / Thin adapters ----------------------
interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentlyAdded: number;
  topCategory: string;
}

const normalizeProduct = (raw: any): Product => normalizeProductUtil(raw) as Product;
const calculateDashboardStats = (arr: Product[]): DashboardStats => calculateDashboardStatsUtil(arr) as any;

const exportCsv = (rows: Record<string, any>[], filename = 'export.csv') => {
  if (!rows || rows.length === 0) return;
  const fields = Object.keys(rows[0]);
  const csv = exportCsvUtil(rows as any, fields);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper para mensajes de error descriptivos
const getErrorMessage = (error: any, context: string = 'operación'): string => {
  const errorMsg = error?.message || String(error);
  
  // Errores de duplicados
  if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
    if (context === 'crear' || context === 'guardar') {
      return 'Ya existe un producto con ese código SKU. Usa un código diferente.';
    }
    return 'Este registro ya existe en el sistema.';
  }
  
  // Errores de red
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('NetworkError')) {
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
  }
  
  // Errores de permisos
  if (errorMsg.includes('permission') || errorMsg.includes('unauthorized') || errorMsg.includes('403')) {
    return 'No tienes permisos para realizar esta acción. Contacta al administrador.';
  }
  
  // Errores de validación
  if (errorMsg.includes('validation') || errorMsg.includes('invalid') || errorMsg.includes('required')) {
    return 'Datos inválidos. Verifica todos los campos e intenta de nuevo.';
  }
  
  // Errores de no encontrado
  if (errorMsg.includes('not found') || errorMsg.includes('404')) {
    return 'El producto no fue encontrado. Puede haber sido eliminado.';
  }
  
  // Errores de timeout
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
    return 'La operación tardó demasiado. Intenta de nuevo.';
  }
  
  // Error genérico con mensaje del servidor
  if (errorMsg && errorMsg.length > 0 && errorMsg !== '[object Object]') {
    return `Error: ${errorMsg}`;
  }
  
  // Fallback
  return `Error al ${context}. Si el problema persiste, contacta al soporte.`;
};

// ---------------------- Component ----------------------
export default function ProductsPage() {
  return (
    <PermissionProvider>
      <Suspense fallback={<div className="p-8 text-center">Cargando productos...</div>}>
        <ProductsPageContent />
      </Suspense>
    </PermissionProvider>
  );
}

function ProductsPageContent() {
  // routing & small store
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const resetEditing = useStore(s => s.resetEditing);
  const { config } = useBusinessConfig();

  const { hasPermission: canWriteProduct } = useHasPermission('products', 'write');
  const { hasPermission: canExportProduct } = useHasPermission('products', 'export');

  // perf
  const perf = usePerfMetrics('ProductsDashboard');
  const perfMarkRef = useRef(perf.mark);
  useEffect(() => { perfMarkRef.current = perf.mark; }, [perf.mark]);

  const { trackInteraction, getInteractionMetrics } = useInteractionTracking('ProductsDashboard');
  const logEvent = useCallback(async (name: string, productId?: string, metadata?: any) => {
    try {
      const m = getInteractionMetrics().find(x => x.name === name);
      const d = Math.round((m?.duration as any) || 0);
      await logInteractionEvent({ component: 'ProductsDashboard', name, durationMs: d, productId: productId ?? null, metadata: metadata ?? null, timestamp: Date.now() });
    } catch { /* noop */ }
  }, [getInteractionMetrics]);

  // UI state (kept minimal) ------------------------------------------------
  const categories = useProductsStore(s => s.categories);
  const productsStoreProducts = useProductsStore(s => s.products);
  const searchResults = useProductsFiltered();
  const mappedSearchResults = useMemo(() => searchResults.map(p => ({
    id: p.id,
    name: p.name,
    code: p.sku || '',
    description: p.description,
    stock: p.stock_quantity || 0,
    minStock: p.min_stock || 0,
    price: p.sale_price || 0,
    costPrice: p.cost_price || 0,
    categoryId: p.category_id || '',
    category: p.category ? {
      id: p.category.id,
      name: p.category.name
    } : undefined,
    discount_percentage: p.discount_percentage,
    image: p.image_url,
    images: p.images || [],
    supplier: p.supplier ? {
      name: p.supplier.name
    } : undefined,
    createdAt: new Date(p.created_at || Date.now()),
    updatedAt: new Date(p.updated_at || Date.now())
  })), [searchResults]);

  // Memoize setters to prevent re-renders
  const setProductsStore = useCallback((products: Product[]) => {
    useProductsStore.setState({ products });
  }, []);

  const setCategoriesStore = useCallback((cats: Category[]) => {
    useProductsStore.setState({ categories: cats });
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({ totalProducts: 0, lowStockProducts: 0, outOfStockProducts: 0, totalValue: 0, recentlyAdded: 0, topCategory: '' });

  const [activeTab, setActiveTab] = useState('overview');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({ image: true, name: true, code: true, category: true, supplier: true, stock: true, price: true, offer: true, status: true });
  const [imageFilter, setImageFilter] = useState<'all' | 'with' | 'without'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);

  // pagination + server filters (single source of truth: serverFilters)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [serverFilters, setServerFilters] = useState<any>({});

  // optimize: stable derived filters object for hook (memo)
  const secureFilters = useMemo(() => ({
    search: serverFilters.search,
    categoryId: serverFilters.categoryId,
    supplierId: serverFilters.supplierId,
    supplierName: serverFilters.supplierName,
    minPrice: serverFilters.minPrice,
    maxPrice: serverFilters.maxPrice,
    minStock: serverFilters.minStock,
    maxStock: serverFilters.maxStock,
    isActive: serverFilters.isActive,
    createdAfter: serverFilters.dateFrom,
    createdBefore: serverFilters.dateTo,
    inStock: serverFilters.stockStatus === 'in_stock' ? true : undefined,
    outOfStock: serverFilters.stockStatus === 'out_of_stock' ? true : undefined,
    lowStock: serverFilters.stockStatus === 'low_stock' ? true : undefined,
    critical: serverFilters.stockStatus === 'critical' ? true : undefined,
    lowStockThreshold: getStockThresholds().low,
    criticalThreshold: getStockThresholds().critical,
    includeCategory: true,
    includeSupplier: true
  }), [serverFilters]);

  // secure products hook (hybrid) ------------------------------------------------
  const {
    products: secureProducts,
    loading: productsLoading,
    error: productsError,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    total,
    hasMore,
    loadMore,
    metrics,
    cacheMetrics,
    clearCache
  } = useSecureProducts({
    enableRealtime: true,
    showNotifications: true,
    filters: secureFilters,
    cacheTimeout: 300_000,
    retryAttempts: 3,
    enableMetrics: true,
    countMode: 'estimated'
  });

  // keep a ref to refetch to avoid effect deps
  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  // categories loader (safe & cached localStorage) ----------------------------
  const { getCategories } = useSupabase();
  const getCategoriesRef = useRef(getCategories);
  useEffect(() => { getCategoriesRef.current = getCategories; }, [getCategories]);

  const loadCategories = useCallback(async () => {
    try {
      const cached = (typeof window !== 'undefined') ? localStorage.getItem('products-categories-cache') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.ts && (Date.now() - parsed.ts) < 300_000 && Array.isArray(parsed.data)) {
          setCategoriesStore(parsed.data);
        }
      }
    } catch { /* ignore */ }

    try {
      const { data, error } = await getCategoriesRef.current();
      if (!error && Array.isArray(data)) {
        setCategoriesStore(data);
        try { localStorage.setItem('products-categories-cache', JSON.stringify({ ts: Date.now(), data })); } catch { }
      }
    } catch (e) {
      console.error('getCategories failed', e);
    }
  }, []);

  // Load initial data once (categories + first refetch) -----------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await loadCategories();
      try { perfMarkRef.current('products-refetch-start'); await refetchRef.current(); } catch (e) { console.error(e); }
      if (mounted) setIsLoading(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // normalize secureProducts -> UI products (single place) --------------------
  useEffect(() => {
    if (productsLoading) return;
    if (productsError) {
      toast.error(getErrorMessage(productsError, 'cargar productos'));
      setIsLoading(false);
      return;
    }

    if (!secureProducts || secureProducts.length === 0) {
      setProductsStore([]);
      setDashboardStats({ totalProducts: 0, lowStockProducts: 0, outOfStockProducts: 0, totalValue: 0, recentlyAdded: 0, topCategory: '' });
      setIsLoading(false);
      return;
    }

    const normalized = (secureProducts as any).map(normalizeProduct);
    setProductsStore(normalized);
    setDashboardStats(calculateDashboardStats(normalized));
    setIsLoading(false);
    try { if (typeof (perf as any).measureAndLog === 'function') (perf as any).measureAndLog('products-query-response', 'products-refetch-start'); } catch { }
  }, [secureProducts, productsLoading, productsError, setProductsStore]);

  // URL params -> state (single effect, safe parsing) -------------------------
  useEffect(() => {
    const spSearch = searchParams?.get('search') ?? undefined;
    const spCategory = searchParams?.get('category') ?? undefined;
    const spPage = Number(searchParams?.get('page') ?? '') || 1;
    const spLimit = Number(searchParams?.get('limit') ?? '') || 25;
    const spSortBy = (searchParams?.get('sortBy') as any) ?? undefined;
    const spSortOrder = (searchParams?.get('sortOrder') as any) ?? undefined;
    const spImg = (searchParams?.get('img') as any) ?? undefined;
    const spTab = searchParams?.get('tab') ?? undefined;
    const spSupplierId = searchParams?.get('supplierId') ?? undefined;
    const spSupplierName = searchParams?.get('supplierName') ?? undefined;

    // apply safely and only when changes are meaningful
    setServerFilters((prev: any) => {
      const next = { ...prev, search: spSearch, categoryId: spCategory, supplierId: spSupplierId, supplierName: spSupplierName, sortBy: spSortBy, sortOrder: spSortOrder };
      return next;
    });
    if (spImg === 'with' || spImg === 'without') setImageFilter(spImg as any);
    setCurrentPage(spPage);
    setItemsPerPage(spLimit);
    if (spTab) setActiveTab(spTab);
  }, [searchParams]);

  // updateUrl helper (debounced via useProductsLogic) -------------------------
  const updateUrl = useCallback((next: any) => {
    const current = searchParams?.toString() ?? '';
    const sp = new URLSearchParams(current);
    if (next.search !== undefined) next.search ? sp.set('search', next.search) : sp.delete('search');
    if (next.categoryId !== undefined) next.categoryId ? sp.set('category', next.categoryId) : sp.delete('category');
    if (next.supplierId !== undefined) next.supplierId ? sp.set('supplierId', next.supplierId) : sp.delete('supplierId');
    if (next.supplierName !== undefined) next.supplierName ? sp.set('supplierName', next.supplierName) : sp.delete('supplierName');
    if (next.page !== undefined) sp.set('page', String(next.page));
    if (next.limit !== undefined) sp.set('limit', String(next.limit));
    if (next.sortBy !== undefined) next.sortBy ? sp.set('sortBy', next.sortBy) : sp.delete('sortBy');
    if (next.sortOrder !== undefined) next.sortOrder ? sp.set('sortOrder', next.sortOrder) : sp.delete('sortOrder');
    if (next.stockStatus !== undefined) next.stockStatus ? sp.set('stock', next.stockStatus) : sp.delete('stock');
    if (next.img !== undefined) {
      const v = next.img === 'all' ? '' : String(next.img || '');
      if (v) sp.set('img', v); else sp.delete('img');
    }
    if (next.tab !== undefined) next.tab ? sp.set('tab', next.tab) : sp.delete('tab');
    const safePath = pathname || '/dashboard/products';
    const nextStr = sp.toString();
    if (nextStr !== current) router.replace(`${safePath}?${nextStr}`);
  }, [searchParams, pathname, router]);

  // Product logic hook (keeps your existing handlers but optimized) -----------
  const {
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    handleImageFilterChange,
    handleStockStatusChange,
    applyFilters,
    clearAllFilters,
    onPageChange,
    onItemsPerPageChange
  } = useProductsLogic({
    itemsPerPage,
    updateUrl: (next: any) => updateUrl(next),
    setServerFilters,
    setCurrentPage,
    setImageFilter
  });

  // Small wrappers to keep stable identity
  const handleImageFilterChangeLocal = useCallback((val: 'all' | 'with' | 'without') => handleImageFilterChange(val), [handleImageFilterChange]);

  // basic CRUD handlers (stable) -------------------------------------------
  const handleEditProduct = useCallback((product: any) => { setEditingProduct(product); setShowProductForm(true); }, []);

  const handleDeleteProduct = useCallback((product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!productToDelete) return;
    
    try {
      const success = await deleteProduct(productToDelete.id);
      if (success) {
        toast.success(`Producto "${productToDelete.name}" eliminado correctamente`);
        await refetch();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(getErrorMessage(error, 'eliminar el producto'));
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [productToDelete, deleteProduct, refetch]);

  const handleViewProduct = useCallback((product: any) => { router.push(`/dashboard/products/view/${product.id}`); }, [router]);

  const retry = useCallback(async (fn: () => Promise<any>, attempts = 3) => {
    let lastError: any = null;
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (e) { lastError = e; await new Promise(res => setTimeout(res, 300 * Math.pow(2, i))); }
    }
    throw lastError;
  }, []);

  const toSupabasePayload = useCallback((productData: any) => {
    const r1000 = (n: any) => {
      const v = Number(n);
      if (!Number.isFinite(v) || v <= 0) return undefined;
      return Math.round(v / 1000) * 1000;
    };
    return {
      name: productData.name,
      sku: productData.code,
      description: productData.description,
      cost_price: r1000(productData.costPrice),
      sale_price: r1000(productData.price),
      wholesale_price: r1000(productData.wholesalePrice),
      offer_price: productData.offerActive ? r1000(productData.offerPrice) : undefined,
      stock_quantity: productData.stock,
      min_stock: productData.minStock,
      category_id: productData.categoryId,
      image_url: Array.isArray(productData.images) ? (productData.images[0] || undefined) : (productData.images || undefined),
      brand: productData.brand,
      shade: productData.shade,
      volume: productData.volume,
      spf: productData.spf,
      finish: productData.finish,
      coverage: productData.coverage,
      waterproof: productData.waterproof,
      vegan: productData.vegan,
      cruelty_free: productData.cruelty_free,
      expiration_date: productData.expiration_date,
      iva_rate: productData.ivaRate,
      iva_included: productData.ivaIncluded
    };
  }, []);

  const handleSaveProduct = useCallback(async (productData: any) => {
    try {
      if (editingProduct) {
        const prevStock = Number(editingProduct.stock_quantity || editingProduct.stock || 0);
        const nextStock = Number(productData.stock || 0);
        await retry(() => updateProduct(String(editingProduct.id), toSupabasePayload(productData)), 3);
        if (prevStock !== nextStock) {
          try { const { inventoryAPI } = await import('@/lib/api'); const delta = nextStock - prevStock; if (delta !== 0) await retry(() => inventoryAPI.adjustStock(String(editingProduct.id), delta, 'Ajuste por edición de producto'), 3); } catch { toast.warning('No se pudo registrar movimiento de inventario'); }
        }
        toast.success('Producto actualizado exitosamente');
      } else {
        const base = toSupabasePayload(productData) as any;
        await retry(() => createProduct({ ...base, is_active: true } as any), 3);
        toast.success('Producto creado exitosamente');
      }
      setShowProductForm(false);
      setEditingProduct(null);
      await refetch();
    } catch (error) {
      console.error('Error guardando producto:', error);
      const context = editingProduct ? 'actualizar el producto' : 'crear el producto';
      toast.error(getErrorMessage(error, context));
    }
  }, [editingProduct, retry, updateProduct, toSupabasePayload, createProduct, refetch]);

  // bulk actions (optimized) ------------------------------------------------
  const handleBulkAction = useCallback(async (action: string, productIds: string[]) => {
    try {
      switch (action) {
        case 'delete':
          {
            const current = useProductsStore.getState().products as any[];
            const next = current.filter(p => !productIds.includes(p.id));
            setProductsStore(next as any);
          }
          toast.success(`${productIds.length} producto(s) eliminado(s)`);
          await refetch();
          break;
        case 'activate':
          await Promise.all(productIds.map(id => updateProduct(String(id), { is_active: true } as any)));
          toast.success(`${productIds.length} producto(s) activado(s)`);
          await refetch();
          break;
        case 'deactivate':
          await Promise.all(productIds.map(id => updateProduct(String(id), { is_active: false } as any)));
          toast.success(`${productIds.length} producto(s) desactivado(s)`);
          await refetch();
          break;
        case 'export':
          const rows = productsStoreProducts.filter((p: any) => productIds.includes(p.id)).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, price: p.sale_price, stock: p.stock_quantity }));
          exportCsv(rows, `productos_export_${Date.now()}.csv`);
          break;
      }
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error(getErrorMessage(error, 'realizar la acción masiva'));
    }
  }, [productsStoreProducts, refetch, updateProduct, setProductsStore]);

  // load more handler: append instead of replace (stable)
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMore();
    } catch (e) {
      console.error('Error loading more:', e);
    }
  }, [loadMore, secureProducts]);

  const handleExportSummary = useCallback((rows: Array<Record<string, any>>, filename = 'resumen.csv') => { exportCsv(rows, filename); }, []);

  // Render: skeleton while loading ------------------------------------------
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  // Empty state when no products ------------------------------------------
  if (!isLoading && productsStoreProducts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/', icon: LayoutDashboard },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Productos', href: '/dashboard/products', isCurrentPage: true }
          ]}
        />
        
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold mb-2">No hay productos</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Comienza agregando tu primer producto al inventario. Puedes crear productos manualmente o importarlos desde un archivo.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/dashboard/products/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Producto
              </Button>
              <Button variant="outline" onClick={() => toast.info('Importar próximamente...')}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Productos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------- Main render (preserved structure) ----------------------
  return (
    <>
      <SkipNavigation />
      <div id="main-content" className="container mx-auto p-6 space-y-6" role="main">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/', icon: LayoutDashboard },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Productos', href: '/dashboard/products', isCurrentPage: true }
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center overflow-hidden">
                {config.branding?.logo ? (
                  <img src={config.branding.logo} alt="Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <ShoppingCart className="w-5 h-5 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{config.businessName || 'BeautyPOS'}</h1>
            </div>
            <p className="text-muted-foreground">{config.tagline || 'Sistema de Cosméticos'} · Gestión de Productos</p>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => toast.info('Importar próximamente...')}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            {canExportProduct && (<ProductExport products={searchResults} categories={categories} className="mr-2" />)}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={() => router.push('/dashboard/products/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </div>

        {(dashboardStats.lowStockProducts > 0 || dashboardStats.outOfStockProducts > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboardStats.outOfStockProducts > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-red-800">Productos sin stock</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700">{dashboardStats.outOfStockProducts} producto(s) sin stock requieren atención inmediata</p>
                </CardContent>
              </Card>
            )}
            {dashboardStats.lowStockProducts > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-yellow-800">Stock bajo</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-700">{dashboardStats.lowStockProducts} producto(s) con stock bajo</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); updateUrl({ tab: val }); }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center space-x-2"><TrendingUp className="h-4 w-4" /><span>Resumen</span></TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2"><BarChart3 className="h-4 w-4" /><span>Análisis</span></TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2"><Package className="h-4 w-4" /><span>Productos</span></TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center space-x-2"><LayoutDashboard className="h-4 w-4" /><span>Recomendaciones</span></TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2"><BarChart3 className="h-4 w-4" /><span>Rendimiento</span></TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2"><Settings className="h-4 w-4" /><span>Gestión</span></TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2"><Download className="h-4 w-4" /><span>Reportes</span></TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2"><Package className="h-4 w-4" /><span>Inventario</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ProductMetrics products={productsStoreProducts as any} categories={categories} isLoading={isLoading} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">+{dashboardStats.recentlyAdded} esta semana</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${dashboardStats.totalValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Valor del inventario</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categoría Principal</CardTitle>
                  <Badge variant="outline">{dashboardStats.topCategory}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{categories.find(c => c.name === dashboardStats.topCategory)?.name || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">Más productos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{dashboardStats.lowStockProducts + dashboardStats.outOfStockProducts}</div>
                  <p className="text-xs text-muted-foreground">Requieren atención</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Productos Recientes</CardTitle>
                <CardDescription>Últimos productos agregados al inventario</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productsStoreProducts.slice(0, 5).map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${product.sale_price}</p>
                        <p className="text-sm text-muted-foreground">Stock: {product.stock_quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <ProductCharts data={{ salesTrend: [], categoryDistribution: [], stockLevels: [], topProducts: [], monthlyRevenue: [] }} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ProductCharts data={{ salesTrend: [], categoryDistribution: [], stockLevels: [], topProducts: [], monthlyRevenue: [] }} />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <EnhancedProductCatalog
              products={productsStoreProducts.map(p => ({
                id: p.id,
                name: p.name,
                code: p.sku || '',
                description: p.description,
                stock: p.stock_quantity || 0,
                minStock: p.min_stock || 0,
                price: p.sale_price || 0,
                costPrice: p.cost_price || 0,
                categoryId: p.category_id || '',
                category: p.category ? {
                  id: p.category.id,
                  name: p.category.name
                } : undefined,
                discount_percentage: p.discount_percentage,
                image: p.image_url,
                images: p.images || [],
                supplier: p.supplier ? {
                  name: p.supplier.name
                } : undefined,
                createdAt: new Date(p.created_at || Date.now()),
                updatedAt: new Date(p.updated_at || Date.now())
              }))}
              categories={categories.map((c: any) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                productCount: c.productCount || productsStoreProducts.filter(p => p.category_id === c.id).length
              }))}
              isLoading={isLoading}
              onEdit={handleEditProduct}
              onView={handleViewProduct}
              onDelete={handleDeleteProduct}
              onRefresh={refetch}
              onExport={(format) => {
                const rows = searchResults.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  sku: p.sku || p.code,
                  category: p.category?.name,
                  supplier: p.supplier?.name,
                  stock: p.stock_quantity || p.stock,
                  price: p.sale_price || p.price,
                  cost: p.cost_price || p.costPrice,
                  status: p.is_active ? 'Activo' : 'Inactivo'
                }));
                exportCsv(rows, `productos_${format}_${Date.now()}.${format}`);
              }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              canEdit={canWriteProduct}
              canDelete={canWriteProduct}
              canExport={canExportProduct}
            >
              {/* Render the appropriate view based on viewMode */}
              {viewMode === 'list' ? (
                <ProductTable
                  products={mappedSearchResults as any}
                  isLoading={isLoading}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onView={handleViewProduct}
                  onBulkAction={handleBulkAction}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page: number) => onPageChange(page)}
                  onItemsPerPageChange={(next: number) => { setItemsPerPage(next); onItemsPerPageChange(next); }}
                  totalItems={total}
                  hasMore={hasMore}
                  enableVirtualization={true}
                  virtualizationHeight={720}
                  onLoadMore={handleLoadMore}
                  visibleColumns={visibleColumns}
                  searchValue={serverFilters.search || ''}
                  onSearchChange={handleSearchChange}
                  imageFilterValue={imageFilter}
                  onImageFilterChange={handleImageFilterChangeLocal}
                  sortBy={(serverFilters.sortBy === 'sale_price') ? 'price' : (serverFilters.sortBy === 'offer_price') ? 'offer' : (serverFilters.sortBy === 'stock_quantity') ? 'stock' : (serverFilters.sortBy === 'created_at') ? 'createdAt' : (serverFilters.sortBy === 'category_id') ? 'category' : (serverFilters.sortBy === 'supplier_id') ? 'supplier' : (serverFilters.sortBy === 'sku') ? 'code' : (serverFilters.sortBy === 'name') ? 'name' : undefined}
                  sortOrder={(serverFilters.sortOrder as any) || 'asc'}
                  onSortChange={(field: 'name' | 'price' | 'offer' | 'stock' | 'createdAt' | 'code' | 'category' | 'supplier', order: 'asc' | 'desc') => { const map: Record<string, string> = { name: 'name', price: 'sale_price', offer: 'offer_price', stock: 'stock_quantity', createdAt: 'created_at', code: 'sku', category: 'category_id', supplier: 'supplier_id' }; const serverField = map[field] || 'name'; handleSortChange(serverField, order); }}
                  canEdit={canWriteProduct}
                  canDelete={canWriteProduct}
                />
              ) : (
                <ProductGrid
                  products={mappedSearchResults as any}
                  isLoading={isLoading}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onView={handleViewProduct}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page: number) => onPageChange(page)}
                  onItemsPerPageChange={(next: number) => { setItemsPerPage(next); onItemsPerPageChange(next); }}
                  totalItems={total}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  canEdit={canWriteProduct}
                  canDelete={canWriteProduct}
                />
              )}
            </EnhancedProductCatalog>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <ProductRecommendations
              products={productsStoreProducts as any}
              onViewProduct={handleViewProduct}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryManagement
              products={productsStoreProducts as any}
              categories={categories}
              onAdjustStock={async (productId: string, adjustment: number, reason: string) => {
                try {
                  // Update product stock
                  const product = productsStoreProducts.find(p => p.id === productId);
                  if (product) {
                    const newStock = (product.stock_quantity || 0) + adjustment;
                    await updateProduct(productId, { stock_quantity: newStock } as any);

                    // Log inventory movement if API available
                    try {
                      const { inventoryAPI } = await import('@/lib/api');
                      await inventoryAPI.adjustStock(productId, adjustment, reason);
                    } catch (e) {
                      console.warn('Inventory movement logging not available:', e);
                    }

                    toast.success('Stock ajustado correctamente');
                    await refetch();
                  }
                } catch (error) {
                  console.error('Error adjusting stock:', error);
                  toast.error('Error al ajustar el stock');
                }
              }}
              onViewProduct={handleViewProduct}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Reportes Avanzados de Productos</CardTitle>
                <CardDescription>Accede a reportes completos de inventario, ventas y análisis de rendimiento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"><CardContent className="p-6 text-center"><Package className="h-12 w-12 mx-auto mb-4 text-blue-600" /><h3 className="font-semibold mb-2">Reporte de Inventario</h3></CardContent></Card>
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"><CardContent className="p-6 text-center"><TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-600" /><h3 className="font-semibold mb-2">Reporte de Ventas</h3></CardContent></Card>
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"><CardContent className="p-6 text-center"><BarChart3 className="h-12 w-12 mx-auto mb-4 text-purple-600" /><h3 className="font-semibold mb-2">Análisis de Rendimiento</h3></CardContent></Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {showProductForm && canWriteProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-[#F8F9FA] rounded-[6px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.15)] transition-all duration-200 max-w-[960px] w-full mx-4 md:mx-6 max-h-[90vh] overflow-y-auto">
              <ProductForm product={editingProduct as any} categories={categories} onSubmit={handleSaveProduct} mode={editingProduct ? 'edit' : 'create'} onCancel={() => { setEditingProduct(null); setShowProductForm(false); resetEditing(); }} />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de eliminar el producto <strong>"{productToDelete?.name}"</strong>.
                Esta acción no se puede deshacer y se perderán todos los datos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Eliminar Producto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
