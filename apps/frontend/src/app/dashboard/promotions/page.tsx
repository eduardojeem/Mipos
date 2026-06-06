'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download, FileJson, FileSpreadsheet, History, Plus,
  RefreshCw, Search, Tag, Zap, TrendingDown, Clock, XCircle, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount?: number;
  usageLimit?: number;
  applicableProducts?: unknown[];
}

const logger = createLogger('PromotionsPage');

function deriveProductCounts(promotions: Promotion[]): Record<string, number> {
  return promotions.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = Array.isArray(p.applicableProducts) ? p.applicableProducts.length : 0;
    return acc;
  }, {});
}

// ── Stat pill (inline) ────────────────────────────────────────────────────────
function StatPill({
  icon: Icon, label, value, accent = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: 'default' | 'emerald' | 'amber' | 'rose' | 'blue';
}) {
  const cls = {
    default:  'bg-muted/60 text-foreground',
    emerald:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    amber:    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    rose:     'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    blue:     'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  }[accent];
  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium', cls)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline text-[11px] opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function PromotionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'inactive'>('all');
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

  const filteredPromotions = useMemo(() => {
    const filtered = storeItems.filter((p: Promotion) => {
      const q = searchTerm.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && getStatus(p) !== statusFilter) return false;
      return true;
    });
    return filtered.sort((a: Promotion, b: Promotion) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      return b.discountValue - a.discountValue;
    });
  }, [storeItems, searchTerm, statusFilter, sortBy, getStatus]);

  // Stats
  const stats = useMemo(() => {
    const all = storeItems as Promotion[];
    return {
      total: all.length,
      active: all.filter((p) => getStatus(p) === 'active').length,
      scheduled: all.filter((p) => getStatus(p) === 'scheduled').length,
      expired: all.filter((p) => getStatus(p) === 'expired').length,
    };
  }, [storeItems, getStatus]);

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = filteredPromotions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, sortBy]);

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

  return (
    <UnifiedPermissionGuard
      resource="promotions"
      action="view"
      fallback={<div className="p-6"><h1 className="text-xl font-semibold">Acceso denegado</h1></div>}
    >
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        {/* ═══ HEADER ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Izquierda: título + stats inline */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Promociones</h1>

            {/* Stat pills */}
            {!storeLoading && stats.total > 0 && (
              <>
                <StatPill icon={Zap} label="Total" value={stats.total} />
                {stats.active > 0 && <StatPill icon={TrendingDown} label="Activas" value={stats.active} accent="emerald" />}
                {stats.scheduled > 0 && <StatPill icon={Clock} label="Programadas" value={stats.scheduled} accent="blue" />}
                {stats.expired > 0 && <StatPill icon={XCircle} label="Expiradas" value={stats.expired} accent="rose" />}
              </>
            )}
          </div>

          {/* Derecha: acciones */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Historial / Carrusel (acceso rápido) */}
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
              Nueva Promoción
            </Button>
          </div>
        </div>

        {/* ═══ CARRUSEL (colapsable) ════════════════════════════════════════════ */}
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <button
            onClick={() => setShowCarousel((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              Carrusel de Ofertas
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
        </div>

        {/* ═══ HISTORIAL (colapsable) ══════════════════════════════════════════ */}
        {showAuditLog && (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="border-b border-border/40 px-4 py-3">
              <h3 className="text-sm font-medium">Historial de Cambios</h3>
            </div>
            <div className="p-4">
              <CarouselAuditLog
                onRevert={() => {
                  fetchStorePromotions();
                  setCarouselVersion((v) => v + 1);
                }}
              />
            </div>
          </div>
        )}

        {/* ═══ BÚSQUEDA Y FILTROS ══════════════════════════════════════════════ */}
        <div className="sticky top-4 z-30 overflow-hidden rounded-2xl border border-border/50 bg-background/90 p-3 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 rounded-xl pl-9 text-sm"
                aria-label="Buscar promociones"
              />
            </div>
            <PromotionFilters
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </div>
        </div>

        {/* ═══ LISTA / ESTADOS ═════════════════════════════════════════════════ */}
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
              onClearFilters={() => { setSearchTerm(''); setStatusFilter('all'); }}
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
