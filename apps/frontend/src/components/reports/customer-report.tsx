'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  UsersIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  StarIcon,
} from 'lucide-react';
import { BarChart, DoughnutChart, LineChart, generateChartData } from './chart-components';
import { formatCurrency } from '@/lib/utils';
import { useCustomerReport, useReportExport, ReportFilter } from '@/hooks/use-reports';

interface CustomerReportProps {
  filters: ReportFilter;
}

export const CustomerReport: React.FC<CustomerReportProps> = ({ filters }) => {
  const { data: reportData, loading, error } = useCustomerReport(filters);
  const { exportReport, isExporting } = useReportExport();

  // Transform data for charts
  const customerSegmentData = useMemo(() => {
    if (!reportData?.customerSegments) return null;
    
    return generateChartData(
      reportData.customerSegments.map(segment => segment.segment),
      [{
        label: 'Clientes',
        data: reportData.customerSegments.map(segment => segment.count),
      }]
    );
  }, [reportData?.customerSegments]);

  const customerGrowthData = useMemo(() => {
    if (!reportData?.acquisitionTrends) return null;
    
    return generateChartData(
      reportData.acquisitionTrends.map((point: any) => point.date),
      [{
        label: 'Nuevos Clientes',
        data: reportData.acquisitionTrends.map((point: any) => point.newCustomers),
      }]
    );
  }, [reportData?.acquisitionTrends]);

  const customerValueData = useMemo(() => {
    if (!reportData?.topCustomers) return null;
    
    return generateChartData(
      reportData.topCustomers.map((customer: any) => customer.name),
      [{
        label: 'Valor Total (€)',
        data: reportData.topCustomers.map((customer: any) => customer.totalSpent),
      }]
    );
  }, [reportData?.topCustomers]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      await exportReport('customers', format, filters);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-3 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar el reporte de clientes: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!reportData) {
    return (
      <Alert>
        <AlertDescription>
          No hay datos disponibles para el período seleccionado.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with export buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reporte de Clientes</h2>
          <p className="text-muted-foreground">
            Análisis detallado de la base de clientes y su comportamiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={isExporting}
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
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +{reportData.summary.newCustomers} nuevos este período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {((reportData.summary.activeCustomers / reportData.summary.totalCustomers) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData.summary.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por pedido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Retención</CardTitle>
            <StarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.summary.customerRetentionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes que repiten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Segmentación de Clientes</CardTitle>
            <CardDescription>
              Distribución de clientes por segmento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerSegmentData && (
              <DoughnutChart data={customerSegmentData} height={300} />
            )}
          </CardContent>
        </Card>

        {/* Customer Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Crecimiento de Clientes</CardTitle>
            <CardDescription>
              Nuevos clientes por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerGrowthData && (
              <LineChart data={customerGrowthData} height={300} />
            )}
          </CardContent>
        </Card>

        {/* Top Customers by Value */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clientes por Valor</CardTitle>
            <CardDescription>
              Top 10 clientes por valor total de compras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerValueData && (
              <BarChart data={customerValueData} height={300} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mejores Clientes</CardTitle>
            <CardDescription>
              Clientes con mayor valor de compras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.topCustomers?.map((customer, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell>{customer.orderCount}</TableCell>
                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell>
                      <Badge variant={customer.orderCount > 0 ? 'default' : 'secondary'}>
                        {customer.orderCount > 0 ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Customer Segments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis por Segmento</CardTitle>
            <CardDescription>
              Métricas detalladas por segmento de cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Valor Promedio</TableHead>
                  <TableHead>Frecuencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.customerSegments?.map((segment, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {segment.segment}
                    </TableCell>
                    <TableCell>{segment.count}</TableCell>
                    <TableCell>{formatCurrency(segment.averageOrderValue)}</TableCell>
                    <TableCell>{segment.totalSpent.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};