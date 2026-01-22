'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3Icon,
  PackageIcon,
  UsersIcon,
  DollarSignIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  FileText,
} from 'lucide-react';
import { ReportFilters } from './report-filters';
import { SalesReport } from './sales-report';
import { InventoryReport } from './inventory-report';
import { CustomerReport } from './customer-report';
import { AdvancedAnalytics } from './advanced-analytics';
import { ComparisonReport } from './comparison-report';
import { useReports, ReportFilter, DATE_PRESETS, useReportExport, type ReportType } from '@/hooks/use-reports';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatPercentage } from './chart-components';
import { NoDataAvailable } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { enqueueExport, useExportJob, useExportJobs, type ExportFormat } from '@/hooks/use-export-queue';
import { getConnectionType } from '@/lib/performance';
import { isSupabaseActive } from '@/lib/env';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export const ReportsDashboard: React.FC = () => {
  const fmtCurrency = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<ReportFilter>(() => {
    // Default to current month
    return DATE_PRESETS.thisMonth.getValue();
  });

  const { sales, inventory, customer, financial, isLoading, error, refetchAll } = useReports(filters);
  const { exportReport, isExporting } = useReportExport();
  const { toast } = useToast();

  // Fuente de datos y estado de conexión
  const REPORTS_SOURCE: 'supabase' | 'backend' = ((process.env.NEXT_PUBLIC_REPORTS_SOURCE || process.env.REPORTS_SOURCE || 'backend') as any);
  const [dataSource, setDataSource] = useState<'supabase' | 'backend'>(REPORTS_SOURCE);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  useEffect(() => {
    try {
      setConnectionType(getConnectionType());
    } catch { }
  }, []);
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const fromQs = qs.get('source');
      const stored = window.localStorage.getItem('reports:source');
      const resolved = (fromQs === 'supabase' || fromQs === 'backend') ? fromQs : (stored === 'supabase' || stored === 'backend') ? stored : REPORTS_SOURCE;
      setDataSource(resolved as 'supabase' | 'backend');
    } catch { }
  }, []);
  const handleSourceChange = (next: 'supabase' | 'backend') => {
    if (next === 'supabase' && !isSupabaseActive()) {
      toast({
        title: 'Supabase no está activo',
        description: 'Activa Supabase para usar esta fuente o selecciona API.',
        variant: 'destructive'
      });
      return;
    }
    setDataSource(next);
    try {
      window.localStorage.setItem('reports:source', next);
      const url = new URL(window.location.href);
      url.searchParams.set('source', next);
      window.history.replaceState({}, '', url.toString());
    } catch { }
  };

  // Exportación en background (cola)
  const [bgJobId, setBgJobId] = useState<string | undefined>(undefined);
  const { job: bgJob, loading: bgLoading, error: bgError, downloadUrl } = useExportJob(bgJobId);
  const hasActiveBgJob = !!bgJobId && (bgJob?.status === 'queued' || bgJob?.status === 'running');
  const disableBg = bgLoading || isLoading || hasActiveBgJob;

  // Notificación al completar
  useEffect(() => {
    if (bgJob?.status === 'completed') {
      const notify = () => {
        try {
          const title = 'Exportación lista';
          const body = bgJob?.result?.filename ? `Archivo: ${bgJob.result.filename}` : 'Tu archivo está listo para descargar';
          new Notification(title, { body });
        } catch { }
      };
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          notify();
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') notify();
          }).catch(() => { });
        }
      }
    }
  }, [bgJob?.status]);

  // Historial de exportaciones
  const { jobs, loading: jobsLoading, error: jobsError, refresh: refreshJobs } = useExportJobs(30);
  const exportHistoryRef = useRef<HTMLDivElement | null>(null);
  const exportProgressRef = useRef<HTMLDivElement | null>(null);

  // Mapear pestaña activa a tipo de reporte para exportación
  const tabToReportType: Record<string, ReportType | null> = {
    sales: 'sales',
    inventory: 'inventory',
    customers: 'customers',
    financial: 'financial',
    analytics: null,
    compare: null,
    overview: 'sales',
  };
  const currentType = tabToReportType[activeTab] || null;

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!currentType) return;
    try {
      await exportReport(currentType, format, filters);
      toast({ title: 'Éxito', description: `Reporte exportado en formato ${format.toUpperCase()}` });
    } catch (error) {
      console.error('Error exporting report:', error);
      const message = (error as any)?.response?.data?.message || (error as Error)?.message || 'No se pudo exportar el reporte';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleEnqueueExport = async (format: ExportFormat) => {
    if (!currentType) return;
    try {
      const id = await enqueueExport(currentType, format, filters);
      setBgJobId(id);
      toast({ title: 'Exportación encolada', description: `Exportación ${format.toUpperCase()} iniciada en background` });
      // refrescar historial pronto
      setTimeout(() => { refreshJobs(); }, 1000);
    } catch (error) {
      console.error('Error encolando exportación:', error);
      const message = (error as any)?.response?.data?.message || (error as Error)?.message || 'No se pudo encolar la exportación';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleCancelJob = async () => {
    if (!bgJobId) return;
    try {
      const res = await fetch(`/api/reports/export/cancel/${bgJobId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo cancelar el job');
      toast({ title: 'Cancelado', description: 'La exportación en background fue cancelada.' });
      refreshJobs();
    } catch (error) {
      console.error('Error cancelando job:', error);
      toast({ title: 'Error', description: 'No se pudo cancelar la exportación', variant: 'destructive' });
    }
  };

  const handleCancelSpecificJob = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/export/cancel/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo cancelar el job');
      toast({ title: 'Cancelado', description: `Job ${id} cancelado.` });
      refreshJobs();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo cancelar el job', variant: 'destructive' });
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/export/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar el job');
      toast({ title: 'Eliminado', description: `Job ${id} eliminado.` });
      refreshJobs();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo eliminar el job', variant: 'destructive' });
    }
  };

  const handleFiltersChange = useCallback((newFilters: ReportFilter) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchAll();
  }, [refetchAll]);

  // Overview metrics
  const overviewMetrics = {
    totalSales: sales.data?.summary.totalSales || 0,
    totalOrders: sales.data?.summary.totalOrders || 0,
    totalProducts: inventory.data?.summary.totalProducts || 0,
    inventoryValue: inventory.data?.summary.totalValue || 0,
    lowStockItems: inventory.data?.summary.lowStockItems || 0,
    outOfStockItems: inventory.data?.summary.outOfStockItems || 0,
    totalCustomers: customer.data?.summary.totalCustomers || 0,
    activeCustomers: customer.data?.summary.activeCustomers || 0,
    totalRevenue: financial.data?.summary.totalRevenue || 0,
    netProfit: financial.data?.summary.netProfit || 0,
    profitMargin: financial.data?.summary.profitMargin || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <TooltipProvider>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-14 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
          <div>
            <h1 className="text-3xl font-bold">Panel de Reportes</h1>
            <p className="text-muted-foreground">
              Análisis completo del rendimiento del negocio
            </p>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={dataSource === 'supabase' ? 'default' : 'secondary'}>Fuente: {dataSource === 'supabase' ? 'Supabase' : 'Backend'}</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Fuente de datos para reportes: API (backend) o Supabase directo.
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1">
                <Button variant={dataSource === 'backend' ? 'default' : 'outline'} size="sm" onClick={() => handleSourceChange('backend')}>API</Button>
                <Button variant={dataSource === 'supabase' ? 'default' : 'outline'} size="sm" onClick={() => handleSourceChange('supabase')} disabled={!isSupabaseActive()}>Supabase</Button>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline">Conexión: {connectionType}</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Tipo de conexión detectada: online, offline, lento o desconocido.
                </TooltipContent>
              </Tooltip>
              {/* Badge compacto de exportación en background */}
              {bgJobId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={hasActiveBgJob ? 'secondary' : (bgJob?.status === 'completed' ? 'default' : 'outline')}
                      title={`Exportación BG: ${bgJob?.status}${typeof bgJob?.progress === 'number' ? ` ${bgJob.progress}%` : ''}`}
                      onClick={() => {
                        const target = hasActiveBgJob ? exportProgressRef.current : exportHistoryRef.current;
                        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="cursor-pointer select-none"
                    >
                      BG: {bgJob?.status === 'queued' ? 'En cola' : bgJob?.status === 'running' ? 'Procesando' : bgJob?.status === 'completed' ? 'Listo' : (bgJob?.status || 'pendiente')}
                      {typeof bgJob?.progress === 'number' ? ` ${bgJob.progress}%` : ''}
                      {bgJob?.status === 'completed' && bgJob?.result?.filename ? ` · ${bgJob.result.filename}` : ''}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Estado de exportación en background. Clic para ver progreso o historial.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            {/* Tabs para navegación */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="analytics">Análisis</TabsTrigger>
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="inventory">Inventario</TabsTrigger>
                <TabsTrigger value="customers">Clientes</TabsTrigger>
                <TabsTrigger value="compare">Comparar</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                title={isLoading ? 'Actualizando' : 'Actualizar datos'}
              >
                <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Actualizando...' : 'Actualizar'}
              </Button>
              {/* Controles de exportación (solo para pestañas con tipo válido) */}
              {currentType && activeTab !== 'compare' && activeTab !== 'analytics' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleExportReport('pdf')}
                    disabled={isExporting || isLoading}
                    className="flex items-center gap-2"
                    title={isExporting ? 'Exportación en curso' : 'Exportar a PDF'}
                  >
                    <DollarSignIcon className="h-4 w-4" />
                    {isExporting ? 'Exportando...' : 'Exportar a PDF'}
                  </Button>
                  <Button
                    onClick={() => handleExportReport('excel')}
                    disabled={isExporting || isLoading}
                    className="flex items-center gap-2"
                    title={isExporting ? 'Exportación en curso' : 'Exportar a Excel'}
                  >
                    <FileText className="h-4 w-4" />
                    {isExporting ? 'Exportando...' : 'Exportar a Excel'}
                  </Button>
                  <Button
                    onClick={() => handleExportReport('csv')}
                    disabled={isExporting || isLoading}
                    className="flex items-center gap-2"
                    title={isExporting ? 'Exportación en curso' : 'Exportar a CSV'}
                  >
                    <FileText className="h-4 w-4" />
                    {isExporting ? 'Exportando...' : 'Exportar a CSV'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEnqueueExport('pdf')}
                    disabled={disableBg}
                    className="flex items-center gap-2"
                    title={hasActiveBgJob ? 'Exportación en background en progreso' : 'Encolar PDF (BG)'}
                  >
                    <FileText className="h-4 w-4" />
                    {bgLoading || hasActiveBgJob ? 'Procesando...' : 'Encolar PDF (BG)'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEnqueueExport('excel')}
                    disabled={disableBg}
                    className="flex items-center gap-2"
                    title={hasActiveBgJob ? 'Exportación en background en progreso' : 'Encolar Excel (BG)'}
                  >
                    <FileText className="h-4 w-4" />
                    {bgLoading || hasActiveBgJob ? 'Procesando...' : 'Encolar Excel (BG)'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleEnqueueExport('csv')}
                    disabled={disableBg}
                    className="flex items-center gap-2"
                    title={hasActiveBgJob ? 'Exportación en background en progreso' : 'Encolar CSV (BG)'}
                  >
                    <FileText className="h-4 w-4" />
                    {bgLoading || hasActiveBgJob ? 'Procesando...' : 'Encolar CSV (BG)'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleEnqueueExport('json')}
                    disabled={disableBg}
                    className="flex items-center gap-2"
                    title={hasActiveBgJob ? 'Exportación en background en progreso' : 'Encolar JSON (BG)'}
                  >
                    <FileText className="h-4 w-4" />
                    {bgLoading || hasActiveBgJob ? 'Procesando...' : 'Encolar JSON (BG)'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        showProductFilter={true}
        showCategoryFilter={true}
        showCustomerFilter={true}
        showSupplierFilter={false}
        showUserFilter={false}
        showStatusFilter={false}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <ArrowLeftRightIcon className="h-4 w-4" />
            Comparar
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Check if we have any data */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !sales.data && !inventory.data && !customer.data && !financial.data ? (
            <NoDataAvailable
              title="No hay datos disponibles"
              description="No se encontraron datos para los filtros seleccionados. Intenta cambiar el rango de fechas o ajustar los filtros."
              onRefresh={handleRefresh}
            />
          ) : (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sales Metrics */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">
                          {fmtCurrency(overviewMetrics.totalSales)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(overviewMetrics.totalOrders)} órdenes
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
                    <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">
                          {fmtCurrency(overviewMetrics.netProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Margen: {formatPercentage(overviewMetrics.profitMargin)}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
                    <PackageIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">
                          {fmtCurrency(overviewMetrics.inventoryValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(overviewMetrics.totalProducts)} productos
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">
                          {formatNumber(overviewMetrics.activeCustomers)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          de {formatNumber(overviewMetrics.totalCustomers)} totales
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Alerts and Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stock Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                      Alertas de Inventario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Productos con stock bajo</span>
                          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">
                            {formatNumber(overviewMetrics.lowStockItems)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Productos sin stock</span>
                          <Badge variant="destructive">
                            {formatNumber(overviewMetrics.outOfStockItems)}
                          </Badge>
                        </div>
                        {(overviewMetrics.lowStockItems > 0 || overviewMetrics.outOfStockItems > 0) && (
                          <p className="text-xs text-muted-foreground">
                            Revisa el inventario para evitar pérdidas de ventas
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                      Resumen de Rendimiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Ingresos totales</span>
                          <span className="font-medium">
                            {fmtCurrency(overviewMetrics.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Margen de ganancia</span>
                          <span className="font-medium">
                            {formatPercentage(overviewMetrics.profitMargin)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Valor promedio por orden</span>
                          <span className="font-medium">
                            {fmtCurrency(
                              overviewMetrics.totalOrders > 0
                                ? overviewMetrics.totalSales / overviewMetrics.totalOrders
                                : 0
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('sales')}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <DollarSignIcon className="h-6 w-6" />
                  <span>Ver Ventas</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('inventory')}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <PackageIcon className="h-6 w-6" />
                  <span>Ver Inventario</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('customers')}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <UsersIcon className="h-6 w-6" />
                  <span>Ver Clientes</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <RefreshCwIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics">
          <AdvancedAnalytics
            isLoading={isLoading}
            dateRange={filters.startDate && filters.endDate ? { from: new Date(filters.startDate), to: new Date(filters.endDate) } : undefined}
            onDateRangeChange={(range) => setFilters(prev => ({ ...prev, startDate: range.from.toISOString().split('T')[0], endDate: range.to.toISOString().split('T')[0] }))}
          />
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <SalesReport filters={filters} />
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <InventoryReport filters={filters} />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <CustomerReport filters={filters} />
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          <ComparisonReport />
        </TabsContent>
      </Tabs>

      {/* Export queue progress */}
      {currentType && bgJobId && (
        <Card>
          <CardHeader>
            <div ref={exportProgressRef} />
            <CardTitle>Exportación en background</CardTitle>
            <CardDescription>
              Estado de la exportación encolada para {String(currentType).toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={bgJob?.status === 'completed' ? 'default' : bgJob?.status === 'failed' ? 'destructive' : 'secondary'}>
                {bgJob?.status ?? 'queued'}
              </Badge>
              <span className="text-sm text-muted-foreground">Job ID: {bgJobId}</span>
              {bgJob?.status === 'completed' && (
                <Badge variant="default" className="ml-auto">Listo</Badge>
              )}
            </div>
            <Progress value={bgJob?.progress ?? 0} />
            {bgError && (
              <div className="text-sm text-destructive">{bgError}</div>
            )}
            {(bgJob?.status === 'queued' || bgJob?.status === 'running') && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelJob}>
                  Cancelar
                </Button>
              </div>
            )}
            {bgJob?.status === 'completed' && downloadUrl && (
              <div className="flex items-center gap-2">
                <Button asChild>
                  <a href={downloadUrl} download>
                    Descargar
                  </a>
                </Button>
                <span className="text-muted-foreground text-sm">{bgJob?.result?.filename} ({Math.round((bgJob?.result?.size || 0) / 1024)} KB)</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de exportaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div ref={exportHistoryRef} />
            <CardTitle>Historial de exportaciones</CardTitle>
            <CardDescription>Últimos trabajos en background</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refreshJobs()} disabled={jobsLoading}>
              {jobsLoading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobsError && (
            <div className="text-sm text-destructive mb-2">{jobsError}</div>
          )}
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay exportaciones recientes.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => {
                const canCancel = j.status === 'queued' || j.status === 'running';
                const terminal = j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled';
                const dlUrl = `/api/reports/export/download/${j.id}`;
                return (
                  <div key={j.id} className="flex items-center gap-3 border rounded p-3">
                    <Badge variant={j.status === 'completed' ? 'default' : j.status === 'failed' ? 'destructive' : 'secondary'}>
                      {j.status}
                    </Badge>
                    <span className="text-sm">{j.type.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">{j.format.toUpperCase()}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {j.status === 'completed' && (
                        <Button asChild size="sm">
                          <a href={dlUrl} download>Descargar</a>
                        </Button>
                      )}
                      {canCancel && (
                        <Button variant="outline" size="sm" onClick={() => handleCancelSpecificJob(j.id)}>Cancelar</Button>
                      )}
                      {terminal && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(j.id)}>Eliminar</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};