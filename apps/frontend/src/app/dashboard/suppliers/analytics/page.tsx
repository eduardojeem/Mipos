'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Download, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Optimized components
import dynamic from 'next/dynamic';
import { AnalyticsKPICards } from './components/AnalyticsKPICards';
const MonthlyTrendsChart = dynamic(
  () => import('./components/MonthlyTrendsChart').then(m => m.MonthlyTrendsChart),
  { ssr: false }
);
const CategoryDistributionChart = dynamic(
  () => import('./components/CategoryDistributionChart').then(m => m.CategoryDistributionChart),
  { ssr: false }
);
import { TopPerformersTable } from './components/TopPerformersTable';
import { PerformanceMetricsGrid } from './components/PerformanceMetricsGrid';

// Custom hook
import { useSupplierAnalytics } from './hooks/useSupplierAnalytics';
import type { SupplierWithMetrics } from './hooks/useSupplierAnalytics';

// Loading skeleton
const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
      
      {/* KPI Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  );
});

const SuppliersAnalyticsPageContent = memo(function SuppliersAnalyticsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '12months' | '24months'>('12months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Data fetching
  const { data, loading, error, lastUpdated, refresh } = useSupplierAnalytics({
    timeRange,
    category: selectedCategory,
  });

  // Handlers
  const handleRefresh = useCallback(() => {
    refresh();
    toast({
      title: 'Datos actualizados',
      description: 'Las métricas han sido actualizadas correctamente',
    });
  }, [refresh, toast]);

  const handleExport = useCallback(() => {
    if (!data) return;
    
    // Create CSV data
    const csvData = [
      ['Proveedor', 'Score', 'Total Compras', 'Órdenes', 'Valor Promedio'],
      ...data.topPerformers.map(supplier => [
        supplier.name,
        supplier.performanceScore.toString(),
        supplier.totalPurchases.toString(),
        supplier.totalOrders.toString(),
        supplier.averageOrderValue.toString(),
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-proveedores-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exportación completada',
      description: 'Los datos han sido exportados correctamente',
    });
  }, [data, toast]);

  const handleViewSupplierDetails = useCallback((supplier: SupplierWithMetrics) => {
    // Navigate to supplier details or open modal
    console.log('View supplier details:', supplier);
    toast({
      title: 'Detalles del proveedor',
      description: `Mostrando información de ${supplier.name}`,
    });
  }, [toast]);

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Button 
            variant="ghost" 
            className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error al cargar analytics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <Button 
            variant="ghost" 
            className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Button 
          variant="ghost" 
          className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics de Proveedores</h1>
          <p className="text-muted-foreground">
            Métricas avanzadas y análisis de rendimiento de proveedores
          </p>
          {lastUpdated && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Actualizado: {lastUpdated.toLocaleTimeString('es-ES')}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Último año</SelectItem>
              <SelectItem value="24months">Últimos 2 años</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {data.categoryDistribution.map(category => (
                <SelectItem key={category.name} value={category.name.toLowerCase()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <AnalyticsKPICards data={data} loading={loading} />

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlyTrendsChart data={data.monthlyTrends} loading={loading} />
            <CategoryDistributionChart data={data.categoryDistribution} loading={loading} />
          </div>
          
          <TopPerformersTable 
            data={data.topPerformers} 
            loading={loading}
            onViewDetails={handleViewSupplierDetails}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetricsGrid 
            data={data.performanceMetrics}
            totalSuppliers={data.totalSuppliers}
            loading={loading}
          />
          
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Rendimiento</CardTitle>
              <CardDescription>
                Análisis detallado del rendimiento por proveedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {data.topPerformers.slice(0, 8).map((supplier, index) => (
                  <div key={supplier.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate">{supplier.name}</span>
                      <Badge variant={supplier.performanceScore >= 90 ? 'default' : 'secondary'}>
                        {supplier.performanceScore}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.totalOrders} órdenes • ${(supplier.totalPurchases / 1000).toFixed(0)}K
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <MonthlyTrendsChart data={data.monthlyTrends} loading={loading} />
          
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Tendencias</CardTitle>
              <CardDescription>
                Insights y patrones identificados en los datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Tendencia Positiva</h4>
                  <p className="text-sm text-green-600">
                    El valor promedio de órdenes ha aumentado 12.3% en el último período
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Proveedores Activos</h4>
                  <p className="text-sm text-blue-600">
                    {((data.activeSuppliers / data.totalSuppliers) * 100).toFixed(1)}% de proveedores están activos
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Oportunidad</h4>
                  <p className="text-sm text-purple-600">
                    {data.performanceMetrics.poor} proveedores necesitan mejoras
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <TopPerformersTable 
            data={data.topPerformers} 
            loading={loading}
            onViewDetails={handleViewSupplierDetails}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default function SuppliersAnalyticsPage() {
  return (
    <ErrorBoundary>
      <SuppliersAnalyticsPageContent />
    </ErrorBoundary>
  );
}
