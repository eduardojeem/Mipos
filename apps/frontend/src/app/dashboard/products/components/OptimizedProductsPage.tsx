'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useOptimizedProducts, useProductStats } from '@/hooks/useOptimizedProducts';
import { SimpleProductList } from '@/components/products/SimpleProductList';
import { ProductsTableView } from '@/components/products/ProductsTableView';
import { ProductDetailsModal } from '@/components/products/ProductDetailsModal';
import { ProductEditModal } from '@/components/products/ProductEditModal';
import { Pagination, PaginationInfo, PageSizeSelector } from '@/components/ui/Pagination';
import { ProductsFilters } from '@/components/products/ProductsFilters';
import { ProductsStats } from '@/components/products/ProductsStats';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import {
  AlertTriangle,
  RefreshCw,
  Plus,
  Download,
  LayoutGrid,
  List,
  Package,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import type { Product } from '@/types';
import { PremiumDashboardCard } from '@/components/dashboard/shared/PremiumDashboardCard';
import { cn } from '@/lib/utils';

interface OptimizedProductsPageProps {
  className?: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

// ── Confirm dialog state ─────────────────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  variant: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

const CONFIRM_CLOSED: ConfirmState = {
  open: false,
  title: '',
  description: '',
  actionLabel: 'Confirmar',
  variant: 'default',
  onConfirm: () => {},
};

// ── Framer variants ──────────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[]) {
  const blob = new Blob([`\uFEFF${rows.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────
export function OptimizedProductsPage({ className = '' }: OptimizedProductsPageProps) {
  const { user, canManageProducts, hasPermission } = useAuth();
  const canCreateProduct = canManageProducts();
  const canExportProducts = hasPermission('products.read');

  // ── Filters ──
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    page: 1,
    limit: 25,
    sortBy: 'updated_at',
    sortOrder: 'desc' as 'asc' | 'desc',
    isActive: true as boolean | undefined,
  });

  // ── UI state ──
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [loginModal, setLoginModal] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(CONFIRM_CLOSED);

  const [detailsModal, setDetailsModal] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [editModal, setEditModal] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  // ── Data ──
  const {
    products, loading, error, total, refetch, currentPage, totalPages, itemsPerPage,
  } = useOptimizedProducts(filters);

  const { stats, loading: statsLoading, refetch: refetchStats } = useProductStats({
    isActive: filters.isActive,
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['dashboard-product-categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      const payload = response.data || {};
      const source = Array.isArray(payload.categories)
        ? payload.categories
        : Array.isArray(payload.data)
          ? payload.data
          : [];
      return source
        .map((c: Partial<CategoryOption>) => ({ id: String(c.id || ''), name: String(c.name || '') }))
        .filter((c: CategoryOption) => c.id && c.name);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const selectedVisibleProducts = useMemo(
    () => (selectedProducts.size ? products.filter((p) => selectedProducts.has(p.id)) : []),
    [products, selectedProducts]
  );

  // Keep selection in sync with visible products
  useEffect(() => {
    setSelectedProducts((prev) => {
      if (!prev.size) return prev;
      const visibleIds = new Set(products.map((p) => p.id));
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  // Clear selection when switching to grid
  useEffect(() => {
    if (viewMode === 'grid' && selectedProducts.size > 0) {
      setSelectedProducts(new Set());
    }
  }, [selectedProducts.size, viewMode]);

  // ── Helpers ──
  const refreshAll = useCallback(async () => {
    await Promise.all([refetch(), refetchStats(), refetchCategories()]);
  }, [refetch, refetchCategories, refetchStats]);

  const openConfirm = useCallback((state: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...state, open: true });
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev, ...newFilters,
      page: typeof newFilters.page === 'number' ? newFilters.page : 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setFilters((prev) => ({ ...prev, sortBy: field, sortOrder: order, page: 1 }));
  }, []);

  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) { next.delete(productId); } else { next.add(productId); }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedProducts(new Set(ids));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  // ── Export ──
  const exportProductsToCsv = useCallback(
    async (targetProducts: Product[], scopeLabel: string) => {
      if (!targetProducts.length) { toast.info('No hay productos para exportar'); return; }
      setIsExporting(true);
      try {
        const rows = [
          ['Nombre', 'SKU', 'Categoría', 'Precio venta', 'Precio costo', 'Stock', 'Estado', 'Actualizado']
            .map(escapeCsvCell).join(','),
          ...targetProducts.map((p) =>
            [
              p.name, p.sku,
              typeof p.category === 'object' ? p.category?.name : '',
              p.sale_price ?? 0, p.cost_price ?? 0, p.stock_quantity ?? 0,
              p.is_active ? 'Activo' : 'Inactivo', p.updated_at ?? '',
            ].map(escapeCsvCell).join(',')
          ),
        ];
        const dateStamp = new Date().toISOString().slice(0, 10);
        downloadCsv(`productos-${scopeLabel}-${dateStamp}.csv`, rows);
        toast.success(`Se exportaron ${targetProducts.length} productos`);
      } catch {
        toast.error('No se pudo exportar el catálogo');
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // ── Bulk delete ──
  const executeBulkDelete = useCallback(async () => {
    const selectedIds = Array.from(selectedProducts);
    if (!selectedIds.length || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const response = await api.post('/products/bulk-delete', { ids: selectedIds });
      await refreshAll();
      handleClearSelection();
      toast.success(response.data?.message || 'Productos procesados correctamente');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsBulkDeleting(false);
    }
  }, [handleClearSelection, isBulkDeleting, refreshAll, selectedProducts]);

  const handleBulkDelete = useCallback(() => {
    openConfirm({
      title: 'Eliminar productos seleccionados',
      description: `Se eliminarán o desactivarán ${selectedProducts.size} producto(s) según su historial de ventas. Esta acción no se puede deshacer.`,
      actionLabel: 'Sí, eliminar',
      variant: 'destructive',
      onConfirm: executeBulkDelete,
    });
  }, [openConfirm, selectedProducts.size, executeBulkDelete]);

  const handleBulkExport = useCallback(async () => {
    await exportProductsToCsv(selectedVisibleProducts, 'seleccion');
  }, [exportProductsToCsv, selectedVisibleProducts]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAll();
      toast.success('Productos actualizados');
    } catch {
      toast.error('Error al actualizar productos');
    }
  }, [refreshAll]);

  // ── CRUD ──
  const handleProductEdit = useCallback((product: Product) => {
    setEditModal({ open: true, product });
  }, []);

  const executeDeleteProduct = useCallback(
    async (productId: string) => {
      setPendingDeleteIds((prev) => new Set(prev).add(productId));
      try {
        const response = await api.delete(`/products/${productId}`);
        setSelectedProducts((prev) => {
          if (!prev.has(productId)) return prev;
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        if (detailsModal.product?.id === productId) {
          setDetailsModal({ open: false, product: null });
        }
        await refreshAll();
        toast.success(response.data?.message || 'Producto procesado correctamente');
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [detailsModal.product?.id, refreshAll]
  );

  const handleProductDelete = useCallback(
    (productId: string) => {
      if (pendingDeleteIds.has(productId)) return;
      openConfirm({
        title: 'Eliminar producto',
        description:
          'Si el producto tiene historial de ventas se marcará como inactivo en lugar de eliminarse permanentemente.',
        actionLabel: 'Sí, continuar',
        variant: 'destructive',
        onConfirm: () => executeDeleteProduct(productId),
      });
    },
    [pendingDeleteIds, openConfirm, executeDeleteProduct]
  );

  const handleProductView = useCallback((product: Product) => {
    setDetailsModal({ open: true, product });
  }, []);

  const handleCreateProduct = useCallback(() => {
    if (!user) { setLoginModal(true); return; }
    if (!canCreateProduct) { toast.error('No tienes permisos para crear productos.'); return; }
    setEditModal({ open: true, product: null });
  }, [canCreateProduct, user]);

  const handleSaveProduct = useCallback(
    async (productData: Partial<Product>) => {
      setIsSaving(true);
      try {
        if (editModal.product) {
          await api.put(`/products/${editModal.product.id}`, productData);
        } else {
          await api.post('/products', productData);
        }
        await refreshAll();
      } catch (err) {
        throw new Error(getErrorMessage(err));
      } finally {
        setIsSaving(false);
      }
    },
    [editModal.product, refreshAll]
  );

  const currentStatusLabel =
    filters.isActive === undefined ? 'Todos' : filters.isActive ? 'Activos' : 'Inactivos';

  // ── Error state ──
  if (error && products.length === 0) {
    return (
      <div className={cn('container mx-auto p-6', className)}>
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Error: {error}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Render ──
  return (
    <>
      <motion.div
        className={cn('container mx-auto space-y-6 p-6', className)}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* ── Hero — adaptive (light & dark) ── */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-purple-50/40 p-8 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/30"
        >
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_hsl(160_80%_50%/0.08),_transparent_40%)]" />
          {/* Ghost icon */}
          <div className="pointer-events-none absolute right-6 top-6 opacity-[0.06]">
            <Package className="h-40 w-40 rotate-6 text-foreground" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-sm ring-1 ring-primary/20">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                  Catálogo de Productos
                </h1>
              </div>

              <p className="max-w-xl text-sm text-muted-foreground">
                Administra el catálogo desde una sola vista, con filtros reales por estado,
                métricas confiables y acciones masivas consistentes con tu organización.
              </p>

              {/* Info badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Package className="h-3 w-3" />
                  {total.toLocaleString()} productos
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Estado: {currentStatusLabel}
                </Badge>
                {(isSaving || pendingDeleteIds.size > 0) && (
                  <Badge className="animate-pulse gap-1 bg-primary/90 text-xs text-primary-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {isSaving ? 'Guardando...' : 'Procesando...'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-xl border border-border bg-background/80 p-1 shadow-sm backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'h-8 rounded-lg px-3 text-sm transition-all',
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                  Grid
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'h-8 rounded-lg px-3 text-sm transition-all',
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="mr-1.5 h-3.5 w-3.5" />
                  Lista
                </Button>
              </div>

              {canExportProducts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportProductsToCsv(products, 'vista')}
                  disabled={isExporting || !products.length}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  {isExporting ? 'Exportando...' : 'Exportar'}
                </Button>
              )}

              {canCreateProduct && (
                <Button size="sm" onClick={handleCreateProduct} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div variants={itemVariants}>
          <ProductsStats products={products} total={total} loading={statsLoading} summary={stats} />
        </motion.div>

        {/* ── Filters ── */}
        <motion.div variants={itemVariants}>
          <ProductsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={handleRefresh}
            categories={categories}
            loading={loading}
          />
        </motion.div>

        {/* ── Bulk action bar (list mode) ── */}
        <AnimatePresence>
          {viewMode === 'list' && selectedProducts.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 48, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 48, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="fixed bottom-8 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
            >
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 p-3.5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Exporta o elimina la selección</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearSelection}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkExport}
                    disabled={isExporting}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Exportar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isBulkDeleting ? 'Procesando...' : 'Eliminar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Product list / table ── */}
        <motion.div variants={itemVariants}>
          <PremiumDashboardCard className="overflow-visible">
            {/* Table toolbar */}
            <div className="flex flex-col items-center justify-between gap-3 border-b border-border/40 p-4 sm:flex-row">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <PaginationInfo
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={total}
                />
                {filters.categoryId && (
                  <Badge variant="secondary" className="border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                    Categoría filtrada
                  </Badge>
                )}
              </div>
              <PageSizeSelector
                pageSize={itemsPerPage}
                onPageSizeChange={handlePageSizeChange}
                options={[10, 25, 50, 100]}
              />
            </div>

            {/* Content area */}
            <div className="relative min-h-[420px]">
              {loading && products.length === 0 ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl bg-background/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Sincronizando catálogo...</p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="flex h-[480px] flex-col items-center justify-center p-12 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-muted/60">
                    <Package className="h-9 w-9 text-muted-foreground/40" />
                  </div>
                  <h3 className="mb-1 text-xl font-bold">No se encontraron productos</h3>
                  <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                    Ajusta la búsqueda, cambia el estado o crea un nuevo producto.
                  </p>
                  {(filters.search || filters.categoryId || filters.isActive !== true) && (
                    <Button
                      variant="outline"
                      onClick={() => handleFilterChange({ search: '', categoryId: '', isActive: true })}
                      className="rounded-xl"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-1">
                  {viewMode === 'grid' ? (
                    <SimpleProductList
                      products={products}
                      onEdit={handleProductEdit}
                      onDelete={handleProductDelete}
                      onView={handleProductView}
                      loading={loading}
                    />
                  ) : (
                    <ProductsTableView
                      products={products}
                      onEdit={handleProductEdit}
                      onDelete={handleProductDelete}
                      onView={handleProductView}
                      onSort={handleSort}
                      sortField={filters.sortBy}
                      sortOrder={filters.sortOrder}
                      loading={loading}
                      selectedIds={selectedProducts}
                      onSelectProduct={handleSelectProduct}
                      onSelectAll={handleSelectAll}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 p-5 sm:flex-row">
                <div className="text-sm text-muted-foreground">
                  Página{' '}
                  <span className="font-semibold text-foreground">{currentPage}</span> de{' '}
                  <span className="font-semibold">{totalPages}</span>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  maxVisiblePages={5}
                />
              </div>
            )}
          </PremiumDashboardCard>
        </motion.div>
      </motion.div>

      {/* ── Modals ── */}
      <ProductDetailsModal
        product={detailsModal.product}
        open={detailsModal.open}
        onOpenChange={(open) =>
          setDetailsModal({ open, product: open ? detailsModal.product : null })
        }
        onEdit={handleProductEdit}
        onDelete={handleProductDelete}
      />

      <ProductEditModal
        product={editModal.product}
        open={editModal.open}
        onOpenChange={(open) =>
          setEditModal({ open, product: open ? editModal.product : null })
        }
        onSave={handleSaveProduct}
        categories={categories}
      />

      <LoginModal open={loginModal} onOpenChange={setLoginModal} />

      {/* ── Confirm AlertDialog ── */}
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => !open && setConfirmState(CONFIRM_CLOSED)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmState(CONFIRM_CLOSED)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmState(CONFIRM_CLOSED);
                await confirmState.onConfirm();
              }}
              className={
                confirmState.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmState.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
