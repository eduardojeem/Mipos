'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Activity,
  Shield,
  BarChart3,
  Settings,
  AlertTriangle,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { useLowStockProducts } from '@/hooks/use-products';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';

interface DashboardSummary {
  todaySales: number;
  totalOrders: number;
  avgTicket: number;
  growthPercentage: number;
  monthlyTotal: number;
}

interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface RecentSalesResponse {
  sales: RecentSale[];
}

// Optimized hook for dashboard summary (lightweight)
function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/summary');
      if (!response.ok) throw new Error('Failed to fetch dashboard summary');
      const json = await response.json();
      return json as DashboardSummary;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Optimized hook for recent sales (only 5 records)
function useRecentSales() {
  return useQuery<RecentSalesResponse>({
    queryKey: ['recent-sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales?limit=5&sort=created_at:desc');
      if (!response.ok) throw new Error('Failed to fetch recent sales');
      const json = await response.json();
      return json as RecentSalesResponse;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });
}

export default function AdminDashboardPageOptimized() {
  // Optimized data fetching - only summary data
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: recentSalesData, isLoading: recentSalesLoading } = useRecentSales();
  const { data: lowStockProducts, isLoading: lowStockLoading } = useLowStockProducts(5); // Reduced to 5

  const recentSales = recentSalesData?.sales || [];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Resumen general del negocio y alertas importantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 py-1.5 px-3">
            <Shield className="h-3.5 w-3.5" />
            Modo Admin
          </Badge>
          <Button asChild size="sm">
            <Link href="/dashboard/pos">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ir al POS
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics Row - Optimized with server-side calculations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <CurrencyDisplay value={summary?.todaySales || 0} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos registrados hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos (30 días)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? <Skeleton className="h-8 w-24" /> : (summary?.totalOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Transacciones realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <CurrencyDisplay value={summary?.avgTicket || 0} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio por venta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockProducts && lowStockProducts.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lowStockLoading ? <Skeleton className="h-8 w-24" /> : (lowStockProducts?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos con stock bajo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Lightweight Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Simplified Charts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Análisis de Ventas</CardTitle>
                <CardDescription>Resumen de rendimiento</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/reports">
                  Ver reportes completos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {summaryLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : `+${summary?.growthPercentage || 0}%`}
                  </p>
                  <p className="text-sm text-muted-foreground">Crecimiento vs mes anterior</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-20 mx-auto" />
                    ) : (
                      <CurrencyDisplay value={summary?.monthlyTotal || 0} />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">Total del mes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions Table - Optimized */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Últimas Transacciones</CardTitle>
                <CardDescription>5 movimientos más recientes</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/sales">
                  Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSalesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))
                ) : recentSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay ventas recientes.</p>
                ) : (
                  recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Venta #{sale.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          <CurrencyDisplay value={sale.total_amount} />
                        </p>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {sale.payment_method}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Alerts & Actions - Optimized */}
        <div className="space-y-8">
          {/* Low Stock Alerts */}
          <Card className={lowStockProducts && lowStockProducts.length > 0 ? "border-red-200" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Stock Crítico
              </CardTitle>
              <CardDescription>Top 5 productos que requieren reabastecimiento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : !lowStockProducts || lowStockProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-20" />
                    <p>Inventario saludable</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                        <div className="space-y-1">
                          <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="ml-auto">
                            {product.stock_quantity} un.
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Funciones administrativas frecuentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/users">
                  <Users className="mr-2 h-4 w-4" />
                  Gestionar Usuarios
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Reportes
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/system">
                  <Activity className="mr-2 h-4 w-4" />
                  Estado del Sistema
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
