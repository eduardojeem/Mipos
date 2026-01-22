/**
 * EJEMPLO DE INTEGRACIÓN - Sales Page Refactorizado
 * 
 * Este archivo muestra cómo integrar todos los componentes y hooks
 * creados en las Fases 1, 2 y 3 de la refactorización.
 * 
 * Reducción: De 2,160 líneas a ~350 líneas (-84%)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Hooks personalizados
import { useSalesFilters } from '@/hooks/useSalesFilters';
import { useSalesStats } from '@/hooks/useSalesStats';
import { useSalesSort } from '@/hooks/useSalesSort';
import { usePagination } from '@/hooks/usePagination';
import { useRealTimeSales } from '@/hooks/useRealTimeSales';

// Componentes de ventas
import {
    SalesStatsCards,
    SalesStatsDetailed,
    SalesFilters,
    SalesView,
    SaleDetailModal,
} from '@/components/sales';

// Tipos
import type { Sale, Customer } from '@/types';

// Utils
import { exportSales } from '@/lib/export-utils';

export default function SalesPageRefactored() {
    const { toast } = useToast();

    // Estado local mínimo
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    // Real-time sales data
    const {
        sales,
        isLoading,
        refreshSales,
        isConnected,
    } = useRealTimeSales({
        enabled: true,
        interval: 30000,
    });

    // Filtros
    const {
        filters,
        filteredSales,
        updateFilter,
        clearFilters,
        hasActiveFilters,
    } = useSalesFilters({
        sales,
        onFilterChange: () => {
            // Reset to first page when filters change
            goToPage(1);
        },
    });

    // Ordenamiento
    const {
        sortedSales,
        sortBy,
        sortOrder,
        handleSort,
    } = useSalesSort({
        sales: filteredSales,
        initialSortBy: 'date',
        initialSortOrder: 'desc',
    });

    // Paginación
    const {
        pagination: { page, limit, totalPages },
        controls: { goToPage, nextPage, previousPage },
        setTotal
    } = usePagination({ initialLimit: 10 });
    // Mantener total sincronizado con ventas ordenadas
    useEffect(() => { setTotal(sortedSales.length); }, [sortedSales.length, setTotal]);

    // Estadísticas
    const stats = useSalesStats({
        sales: sortedSales,
        allSales: sales,
    });

    // Paginar ventas
    const paginatedSales = sortedSales.slice(
        (page - 1) * limit,
        page * limit
    );

    // Handlers
    const handleViewSale = useCallback((sale: Sale) => {
        setSelectedSale(sale);
        setShowDetailModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowDetailModal(false);
        setSelectedSale(null);
    }, []);

    const handlePrint = useCallback((sale: Sale) => {
        // Implementar lógica de impresión
        console.log('Print sale:', sale.id);
        toast({
            title: 'Imprimiendo...',
            description: `Preparando recibo de venta #${sale.id.slice(-8)}`,
        });
    }, [toast]);

    const handleDownload = useCallback((sale: Sale) => {
        // Implementar lógica de descarga
        console.log('Download sale:', sale.id);
        toast({
            title: 'Descargando...',
            description: `Generando PDF de venta #${sale.id.slice(-8)}`,
        });
    }, [toast]);

    const handleExport = useCallback(async () => {
        try {
            setExportLoading(true);

            const transformedSales = sortedSales.map(sale => ({
                id: sale.id,
                customer: sale.customer?.name || 'Cliente Anónimo',
                items: sale.items?.length || 0,
                total: sale.total_amount,
                paymentMethod: sale.payment_method,
                status: sale.status,
                date: sale.created_at,
                notes: sale.notes,
            }));

            await exportSales(transformedSales, {
                format: 'excel',
                dateRange: { from: '', to: '' },
                includeFields: ['id', 'customer', 'total', 'paymentMethod', 'status', 'date'],
                summary: true,
                filters: {},
            });

            toast({
                title: 'Éxito',
                description: 'Ventas exportadas correctamente',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudieron exportar las ventas',
                variant: 'destructive',
            });
        } finally {
            setExportLoading(false);
        }
    }, [sortedSales, toast]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Cargando ventas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Ventas</h1>
                    <p className="text-muted-foreground">
                        Gestiona y visualiza todas las transacciones
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={refreshSales}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={exportLoading || sortedSales.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Estadísticas principales */}
            <SalesStatsCards stats={stats} />

            {/* Filtros */}
            <SalesFilters
                filters={filters}
                onFilterChange={updateFilter}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                customers={[]} // Cargar clientes desde API
            />

            {/* Desglose detallado */}
            <SalesStatsDetailed stats={stats} />

            {/* Vista de ventas (Tabla o Cards con toggle) */}
            <SalesView
                sales={paginatedSales}
                onViewSale={handleViewSale}
                sortBy={'date'}
                sortOrder={'desc'}
                onSort={handleSort}
                page={page}
                limit={limit}
                totalPages={totalPages}
                onPageChange={goToPage}
                defaultViewMode="table"
            />

            {/* Modal de detalles */}
            <SaleDetailModal
                sale={selectedSale}
                isOpen={showDetailModal}
                onClose={handleCloseModal}
                onPrint={handlePrint}
                onDownload={handleDownload}
            />
        </div>
    );
}
