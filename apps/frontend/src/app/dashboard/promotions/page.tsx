'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download, FileJson, FileSpreadsheet, History, Plus,
  RefreshCw, Search, Tag, Clock, XCircle, Package, Scissors, Info, Store, Layers3, Sparkles, FilterX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';
import { useStore } from '@/store';
import { PromotionFilters } from './components/PromotionFilters';
import { CreatePromotionDialog } from './components/CreatePromotionDialog';
import { PromotionsList } from './components/PromotionsList';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { BulkActionsBar } from './components/BulkActionsBar';
import { Pagination } from './components/Pagination';
import CarouselEditor from './components/CarouselEditor';
import CarouselAuditLog from './components/CarouselAuditLog';
import api from '@/lib/api';
import { getSelectedOrganizationId } from '@/lib/organization-context';
import { toast } from '@/lib/toast';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createLogger } from '@/lib/logger';
import { useCurrentVertical } from '@/hooks/use-current-vertical';

interface Promotion {
  id: string;
  name: string;
  description: string;
  targetType?: 'PRODUCT' | 'SERVICE';
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount?: number;
  usageLimit?: number;
  applicableProducts?: unknown[];
  applicableServices?: unknown[];
}

const logger = createLogger('PromotionsPage');

function deriveProductCounts(promotions: Promotion[]): Record<string, number> {
  return promotions.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = Array.isArray(p.applicableProducts) ? p.applicableProducts.length : 0;
    return acc;
  }, {});
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  helper,
  accent = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  helper: string;
  accent?: 'default' | 'emerald' | 'amber' | 'rose' | 'blue';
}) {
  const palette = {
    default: {
      wrap: 'bg-muted/50 text-foreground',
      icon: 'bg-background text-foreground',
    },
    emerald: {
      wrap: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
      icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    amber: {
      wrap: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
      icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    },
    rose: {
      wrap: 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
      icon: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    },
    blue: {
      wrap: 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100',
      icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
  }[accent];

  return (
    <Card className={cn('border-border/60 shadow-sm', palette.wrap)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs opacity-70">{helper}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', palette.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PromotionsPage() {
  const vertical = useCurrentVertical();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'inactive'>('all');
  const [targetFilter, setTargetFilter] = useState<'all' | 'PRODUCT' | 'SERVICE'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'discount'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselVersion, setCarouselVersion] = useState(0);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const storeItems = useStore((s) => s.items);
  const fetchStorePromotions = useStore((s) => s.fetchPromotions);
  const storeLoading = useStore((s) => s.loading);
  const storeError = useStore((s) => s.error);

  const fetchProductCounts = useCallback(async () => {
    try {
      setLoadingCounts(true);
      const ids = storeItems.map((p: Promotion) => p.id);
      const fallbackCounts = deriveProductCounts(storeItems);
      if (ids.length === 0) { setProductCounts(fallbackCounts); return; }

      const orgId = getSelectedOrganizationId();
      const headers = orgId ? { 'x-organization-id': orgId } : {};
      const chunkSize = 100;
      const chunks = Array.from(
        { length: Math.ceil(ids.length / chunkSize) },
        (_, i) => ids.slice(i * chunkSize, (i + 1) * chunkSize),
      );

      const responses = await Promise.all(
        chunks.map((chunk) => api.post('/promotions/batch/product-counts', { ids: chunk }, { headers }))
      );

      const merged = responses.reduce<Record<string, number>>((acc, r) => {
        if (r.data?.success && r.data?.counts) Object.assign(acc, r.data.counts);
        return acc;
      }, {});

      setProductCounts(Object.keys(merged).length > 0 ? merged : fallbackCounts);
    } catch (err) {
      logger.log('Batch counts failed, using fallback', err);
      setProductCounts(deriveProductCounts(storeItems));
    } finally {
      setLoadingCounts(false);
    }
  }, [storeItems]);

  useEffect(() => {
    fetchStorePromotions().catch(() => {});
  }, [fetchStorePromotions]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => { try { await fetchProductCounts(); } catch { /**/ } };
    if (!cancelled) run();
    return () => { cancelled = true; };
  }, [storeItems, fetchProductCounts]);

  const getStatus = useCallback((p: Promotion) => {
    const now = new Date();
    if (!p.isActive) return 'inactive';
    if (now < new Date(p.startDate)) return 'scheduled';
    if (now > new Date(p.endDate)) return 'expired';
    return 'active';
  }, []);

  const getAssociationCount = useCallback((promotion: Promotion) => {
    if (promotion.targetType === 'SERVICE') {
      return promotion.applicableServices?.length ?? 0;
    }

    return productCounts[promotion.id] ?? promotion.applicableProducts?.length ?? 0;
  }, [productCounts]);

  const filteredPromotions = useMemo(() => {
    const filtered = storeItems.filter((p: Promotion) => {
      const q = searchTerm.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && getStatus(p) !== statusFilter) return false;
      if (targetFilter !== 'all' && (p.targetType || 'PRODUCT') !== targetFilter) return false;
      return true;
    });
    return filtered.sort((a: Promotion, b: Promotion) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      return b.discountValue - a.discountValue;
    });
  }, [storeItems, searchTerm, statusFilter, targetFilter, sortBy, getStatus]);

  const stats = useMemo(() => {
    const all = storeItems as Promotion[];
    const productPromotions = all.filter((p) => (p.targetType || 'PRODUCT') === 'PRODUCT');
    const servicePromotions = all.filter((p) => p.targetType === 'SERVICE');

    return {
      total: all.length,
      active: all.filter((p) => getStatus(p) === 'active').length,
      scheduled: all.filter((p) => getStatus(p) === 'scheduled').length,
      expired: all.filter((p) => getStatus(p) === 'expired').length,
      productPromotions: productPromotions.length,
      servicePromotions: servicePromotions.length,
      linkedProducts: productPromotions.reduce((sum, promotion) => sum + getAssociationCount(promotion), 0),
      linkedServices: servicePromotions.reduce((sum, promotion) => sum + getAssociationCount(promotion), 0),
    };
  }, [storeItems, getStatus, getAssociationCount]);

  const activeFiltersCount = [
    searchTerm.trim().length > 0,
    statusFilter !== 'all',
    targetFilter !== 'all',
  ].filter(Boolean).length;

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = filteredPromotions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, targetFilter, sortBy]);

  const exportToExcel = () => {
    const data = filteredPromotions.map((p: Promotion) => ({
      Nombre: p.name, Descripción: p.description,
      Tipo: p.discountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto Fijo',
      Valor: p.discountValue, Inicio: p.startDate, Fin: p.endDate,
      Estado: getStatus(p), Activa: p.isActive ? 'Sí' : 'No',
      Usos: p.usageCount || 0, Límite: p.usageLimit || 'Ilimitado',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promociones');
    XLSX.writeFile(wb, `promociones-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Archivo Excel descargado');
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(filteredPromotions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `promociones-${new Date().toISOString().split('T')[0]}.json`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Archivo JSON descargado');
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const refreshAll = () => {
    fetchStorePromotions();
    fetchProductCounts();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTargetFilter('all');
  };

  const isBarbershop = vertical === 'BARBERSHOP';
  const pageCopy = isBarbershop
    ? {
        title: 'Promociones y campañas',
        subtitle: 'Administrá promociones de productos y servicios para tu barbería desde un solo panel.',
        createLabel: 'Nueva promoción',
        searchPlaceholder: 'Buscar campañas o promociones...',
        carouselTitle: 'Carrusel de compras online',
        infoTitle: 'Promociones para barbería',
        infoDescription: 'Desde este panel podés gestionar promos de productos y servicios. Las ofertas web siguen funcionando para productos, mientras que las promos de servicios quedan disponibles para uso interno y operación del negocio.',
        workspaceTitle: 'Panel operativo',
        workspaceDescription: 'Controlá campañas activas, material público y promociones internas sin mezclar reservas con ofertas web.',
      }
    : {
        title: 'Promociones',
        subtitle: 'Gestioná descuentos y ofertas para tu tienda online y catálogo de productos.',
        createLabel: 'Nueva Promoción',
        searchPlaceholder: 'Buscar por nombre o descripción...',
        carouselTitle: 'Carrusel de Ofertas',
        infoTitle: '',
        infoDescription: '',
        workspaceTitle: 'Panel comercial',
        workspaceDescription: 'Gestioná campañas visibles para el catálogo, seguimiento operativo y acciones masivas desde una sola vista.',
      };

  return (
    <UnifiedPermissionGuard
      resource="promotions"
      action="view"
      fallback={<div className="p-6"><h1 className="text-xl font-semibold">Acceso denegado</h1></div>}
    >
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
              {isBarbershop ? (
                <Scissors className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-bold tracking-tight">{pageCopy.title}</h1>
              <p className="text-sm text-muted-foreground">{pageCopy.subtitle}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Layers3 className="h-3.5 w-3.5" />
                  {pageCopy.workspaceTitle}
                </Badge>
                <Badge variant="outline">{filteredPromotions.length} resultado{filteredPromotions.length !== 1 ? 's' : ''}</Badge>
                {selectedIds.size > 0 && <Badge variant="outline">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}</Badge>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowAuditLog((v) => !v)}
              className={cn('h-9 w-9 text-muted-foreground', showAuditLog && 'bg-muted text-foreground')}
              title="Historial de cambios"
            >
              <History className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => refreshAll()}
              disabled={storeLoading}
              className="h-9 w-9 text-muted-foreground"
              title="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', storeLoading && 'animate-spin')} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer">
                  <FileJson className="h-4 w-4 mr-2 text-orange-600" /> JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4" />
              {pageCopy.createLabel}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{pageCopy.workspaceTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{pageCopy.workspaceDescription}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewCard
                  icon={Tag}
                  label="Promociones"
                  value={stats.total}
                  helper="Total cargadas en esta organización"
                />
                <OverviewCard
                  icon={Sparkles}
                  label="Activas"
                  value={stats.active}
                  helper={`${stats.scheduled} programadas y ${stats.expired} expiradas`}
                  accent="emerald"
                />
                <OverviewCard
                  icon={Store}
                  label="Productos"
                  value={stats.productPromotions}
                  helper={`${stats.linkedProducts} productos asociados`}
                  accent="blue"
                />
                <OverviewCard
                  icon={Scissors}
                  label="Servicios"
                  value={stats.servicePromotions}
                  helper={`${stats.linkedServices} servicios asociados`}
                  accent={isBarbershop ? 'amber' : 'default'}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado operativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Vista actual</span>
                <Badge variant="secondary">{viewMode === 'grid' ? 'Tarjetas' : 'Lista'}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Filtros activos</span>
                <Badge variant={activeFiltersCount > 0 ? 'default' : 'secondary'}>{activeFiltersCount}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Página</span>
                <Badge variant="outline">{totalPages > 0 ? `${currentPage} de ${totalPages}` : 'Sin paginar'}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Acciones masivas</span>
                <Badge variant="outline">{selectedIds.size > 0 ? 'Disponibles' : 'Sin selección'}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {isBarbershop && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            <Info className="h-4 w-4" />
            <AlertTitle>{pageCopy.infoTitle}</AlertTitle>
            <AlertDescription>{pageCopy.infoDescription}</AlertDescription>
          </Alert>
        )}

        <div className="sticky top-4 z-30 overflow-hidden rounded-2xl border border-border/50 bg-background/90 p-3 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Buscador y filtros</p>
                <p className="text-xs text-muted-foreground">
                  Encontrá campañas por nombre, estado o alcance y mantené visible solo lo que necesitás operar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{filteredPromotions.length} visible{filteredPromotions.length !== 1 ? 's' : ''}</Badge>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={clearFilters}>
                    <FilterX className="h-3.5 w-3.5" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={pageCopy.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 rounded-xl pl-9 text-sm"
                aria-label="Buscar promociones"
              />
            </div>
            <PromotionFilters
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              targetFilter={targetFilter}
              setTargetFilter={setTargetFilter}
              showTargetFilter={isBarbershop}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-[400px]">
            {storeError ? (
              <ErrorState
                error={storeError}
                onRetry={refreshAll}
                additionalInfo="Verifica tu conexión o contacta a soporte."
              />
            ) : storeLoading && storeItems.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl border border-border/50 bg-muted/40" />
                ))}
              </div>
            ) : filteredPromotions.length === 0 ? (
              <EmptyState
                type={storeItems.length === 0 ? 'no-promotions' : 'no-results'}
                onCreateClick={storeItems.length === 0 ? () => setIsCreateDialogOpen(true) : undefined}
                onClearFilters={clearFilters}
              />
            ) : (
              <div className="space-y-5">
                <PromotionsList
                  promotions={paginatedPromotions}
                  viewMode={viewMode}
                  onRefresh={refreshAll}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  productCounts={productCounts}
                  loadingCounts={loadingCounts}
                />
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredPromotions.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="overflow-hidden border-border/60 shadow-sm">
              <button
                onClick={() => setShowCarousel((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
              >
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-500" />
                  {pageCopy.carouselTitle}
                </span>
                <Badge variant="outline" className="text-[11px]">
                  {showCarousel ? 'Ocultar' : 'Mostrar'}
                </Badge>
              </button>
              {showCarousel && (
                <div className="border-t border-border/40 p-4">
                  <CarouselEditor
                    key={`carousel-v${carouselVersion}`}
                    promotions={storeItems}
                    isLoading={storeLoading}
                  />
                </div>
              )}
            </Card>

            <Card className="overflow-hidden border-border/60 shadow-sm">
              <button
                onClick={() => setShowAuditLog((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  Historial de cambios
                </span>
                <Badge variant="outline" className="text-[11px]">
                  {showAuditLog ? 'Ocultar' : 'Mostrar'}
                </Badge>
              </button>
              {showAuditLog && (
                <div className="border-t border-border/40 p-4">
                  <CarouselAuditLog
                    onRevert={() => {
                      fetchStorePromotions();
                      setCarouselVersion((v) => v + 1);
                    }}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ═══ BARRA FLOTANTE ══════════════════════════════════════════════════════ */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        onRefresh={refreshAll}
      />

      {/* ═══ MODAL CREAR ══════════════════════════════════════════════════════════ */}
      <CreatePromotionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          fetchStorePromotions();
          toast.success('Promoción creada exitosamente');
        }}
      />
    </UnifiedPermissionGuard>
  );
}
