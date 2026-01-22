'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Bell, BellOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionProvider } from '@/components/ui/permission-guard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

// Types
interface SalesSummary {
  todaySales: number;
  todayCount: number;
  weekSales: number;
  weekCount: number;
  monthSales: number;
  monthCount: number;
  avgTicket: number;
  topPaymentMethod: string;
  growthPercentage: number;
}

interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
  status: string;
}

// Optimized hooks
function useSalesSummary() {
  return useQuery({
    queryKey: ['sales-summary'],
    queryFn: async (): Promise<SalesSummary> => {
      const response = await fetch('/api/sales/summary');
      if (!response.ok) throw new Error('Failed to fetch sales summary');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

function useRecentSales(limit = 10) {
  return useQuery({
    queryKey: ['recent-sales', limit],
    queryFn: async (): Promise<{ sales: RecentSale[]; total: number }> => {
      const response = await fetch(`/api/sales/recent?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch recent sales');
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

// Loading skeleton
function SalesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Stats card component
function StatsCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  isLoading 
}: { 
  title: string; 
  value: React.ReactNode; 
  subtitle: string; 
  trend?: number; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {trend !== undefined && (
          <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function SalesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Optimized data fetching
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useSalesSummary();
  const { data: recentSalesData, isLoading: recentLoading, refetch: refetchRecent } = useRecentSales(10);

  const recentSales = recentSalesData?.sales || [];

  // Handlers
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchSummary(),
        refetchRecent()
      ]);
      toast({
        title: 'Actualizado',
        description: 'Datos de ventas actualizados correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los datos',
        variant: 'destructive',
      });
    }
  }, [refetchSummary, refetchRecent, toast]);

  const handleExportRecent = useCallback(async () => {
    try {
      setExportLoading(true);
      
      // Export only recent sales (lightweight)
      const response = await fetch('/api/sales/export?limit=100&format=excel');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ventas-recientes-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Éxito',
        description: 'Ventas recientes exportadas correctamente',
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
  }, [toast]);

  const handleToggleNotifications = useCallback(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(!notificationsEnabled);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      }
    }
  }, [notificationsEnabled]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  // Loading state
  if (summaryLoading && recentLoading) {
    return (
      <ErrorBoundary>
        <PermissionProvider>
          <div className="container mx-auto p-6">
            <SalesLoadingSkeleton />
          </div>
        </PermissionProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionProvider>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
              <p className="text-muted-foreground mt-1">
                Resumen optimizado de transacciones y métricas clave
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleNotifications}
                className="h-9"
              >
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4 mr-2" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                Notificaciones
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={summaryLoading || recentLoading}
                className="h-9"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportRecent}
                disabled={exportLoading}
                className="h-9"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Recientes
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Ventas de Hoy"
              value={<CurrencyDisplay value={summary?.todaySales || 0} />}
              subtitle={`${summary?.todayCount || 0} transacciones`}
              trend={summary?.growthPercentage}
              isLoading={summaryLoading}
            />
            
            <StatsCard
              title="Esta Semana"
              value={<CurrencyDisplay value={summary?.weekSales || 0} />}
              subtitle={`${summary?.weekCount || 0} ventas`}
              isLoading={summaryLoading}
            />
            
            <StatsCard
              title="Este Mes"
              value={<CurrencyDisplay value={summary?.monthSales || 0} />}
              subtitle={`${summary?.monthCount || 0} transacciones`}
              isLoading={summaryLoading}
            />
            
            <StatsCard
              title="Ticket Promedio"
              value={<CurrencyDisplay value={summary?.avgTicket || 0} />}
              subtitle={`Método: ${summary?.topPaymentMethod || 'N/A'}`}
              isLoading={summaryLoading}
            />
          </div>

          {/* Recent Sales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Transacciones Recientes</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Últimas 10 ventas registradas
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/sales/all">
                      Ver todas →
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))
                    ) : recentSales.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay ventas recientes
                      </p>
                    ) : (
                      recentSales.map((sale: RecentSale) => (
                        <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                #{sale.id.slice(-4)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {sale.customer_name || 'Cliente Anónimo'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(sale.created_at)} • {sale.payment_method}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">
                              <CurrencyDisplay value={sale.total_amount} />
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {sale.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" asChild>
                    <Link href="/dashboard/pos">
                      Nueva Venta
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/sales/all">
                      Ver Todas las Ventas
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/reports">
                      Reportes Detallados
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/customers">
                      Gestionar Clientes
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Performance Indicator */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Estado del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                      Datos actualizados automáticamente
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Última actualización: {new Date().toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PermissionProvider>
    </ErrorBoundary>
  );
}
