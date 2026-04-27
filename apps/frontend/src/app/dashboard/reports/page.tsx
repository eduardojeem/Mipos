'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createLogger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

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
  SalesData,
  InventoryData,
  CustomerData,
  FinancialData
} from './hooks/useOptimizedReportData';
import { useReportsExportHandler } from './hooks/useReportsExportHandler';

// Tipo para los reportes
export type ReportType = 'sales' | 'inventory' | 'customers' | 'financial';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = createLogger('ReportsPage');

export default function ReportsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useCurrentOrganizationId();
  const [activeTab, setActiveTab] = useState<ReportType>('sales');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const urlType = useMemo(() => {
    const t = (searchParams.get('type') || '').toLowerCase();
    if (t === 'sales' || t === 'inventory' || t === 'customers' || t === 'financial') return t as ReportType;
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (!urlType) return;
    setActiveTab(urlType);
  }, [urlType]);

  // Filtros
  const [filters, setFilters] = useState<ReportFilterValues>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
    endDate: new Date(),
  });

  const [appliedFilters, setAppliedFilters] = useState<ReportFilterValues>(filters);

  // Optimized hooks with better caching and reduced refresh intervals
  const salesReport = useOptimizedSalesReport(appliedFilters, {
    enabled: activeTab === 'sales' && !!organizationId,
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : undefined, // 5 minutes instead of 30 seconds
  });

  const inventoryReport = useOptimizedInventoryReport(appliedFilters, {
    enabled: activeTab === 'inventory' && !!organizationId,
    refetchInterval: autoRefresh ? 10 * 60 * 1000 : undefined, // 10 minutes for inventory
  });

  const customerReport = useOptimizedCustomerReport(appliedFilters, {
    enabled: activeTab === 'customers' && !!organizationId,
    refetchInterval: autoRefresh ? 8 * 60 * 1000 : undefined, // 8 minutes for customers
  });

  const financialReport = useOptimizedFinancialReport(appliedFilters, {
    enabled: activeTab === 'financial' && !!organizationId,
    refetchInterval: autoRefresh ? 8 * 60 * 1000 : undefined, // 8 minutes for financial
  });

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

  // Export handler from custom hook
  const { handleExport, isExporting } = useReportsExportHandler({
    activeTab,
    appliedFilters,
    currentReportData: currentReport.data,
  });

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
      description: 'Los datos se están recargando desde la base de datos...',
    });
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
                  ((currentReport.data as SalesData).topProducts)?.length ||
                  ((currentReport.data as InventoryData).stockLevels)?.length ||
                  ((currentReport.data as CustomerData).topCustomers)?.length ||
                  ((currentReport.data as FinancialData).revenueByMonth)?.length ||
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
        activeTab={activeTab}
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = value as ReportType;
          setActiveTab(next);
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.set('type', next);
          router.replace(`?${nextParams.toString()}`);
        }}
        className="space-y-6"
      >
        <TabsList className="flex items-center w-full overflow-x-auto scrollbar-hide h-12 bg-muted/50 dark:bg-slate-900/60 dark:border dark:border-slate-800/50 rounded-lg p-1">
          <TabsTrigger value="sales" className="gap-2 shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <ShoppingCart className="w-4 h-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <Package className="w-4 h-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2 shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2 shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors">
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
