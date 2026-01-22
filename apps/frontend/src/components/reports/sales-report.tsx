'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  UsersIcon,
  PackageIcon,
} from 'lucide-react';
import { LineChart, BarChart, DoughnutChart } from './chart-components';
import {
  ChartDataPoint,
  TimeSeriesDataPoint,
  MultiLineChart,
} from '@/components/ui/charts';
import { useSalesReport, useReportExport, ReportFilter } from '@/hooks/use-reports';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatPercentage } from './chart-components';
import { useToast } from '@/components/ui/use-toast';

interface SalesReportProps {
  filters: ReportFilter;
}

export const SalesReport: React.FC<SalesReportProps> = ({ filters }) => {
  const { data, loading, error, refresh } = useSalesReport(filters);
  const { exportReport, isExporting } = useReportExport();
  const fmtCurrency = useCurrencyFormatter();
  const { toast } = useToast();

  // Transform data for charts
  const salesTrendData = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!data?.salesByDate) return [];
    return data.salesByDate.map(item => ({
      date: item.date,
      value: item.sales,
    }));
  }, [data?.salesByDate]);

  const profitTrendData = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!data?.salesByDate) return [];
    return data.salesByDate.map(item => ({
      date: item.date,
      value: item.profit,
    }));
  }, [data?.salesByDate]);

  const multiLineData = useMemo(() => {
    if (!data?.salesByDate) return [];
    return [
      {
        label: 'Ventas',
        data: salesTrendData,
        color: '#3b82f6',
      },
      {
        label: 'Ganancias',
        data: profitTrendData,
        color: '#10b981',
      },
    ];
  }, [salesTrendData, profitTrendData]);

  const topProductsData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.topProducts) return [];
    return data.topProducts.slice(0, 10).map((product, index) => ({
      label: product.name,
      value: product.sales,
      color: `hsl(${index * 36}, 70%, 50%)`,
    }));
  }, [data?.topProducts]);

  const categoryData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.salesByCategory) return [];
    return data.salesByCategory.map((category, index) => ({
      label: category.category,
      value: category.sales,
      color: `hsl(${index * 45}, 70%, 50%)`,
    }));
  }, [data?.salesByCategory]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    await exportReport('sales', format, filters);
  };

  const exportSalesCategoryCSV = () => {
    const headers = ['Categoría','Ventas','Cantidad','ParticipaciónPct'];
    const totalSales = data?.summary.totalSales || 0;
    const rows = (data?.salesByCategory || []).map((c) => {
      const pct = totalSales > 0 ? ((c.sales / totalSales) * 100).toFixed(2) : '0.00';
      return [
        c.category,
        String(c.sales),
        String(c.quantity),
        String(pct),
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_por_categoria_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: 'CSV de ventas por categoría generado' });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar el reporte de ventas: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reporte de Ventas</h2>
          <p className="text-muted-foreground">
            Análisis detallado de ventas y rendimiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={isExporting || loading}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={isExporting || loading}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {fmtCurrency(data?.summary.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margen: {formatPercentage(data?.summary.profitMargin || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.summary.totalOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor promedio: {fmtCurrency(data?.summary.averageOrderValue || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {fmtCurrency(data?.summary.totalProfit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.summary.profitMargin && data.summary.profitMargin > 0 ? (
                    <span className="text-green-600 flex items-center">
                      <TrendingUpIcon className="h-3 w-3 mr-1" />
                      {formatPercentage(data.summary.profitMargin)}
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <TrendingDownIcon className="h-3 w-3 mr-1" />
                      {formatPercentage(data?.summary.profitMargin || 0)}
                    </span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.topProducts?.reduce((sum, p) => sum + p.quantity, 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.topProducts?.length || 0} productos únicos
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <MultiLineChart
                datasets={multiLineData}
                title="Ventas y Ganancias por Fecha"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <BarChart
                data={topProductsData}
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ventas por Categoría</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportSalesCategoryCSV} disabled={loading || isExporting}>
                  Exportar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportReport('sales', 'excel', filters)} disabled={loading || isExporting}>
                  Exportar XLSX
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <DoughnutChart
                data={categoryData}
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Daily Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Diarias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <LineChart
                data={salesTrendData}
                height={300}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topProducts?.slice(0, 10).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(product.sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(product.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(product.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mejores Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Órdenes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.salesByCustomer?.slice(0, 10).map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell className="font-medium">
                        {customer.customerName}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(customer.sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(customer.orders)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
