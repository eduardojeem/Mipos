'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Package,
  Plus,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  CreateReturnModal,
  ReturnDetailsModal,
  ReturnsFilters,
  ReturnsStats,
  ReturnsTable,
} from './components';
import { useReturnFilters } from './hooks/useReturnFilters';
import { useReturns, type Return, type ReturnsStats as ReturnsStatsType } from './hooks/useReturns';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all', label: 'Todas', icon: RotateCcw },
  { value: 'pending', label: 'Pendientes', icon: Clock },
  { value: 'approved', label: 'Aprobadas', icon: CheckCircle },
  { value: 'processed', label: 'Procesadas', icon: Package },
  { value: 'rejected', label: 'Rechazadas', icon: XCircle },
] as const;

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function escapeCsv(value: string | number | null | undefined) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildReturnsCsv(rows: Return[]) {
  const headers = ['Numero', 'Cliente', 'Venta', 'Estado', 'Reembolso', 'Monto', 'Fecha', 'Razon'];
  const lines = rows.map((row) =>
    [
      row.returnNumber,
      row.customerName,
      row.saleId,
      row.status,
      row.refundMethod,
      formatCurrency(row.totalAmount),
      row.createdAt,
      row.reason,
    ]
      .map(escapeCsv)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

function downloadReturnsCsv(rows: Return[]) {
  const blob = new Blob([buildReturnsCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `devoluciones-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─── Pagination helper ────────────────────────────────────────────────────────

function getPageNum(index: number, currentPage: number, totalPages: number): number {
  if (totalPages <= 5) return index + 1;
  const half = Math.floor(5 / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + 4);
  if (end === totalPages) start = Math.max(1, end - 4);
  return start + index;
}

// ─── CountBadge ──────────────────────────────────────────────────────────────

function CountBadge({
  tab,
  stats,
  active,
}: {
  tab: string;
  stats: ReturnsStatsType;
  active: boolean;
}) {
  const count =
    tab === 'all'
      ? stats.totalReturns
      : tab === 'pending'
        ? stats.pendingReturns
        : tab === 'approved'
          ? stats.approvedReturns
          : tab === 'processed'
            ? stats.completedReturns
            : tab === 'rejected'
              ? stats.rejectedReturns
              : null;

  if (count === null || count === 0) return null;

  return (
    <Badge
      variant="secondary"
      className={`h-4 px-1.5 text-[10px] leading-none transition-colors ${
        active
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
          : ''
      }`}
    >
      {count}
    </Badge>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  return (
    <PermissionProvider>
      <ReturnsPageContent />
    </PermissionProvider>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function ReturnsPageContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filters = useReturnFilters();

  // Keep tab + filter status in sync without duplicating logic
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      setPage(1);
      filters.setStatus(tab);
    },
    [filters]
  );

  const filtersWithTabSync = {
    ...filters,
    setStatus: (status: string) => {
      filters.setStatus(status);
      setActiveTab(status);
      setPage(1);
    },
  };

  const {
    returns,
    pagination,
    stats,
    isLoading,
    isFetching,
    createReturn,
    updateReturn,
    processReturn,
    isCreating,
    isUpdating,
    isProcessing,
  } = useReturns(filters.filters, page, pageSize);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleExport = () => {
    if (!returns.length) {
      toast({
        title: 'Sin datos para exportar',
        description: 'Ajusta los filtros o carga devoluciones antes de exportar.',
      });
      return;
    }
    downloadReturnsCsv(returns);
  };

  const hasPendingUrgency = (stats?.pendingReturns ?? 0) > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300">
      {/* ── Page header ── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="relative rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-2.5 shadow-sm">
            <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            {/* Urgency indicator on header icon */}
            {hasPendingUrgency && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full border border-white bg-amber-500 dark:border-neutral-900" />
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Devoluciones</h1>
            <p className="text-sm text-muted-foreground">
              {stats
                ? `${stats.totalReturns} devolucion${stats.totalReturns !== 1 ? 'es' : ''} · ${formatCurrency(stats.totalAmount)} total`
                : 'Gestiona las devoluciones de productos y reembolsos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGuard permission="returns.export">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={!returns.length}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </PermissionGuard>

          <PermissionGuard permission="returns.create">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Nueva devolución
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <ReturnsStats stats={stats} isLoading={isLoading} />

      {/* ── Main table area ── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Tab bar */}
        <div className="border-b bg-muted/20">
          <div className="flex items-center gap-1 overflow-x-auto px-4 pb-0 pt-3">
            {STATUS_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.value;
              const isUrgent = tab.value === 'pending' && hasPendingUrgency;

              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-white shadow-sm dark:bg-neutral-900'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-neutral-800/60'
                  } ${isActive ? 'text-foreground font-semibold' : ''}`}
                >
                  <TabIcon
                    className={`h-3.5 w-3.5 ${
                      isUrgent && !isActive ? 'text-amber-500 dark:text-amber-400' : ''
                    }`}
                  />
                  <span className={isUrgent && !isActive ? 'text-amber-600 dark:text-amber-400' : ''}>
                    {tab.label}
                  </span>
                  {stats && (
                    <CountBadge tab={tab.value} stats={stats} active={isActive} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3">
            <ReturnsFilters filters={filtersWithTabSync} />
          </div>
        </div>

        {/* Table */}
        <div
          className={`transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-60' : 'opacity-100'}`}
        >
          <ReturnsTable
            returns={returns}
            isLoading={isLoading}
            actionsDisabled={isUpdating || isProcessing}
            onViewDetails={setSelectedReturn}
            onUpdateStatus={updateReturn}
            onProcess={processReturn}
          />
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Mostrando{' '}
              <span className="font-medium text-foreground">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, pagination.total)}
              </span>{' '}
              de{' '}
              <span className="font-medium text-foreground">{pagination.total}</span>{' '}
              devoluciones
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1 || isFetching}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => {
                const pageNum = getPageNum(index, page, pagination.totalPages);
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-8 w-8 text-xs ${
                      pageNum === page ? 'bg-orange-600 hover:bg-orange-700' : ''
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isFetching}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page >= pagination.totalPages || isFetching}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <CreateReturnModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={createReturn}
        isCreating={isCreating}
      />

      {selectedReturn && (
        <ReturnDetailsModal
          return={selectedReturn}
          open={!!selectedReturn}
          onOpenChange={(open) => {
            if (!open) setSelectedReturn(null);
          }}
          onUpdate={updateReturn}
          onProcess={processReturn}
          isUpdating={isUpdating || isProcessing}
        />
      )}
    </div>
  );
}
