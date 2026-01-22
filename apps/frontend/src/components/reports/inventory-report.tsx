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
  PackageIcon,
  AlertTriangleIcon,
  XCircleIcon,
  TrendingUpIcon,
  BarChart3Icon,
} from 'lucide-react';
import { BarChart, DoughnutChart } from './chart-components';
import { ChartDataPoint } from '@/components/ui/charts';
import { useInventoryReport, useReportExport, ReportFilter } from '@/hooks/use-reports';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface InventoryReportProps {
  filters: ReportFilter;
}

export const InventoryReport: React.FC<InventoryReportProps> = ({ filters }) => {
  const { data, loading, error, refresh } = useInventoryReport(filters);
  const { exportReport, isExporting } = useReportExport();

  // Transform data for charts
  const categoryData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.categoryBreakdown) return [];
    return data.categoryBreakdown.map((category, index) => ({
      label: category.category,
      value: category.totalValue,
      color: `hsl(${index * 45}, 70%, 50%)`,
    }));
  }, [data?.categoryBreakdown]);

  const stockStatusData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.summary) return [];
    const inStock = data.summary.totalProducts - data.summary.lowStockItems - data.summary.outOfStockItems;
    return [
      {
        label: 'En Stock',
        value: inStock,
        color: '#10b981',
      },
      {
        label: 'Stock Bajo',
        value: data.summary.lowStockItems,
        color: '#f59e0b',
      },
      {
        label: 'Sin Stock',
        value: data.summary.outOfStockItems,
        color: '#ef4444',
      },
    ];
  }, [data?.summary]);

  const categoryProductsData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.categoryBreakdown) return [];
    return data.categoryBreakdown.map((category, index) => ({
      label: category.category,
      value: category.totalProducts,
      color: `hsl(${index * 36}, 70%, 50%)`,
    }));
  }, [data?.categoryBreakdown]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    await exportReport('inventory', format, filters);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="default" className="bg-green-100 text-green-800">En Stock</Badge>;
      case 'low_stock':
        return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">Stock Bajo</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">Sin Stock</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar el reporte de inventario: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reporte de Inventario</h2>
          <p className="text-muted-foreground">
            Análisis detallado de stock y movimientos de inventario
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.summary.totalProducts || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Productos únicos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(data?.summary.totalValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor del inventario
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Promedio</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.summary.averageStockLevel || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unidades promedio
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatNumber(data?.summary.lowStockItems || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Productos con stock bajo
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <XCircleIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(data?.summary.outOfStockItems || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Productos agotados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <DoughnutChart
                data={stockStatusData}
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Value by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Valor por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <BarChart
                data={categoryData}
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Products by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Productos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <BarChart
                data={categoryProductsData}
                height={300}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels Table */}
        <Card>
          <CardHeader>
            <CardTitle>Niveles de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                    <TableHead className="text-right">Stock Mín.</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.stockLevels?.slice(0, 10).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.currentStock)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.minStock)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.value)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Categoría</CardTitle>
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
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Productos</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Stock Prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.categoryBreakdown?.map((category) => (
                    <TableRow key={category.category}>
                      <TableCell className="font-medium">
                        {category.category}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(category.totalProducts)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(category.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(category.averageStock)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.stockMovements?.slice(0, 20).map((movement, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(movement.date).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {movement.productName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={movement.type === 'in' ? 'default' : 'secondary'}>
                        {movement.type === 'in' ? 'Entrada' : 'Salida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(movement.quantity)}
                    </TableCell>
                    <TableCell>
                      {movement.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};