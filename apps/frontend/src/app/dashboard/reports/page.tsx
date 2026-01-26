'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { createLogger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';

// Componentes UI
import { ReportFilters, ReportFilterValues } from './components/ReportFilters';
import { RefreshIndicator } from './components/RefreshIndicator';
import { EnhancedExportMenu } from './components/EnhancedExportMenu';
import { EmptyState } from './components/EmptyState';
import { InformativeEmptyState } from './components/InformativeEmptyState';

// Componentes de Contenido Tabs
import { ReportsSalesTab } from './components/tabs/ReportsSalesTab';
import { ReportsInventoryTab } from './components/tabs/ReportsInventoryTab';
import { ReportsCustomersTab } from './components/tabs/ReportsCustomersTab';
import { ReportsFinancialTab } from './components/tabs/ReportsFinancialTab';

// Skeletons
import {
  SalesReportSkeleton,
  InventoryReportSkeleton,
  CustomersReportSkeleton,
  FinancialReportSkeleton
} from './components/ReportsSkeletons';

// Hooks
import {
  useOptimizedSalesReport,
  useOptimizedInventoryReport,
  useOptimizedCustomerReport,
  useOptimizedFinancialReport,
} from './hooks/useOptimizedReportData';
import { useAdvancedReportExport, ExportFormat } from './hooks/useAdvancedReportExport';

// Tipo para los reportes
export type ReportType = 'sales' | 'inventory' | 'customers' | 'financial';

const logger = createLogger('ReportsPage');

export default function ReportsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ReportType>('sales');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filtros
  const [filters, setFilters] = useState<ReportFilterValues>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
    endDate: new Date(),
  });

  const [appliedFilters, setAppliedFilters] = useState<ReportFilterValues>(filters);

  // Optimized hooks with better caching and reduced refresh intervals
  const salesReport = useOptimizedSalesReport(appliedFilters, {
    enabled: activeTab === 'sales',
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : undefined, // 5 minutes instead of 30 seconds
  });

  const inventoryReport = useOptimizedInventoryReport(appliedFilters, {
    enabled: activeTab === 'inventory',
    refetchInterval: autoRefresh ? 10 * 60 * 1000 : undefined, // 10 minutes for inventory
  });

  const customerReport = useOptimizedCustomerReport(appliedFilters, {
    enabled: activeTab === 'customers',
    refetchInterval: autoRefresh ? 8 * 60 * 1000 : undefined, // 8 minutes for customers
  });

  const financialReport = useOptimizedFinancialReport(appliedFilters, {
    enabled: activeTab === 'financial',
    refetchInterval: autoRefresh ? 8 * 60 * 1000 : undefined, // 8 minutes for financial
  });

  const { exportReport, isExporting } = useAdvancedReportExport();

  // Obtener reporte actual
  const getCurrentReport = () => {
    switch (activeTab) {
      case 'sales':
        return { data: salesReport.data, loading: salesReport.isLoading, error: salesReport.error, refetch: salesReport.refetch };
      case 'inventory':
        return { data: inventoryReport.data, loading: inventoryReport.isLoading, error: inventoryReport.error, refetch: inventoryReport.refetch };
      case 'customers':
        return { data: customerReport.data, loading: customerReport.isLoading, error: customerReport.error, refetch: customerReport.refetch };
      case 'financial':
        return { data: financialReport.data, loading: financialReport.isLoading, error: financialReport.error, refetch: financialReport.refetch };
      default:
        return { data: salesReport.data, loading: salesReport.isLoading, error: salesReport.error, refetch: salesReport.refetch };
    }
  };

  const currentReport = getCurrentReport();

  // Actualizar timestamp cuando los datos cambien
  useEffect(() => {
    if (!currentReport.loading && currentReport.data) {
      setLastUpdate(new Date());
    }
  }, [currentReport.data, currentReport.loading]);

  // Handlers
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    toast({
      title: 'Filtros aplicados',
      description: 'Los datos se están actualizando...',
    });
  };

  const handleResetFilters = () => {
    const defaultFilters: ReportFilterValues = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleRefresh = () => {
    currentReport.refetch();
    toast({
      title: 'Actualizando datos',
      description: 'Los datos se están recargando desde Supabase...',
    });
  };

  const handleExport = async (format: ExportFormat) => {
    const data = currentReport.data;
    if (!data) {
      const reportNames = {
        sales: 'ventas',
        inventory: 'productos en inventario',
        customers: 'clientes',
        financial: 'datos financieros'
      };

      toast({
        title: `📊 No hay ${reportNames[activeTab]} para exportar`,
        description: `No se encontraron ${reportNames[activeTab]} para el período seleccionado. Intenta ajustar los filtros de fecha o verifica que haya datos registrados.`,
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    try {
      // Configurar exportación según el tipo de reporte
      const reportData = data as any; // Cast para acceder a propiedades específicas

      if (activeTab === 'sales') {
        const exportData = reportData.topProducts || [];
        const charts = [
          {
            type: 'bar' as const,
            title: 'Ventas por Fecha',
            labels: reportData.salesByDate?.map((item: any) =>
              new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
            ) || [],
            datasets: [{
              label: 'Ventas (₲)',
              data: reportData.salesByDate?.map((item: any) => item.sales) || [],
              backgroundColor: 'rgba(99, 102, 241, 0.8)',
              borderColor: 'rgba(99, 102, 241, 1)',
            }]
          },
          {
            type: 'pie' as const,
            title: 'Ventas por Categoría',
            labels: reportData.salesByCategory?.map((item: any) => item.category) || [],
            datasets: [{
              label: 'Ventas',
              data: reportData.salesByCategory?.map((item: any) => item.sales) || [],
            }]
          }
        ];

        await exportReport(exportData, format, {
          filename: `ventas-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte de Ventas',
          subtitle: `Período: ${appliedFilters.startDate?.toLocaleDateString()} - ${appliedFilters.endDate?.toLocaleDateString()}`,
          columns: [
            { header: 'Producto', dataKey: 'name', width: 200, format: 'text' },
            { header: 'Ventas', dataKey: 'sales', width: 120, format: 'currency' },
            { header: 'Cantidad', dataKey: 'quantity', width: 100, format: 'number' },
          ],
          charts,
          includeCharts: true,
          orientation: 'landscape',
        });
      } else if (activeTab === 'inventory') {
        const exportData = reportData.stockLevels || [];
        const charts = [
          {
            type: 'bar' as const,
            title: 'Productos por Categoría',
            labels: reportData.categoryBreakdown?.map((item: any) => item.category) || [],
            datasets: [{
              label: 'Cantidad',
              data: reportData.categoryBreakdown?.map((item: any) => item.count) || [],
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
            }]
          }
        ];

        await exportReport(exportData, format, {
          filename: `inventario-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte de Inventario',
          subtitle: 'Estado actual del inventario',
          columns: [
            { header: 'Producto', dataKey: 'name', width: 200, format: 'text' },
            { header: 'Stock', dataKey: 'stock', width: 100, format: 'number' },
            { header: 'Estado', dataKey: 'status', width: 100, format: 'text' },
          ],
          charts,
          includeCharts: true,
        });
      } else if (activeTab === 'customers') {
        const exportData = reportData.topCustomers || [];
        const charts = [
          {
            type: 'pie' as const,
            title: 'Segmentos de Clientes',
            labels: reportData.customerSegments?.map((item: any) => item.segment) || [],
            datasets: [{
              label: 'Clientes',
              data: reportData.customerSegments?.map((item: any) => item.count) || [],
            }]
          }
        ];

        await exportReport(exportData, format, {
          filename: `clientes-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte de Clientes',
          subtitle: `Período: ${appliedFilters.startDate?.toLocaleDateString()} - ${appliedFilters.endDate?.toLocaleDateString()}`,
          columns: [
            { header: 'Cliente', dataKey: 'name', width: 180, format: 'text' },
            { header: 'Total Gastado', dataKey: 'totalSpent', width: 120, format: 'currency' },
            { header: 'Pedidos', dataKey: 'orders', width: 100, format: 'number' },
          ],
          charts,
          includeCharts: true,
        });
      } else if (activeTab === 'financial') {
        const exportData = reportData.revenueByMonth || [];
        const charts = [
          {
            type: 'bar' as const,
            title: 'Ingresos vs Gastos',
            labels: reportData.revenueByMonth?.map((item: any) => item.month) || [],
            datasets: [
              {
                label: 'Ingresos',
                data: reportData.revenueByMonth?.map((item: any) => item.revenue) || [],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
              },
              {
                label: 'Gastos',
                data: reportData.revenueByMonth?.map((item: any) => item.expenses) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
              }
            ]
          },
          {
            type: 'pie' as const,
            title: 'Desglose de Gastos',
            labels: reportData.expenseBreakdown?.map((item: any) => item.category) || [],
            datasets: [{
              label: 'Gastos',
              data: reportData.expenseBreakdown?.map((item: any) => item.amount) || [],
            }]
          }
        ];

        await exportReport(exportData, format, {
          filename: `financiero-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte Financiero',
          subtitle: `Período: ${appliedFilters.startDate?.toLocaleDateString()} - ${appliedFilters.endDate?.toLocaleDateString()}`,
          columns: [
            { header: 'Período', dataKey: 'month', width: 120, format: 'text' },
            { header: 'Ingresos', dataKey: 'revenue', width: 120, format: 'currency' },
            { header: 'Gastos', dataKey: 'expenses', width: 120, format: 'currency' },
            { header: 'Beneficio', dataKey: 'profit', width: 120, format: 'currency' },
          ],
          charts,
          includeCharts: true,
          orientation: 'landscape',
        });
      }
    } catch (error) {
      logger.error('Error exporting report:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl dark:bg-gradient-to-br dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900 dark:rounded-xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 dark:bg-slate-950/60 dark:border dark:border-slate-800/50 dark:rounded-xl dark:p-4 dark:backdrop-blur-xl"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Reportes y Analíticas
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Visualiza y analiza los datos de tu negocio en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshIndicator
            lastUpdate={lastUpdate}
            isRefreshing={currentReport.loading}
            onRefresh={handleRefresh}
            autoRefresh={autoRefresh}
            onAutoRefreshToggle={setAutoRefresh}
          />
          <EnhancedExportMenu
            onExport={handleExport}
            disabled={!currentReport.data}
            loading={isExporting}
            recordCount={
              currentReport.data
                ? (
                  (currentReport.data as any).topProducts?.length ||
                  (currentReport.data as any).stockLevels?.length ||
                  (currentReport.data as any).topCustomers?.length ||
                  (currentReport.data as any).revenueByMonth?.length ||
                  0
                )
                : 0
            }
          />
        </div>
      </motion.div>

      {/* Filtros */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={currentReport.loading}
        showAdvanced={true}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportType)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 dark:bg-slate-900/60 dark:border dark:border-slate-800/50">
          <TabsTrigger value="sales" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <ShoppingCart className="w-4 h-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <Package className="w-4 h-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <DollarSign className="w-4 h-4" />
            Financiero
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          {salesReport.isLoading ? (
            <SalesReportSkeleton />
          ) : salesReport.error ? (
            <EmptyState
              icon={AlertCircle}
              title="Error al cargar datos"
              description={salesReport.error.message}
              action={{
                label: 'Reintentar',
                onClick: salesReport.refetch,
              }}
            />
          ) : salesReport.data ? (
            <ReportsSalesTab data={salesReport.data} />
          ) : (
            <InformativeEmptyState
              icon={ShoppingCart}
              title="No hay datos de ventas"
              description="No se encontraron ventas para el período seleccionado"
              suggestions={[
                'Ajusta el rango de fechas a un período más amplio',
                'Verifica que haya ventas registradas en el sistema',
                'Intenta con filtros diferentes o sin filtros',
                'Revisa que las ventas estén correctamente guardadas en Supabase'
              ]}
              action={{
                label: 'Ajustar Filtros',
                onClick: handleResetFilters,
              }}
            />
          )}
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {inventoryReport.isLoading ? (
            <InventoryReportSkeleton />
          ) : inventoryReport.error ? (
            <EmptyState
              icon={AlertCircle}
              title="Error al cargar datos"
              description={inventoryReport.error.message}
              action={{
                label: 'Reintentar',
                onClick: inventoryReport.refetch,
              }}
            />
          ) : inventoryReport.data ? (
            <ReportsInventoryTab data={inventoryReport.data} />
          ) : (
            <InformativeEmptyState
              icon={Package}
              title="No hay datos de inventario"
              description="No se encontraron productos en el inventario"
              suggestions={[
                'Verifica que haya productos registrados',
                'Revisa que los productos tengan stock actualizado',
                'Intenta sin aplicar filtros',
                'Asegúrate de que los datos estén correctos en Supabase'
              ]}
              action={{
                label: 'Ajustar Filtros',
                onClick: handleResetFilters,
              }}
            />
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          {customerReport.isLoading ? (
            <CustomersReportSkeleton />
          ) : customerReport.error ? (
            <EmptyState
              icon={AlertCircle}
              title="Error al cargar datos"
              description={customerReport.error.message}
              action={{
                label: 'Reintentar',
                onClick: customerReport.refetch,
              }}
            />
          ) : customerReport.data ? (
            <ReportsCustomersTab data={customerReport.data} />
          ) : (
            <InformativeEmptyState
              icon={Users}
              title="No hay datos de clientes"
              description="No se encontraron clientes para el período seleccionado"
              suggestions={[
                'Ajusta el rango de fechas',
                'Verifica que haya clientes registrados',
                'Revisa que los clientes tengan compras en el período',
                'Intenta con un período más amplio'
              ]}
              action={{
                label: 'Ajustar Filtros',
                onClick: handleResetFilters,
              }}
            />
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          {financialReport.isLoading ? (
            <FinancialReportSkeleton />
          ) : financialReport.error ? (
            <EmptyState
              icon={AlertCircle}
              title="Error al cargar datos"
              description={financialReport.error.message}
              action={{
                label: 'Reintentar',
                onClick: financialReport.refetch,
              }}
            />
          ) : financialReport.data ? (
            <ReportsFinancialTab data={financialReport.data} />
          ) : (
            <InformativeEmptyState
              icon={DollarSign}
              title="No hay datos financieros"
              description="No se encontraron datos financieros para el período seleccionado"
              suggestions={[
                'Ajusta el rango de fechas a un período con transacciones',
                'Verifica que haya ventas o gastos registrados',
                'Revisa que los datos financieros estén en Supabase',
                'Intenta con un período más amplio'
              ]}
              action={{
                label: 'Ajustar Filtros',
                onClick: handleResetFilters,
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
