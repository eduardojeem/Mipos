'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { UICustomer } from '@/lib/customer-service';
import { UnifiedStateHandler, useUnifiedState } from '@/components/ui/unified-error-loading';
import { Typography } from '@/components/ui/Typography';
import { Box, Stack, HStack, Container, Section } from '@/components/ui/Spacing';
import { ColorBadge, StatusIndicator } from '@/components/ui/ColorSystem';

interface CustomerAnalyticsProps {
  customers?: UICustomer[];
  onRefresh?: () => void;
}

interface AnalyticsData {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  customerGrowth: number;
  revenueGrowth: number;
  topCustomers: UICustomer[];
  customersByType: {
    regular: number;
    vip: number;
    wholesale: number;
  };
  monthlyStats: {
    month: string;
    newCustomers: number;
    revenue: number;
    orders: number;
  }[];
  segmentAnalysis: {
    new: number;
    regular: number;
    frequent: number;
    vip: number;
  };
}

interface BackendAnalytics {
  overview: {
    totalCustomers: number;
    activeCustomers: number;
    customersWithPurchases: number;
    recentCustomers: number;
    conversionRate: string;
  };
  financial: {
    totalRevenue: number;
    averageOrderValue: number;
    averageCustomerValue: number;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    totalPurchases: number;
    lastPurchase: string;
    _count: { sales: number };
  }>;
  customersByType: Array<{
    type: string;
    count: number;
    totalRevenue: number;
  }>;
  growth: {
    newCustomersThisMonth: number;
    monthlyGrowth: any[];
  };
}

export function CustomerAnalytics({ customers, onRefresh }: CustomerAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [backendAnalytics, setBackendAnalytics] = useState<BackendAnalytics | null>(null);
  
  // Usar el nuevo sistema unificado de estados
  const {
    state,
    error,
    executeWithState,
    setIdleState
  } = useUnifiedState();

  useEffect(() => {
    fetchBackendAnalytics();
    if (customers) {
      calculateAnalytics();
    }
  }, [customers, timeRange]);

  const fetchBackendAnalytics = async () => {
    await executeWithState(
      async () => {
        const response = await fetch('/api/customers/analytics');
        
        if (!response.ok) {
          const error = new Error('Error al cargar analytics del servidor');
          (error as any).status = response.status;
          throw error;
        }
        
        const data = await response.json();
        setBackendAnalytics(data.data);
        return data.data;
      },
      {
        message: 'Cargando analytics...',
        variant: 'spinner',
        size: 'md'
      }
    );
  };

  const handleRefresh = async () => {
    await fetchBackendAnalytics();
    onRefresh?.();
  };

  const calculateAnalytics = () => {
    if (!customers || !customers.length) {
      setAnalytics(null);
      return;
    }

    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Filtrar clientes por rango de tiempo
    const filteredCustomers = customers.filter(customer => 
      new Date(customer.created_at) >= cutoffDate
    );

    // Calcular métricas básicas
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.is_active).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calcular crecimiento (simulado para demo)
    const customerGrowth = Math.floor(Math.random() * 20) + 5; // 5-25%
    const revenueGrowth = Math.floor(Math.random() * 30) + 10; // 10-40%

    // Top 5 clientes
    const topCustomers = [...customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5);

    // Clientes por tipo
    const customersByType = {
      regular: customers.filter(c => c.customerType === 'regular').length,
      vip: customers.filter(c => c.customerType === 'vip').length,
      wholesale: customers.filter(c => c.customerType === 'wholesale').length,
    };

    // Estadísticas mensuales (simuladas)
    const monthlyStats = generateMonthlyStats(6);

    // Análisis de segmentación
    const segmentAnalysis = calculateSegmentation(customers);

    setAnalytics({
      totalCustomers,
      activeCustomers,
      totalRevenue,
      averageOrderValue,
      customerGrowth,
      revenueGrowth,
      topCustomers,
      customersByType,
      monthlyStats,
      segmentAnalysis,
    });
  };

  const generateMonthlyStats = (months: number) => {
    const stats = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      
      stats.push({
        month: monthName,
        newCustomers: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        orders: Math.floor(Math.random() * 200) + 50,
      });
    }
    
    return stats;
  };

  const calculateSegmentation = (customers: UICustomer[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return {
      new: customers.filter(c => 
        new Date(c.created_at) >= thirtyDaysAgo && (c.totalOrders || 0) <= 1
      ).length,
      regular: customers.filter(c => 
        (c.totalOrders || 0) >= 2 && (c.totalOrders || 0) <= 5
      ).length,
      frequent: customers.filter(c => 
        (c.totalOrders || 0) >= 6 && (c.totalOrders || 0) <= 15
      ).length,
      vip: customers.filter(c => 
        (c.totalOrders || 0) > 15 || (c.totalSpent || 0) > 5000
      ).length,
    };
  };

  // Usar datos del backend si están disponibles, sino usar datos locales
  const displayData = backendAnalytics || analytics;

  return (
    <Container className="ds-space-y-6">
      <UnifiedStateHandler
        state={state}
        error={error ?? undefined}
        onRetry={handleRefresh}
        loading={{
          message: 'Cargando analytics de clientes...',
          variant: 'skeleton',
          size: 'lg'
        }}
      >
        {displayData ? (
          <>
            {/* Header Section */}
            <Section>
              <Stack spacing="md">
                <HStack className="ds-justify-between ds-items-center">
                  <Stack spacing="xs">
                    <Typography variant="h1">Analytics de Clientes</Typography>
                    <Typography variant="body2" color="muted">
                      Métricas esenciales y estadísticas de clientes
                    </Typography>
                  </Stack>
                  <HStack spacing="sm">
                    <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                      <SelectTrigger className="ds-w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">7 días</SelectItem>
                        <SelectItem value="30d">30 días</SelectItem>
                        <SelectItem value="90d">90 días</SelectItem>
                        <SelectItem value="1y">1 año</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRefresh}
                      disabled={state === 'loading'}
                      className="ds-btn ds-btn-outline"
                    >
                      <RefreshCw className={`ds-h-4 ds-w-4 ds-mr-2 ${state === 'loading' ? 'ds-animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </HStack>
                </HStack>
              </Stack>
            </Section>

            {/* Backend Analytics */}
            {backendAnalytics && (
              <>
                {/* Overview Metrics */}
                <Section>
                  <div className="ds-grid ds-grid-cols-1 md:ds-grid-cols-2 lg:ds-grid-cols-4 ds-gap-4">
                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <Users className="ds-h-8 ds-w-8 ds-text-primary" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{backendAnalytics.overview.totalCustomers}</Typography>
                            <Typography variant="caption" color="muted">Total Clientes</Typography>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>

                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <StatusIndicator status="success" size="md" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{backendAnalytics.overview.activeCustomers}</Typography>
                            <Typography variant="caption" color="muted">Clientes Activos</Typography>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>

                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <DollarSign className="ds-h-8 ds-w-8 ds-text-success" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{formatCurrency(backendAnalytics.financial.totalRevenue)}</Typography>
                            <Typography variant="caption" color="muted">Ingresos Totales</Typography>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>

                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <ShoppingCart className="ds-h-8 ds-w-8 ds-text-info" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{formatCurrency(backendAnalytics.financial.averageOrderValue)}</Typography>
                            <Typography variant="caption" color="muted">Valor Promedio</Typography>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>
                  </div>
                </Section>

                {/* Tabs Section */}
                <Section>
                  <Tabs defaultValue="overview" className="ds-w-full">
                    <TabsList className="ds-grid ds-w-full ds-grid-cols-3">
                      <TabsTrigger value="overview">Resumen</TabsTrigger>
                      <TabsTrigger value="top-customers">Top Clientes</TabsTrigger>
                      <TabsTrigger value="by-type">Por Tipo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="ds-space-y-4">
                      <div className="ds-grid ds-grid-cols-1 lg:ds-grid-cols-2 ds-gap-6">
                        <Card className="ds-card">
                          <CardHeader>
                            <Typography variant="h4">Métricas Financieras</Typography>
                          </CardHeader>
                          <CardContent>
                            <Stack spacing="md">
                              <HStack className="ds-justify-between ds-items-center">
                                <Typography variant="body2">Valor Promedio por Cliente</Typography>
                                <Typography variant="body1" className="font-bold">
                                  {formatCurrency(backendAnalytics.financial.averageCustomerValue)}
                                </Typography>
                              </HStack>
                              <HStack className="ds-justify-between ds-items-center">
                                <Typography variant="body2">Tasa de Conversión</Typography>
                                <ColorBadge variant="success">
                                  {backendAnalytics.overview.conversionRate}
                                </ColorBadge>
                              </HStack>
                              <HStack className="ds-justify-between ds-items-center">
                                <Typography variant="body2">Clientes con Compras</Typography>
                                <Typography variant="body1" className="font-bold">
                                  {backendAnalytics.overview.customersWithPurchases}
                                </Typography>
                              </HStack>
                            </Stack>
                          </CardContent>
                        </Card>

                        <Card className="ds-card">
                          <CardHeader>
                            <Typography variant="h4">Crecimiento</Typography>
                          </CardHeader>
                          <CardContent>
                            <Stack spacing="md">
                              <HStack className="ds-justify-between ds-items-center">
                                <Typography variant="body2">Nuevos este mes</Typography>
                                <HStack spacing="xs" className="ds-items-center">
                                  <TrendingUp className="ds-h-4 ds-w-4 ds-text-success" />
                                  <Typography variant="body1" className="font-medium">
                                    {backendAnalytics.growth.newCustomersThisMonth}
                                  </Typography>
                                </HStack>
                              </HStack>
                              <HStack className="ds-justify-between ds-items-center">
                                <Typography variant="body2">Clientes Recientes</Typography>
                                <Typography variant="body1" className="font-bold">
                                  {backendAnalytics.overview.recentCustomers}
                                </Typography>
                              </HStack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="top-customers" className="ds-space-y-4">
                      <Card className="ds-card">
                        <CardHeader>
                          <Typography variant="h4">Top Clientes por Ingresos</Typography>
                          <Typography variant="body2" color="muted">
                            Los clientes que más han gastado en tu negocio
                          </Typography>
                        </CardHeader>
                        <CardContent>
                          <Stack spacing="md">
                            {backendAnalytics.topCustomers.map((customer, index) => (
                              <Box
                                key={customer.id}
                                className="ds-flex ds-items-center ds-justify-between ds-p-4 ds-border ds-rounded-lg ds-hover-bg-muted"
                              >
                                <HStack spacing="md" className="ds-items-center">
                                  <div className="ds-flex ds-items-center ds-justify-center ds-w-8 ds-h-8 ds-bg-primary/10 ds-text-primary ds-rounded-full ds-font-semibold">
                                    {index + 1}
                                  </div>
                                  <Stack spacing="xs">
                                    <Typography variant="body1" className="font-medium">
                                      {customer.name}
                                    </Typography>
                                    <Typography variant="caption" color="muted">
                                      {customer._count.sales} ventas • Última compra: {new Date(customer.lastPurchase).toLocaleDateString()}
                                    </Typography>
                                  </Stack>
                                </HStack>
                                <Typography variant="body1" className="font-bold">
                                  {formatCurrency(customer.totalPurchases || 0)}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="by-type" className="ds-space-y-4">
                      <Card className="ds-card">
                        <CardHeader>
                          <Typography variant="h4">Clientes por Tipo</Typography>
                        </CardHeader>
                        <CardContent>
                          <Stack spacing="md">
                            {backendAnalytics.customersByType.map((type) => (
                              <Box
                                key={type.type}
                                className="ds-flex ds-items-center ds-justify-between ds-p-4 ds-border ds-rounded-lg"
                              >
                                <HStack spacing="md" className="ds-items-center">
                                  <ColorBadge variant="gray" className="ds-capitalize">
                                    {type.type}
                                  </ColorBadge>
                                  <Typography variant="body1" className="font-medium">
                                    {type.count} clientes
                                  </Typography>
                                </HStack>
                                <Stack spacing="xs" className="ds-text-right">
                                  <Typography variant="body1" className="font-bold">
                                    {formatCurrency(type.totalRevenue)}
                                  </Typography>
                                  <Typography variant="caption" color="muted">
                                    Ingresos totales
                                  </Typography>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </Section>
              </>
            )}

            {/* Local Analytics Fallback */}
            {!backendAnalytics && analytics && (
              <>
                {/* Métricas principales */}
                <Section>
                  <div className="ds-grid ds-grid-cols-1 md:ds-grid-cols-2 lg:ds-grid-cols-4 ds-gap-4">
                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <Users className="ds-h-8 ds-w-8 ds-text-primary" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{analytics.totalCustomers}</Typography>
                            <Typography variant="caption" color="muted">Total Clientes</Typography>
                            <HStack spacing="xs" className="ds-items-center">
                              <TrendingUp className="ds-h-3 ds-w-3 ds-text-success" />
                              <Typography variant="caption" color="success">
                                +{analytics.customerGrowth}% vs período anterior
                              </Typography>
                            </HStack>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>

                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <StatusIndicator status="success" size="md" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{analytics.activeCustomers}</Typography>
                            <Typography variant="caption" color="muted">Clientes Activos</Typography>
                            <Typography variant="caption" color="success">
                              {Math.round((analytics.activeCustomers / analytics.totalCustomers) * 100)}% del total
                            </Typography>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>

                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <DollarSign className="ds-h-8 ds-w-8 ds-text-success" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{formatCurrency(analytics.totalRevenue)}</Typography>
                            <Typography variant="caption" color="muted">Ingresos Totales</Typography>
                            <HStack spacing="xs" className="ds-items-center">
                              <TrendingUp className="ds-h-3 ds-w-3 ds-text-success" />
                              <Typography variant="caption" color="success">
                                +{analytics.revenueGrowth}%
                              </Typography>
                            </HStack>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>

                    <Card className="ds-card">
                      <CardContent className="ds-p-6">
                        <HStack className="ds-items-center ds-space-x-2">
                          <ShoppingCart className="ds-h-8 ds-w-8 ds-text-info" />
                          <Stack spacing="xs">
                            <Typography variant="h3">{formatCurrency(analytics.averageOrderValue)}</Typography>
                            <Typography variant="caption" color="muted">Valor Promedio</Typography>
                          </Stack>
                        </HStack>
                      </CardContent>
                    </Card>
                  </div>
                </Section>

                {/* Tabs for local analytics */}
                <Section>
                  <Tabs defaultValue="overview" className="ds-w-full">
                    <TabsList className="ds-grid ds-w-full ds-grid-cols-3">
                      <TabsTrigger value="overview">Resumen</TabsTrigger>
                      <TabsTrigger value="segments">Segmentación</TabsTrigger>
                      <TabsTrigger value="top-customers">Top Clientes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="ds-space-y-4">
                      <div className="ds-grid ds-grid-cols-1 lg:ds-grid-cols-2 ds-gap-6">
                        {/* Distribución por tipo */}
                        <Card className="ds-card">
                          <CardHeader>
                            <HStack spacing="sm" className="ds-items-center">
                              <PieChart className="ds-h-5 ds-w-5" />
                              <Typography variant="h4">Distribución por Tipo</Typography>
                            </HStack>
                          </CardHeader>
                          <CardContent>
                            <Stack spacing="md">
                              <Stack spacing="xs">
                                <HStack className="ds-justify-between ds-items-center">
                                  <Typography variant="body2">Regular</Typography>
                                  <Typography variant="body2" className="font-medium">
                                    {analytics.customersByType.regular}
                                  </Typography>
                                </HStack>
                                <Progress 
                                  value={(analytics.customersByType.regular / analytics.totalCustomers) * 100} 
                                  className="ds-h-2"
                                />
                              </Stack>
                              
                              <Stack spacing="xs">
                                <HStack className="ds-justify-between ds-items-center">
                                  <Typography variant="body2">VIP</Typography>
                                  <Typography variant="body2" className="font-medium">
                                    {analytics.customersByType.vip}
                                  </Typography>
                                </HStack>
                                <Progress 
                                  value={(analytics.customersByType.vip / analytics.totalCustomers) * 100} 
                                  className="ds-h-2"
                                />
                              </Stack>
                              
                              <Stack spacing="xs">
                                <HStack className="ds-justify-between ds-items-center">
                                  <Typography variant="body2">Mayorista</Typography>
                                  <Typography variant="body2" className="font-medium">
                                    {analytics.customersByType.wholesale}
                                  </Typography>
                                </HStack>
                                <Progress 
                                  value={(analytics.customersByType.wholesale / analytics.totalCustomers) * 100} 
                                  className="ds-h-2"
                                />
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>

                        {/* Tendencias mensuales */}
                        <Card className="ds-card">
                          <CardHeader>
                            <HStack spacing="sm" className="ds-items-center">
                              <BarChart3 className="ds-h-5 ds-w-5" />
                              <Typography variant="h4">Tendencias Mensuales</Typography>
                            </HStack>
                          </CardHeader>
                          <CardContent>
                            <Stack spacing="md">
                              {analytics.monthlyStats.slice(-3).map((stat, index) => (
                                <Box
                                  key={index}
                                  className="ds-flex ds-items-center ds-justify-between ds-p-3 ds-bg-muted/50 ds-rounded-lg"
                                >
                                  <Stack spacing="xs">
                                    <Typography variant="body1" className="font-medium">{stat.month}</Typography>
                                    <Typography variant="caption" color="muted">
                                      {stat.newCustomers} nuevos clientes
                                    </Typography>
                                  </Stack>
                                  <Stack spacing="xs" className="ds-text-right">
                                    <Typography variant="body1" className="font-medium">
                                      {formatCurrency(stat.revenue)}
                                    </Typography>
                                    <Typography variant="caption" color="muted">
                                      {stat.orders} órdenes
                                    </Typography>
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="segments" className="ds-space-y-4">
                      <div className="ds-grid ds-grid-cols-1 md:ds-grid-cols-2 lg:ds-grid-cols-4 ds-gap-4">
                        <Card className="ds-card">
                          <CardContent className="ds-p-6">
                            <HStack spacing="sm" className="ds-items-center ds-mb-3">
                              <Clock className="ds-h-4 ds-w-4 ds-text-info" />
                              <Typography variant="body2" className="font-medium">Nuevos</Typography>
                            </HStack>
                            <Typography variant="h3">{analytics.segmentAnalysis.new}</Typography>
                            <Typography variant="caption" color="muted">Últimos 30 días</Typography>
                          </CardContent>
                        </Card>

                        <Card className="ds-card">
                          <CardContent className="ds-p-6">
                            <HStack spacing="sm" className="ds-items-center ds-mb-3">
                              <Users className="ds-h-4 ds-w-4 ds-text-success" />
                              <Typography variant="body2" className="font-medium">Regulares</Typography>
                            </HStack>
                            <Typography variant="h3">{analytics.segmentAnalysis.regular}</Typography>
                            <Typography variant="caption" color="muted">2-5 compras</Typography>
                          </CardContent>
                        </Card>

                        <Card className="ds-card">
                          <CardContent className="ds-p-6">
                            <HStack spacing="sm" className="ds-items-center ds-mb-3">
                              <ShoppingCart className="ds-h-4 ds-w-4 ds-text-warning" />
                              <Typography variant="body2" className="font-medium">Frecuentes</Typography>
                            </HStack>
                            <Typography variant="h3">{analytics.segmentAnalysis.frequent}</Typography>
                            <Typography variant="caption" color="muted">6-15 compras</Typography>
                          </CardContent>
                        </Card>

                        <Card className="ds-card">
                          <CardContent className="ds-p-6">
                            <HStack spacing="sm" className="ds-items-center ds-mb-3">
                              <Award className="ds-h-4 ds-w-4 ds-text-primary" />
                              <Typography variant="body2" className="font-medium">VIP</Typography>
                            </HStack>
                            <Typography variant="h3">{analytics.segmentAnalysis.vip}</Typography>
                            <Typography variant="caption" color="muted">+15 compras o +$5K</Typography>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="top-customers" className="ds-space-y-4">
                      <Card className="ds-card">
                        <CardHeader>
                          <Typography variant="h4">Top 5 Clientes por Ingresos</Typography>
                          <Typography variant="body2" color="muted">
                            Los clientes que más han gastado en tu negocio
                          </Typography>
                        </CardHeader>
                        <CardContent>
                          <Stack spacing="md">
                            {analytics.topCustomers.map((customer, index) => (
                              <Box
                                key={customer.id}
                                className="ds-flex ds-items-center ds-justify-between ds-p-4 ds-border ds-rounded-lg"
                              >
                                <HStack spacing="md" className="ds-items-center">
                                  <div className="ds-flex ds-items-center ds-justify-center ds-w-8 ds-h-8 ds-bg-primary/10 ds-text-primary ds-rounded-full ds-font-semibold">
                                    {index + 1}
                                  </div>
                                  <Stack spacing="xs">
                                    <Typography variant="body1" className="font-medium">{customer.name}</Typography>
                                    <Typography variant="caption" color="muted">{customer.email}</Typography>
                                  </Stack>
                                </HStack>
                                <Stack spacing="xs" className="ds-text-right">
                                  <Typography variant="body1" className="font-bold">
                                    {formatCurrency(customer.totalSpent || 0)}
                                  </Typography>
                                  <Typography variant="caption" color="muted">
                                    {customer.totalOrders || 0} compras
                                  </Typography>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </Section>
              </>
            )}
          </>
        ) : (
          <Card className="ds-card">
            <CardContent className="ds-p-6">
              <Box className="ds-text-center">
                <Typography variant="body1" color="muted" className="ds-mb-4">
                  No hay datos disponibles
                </Typography>
                <Button onClick={handleRefresh} className="ds-btn ds-btn-primary">
                  Cargar Datos
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </UnifiedStateHandler>
    </Container>
  );
}

export default CustomerAnalytics;