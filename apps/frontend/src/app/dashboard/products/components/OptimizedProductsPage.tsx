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
  CheckSquare,
  Download,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermissionsContext } from '@/hooks/use-unified-permissions';
import { LoginModal } from '@/components/auth/LoginModal';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { canCreateProducts, canDeleteProducts, canEditProducts } from '../utils/product-permissions';
import { useProductsStore } from '@/store/products-store';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OptimizedProductsPageProps { className?: string }
interface CategoryOption { id: string; name: string }
interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  variant: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

const CONFIRM_CLOSED: ConfirmState = {
  open: false, title: '', description: '',
  actionLabel: 'Confirmar', variant: 'default', onConfirm: () => {},
};

// ── Framer ────────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

// ── CSV ───────────────────────────────────────────────────────────────────────
function esc(v: unknown) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }
function downloadCsv(name: string, rows: string[]) {
  const blob = new Blob([`﻿${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url });
  a.setAttribute('download', name);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Message helpers ───────────────────────────────────────────────────────────
function getDeleteMsg(d: any) {
  if (d?.action === 'deactivated') return 'Producto desactivado (tiene historial de ventas). Visible filtrando por Inactivos.';
  if (d?.action === 'deleted') return 'Producto eliminado permanentemente.';
  return d?.message || 'Producto procesado';
}
function getBulkMsg(d: any) {
  const del = Number(d?.results?.deleted || 0);
  const deact = Number(d?.results?.deactivated || 0);
  const parts = [];
  if (del) parts.push(`${del} eliminado${del !== 1 ? 's' : ''}`);
  if (deact) parts.push(`${deact} desactivado${deact !== 1 ? 's' : ''} (con historial)`);
  return parts.length ? `${parts.join(', ')}. Los desactivados se ven en "Inactivos".` : d?.message || 'Procesados';
}

// ── Component ─────────────────────────────────────────────────────────────────
export function OptimizedProductsPage({ className = '' }: OptimizedProductsPageProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Permisos ──────────────────────────────────────────────────────────────
  // IMPORTANTE: `loading = true` mientras los permisos se cargan desde la API.
  // Durante ese período mostramos los botones de forma optimista (si el usuario
  // está autenticado) y dejamos que la API haga la validación final.
  const pctx = usePermissionsContext();
  const permsReady = !pctx.loading;

  // Permiso calculado: true si está listo Y tiene el permiso, o si aún está
  // cargando pero el usuario está autenticado (optimistic).
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

  // ── Preferencias (Zustand) ────────────────────────────────────────────────
  const storedView    = useProductsStore((s) => s.currentView);
  const storedLimit   = useProductsStore((s) => s.itemsPerPage);
  const setStoredView  = useProductsStore((s) => s.setCurrentView);
  const setStoredLimit = useProductsStore((s) => s.setItemsPerPage);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search: '', categoryId: '', page: 1, limit: storedLimit,
    sortBy: 'updated_at', sortOrder: 'desc' as 'asc' | 'desc',
    isActive: true as boolean | undefined,   // true = solo activos (default)
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    storedView === 'grid' ? 'grid' : 'list'
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [loginModal, setLoginModal] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(CONFIRM_CLOSED);
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; product: Product | null }>
    ({ open: false, product: null });
  const [editModal, setEditModal] = useState<{ open: boolean; product: Product | null }>
    ({ open: false, product: null });

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

  // Sincronizar selección con productos visibles
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products-list'] });
    await queryClient.invalidateQueries({ queryKey: ['products-summary'] });
    await refetchCategories();
  }, [queryClient, refetchCategories]);

  const openConfirm = useCallback((s: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...s, open: true });
  }, []);

  const handleFilterChange = useCallback((f: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...f, page: typeof f.page === 'number' ? f.page : 1 }));
  }, []);

  const switchView = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    setStoredView(mode === 'grid' ? 'grid' : 'table');
  }, [setStoredView]);

  const toggleShowInactive = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      isActive: prev.isActive === false ? true : false,
      page: 1,
    }));
  }, []);

  const showInactive = filters.isActive === false;

  // ── Export ────────────────────────────────────────────────────────────────
  const exportCsv = useCallback(async (items: Product[], label: string) => {
    if (!items.length) { toast.info('No hay productos para exportar'); return; }
    setIsExporting(true);
    try {
      const rows = [
        ['Nombre','SKU','Categoría','Precio venta','Precio costo','Stock','Estado','Actualizado']
          .map(esc).join(','),
        ...items.map((p) => [
          p.name, p.sku,
          typeof p.category === 'object' ? p.category?.name : '',
          p.sale_price ?? 0, p.cost_price ?? 0, p.stock_quantity ?? 0,
          p.is_active ? 'Activo' : 'Inactivo', p.updated_at ?? '',
        ].map(esc).join(',')),
      ];
      downloadCsv(`productos-${label}-${new Date().toISOString().slice(0,10)}.csv`, rows);
      toast.success(`${items.length} productos exportados`);
    } catch { toast.error('No se pudo exportar'); }
    finally { setIsExporting(false); }
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const executeDelete = useCallback(async (productId: string) => {
    setPendingDelete((p) => new Set(p).add(productId));
    try {
      const r = await api.delete(`/products/${productId}`);
      setSelected((p) => { const n = new Set(p); n.delete(productId); return n; });
      if (detailsModal.product?.id === productId) setDetailsModal({ open: false, product: null });
      await refreshAll();
      toast.success(getDeleteMsg(r.data));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally {
      setPendingDelete((p) => { const n = new Set(p); n.delete(productId); return n; });
    }
  }, [detailsModal.product?.id, refreshAll]);

  const executeBulkDelete = useCallback(async () => {
    const ids = [...selected];
    if (!ids.length || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const r = await api.post('/products/bulk-delete', { ids });
      await refreshAll();
      setSelected(new Set());
      toast.success(getBulkMsg(r.data));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsBulkDeleting(false); }
  }, [isBulkDeleting, refreshAll, selected]);

  const handleEdit = useCallback((product: Product) => {
    if (permsReady && !canEdit) { toast.error('Sin permisos para editar'); return; }
    setEditModal({ open: true, product });
  }, [canEdit, permsReady]);

  const handleDelete = useCallback((productId: string) => {
    if (permsReady && !canDelete) { toast.error('Sin permisos para eliminar'); return; }
    if (pendingDelete.has(productId)) return;
    openConfirm({
      title: 'Eliminar producto',
      description: 'Si tiene historial de ventas se desactivará en lugar de eliminarse permanentemente.',
      actionLabel: 'Sí, eliminar',
      variant: 'destructive',
      onConfirm: () => executeDelete(productId),
    });
  }, [canDelete, pendingDelete, openConfirm, executeDelete, permsReady]);

  const handleBulkDelete = useCallback(() => {
    if (permsReady && !canDelete) { toast.error('Sin permisos para eliminar'); return; }
    openConfirm({
      title: `Eliminar ${selected.size} producto${selected.size !== 1 ? 's' : ''}`,
      description: 'Los que tengan ventas se desactivarán. Esta acción no se puede deshacer.',
      actionLabel: 'Sí, eliminar', variant: 'destructive',
      onConfirm: executeBulkDelete,
    });
  }, [canDelete, openConfirm, selected.size, executeBulkDelete, permsReady]);

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
      await refreshAll();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [editModal.product, refreshAll]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        className={cn('flex flex-col gap-4 p-4 sm:p-6', className)}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Izquierda: título + stats inline */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Productos</h1>

            <ProductsStats products={products} total={total} loading={statsLoading} summary={stats} />

            {(isSaving || pendingDelete.size > 0) && (
              <Badge className="animate-pulse gap-1 bg-primary/90 text-[11px] text-primary-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {isSaving ? 'Guardando…' : 'Procesando…'}
              </Badge>
            )}
          </div>

          {/* Derecha: acciones */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Toggle: mostrar inactivos */}
            <Button
              variant={showInactive ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleShowInactive}
              className={cn('h-9 gap-1.5 text-xs', showInactive && 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400')}
              title={showInactive ? 'Mostrando inactivos — clic para ver activos' : 'Ver productos inactivos'}
            >
              {showInactive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{showInactive ? 'Inactivos' : 'Ver inactivos'}</span>
            </Button>

            {/* Vista grid / lista */}
            <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => switchView(mode)}
                  className={cn(
                    'flex h-7 w-8 items-center justify-center rounded-md transition-all',
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mode === 'grid' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>

            {canExport && (
              <Button variant="outline" size="sm"
                onClick={() => exportCsv(products, 'vista')}
                disabled={isExporting || !products.length}
                className="h-9 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isExporting ? 'Exportando…' : 'Exportar'}</span>
              </Button>
            )}

            {/* Crear producto — visible para todos los usuarios autenticados */}
            {user && (
              <Button size="sm" onClick={handleCreate} className="h-9 gap-1.5"
                disabled={pctx.loading}
              >
                {pctx.loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Plus className="h-4 w-4" />
                }
                Nuevo Producto
              </Button>
            )}
          </div>
        </motion.div>

        {/* ═══ FILTROS ══════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}>
          <ProductsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={handleRefresh}
            categories={categories}
            loading={loading}
          />
        </motion.div>

        {/* ═══ CONTENIDO ════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}
          className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
        >
          {/* Toolbar: info de paginación + tamaño de página */}
          <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <PaginationInfo currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={total} />
              {showInactive && (
                <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                  <EyeOff className="h-3 w-3" /> Mostrando inactivos
                </Badge>
              )}
            </div>
            <PageSizeSelector
              pageSize={itemsPerPage}
              onPageSizeChange={(limit) => {
                setFilters((p) => ({ ...p, limit, page: 1 }));
                setStoredLimit(limit);
              }}
              options={[10, 25, 50, 100]}
            />
          </div>

          {/* Lista / Tabla / Loading / Empty */}
          <div className="relative min-h-[400px]">
            {loading && products.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-border border-t-primary" />
                  <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                hasFilters={Boolean(filters.search || filters.categoryId)}
                showInactive={showInactive}
                canCreate={canCreate}
                permissionsLoading={pctx.loading}
                onClearFilters={() => handleFilterChange({ search: '', categoryId: '', isActive: true })}
                onShowInactive={toggleShowInactive}
                onCreate={handleCreate}
              />
            ) : viewMode === 'grid' ? (
              <SimpleProductList
                products={products}
                onEdit={canEdit ? handleEdit : undefined}
                onDelete={canDelete ? handleDelete : undefined}
                onView={(p) => setDetailsModal({ open: true, product: p })}
                loading={loading}
                selectedIds={selected}
                onSelectProduct={(id) => {
                  setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
                }}
              />
            ) : (
              <ProductsTableView
                products={products}
                onEdit={canEdit ? handleEdit : undefined}
                onDelete={canDelete ? handleDelete : undefined}
                onView={(p) => setDetailsModal({ open: true, product: p })}
                onSort={(field, order) => setFilters((p) => ({ ...p, sortBy: field, sortOrder: order, page: 1 }))}
                sortField={filters.sortBy}
                sortOrder={filters.sortOrder}
                loading={loading}
                selectedIds={selected}
                onSelectProduct={(id) => {
                  setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
                }}
                onSelectAll={(ids) => setSelected(new Set(ids))}
              />
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 px-4 py-3 sm:flex-row">
              <span className="text-xs text-muted-foreground">
                Página <strong className="text-foreground">{currentPage}</strong> de <strong className="text-foreground">{totalPages}</strong>
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

      {/* ═══ BARRA FLOTANTE DE SELECCIÓN MASIVA ════════════════════════════ */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 64 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 64 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 px-4"
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-2xl backdrop-blur-lg">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold leading-none">
                    {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Exportar o eliminar</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}
                  className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button size="sm" variant="outline" disabled={isExporting}
                  onClick={() => exportCsv(selectedVisible, 'seleccion')} className="h-8 gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
                {canDelete && (
                  <Button size="sm" variant="destructive" disabled={isBulkDeleting}
                    onClick={handleBulkDelete} className="h-8 gap-1">
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
      />
      <LoginModal open={loginModal} onOpenChange={setLoginModal} />

      {/* ═══ CONFIRM DIALOG ═════════════════════════════════════════════════ */}
      <AlertDialog open={confirmState.open} onOpenChange={(o) => !o && setConfirmState(CONFIRM_CLOSED)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmState(CONFIRM_CLOSED)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const run = confirmState.onConfirm;
                setConfirmState(CONFIRM_CLOSED);
                await run();
              }}
              className={confirmState.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmState.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({
  hasFilters, showInactive, canCreate, permissionsLoading,
  onClearFilters, onShowInactive, onCreate,
}: {
  hasFilters: boolean;
  showInactive: boolean;
  canCreate: boolean;
  permissionsLoading: boolean;
  onClearFilters: () => void;
  onShowInactive: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-[440px] flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
        <Package className="h-8 w-8 text-muted-foreground/40" />
      </div>

      <div>
        <h3 className="text-base font-semibold">
          {showInactive ? 'No hay productos inactivos' : 'No se encontraron productos'}
        </h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {hasFilters
            ? 'Ajusta la búsqueda o limpia los filtros.'
            : showInactive
              ? 'Todos los productos están activos.'
              : 'No hay productos activos. Puedes ver los inactivos o crear uno nuevo.'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        )}
        {!showInactive && !hasFilters && (
          <Button variant="outline" size="sm" onClick={onShowInactive} className="gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />
            Ver inactivos
          </Button>
        )}
        {showInactive && (
          <Button variant="outline" size="sm" onClick={onShowInactive} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Ver activos
          </Button>
        )}
        <Button size="sm" onClick={onCreate} className="gap-1.5"
          disabled={permissionsLoading}>
          {permissionsLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />}
          Nuevo Producto
        </Button>
      </div>
    </div>
  );
}
