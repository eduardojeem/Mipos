'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptimizedProducts, useProductStats } from '@/hooks/useOptimizedProducts';
import { SimpleProductList } from '@/components/products/SimpleProductList';
import { ProductsTableView } from '@/components/products/ProductsTableView';
import { ProductDetailsModal } from '@/components/products/ProductDetailsModal';
import { ProductEditModal } from '@/components/products/ProductEditModal';
import { Pagination, PaginationInfo, PageSizeSelector } from '@/components/ui/Pagination';
import { ProductsFilters } from '@/components/products/ProductsFilters';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DeleteProductDialog, BulkDeleteDialog } from '@/components/products/DeleteProductDialog';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckSquare,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Package,
  PackageX,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trash2,
  Warehouse,
} from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermissionsContext } from '@/hooks/use-unified-permissions';
import { LoginModal } from '@/components/auth/LoginModal';
import { exportProductsToPdf } from '@/lib/pdf/products-export';
import { exportProductsToCSV } from '@/lib/csv/products-export';
import { ExportConfigDialog, type ExportConfig } from '@/components/products/ExportConfigDialog';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { canCreateProducts, canDeleteProducts, canEditProducts } from '../utils/product-permissions';
import { useProductsStore } from '@/store/products-store';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OptimizedProductsPageProps { className?: string }
interface CategoryOption { id: string; name: string }

// ── Animations ────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// ── CSV ───────────────────────────────────────────────────────────────────────
function esc(v: unknown) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }
function downloadCsv(name: string, rows: string[]) {
  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url });
  a.setAttribute('download', name);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getBulkMsg(d: unknown) {
  const obj = (d && typeof d === 'object') ? (d as Record<string, unknown>) : {};
  const results = (obj.results && typeof obj.results === 'object') ? (obj.results as Record<string, unknown>) : {};
  const del = Number(results.deleted || 0);
  const deact = Number(results.deactivated || 0);
  const parts = [];
  if (del) parts.push(`${del} eliminado${del !== 1 ? 's' : ''}`);
  if (deact) parts.push(`${deact} desactivado${deact !== 1 ? 's' : ''}`);
  const msg = typeof obj.message === 'string' ? obj.message : '';
  return parts.length ? parts.join(', ') : msg || 'Procesados';
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent, loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: 'blue' | 'emerald' | 'amber' | 'rose';
  loading?: boolean;
}) {
  const accentMap = {
    blue:    'from-blue-500/10 to-indigo-500/10 ring-blue-500/20 text-blue-600 dark:text-blue-400',
    emerald: 'from-emerald-500/10 to-teal-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber:   'from-amber-500/10 to-orange-500/10 ring-amber-500/20 text-amber-600 dark:text-amber-400',
    rose:    'from-rose-500/10 to-red-500/10 ring-rose-500/20 text-rose-600 dark:text-rose-400',
  };
  const iconBg = {
    blue:    'bg-blue-500/10',
    emerald: 'bg-emerald-500/10',
    amber:   'bg-amber-500/10',
    rose:    'bg-rose-500/10',
  };

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br p-5 ring-1 transition-shadow hover:shadow-md',
        accentMap[accent],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          )}
          {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', iconBg[accent])}>
          <Icon className={cn('h-5 w-5', accentMap[accent].split(' ')[2])} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function OptimizedProductsPage({ className = '' }: OptimizedProductsPageProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Permisos ──────────────────────────────────────────────────────────────
  const pctx = usePermissionsContext();
  const permsReady = !pctx.loading;

  const canCreate = permsReady
    ? canCreateProducts({ permissions: pctx.permissions, roles: pctx.roles, hasPermission: pctx.hasPermission })
    : !!user;
  const canEdit = permsReady
    ? canEditProducts({ permissions: pctx.permissions, roles: pctx.roles, hasPermission: pctx.hasPermission })
    : !!user;
  const canDelete = permsReady
    ? canDeleteProducts({ permissions: pctx.permissions, roles: pctx.roles, hasPermission: pctx.hasPermission })
    : !!user;
  const canExport = permsReady ? pctx.hasPermission('products', 'read') : !!user;

  // ── Preferencias ──────────────────────────────────────────────────────────
  const storedView    = useProductsStore((s) => s.currentView);
  const storedLimit   = useProductsStore((s) => s.itemsPerPage);
  const setStoredView  = useProductsStore((s) => s.setCurrentView);
  const setStoredLimit = useProductsStore((s) => s.setItemsPerPage);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search: '', categoryId: '', page: 1, limit: storedLimit,
    sortBy: 'updated_at', sortOrder: 'desc' as 'asc' | 'desc',
    isActive: true as boolean | undefined,
    stockStatus: undefined as string | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    showDeleted: false,
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    storedView === 'grid' ? 'grid' : 'list'
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [loginModal, setLoginModal] = useState(false);
  const [exportDialog, setExportDialog] = useState<{ open: boolean; items: Product[]; type: 'pdf' | 'csv' }>({
    open: false,
    items: [],
    type: 'pdf',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
    productId: string | null;
  }>({ open: false, product: null, productId: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; product: Product | null }>(
    { open: false, product: null }
  );
  const [editModal, setEditModal] = useState<{ open: boolean; product: Product | null }>(
    { open: false, product: null }
  );

  // ── Data ──────────────────────────────────────────────────────────────────
  const { products, loading, error, total, currentPage, totalPages, itemsPerPage } =
    useOptimizedProducts(filters);
  const { stats, loading: statsLoading } = useProductStats({ isActive: filters.isActive });
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['dashboard-product-categories'],
    queryFn: async () => {
      const r = await api.get('/categories');
      const src = Array.isArray(r.data?.categories) ? r.data.categories
                : Array.isArray(r.data?.data) ? r.data.data : [];
      return src
        .map((c: Partial<CategoryOption>) => ({ id: String(c.id ?? ''), name: String(c.name ?? '') }))
        .filter((c: CategoryOption) => c.id && c.name);
    },
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, retry: 1,
  });

  // Sincronizar selección
  useEffect(() => {
    setSelected((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(products.map((p) => p.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  const selectedVisible = useMemo(
    () => selected.size ? products.filter((p) => selected.has(p.id)) : [],
    [products, selected]
  );

  // ── Computed stats ────────────────────────────────────────────────────────
  const lowStock   = stats?.lowStockProducts  ?? 0;
  const outOfStock = stats?.outOfStockProducts ?? 0;
  const totalValue = stats?.totalValue ?? 0;
  // Usamos `total` de la query de lista: siempre está en sincronía con lo que
  // se renderiza y se actualiza inmediatamente tras crear/eliminar/editar.
  const totalCount = total;
  const alertCount = lowStock + outOfStock;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refreshProducts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products-list'], exact: false });
    await queryClient.invalidateQueries({ queryKey: ['products-summary'], exact: false });
  }, [queryClient]);

  const refreshAll = useCallback(async () => {
    await refreshProducts();
    await refetchCategories();
  }, [refreshProducts, refetchCategories]);

  const handleFilterChange = useCallback((f: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...f, page: typeof f.page === 'number' ? f.page : 1 }));
  }, []);

  const switchView = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    setStoredView(mode === 'grid' ? 'grid' : 'table');
  }, [setStoredView]);

  // ── Export ────────────────────────────────────────────────────────────────
  const openExportDialog = useCallback((items: Product[], type: 'pdf' | 'csv') => {
    if (!items.length) {
      toast.info('No hay productos para exportar');
      return;
    }
    setExportDialog({ open: true, items, type });
  }, []);

  const handleExportWithConfig = useCallback(async (config: ExportConfig) => {
    setIsExporting(true);
    try {
      const { items, type } = exportDialog;

      if (type === 'pdf') {
        await exportProductsToPdf(items, {
          title: 'Catálogo de Productos',
          includeStats: config.includeStats,
          columns: config.columns,
          stats: {
            total: items.length,
            totalValue: items.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.stock_quantity || 0)), 0),
            inStock: items.filter((p) => (p.stock_quantity || 0) > 0).length,
            lowStock: items.filter((p) => {
              const stock = p.stock_quantity || 0;
              const minStock = p.min_stock || 5;
              return stock > 0 && stock <= minStock;
            }).length,
          },
        });
        toast.success(`${items.length} productos exportados a PDF`);
      } else {
        exportProductsToCSV(items, { columns: config.columns });
        toast.success(`${items.length} productos exportados a CSV`);
      }
    } catch (err) {
      console.error('[handleExportWithConfig] Error:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }, [exportDialog]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const executeDelete = useCallback(async (productId: string) => {
    setPendingDelete((p) => new Set(p).add(productId));
    try {
      const r = await api.delete(`/products/${productId}`);
      setSelected((p) => { const n = new Set(p); n.delete(productId); return n; });
      if (detailsModal.product?.id === productId) setDetailsModal({ open: false, product: null });
      await refreshProducts();
      const action = r.data?.action;
      if (action === 'deactivated') {
        toast.warning('Producto desactivado — tiene historial de ventas y no puede eliminarse permanentemente.');
      } else if (action === 'deleted') {
        toast.success('Producto eliminado correctamente.');
      } else {
        toast.success(r.data?.message || 'Producto procesado.');
      }
    } catch (err) {
      console.error('[executeDelete] Error al eliminar producto:', productId, err);
      toast.error(getErrorMessage(err));
    } finally {
      setPendingDelete((p) => { const n = new Set(p); n.delete(productId); return n; });
    }
  }, [detailsModal.product?.id, refreshProducts]);

  const handleRestore = useCallback(async (productId: string) => {
    try {
      await api.post(`/products/${productId}/restore`);
      toast.success('Producto restaurado correctamente.');
      await refreshProducts();
    } catch (err) {
      console.error('[handleRestore] Error al restaurar producto:', productId, err);
      toast.error(getErrorMessage(err));
    }
  }, [refreshProducts]);

  const executeBulkDelete = useCallback(async () => {
    const ids = [...selected];
    if (!ids.length || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const r = await api.post('/products/bulk-delete', { ids });
      await refreshProducts();
      setSelected(new Set());
      const hasErrors = Array.isArray(r.data?.errors) && r.data.errors.length > 0;
      toast.success(getBulkMsg(r.data));
      if (hasErrors) toast.warning('Algunos productos no pudieron procesarse.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsBulkDeleting(false); }
  }, [isBulkDeleting, refreshProducts, selected]);

  const handleEdit = useCallback((product: Product) => {
    if (permsReady && !canEdit) { toast.error('Sin permisos para editar'); return; }
    setEditModal({ open: true, product });
  }, [canEdit, permsReady]);

  const handleDelete = useCallback((productId: string) => {
    if (permsReady && !canDelete) { toast.error('Sin permisos para eliminar'); return; }
    if (pendingDelete.has(productId)) return;
    const product = products.find((p) => p.id === productId) ?? null;
    setDeleteDialog({ open: true, product, productId });
  }, [canDelete, pendingDelete, permsReady, products]);

  const handleBulkDelete = useCallback(() => {
    if (permsReady && !canDelete) { toast.error('Sin permisos para eliminar'); return; }
    setBulkDeleteDialog(true);
  }, [canDelete, permsReady]);

  const handleCreate = useCallback(() => {
    if (!user) { setLoginModal(true); return; }
    if (permsReady && !canCreate) { toast.error('Sin permisos para crear productos'); return; }
    setEditModal({ open: true, product: null });
  }, [canCreate, user, permsReady]);

  const handleSave = useCallback(async (data: Partial<Product>) => {
    setIsSaving(true);
    try {
      if (editModal.product) {
        await api.put(`/products/${editModal.product.id}`, data);
        toast.success('Producto actualizado');
      } else {
        await api.post('/products', data);
        toast.success('Producto creado');
      }
      await refreshProducts();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [editModal.product, refreshProducts]);

  const handleTogglePrivacy = useCallback(async (productId: string, isPublic: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(productId));
    try {
      await api.put(`/products/${productId}`, { is_public: isPublic });
      await refreshProducts();
      toast.success(isPublic ? 'Producto visible en catálogo' : 'Producto ocultado del catálogo');
    } catch (err) {
      console.error('[handleTogglePrivacy] Error:', productId, err);
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [refreshProducts]);

  const handleRefresh = useCallback(async () => {
    try { await refreshAll(); toast.success('Catálogo actualizado'); }
    catch { toast.error('Error al actualizar'); }
  }, [refreshAll]);

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && products.length === 0) {
    return (
      <div className={cn('p-4 sm:p-6', className)}>
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="truncate">{error}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="shrink-0">
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.categoryId || filters.stockStatus ||
    filters.minPrice || filters.maxPrice || filters.showDeleted
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        className={cn('flex flex-col gap-6 p-4 sm:p-6 lg:p-8', className)}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ═══ HERO HEADER ════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}>
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-8 shadow-sm">
            {/* Decorative orb */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl"
            />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Izquierda */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/30 shadow-inner">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Productos</h1>
                    {(isSaving || pendingDelete.size > 0) && (
                      <Badge className="animate-pulse gap-1 bg-primary/90 text-xs text-primary-foreground">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        {isSaving ? 'Guardando…' : 'Procesando…'}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gestioná tu catálogo, precios e inventario desde un solo lugar.
                  </p>
                </div>
              </div>

              {/* Derecha: acciones */}
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {/* Selector vista */}
                <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/50 p-1">
                  {(['grid', 'list'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => switchView(mode)}
                      className={cn(
                        'flex h-7 w-8 items-center justify-center rounded-lg transition-all duration-150',
                        viewMode === mode
                          ? 'bg-background text-primary shadow-sm ring-1 ring-border/60'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title={mode === 'grid' ? 'Vista tarjetas' : 'Vista tabla'}
                    >
                      {mode === 'grid' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>

                {canExport && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExportDialog(products, 'csv')}
                      disabled={isExporting || !products.length}
                      className="h-9 gap-1.5 rounded-xl text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">CSV</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExportDialog(products, 'pdf')}
                      disabled={isExporting || !products.length}
                      className="h-9 gap-1.5 rounded-xl text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-9 gap-1.5 rounded-xl text-xs"
                  title="Actualizar catálogo"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>

                {user && (
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={pctx.loading}
                    className="h-9 gap-1.5 rounded-xl bg-primary text-sm font-semibold shadow-sm"
                  >
                    {pctx.loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Plus className="h-4 w-4" />
                    }
                    Nuevo Producto
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ STAT CARDS ═════════════════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <StatCard
            label="Total productos"
            value={totalCount}
            sub={`${stats?.recentlyAdded ?? 0} añadidos esta semana`}
            icon={ShoppingBag}
            accent="blue"
            loading={loading && totalCount === 0}
          />
          <StatCard
            label="Valor inventario"
            value={statsLoading ? '—' : `Gs ${totalValue.toLocaleString('es-PY')}`}
            sub="Basado en precio de costo"
            icon={TrendingUp}
            accent="emerald"
            loading={statsLoading}
          />
          <StatCard
            label="Sin stock"
            value={outOfStock}
            sub={outOfStock > 0 ? 'Requieren reposición urgente' : 'Todo con stock disponible'}
            icon={PackageX}
            accent={outOfStock > 0 ? 'rose' : 'emerald'}
            loading={statsLoading}
          />
          <StatCard
            label="Stock bajo"
            value={alertCount}
            sub={alertCount > 0 ? 'Revisar antes de agotar' : 'Niveles de stock normales'}
            icon={Warehouse}
            accent={alertCount > 0 ? 'amber' : 'emerald'}
            loading={statsLoading}
          />
        </motion.div>

        {/* ═══ FILTROS ════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}>
          <ProductsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={handleRefresh}
            categories={categories}
            loading={loading}
          />
        </motion.div>

        {/* ═══ TABLA / GRID ═══════════════════════════════════════════════ */}
        <motion.div
          variants={fadeUp}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-5 py-3">
            <div className="flex items-center gap-3">
              <PaginationInfo currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={total} />
              {filters.search && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" /> &quot;{filters.search}&quot;
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'list' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={() => setFilters((p) => ({
                    ...p,
                    sortOrder: p.sortOrder === 'asc' ? 'desc' : 'asc',
                  }))}
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {filters.sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </Button>
              )}
              <PageSizeSelector
                pageSize={itemsPerPage}
                onPageSizeChange={(limit) => {
                  setFilters((p) => ({ ...p, limit, page: 1 }));
                  setStoredLimit(limit);
                }}
                options={[10, 25, 50, 100]}
              />
            </div>
          </div>

          {/* Contenido */}
          <div className="relative min-h-[440px]">
            {loading && products.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
                    <Package className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                hasFilters={hasActiveFilters}
                canCreate={canCreate}
                permissionsLoading={pctx.loading}
                onClearFilters={() => handleFilterChange({
                  search: '', categoryId: '', isActive: true,
                  stockStatus: undefined, minPrice: undefined, maxPrice: undefined,
                  showDeleted: false,
                })}
                onCreate={handleCreate}
              />
            ) : viewMode === 'grid' ? (
              <SimpleProductList
                products={products}
                onEdit={canEdit ? handleEdit : undefined}
                onDelete={canDelete ? handleDelete : undefined}
                onRestore={handleRestore}
                showDeleted={filters.showDeleted}
                onView={(p) => setDetailsModal({ open: true, product: p })}
                loading={loading}
                selectedIds={selected}
                onSelectProduct={(id) => {
                  setSelected((prev) => {
                    const n = new Set(prev);
                    if (n.has(id)) n.delete(id);
                    else n.add(id);
                    return n;
                  });
                }}
              />
            ) : (
              <ProductsTableView
                products={products}
                onEdit={canEdit ? handleEdit : undefined}
                onDelete={canDelete ? handleDelete : undefined}
                onRestore={handleRestore}
                onTogglePrivacy={handleTogglePrivacy}
                showDeleted={filters.showDeleted}
                onView={(p) => setDetailsModal({ open: true, product: p })}
                onSort={(field, order) => setFilters((p) => ({ ...p, sortBy: field, sortOrder: order, page: 1 }))}
                sortField={filters.sortBy}
                sortOrder={filters.sortOrder}
                loading={loading}
                selectedIds={selected}
                onSelectProduct={(id) => {
                  setSelected((prev) => {
                    const n = new Set(prev);
                    if (n.has(id)) n.delete(id);
                    else n.add(id);
                    return n;
                  });
                }}
                onSelectAll={(ids) => setSelected(new Set(ids))}
                togglingIds={togglingIds}
              />
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border/50 bg-muted/10 px-5 py-3 sm:flex-row">
              <span className="text-xs text-muted-foreground">
                Página <strong className="text-foreground">{currentPage}</strong> de{' '}
                <strong className="text-foreground">{totalPages}</strong>
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
                maxVisiblePages={5}
              />
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ═══ BARRA FLOTANTE SELECCIÓN MASIVA ════════════════════════════════ */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4"
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 px-5 py-3.5 shadow-2xl shadow-black/20 backdrop-blur-xl ring-1 ring-border/40">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <CheckSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">
                    {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Exportar o eliminar</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-8 rounded-lg text-xs">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isExporting}
                  onClick={() => openExportDialog(selectedVisible, 'csv')}
                  className="h-8 gap-1 rounded-lg"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isExporting}
                  onClick={() => openExportDialog(selectedVisible, 'pdf')}
                  className="h-8 gap-1 rounded-lg"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
                {canDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="h-8 gap-1 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isBulkDeleting ? 'Procesando…' : 'Eliminar'}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODALES ════════════════════════════════════════════════════════ */}
      <ProductDetailsModal
        product={detailsModal.product}
        open={detailsModal.open}
        onOpenChange={(open) => setDetailsModal({ open, product: open ? detailsModal.product : null })}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <ProductEditModal
        product={editModal.product}
        open={editModal.open}
        onOpenChange={(open) => setEditModal({ open, product: open ? editModal.product : null })}
        onSave={handleSave}
        categories={categories}
        onTaxonomyChange={() => { void refetchCategories(); }}
      />
      <LoginModal open={loginModal} onOpenChange={setLoginModal} />

      {/* ═══ DELETE DIALOG (individual) ═════════════════════════════════════ */}
      <DeleteProductDialog
        open={deleteDialog.open}
        product={deleteDialog.product}
        isDeleting={deleteDialog.productId ? pendingDelete.has(deleteDialog.productId) : false}
        onConfirm={() => {
          const id = deleteDialog.productId;
          setDeleteDialog({ open: false, product: null, productId: null });
          if (id) {
            executeDelete(id);
          } else {
            console.warn('[DeleteProduct] onConfirm: productId en estado es null');
          }
        }}
        onCancel={() => {
          setDeleteDialog({ open: false, product: null, productId: null });
        }}
      />

      {/* ═══ BULK DELETE DIALOG ═════════════════════════════════════════════ */}
      <BulkDeleteDialog
        open={bulkDeleteDialog}
        count={selected.size}
        isDeleting={isBulkDeleting}
        onConfirm={() => {
          setBulkDeleteDialog(false);
          executeBulkDelete();
        }}
        onCancel={() => setBulkDeleteDialog(false)}
      />

      {/* ═══ EXPORT CONFIG DIALOG ═══════════════════════════════════════════ */}
      <ExportConfigDialog
        open={exportDialog.open}
        onOpenChange={(open) => setExportDialog((prev) => ({ ...prev, open }))}
        onExport={handleExportWithConfig}
        isLoading={isExporting}
        selectedCount={exportDialog.items.length}
      />
    </>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({
  hasFilters, canCreate, permissionsLoading,
  onClearFilters, onCreate,
}: {
  hasFilters: boolean;
  canCreate: boolean;
  permissionsLoading: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-[480px] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border/40">
          <Package className="h-9 w-9 text-muted-foreground/50" />
        </div>
        {hasFilters && (
          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/90 ring-2 ring-background">
            <span className="text-[10px] font-bold text-white">!</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">
          {hasFilters ? 'Sin resultados' : 'Tu catálogo está vacío'}
        </h3>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {hasFilters
            ? 'No encontramos productos con esos filtros. Probá ajustando la búsqueda.'
            : 'Empezá añadiendo tu primer producto al catálogo.'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="rounded-xl">
            Limpiar filtros
          </Button>
        )}
        {!hasFilters && canCreate && (
          <Button
            size="sm"
            onClick={onCreate}
            disabled={permissionsLoading}
            className="gap-1.5 rounded-xl shadow-sm"
          >
            {permissionsLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            Nuevo Producto
          </Button>
        )}
      </div>
    </div>
  );
}
