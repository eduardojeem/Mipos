'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from 'use-debounce';
import { SalesFilters, SalesFilters as FiltersType } from './components/SalesFilters';
import { SalesDataTable, Sale } from './components/SalesDataTable';
import { SaleDetailModal } from './components/SaleDetailModal';
import { useSales } from './hooks/useSales';
import { PermissionProvider, PermissionGuard } from '@/components/ui/permission-guard';

export default function AllSalesPage() {
  const [filters, setFilters] = useState<FiltersType>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  // Debounce only the search field to avoid firing on every keystroke
  const [debouncedSearch] = useDebounce(filters.search, 350);
  const debouncedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedFilters]);

  const { sales, pagination, isLoading, isExporting, error, refetch, exportSales } = useSales({
    filters: debouncedFilters,
    page,
    limit,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ventas.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleExport = async () => {
    try {
      await exportSales();
      toast({ description: 'Ventas exportadas correctamente.' });
    } catch {
      toast({ description: 'No se pudo exportar.', variant: 'destructive' });
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({ description: 'Lista actualizada.' });
  };

  return (
    <PermissionProvider>
    <PermissionGuard permission="sales.view">
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/sales">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Todas las Ventas</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {pagination.total > 0
                ? `${pagination.total} ventas encontradas`
                : 'Vista completa con filtros avanzados'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || pagination.total === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <SalesFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClear={() => setFilters({})}
      />

      {/* Data Table */}
      <SalesDataTable
        data={sales}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
        onViewDetails={(sale) => { setSelectedSale(sale); setIsDetailModalOpen(true); }}
        onExport={handleExport}
        isLoading={isLoading}
      />

      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={selectedSale}
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
    </PermissionGuard>
    </PermissionProvider>
  );
}
