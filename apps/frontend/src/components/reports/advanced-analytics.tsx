'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  PieChart,
  Activity,
  Target,
  Download,
  RefreshCw,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { LineChart, BarChart, DoughnutChart } from './chart-components';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface AnalyticsData {
  salesTrend: Array<{ date: string; sales: number; revenue: number }>;
  productPerformance: Array<{ name: string; sales: number; revenue: number; margin: number }>;
  customerSegments: Array<{ segment: string; count: number; value: number; percentage: number }>;
  hourlyActivity: Array<{ hour: number; sales: number; customers: number }>;
  categoryBreakdown: Array<{ category: string; sales: number; percentage: number; growth: number }>;
  paymentMethods: Array<{ method: string; count: number; amount: number; percentage: number }>;
  inventoryTurnover: Array<{ product: string; turnover: number; daysInStock: number; status: 'high' | 'medium' | 'low' }>;
  profitabilityAnalysis: Array<{ period: string; revenue: number; costs: number; profit: number; margin: number }>;
}

interface AdvancedAnalyticsProps {
  data?: AnalyticsData;
  isLoading?: boolean;
  dateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

export function AdvancedAnalytics({ 
  data, 
  isLoading = false, 
  dateRange,
  onDateRangeChange 
}: AdvancedAnalyticsProps) {
  // Define types for better type safety and reusability
  type ViewType = 'overview' | 'sales' | 'products' | 'customers';

  // State management with proper typing
  const [activeView, setActiveView] = useState<ViewType>('overview');

  // Drill-down state with better structure
  const [drilldownState, setDrilldownState] = useState<{
    isOpen: boolean;
    title: string;
    items: Array<{ label: string; value: string }>;
  }>({
    isOpen: false,
    title: '',
    items: []
  });

  // Mock data para demostración
  const mockData: AnalyticsData = {
    salesTrend: [
      { date: '2024-01-01', sales: 45, revenue: 12500 },
      { date: '2024-01-02', sales: 52, revenue: 14200 },
      { date: '2024-01-03', sales: 38, revenue: 10800 },
      { date: '2024-01-04', sales: 61, revenue: 16900 },
      { date: '2024-01-05', sales: 49, revenue: 13400 },
      { date: '2024-01-06', sales: 67, revenue: 18200 },
      { date: '2024-01-07', sales: 58, revenue: 15600 }
    ],
    productPerformance: [
      { name: 'Laptop HP Pavilion', sales: 45, revenue: 31500, margin: 22.5 },
      { name: 'Mouse Logitech MX', sales: 38, revenue: 2280, margin: 35.2 },
      { name: 'Teclado Mecánico RGB', sales: 32, revenue: 4800, margin: 28.8 },
      { name: 'Monitor 24" Full HD', sales: 28, revenue: 8400, margin: 18.7 },
      { name: 'Auriculares Bluetooth', sales: 25, revenue: 3750, margin: 42.1 }
    ],
    customerSegments: [
      { segment: 'Clientes Premium', count: 45, value: 125000, percentage: 35.2 },
      { segment: 'Clientes Regulares', count: 128, value: 89000, percentage: 42.8 },
      { segment: 'Clientes Nuevos', count: 67, value: 34000, percentage: 22.0 }
    ],
    hourlyActivity: [
      { hour: 9, sales: 12, customers: 8 },
      { hour: 10, sales: 18, customers: 14 },
      { hour: 11, sales: 25, customers: 19 },
      { hour: 12, sales: 32, customers: 24 },
      { hour: 13, sales: 28, customers: 21 },
      { hour: 14, sales: 35, customers: 26 },
      { hour: 15, sales: 42, customers: 31 },
      { hour: 16, sales: 38, customers: 28 },
      { hour: 17, sales: 45, customers: 33 },
      { hour: 18, sales: 29, customers: 22 }
    ],
    categoryBreakdown: [
      { category: 'Electrónicos', sales: 156, percentage: 45.2, growth: 12.5 },
      { category: 'Accesorios', sales: 89, percentage: 25.8, growth: 8.3 },
      { category: 'Audio', sales: 67, percentage: 19.4, growth: -2.1 },
      { category: 'Gaming', sales: 33, percentage: 9.6, growth: 18.7 }
    ],
    paymentMethods: [
      { method: 'Efectivo', count: 145, amount: 45600, percentage: 42.1 },
      { method: 'Tarjeta', count: 128, amount: 52300, percentage: 37.2 },
      { method: 'Transferencia', count: 71, amount: 22500, percentage: 20.7 }
    ],
    inventoryTurnover: [
      { product: 'Laptop HP Pavilion', turnover: 8.5, daysInStock: 43, status: 'high' },
      { product: 'Mouse Logitech MX', turnover: 6.2, daysInStock: 59, status: 'medium' },
      { product: 'Teclado Mecánico RGB', turnover: 4.8, daysInStock: 76, status: 'medium' },
      { product: 'Monitor 24" Full HD', turnover: 3.1, daysInStock: 118, status: 'low' },
      { product: 'Auriculares Bluetooth', turnover: 7.3, daysInStock: 50, status: 'high' }
    ],
    profitabilityAnalysis: [
      { period: 'Enero', revenue: 125000, costs: 87500, profit: 37500, margin: 30.0 },
      { period: 'Febrero', revenue: 142000, costs: 99400, profit: 42600, margin: 30.0 },
      { period: 'Marzo', revenue: 138000, costs: 96600, profit: 41400, margin: 30.0 },
      { period: 'Abril', revenue: 156000, costs: 109200, profit: 46800, margin: 30.0 }
    ]
  };

  // Memoize analytics data to prevent unnecessary recalculations
  const analyticsData = useMemo(() => data || mockData, [data]);

  // Helpers para abrir panel de drill-down
  const openDrilldown = (title: string, items: Array<{ label: string; value: string }>) => {
    setDrilldownState({ isOpen: true, title, items });
  };

  // Enhanced click handlers with error handling and type safety
  const handleSalesTrendClick = (evt: unknown, elements: any[]) => {
    try {
      if (!elements || elements.length === 0) return;
      const idx = elements[0]?.index ?? 0;
      if (idx < 0 || idx >= analyticsData.salesTrend.length) return;

      const item = analyticsData.salesTrend[idx];
      const label = new Date(item.date).toLocaleDateString();
      openDrilldown(`Tendencia de Ventas — ${label}`, [
        { label: 'Ventas', value: formatNumber(item.sales) },
        { label: 'Ingresos', value: formatCurrency(item.revenue) },
      ]);
    } catch (error) {
      console.error('Error handling sales trend click:', error);
    }
  };

  const handleCategoryClick = (evt: unknown, elements: any[]) => {
    try {
      if (!elements || elements.length === 0) return;
      const idx = elements[0]?.index ?? 0;
      if (idx < 0 || idx >= analyticsData.categoryBreakdown.length) return;

      const item = analyticsData.categoryBreakdown[idx];
      openDrilldown(`Categoría — ${item.category}`, [
        { label: 'Participación', value: `${item.percentage}%` },
        { label: 'Ventas', value: formatNumber(item.sales) },
        { label: 'Crecimiento', value: `${item.growth > 0 ? '+' : ''}${item.growth}%` },
      ]);
    } catch (error) {
      console.error('Error handling category click:', error);
    }
  };

  const handleHourlyClick = (evt: unknown, elements: any[]) => {
    try {
      if (!elements || elements.length === 0) return;
      const idx = elements[0]?.index ?? 0;
      if (idx < 0 || idx >= analyticsData.hourlyActivity.length) return;

      const item = analyticsData.hourlyActivity[idx];
      openDrilldown(`Actividad — ${item.hour}:00`, [
        { label: 'Ventas', value: formatNumber(item.sales) },
        { label: 'Clientes', value: formatNumber(item.customers) },
      ]);
    } catch (error) {
      console.error('Error handling hourly click:', error);
    }
  };

  const handleProfitabilityClick = (evt: unknown, elements: any[]) => {
    try {
      if (!elements || elements.length === 0) return;
      const idx = elements[0]?.index ?? 0;
      if (idx < 0 || idx >= analyticsData.profitabilityAnalysis.length) return;

      const item = analyticsData.profitabilityAnalysis[idx];
      openDrilldown(`Rentabilidad — ${item.period}`, [
        { label: 'Ingresos', value: formatCurrency(item.revenue) },
        { label: 'Costos', value: formatCurrency(item.costs) },
        { label: 'Ganancia', value: formatCurrency(item.profit) },
        { label: 'Margen', value: `${item.margin}%` },
      ]);
    } catch (error) {
      console.error('Error handling profitability click:', error);
    }
  };

  const handlePaymentMethodClick = (evt: unknown, elements: any[]) => {
    try {
      if (!elements || elements.length === 0) return;
      const idx = elements[0]?.index ?? 0;
      if (idx < 0 || idx >= analyticsData.paymentMethods.length) return;

      const item = analyticsData.paymentMethods[idx];
      openDrilldown(`Método de Pago — ${item.method}`, [
        { label: 'Transacciones', value: formatNumber(item.count) },
        { label: 'Monto', value: formatCurrency(item.amount) },
        { label: 'Participación', value: `${item.percentage}%` },
      ]);
    } catch (error) {
      console.error('Error handling payment method click:', error);
    }
  };

  // Memoize KPI calculations for performance
  const kpiCards = useMemo(() => [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(analyticsData.profitabilityAnalysis.reduce((sum, item) => sum + item.revenue, 0)),
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Productos Vendidos',
      value: formatNumber(analyticsData.productPerformance.reduce((sum, item) => sum + item.sales, 0)),
      change: '+8.3%',
      trend: 'up' as const,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Clientes Activos',
      value: formatNumber(analyticsData.customerSegments.reduce((sum, item) => sum + item.count, 0)),
      change: '+5.7%',
      trend: 'up' as const,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Margen Promedio',
      value: '28.5%',
      change: '-1.2%',
      trend: 'down' as const,
      icon: Target,
      color: 'text-orange-600'
    }
  ], [analyticsData]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800'
    };
    const labels = {
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo'
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  // Loading state with better structure
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={`loading-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error boundary for data validation
  if (!analyticsData || typeof analyticsData !== 'object') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Error al cargar los datos de análisis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(kpi.trend)}
                <span className={`ml-1 ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {kpi.change} vs período anterior
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewType)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Tendencia de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={{
                    labels: analyticsData.salesTrend.map(item => new Date(item.date).toLocaleDateString()),
                    datasets: [
                      {
                        label: 'Ventas',
                        data: analyticsData.salesTrend.map(item => item.sales),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                      },
                      {
                        label: 'Ingresos',
                        data: analyticsData.salesTrend.map(item => item.revenue / 100),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    onClick: handleSalesTrendClick,
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Distribución por Categorías
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DoughnutChart
                  data={{
                    labels: analyticsData.categoryBreakdown.map(item => item.category),
                    datasets: [
                      {
                        data: analyticsData.categoryBreakdown.map(item => item.percentage),
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(16, 185, 129, 0.8)',
                          'rgba(245, 158, 11, 0.8)',
                          'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    onClick: handleCategoryClick,
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Actividad por Hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={{
                    labels: analyticsData.hourlyActivity.map(item => `${item.hour}:00`),
                    datasets: [
                      {
                        label: 'Ventas',
                        data: analyticsData.hourlyActivity.map(item => item.sales),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    onClick: handleHourlyClick,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Segmentos de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.customerSegments.map((segment, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{segment.segment}</span>
                      <span className="text-muted-foreground">{segment.count} clientes</span>
                    </div>
                    <Progress value={segment.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(segment.value)} ({segment.percentage}%)
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Rotación de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.inventoryTurnover.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product}</p>
                      <p className="text-xs text-muted-foreground">{item.daysInStock} días en stock</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.turnover}x</span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Rentabilidad</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={{
                    labels: analyticsData.profitabilityAnalysis.map(item => item.period),
                    datasets: [
                      {
                        label: 'Ingresos',
                        data: analyticsData.profitabilityAnalysis.map(item => item.revenue),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      },
                      {
                        label: 'Costos',
                        data: analyticsData.profitabilityAnalysis.map(item => item.costs),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      },
                      {
                        label: 'Ganancia',
                        data: analyticsData.profitabilityAnalysis.map(item => item.profit),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    onClick: handleProfitabilityClick,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <DoughnutChart
                  data={{
                    labels: analyticsData.paymentMethods.map(item => item.method),
                    datasets: [
                      {
                        data: analyticsData.paymentMethods.map(item => item.percentage),
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(16, 185, 129, 0.8)',
                          'rgba(245, 158, 11, 0.8)'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    onClick: handlePaymentMethodClick,
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.productPerformance.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.sales} unidades vendidas
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      <Badge variant={product.margin > 30 ? 'default' : product.margin > 20 ? 'secondary' : 'destructive'}>
                        {product.margin}% margen
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Valor por Segmento</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={{
                    labels: analyticsData.customerSegments.map(item => item.segment),
                    datasets: [
                      {
                        label: 'Valor Total',
                        data: analyticsData.customerSegments.map(item => item.value),
                        backgroundColor: 'rgba(139, 92, 246, 0.8)',
                      }
                    ]
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <DoughnutChart
                  data={{
                    labels: analyticsData.customerSegments.map(item => item.segment),
                    datasets: [
                      {
                        data: analyticsData.customerSegments.map(item => item.count),
                        backgroundColor: [
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(16, 185, 129, 0.8)'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                      }
                    ]
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      {/* Panel lateral para drill-down */}
      <Sheet open={drilldownState.isOpen} onOpenChange={(open) => setDrilldownState(prev => ({ ...prev, isOpen: open }))}>
        <SheetContent side="right" className="w-[380px]" aria-labelledby="drilldown-title">
          <SheetHeader>
            <SheetTitle id="drilldown-title">{drilldownState.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drilldownState.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Panel de Drill-Down
export default AdvancedAnalytics;