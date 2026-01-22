'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { SalesFilters, SalesFilters as FiltersType } from './components/SalesFilters';
import { SalesDataTable, Sale } from './components/SalesDataTable';
import { SaleDetailModal } from './components/SaleDetailModal';
import { useSales } from './hooks/useSales';

export default function AllSalesPage() {
  const [filters, setFilters] = useState<FiltersType>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const { toast } = useToast();
  
  const { sales, pagination, isLoading, isExporting, error, refetch, exportSales } = useSales({
    filters,
    page,
    limit,
    includeItems: true,
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar las ventas. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setLimit(newSize);
    setPage(1); // Reset to first page when page size changes
  };

  // Handle view details
  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportSales('csv');
      toast({
        title: 'Exportación exitosa',
        description: 'Las ventas se han exportado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error de exportación',
        description: 'No se pudieron exportar las ventas. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Datos actualizados',
      description: 'La lista de ventas se ha actualizado.',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/sales">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Resumen
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Todas las Ventas</h1>
            <p className="text-muted-foreground mt-1">
              Vista completa de transacciones con filtros avanzados
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Cargando...' : `${pagination.total} ventas encontradas`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Página Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.page}</div>
            <p className="text-xs text-muted-foreground">
              de {pagination.pages} páginas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas por Página</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{limit}</div>
            <p className="text-xs text-muted-foreground">
              filas mostradas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtros Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(filters).filter(value => value !== undefined && value !== '' && value !== null).length}
            </div>
            <p className="text-xs text-muted-foreground">
              filtros aplicados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <SalesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* Data Table */}
      <SalesDataTable
        data={sales}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onViewDetails={handleViewDetails}
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
  );
}
