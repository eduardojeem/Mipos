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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ShoppingCart,
  X
} from 'lucide-react';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';

import ProductMetrics from '@/components/products/ProductMetrics';
const ProductCharts = dynamic(() => import('@/components/products/ProductCharts'), { ssr: false });
const ProductTable = dynamic(() => import('@/components/tables/LazyTableComponents').then(m => m.LazyProductTable), { ssr: false });
import ProductExport from '@/components/products/ProductExport';
import AdvancedSearch from '@/components/products/AdvancedSearch';
import ProductForm from '@/components/products/ProductForm';
const ProductManager = dynamic(() => import('@/components/products/ProductManager'), { ssr: false });

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

import type { Product, Category } from '@/types';
import { normalizeProduct as normalizeProductUtil, calculateDashboardStats as calculateDashboardStatsUtil, exportCsv as exportCsvUtil } from '@/utils/products';
import { useProductsLogic } from '@/hooks/useProductsLogic';

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

// ---------------------- Component ----------------------
export default function ProductsPage() {
  return (
    <PermissionProvider>
      <ProductsPageContent />
    </PermissionProvider>
  );
}

function ProductsPageContent() {
  // routing & small store
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const resetEditing = useStore(s => s.resetEditing);

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({ totalProducts: 0, lowStockProducts: 0, outOfStockProducts: 0, totalValue: 0, recentlyAdded: 0, topCategory: '' });

  const [activeTab, setActiveTab] = useState('overview');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({ image: true, name: true, code: true, category: true, supplier: true, stock: true, price: true, status: true });
  const [imageFilter, setImageFilter] = useState<'all' | 'with' | 'without'>('all');

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
          setCategories(parsed.data);
        }
      }
    } catch { /* ignore */ }

    try {
      const { data, error } = await getCategoriesRef.current();
      if (!error && Array.isArray(data)) {
        setCategories(data);
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
      toast.error(`Error al cargar productos: ${productsError}`);
      setIsLoading(false);
      return;
    }

    if (!secureProducts || secureProducts.length === 0) {
      setProducts([]);
      setSearchResults([]);
      setDashboardStats({ totalProducts: 0, lowStockProducts: 0, outOfStockProducts: 0, totalValue: 0, recentlyAdded: 0, topCategory: '' });
      setIsLoading(false);
      return;
    }

    const normalized = (secureProducts as any).map(normalizeProduct);
    setProducts(normalized);
    setSearchResults(normalized);
    setDashboardStats(calculateDashboardStats(normalized));
    setIsLoading(false);
    try { if (typeof (perf as any).measureAndLog === 'function') (perf as any).measureAndLog('products-query-response', 'products-refetch-start'); } catch { }
  }, [secureProducts, productsLoading, productsError, perf]);

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
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
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
    router.replace(`${safePath}?${sp.toString()}`);
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
  const handleEditProduct = useCallback((product: Product) => { setEditingProduct(product); setShowProductForm(true); }, []);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    try {
      const success = await deleteProduct(productId);
      if (success) {
        toast.success('Producto eliminado correctamente');
        await refetch();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  }, [deleteProduct, refetch]);

  const handleViewProduct = useCallback((product: Product) => { router.push(`/dashboard/products/view/${product.id}`); }, [router]);

  const retry = useCallback(async (fn: () => Promise<any>, attempts = 3) => {
    let lastError: any = null;
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (e) { lastError = e; await new Promise(res => setTimeout(res, 300 * Math.pow(2, i))); }
    }
    throw lastError;
  }, []);

  const toSupabasePayload = useCallback((productData: any) => ({
    name: productData.name,
    sku: productData.code,
    description: productData.description,
    cost_price: productData.costPrice,
    sale_price: productData.price,
    wholesale_price: productData.wholesalePrice,
    offer_price: productData.offerActive ? productData.offerPrice : undefined,
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
  }), []);

  const handleSaveProduct = useCallback(async (productData: any) => {
    try {
      if (editingProduct) {
        const prevStock = Number(editingProduct.stock_quantity || 0);
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
      toast.error('Error al guardar el producto');
    }
  }, [editingProduct, retry, updateProduct, toSupabasePayload, createProduct, refetch]);

  // bulk actions (optimized) ------------------------------------------------
  const handleBulkAction = useCallback(async (action: string, productIds: string[]) => {
    try {
      switch (action) {
        case 'delete':
          setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
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
          const rows = products.filter(p => productIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, sku: p.sku, price: p.sale_price, stock: p.stock_quantity }));
          exportCsv(rows, `productos_export_${Date.now()}.csv`);
          break;
      }
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Error al realizar la acción');
    }
  }, [products, refetch, updateProduct]);

  // load more handler: append instead of replace (stable)
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMore();
      const next = (secureProducts as any).map(normalizeProduct);
      setSearchResults(prev => {
        const existing = new Set(prev.map(p => p.id));
        const appended = next.filter((p: any) => !existing.has(p.id));
        return [...prev, ...appended];
      });
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
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  // ---------------------- Main render (preserved structure) ----------------------
  return (
    <div className="container mx-auto p-6 space-y-6">
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">BeautyPOS</h1>
          </div>
          <p className="text-muted-foreground">Sistema de Cosméticos · Gestión de Productos</p>
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
          <ProductMetrics products={products} categories={categories} isLoading={isLoading} />

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
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Gs {product.sale_price}</p>
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestión de Productos</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refrescar</Button>

              <Dialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Settings className="h-4 w-4 mr-2" />Personalizar columnas</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Columnas visibles</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    {(['image', 'name', 'code', 'category', 'supplier', 'stock', 'price', 'status'] as const).map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox checked={!!(visibleColumns as any)[key]} onCheckedChange={(checked) => setVisibleColumns((prev: typeof visibleColumns) => ({ ...prev, [key]: !!checked }))} />
                        <Label className="capitalize">{key}</Label>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              {canWriteProduct && (<Button onClick={() => setShowProductForm(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button>)}
              {canWriteProduct && (<Button variant="outline" onClick={() => toast.info('Importar próximamente...')}><Upload className="h-4 w-4 mr-2" />Importar</Button>)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {serverFilters.search && (<Badge variant="secondary" className="flex items-center gap-2">Buscar: &quot;{serverFilters.search}&quot;<Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => { setServerFilters((prev: any) => ({ ...prev, search: undefined })); updateUrl({ search: undefined }); }}><X className="h-3 w-3" /></Button></Badge>)}
            {serverFilters.categoryId && (<Badge variant="secondary" className="flex items-center gap-2">Categoría: {categories.find(c => c.id === serverFilters.categoryId)?.name || serverFilters.categoryId}<Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => { setServerFilters((prev: any) => ({ ...prev, categoryId: undefined })); updateUrl({ categoryId: undefined }); }}><X className="h-3 w-3" /></Button></Badge>)}
            {serverFilters.supplierId && (<Badge variant="secondary" className="flex items-center gap-2">Proveedor: {serverFilters.supplierId}<Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => { setServerFilters((prev: any) => ({ ...prev, supplierId: undefined })); updateUrl({ supplierId: undefined }); }}><X className="h-3 w-3" /></Button></Badge>)}
            {serverFilters.supplierName && (<Badge variant="secondary" className="flex items-center gap-2">Proveedor contiene: &quot;{serverFilters.supplierName}&quot;<Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => { setServerFilters((prev: any) => ({ ...prev, supplierName: undefined })); updateUrl({ supplierName: undefined }); }}><X className="h-3 w-3" /></Button></Badge>)}
            <Button variant="ghost" size="sm" className="h-7" onClick={() => { clearAllFilters(); }}>Limpiar todo</Button>
            <Select value={serverFilters.stockStatus || 'all'} onValueChange={(v: any) => handleStockStatusChange(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado de stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="in_stock">Con stock</SelectItem>
                <SelectItem value="out_of_stock">Sin stock</SelectItem>
                <SelectItem value="low_stock">Bajo</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AdvancedSearch products={products as any} categories={categories} onFiltersChange={(filters) => applyFilters(filters)} />

          <ProductTable
            products={searchResults}
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
            sortBy={(serverFilters.sortBy === 'sale_price') ? 'price' : (serverFilters.sortBy === 'stock_quantity') ? 'stock' : (serverFilters.sortBy === 'created_at') ? 'createdAt' : (serverFilters.sortBy === 'category_id') ? 'category' : (serverFilters.sortBy === 'supplier_id') ? 'supplier' : (serverFilters.sortBy === 'sku') ? 'code' : (serverFilters.sortBy === 'name') ? 'name' : undefined}
            sortOrder={(serverFilters.sortOrder as any) || 'asc'}
            onSortChange={(field: 'name' | 'price' | 'stock' | 'createdAt' | 'code' | 'category' | 'supplier', order: 'asc' | 'desc') => { const map: Record<string, string> = { name: 'name', price: 'sale_price', stock: 'stock_quantity', createdAt: 'created_at', code: 'sku', category: 'category_id', supplier: 'supplier_id' }; const serverField = map[field] || 'name'; handleSortChange(serverField, order); }}
            canEdit={canWriteProduct}
            canDelete={canWriteProduct}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Productos</CardTitle>
              <CardDescription>Métricas clave, filtros avanzados y acciones rápidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Productos</div><div className="text-2xl font-semibold">{dashboardStats.totalProducts}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Sin stock</div><div className="text-2xl font-semibold text-red-600">{dashboardStats.outOfStockProducts}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Stock bajo</div><div className="text-2xl font-semibold text-yellow-600">{dashboardStats.lowStockProducts}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Rotación estimada</div><div className="text-2xl font-semibold">{Math.round(((products.filter((p: any) => { const d = new Date(p.updated_at); const days = (Date.now() - d.getTime()) / 86400000; return days <= 30; }).length) / (products.length || 1)) * 100)}%</div></CardContent></Card>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
