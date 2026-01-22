'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false });
const LineChart = lazyRecharts('LineChart');
const Line = lazyRecharts('Line');
const AreaChart = lazyRecharts('AreaChart');
const Area = lazyRecharts('Area');
const Bar = lazyRecharts('Bar');
const PieChart = lazyRecharts('PieChart');
const Pie = lazyRecharts('Pie');
const Cell = lazyRecharts('Cell');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const CartesianGrid = lazyRecharts('CartesianGrid');
const Tooltip = lazyRecharts('Tooltip');
const Legend = lazyRecharts('Legend');
const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const ComposedChart = lazyRecharts('ComposedChart');
const RadialBarChart = lazyRecharts('RadialBarChart');
const RadialBar = lazyRecharts('RadialBar');
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Clock,
  Target,
  Zap,
  Star,
  Award,
  Filter,
  Download,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Settings,
  Info,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { supabaseRealtimeService } from '@/lib/supabase-realtime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  orders: number;
  customers: number;
  hour?: number;
  day?: string;
  month?: string;
  year?: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  growth: number;
  items: number;
}

interface ProductPerformance {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  profit: number;
  margin: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  stock: number;
}

interface ChartMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  growthRate: number;
  topCategory: string;
  peakHour: number;
  customerRetention: number;
}

interface RealtimeChartsProps {
  className?: string;
}

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y';
type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'composed';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const TIME_RANGES = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' }
];

// Componente de tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.dataKey}:</span>
            <span className="font-medium">
              {entry.dataKey.includes('revenue') || entry.dataKey.includes('sales') 
                ? `$${entry.value.toLocaleString()}` 
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Componente de métricas rápidas mejorado
const QuickMetrics = ({ metrics }: { metrics: ChartMetrics }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 }}
      className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 p-5 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        {metrics.growthRate !== 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
            metrics.growthRate > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {metrics.growthRate > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(metrics.growthRate).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Ingresos Totales</p>
      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${metrics.totalRevenue.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-1">En el período seleccionado</p>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 p-5 rounded-2xl border border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
          <ShoppingCart className="h-6 w-6 text-white" />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Órdenes</p>
      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.totalOrders.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-1">Transacciones completadas</p>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 p-5 rounded-2xl border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <Target className="h-6 w-6 text-white" />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Ticket Promedio</p>
      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">${metrics.averageOrderValue.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground mt-1">Valor por transacción</p>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 p-5 rounded-2xl border border-orange-200/50 dark:border-orange-800/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tasa Conversión</p>
      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metrics.conversionRate.toFixed(1)}%</p>
      <p className="text-xs text-muted-foreground mt-1">Efectividad de ventas</p>
    </motion.div>
  </div>
)

export function RealtimeCharts({ className }: RealtimeChartsProps) {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [productData, setProductData] = useState<ProductPerformance[]>([]);
  const [metrics, setMetrics] = useState<ChartMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    growthRate: 0,
    topCategory: '',
    peakHour: 0,
    customerRetention: 0
  });
  
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['dashboard', 'summary', timeRange], [timeRange]);
  const { data: summaryData, isLoading: queryLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary', { params: { range: timeRange } });
      return data?.data || data;
    },
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
    enabled: true,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  const loading = queryLoading;
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pollRef = React.useRef<any>(null)

  useEffect(() => {
    if (summaryData) {
      generateFromSummary(summaryData)
      setLastUpdate(new Date())
    }
  }, [summaryData])

  // El auto-refresh lo maneja React Query mediante refetchInterval

  // Función para generar datos de ejemplo mejorados
  const generateFromSummary = (payload: any) => {
    const daily = Array.isArray(payload?.daily) ? payload.daily : []
    const categories = Array.isArray(payload?.categories) ? payload.categories : []
    const totals = payload?.totals || { orders: 0, revenue: 0 }

    const sales: SalesData[] = daily.map((d: any) => ({
      date: typeof d.day === 'string' ? d.day : new Date(d.day).toISOString(),
      sales: Number(d.orders || 0),
      revenue: Number(d.revenue || 0),
      orders: Number(d.orders || 0),
      customers: 0
    }))

    const cat: CategoryData[] = categories.map((c: any, i: number) => {
      const value = Number(c.value || 0)
      const totalCat = categories.reduce((acc: number, x: any) => acc + Number(x.value || 0), 0)
      const percentage = totalCat > 0 ? Math.round((value / totalCat) * 100) : 0
      return {
        name: String(c.name || ''),
        value,
        color: COLORS[i % COLORS.length],
        percentage,
        growth: 0,
        items: 0
      }
    })

    const avgOrder = totals.orders > 0 ? totals.revenue / totals.orders : 0
    const m: ChartMetrics = {
      totalRevenue: Number(totals.revenue || 0),
      totalOrders: Number(totals.orders || 0),
      averageOrderValue: avgOrder,
      conversionRate: 0,
      growthRate: 0,
      topCategory: cat[0]?.name || '',
      peakHour: 0,
      customerRetention: 0
    }

    setSalesData(sales)
    setCategoryData(cat)
    setMetrics(m)
  }

  const fetchChartData = async () => { await refetch() }
  useEffect(() => {
    let refreshTimer: any = null
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey })
      }, 500)
    }

    const unsubscribeConn = supabaseRealtimeService.onConnectionChange((status) => {
      if (status === 'DISCONNECTED') {
        if (!(pollRef.current)) {
          pollRef.current = setInterval(() => {
            queryClient.invalidateQueries({ queryKey })
          }, 30000)
        }
      } else {
        if (pollRef.current) {
          clearInterval(pollRef.current as any)
          pollRef.current = null
        }
      }
    })

    const unsubSales = supabaseRealtimeService.subscribeToSalesGlobal(() => {
      scheduleRefresh()
    })
    const unsubInv = supabaseRealtimeService.subscribeToInventoryMovementsGlobal(() => {
      scheduleRefresh()
    })

    return () => {
      try { unsubscribeConn() } catch {}
      try { (unsubSales as any).then((fn: any) => fn()).catch(() => {}) } catch {}
      try { (unsubInv as any).then((fn: any) => fn()).catch(() => {}) } catch {}
      if (refreshTimer) clearTimeout(refreshTimer)
      if (pollRef.current) {
        clearInterval(pollRef.current as any)
        pollRef.current = null
      }
    }
  }, [timeRange])

  const handleRefresh = () => { refetch() }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "space-y-6",
        isFullscreen && "fixed inset-0 z-50 bg-background dark:bg-slate-950 p-6 overflow-auto"
      )}
    >
      {/* Métricas rápidas */}
      <QuickMetrics metrics={metrics} />

      {/* Controles principales */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Análisis en Tiempo Real</h2>
          <p className="text-muted-foreground dark:text-slate-400">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && "bg-green-50 text-green-700 border-green-200")}
          >
            {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Gráficos principales */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit dark:bg-slate-900/50 dark:border dark:border-slate-800">
          <TabsTrigger value="sales" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">
            <BarChart3 className="h-4 w-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">
            <PieChartIcon className="h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Tendencias */}
            <Card className="lg:col-span-2 border-border/50 dark:border-slate-800/50 shadow-sm dark:shadow-slate-900/50 bg-gradient-to-br from-card to-card/80 dark:from-slate-900/90 dark:to-slate-900/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg dark:text-slate-100">
                      <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Tendencias de Ventas e Ingresos
                    </CardTitle>
                    <CardDescription className="mt-1 dark:text-slate-400">
                      Evolución de ventas y revenue en el período seleccionado
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChartType(chartType === 'area' ? 'line' : 'area')}
                    >
                      {chartType === 'area' ? 'Línea' : 'Área'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {chartType === 'area' ? (
                      <AreaChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value: string | number) =>
                            new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                          }
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10B981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#revenueGradient)"
                          name="Ingresos ($)"
                        />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#salesGradient)"
                          name="Órdenes"
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value: string | number) =>
                            new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                          }
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10B981"
                          strokeWidth={3}
                          dot={{ fill: '#10B981', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Ingresos ($)"
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Órdenes"
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No hay datos disponibles para el período seleccionado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estadísticas Adicionales */}
            <Card className="border-border/50 dark:border-slate-800/50 shadow-sm dark:shadow-slate-900/50 bg-gradient-to-br from-card to-card/80 dark:from-slate-900/90 dark:to-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-slate-100">
                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Estadísticas Clave
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Métricas de rendimiento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200/30 dark:border-blue-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hora Pico</p>
                        <p className="text-lg font-bold">{metrics.peakHour}:00</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50/50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/20 border border-green-200/30 dark:border-green-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Retención</p>
                        <p className="text-lg font-bold">{metrics.customerRetention.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200/30 dark:border-purple-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Categoría Top</p>
                        <p className="text-sm font-bold truncate">{metrics.topCategory || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparación de Períodos */}
            <Card className="border-border/50 dark:border-slate-800/50 shadow-sm dark:shadow-slate-900/50 bg-gradient-to-br from-card to-card/80 dark:from-slate-900/90 dark:to-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-slate-100">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Crecimiento
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Comparación con período anterior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Tasa de Crecimiento</span>
                      <span className={cn(
                        "text-lg font-bold flex items-center gap-1",
                        metrics.growthRate > 0 ? "text-green-600" : metrics.growthRate < 0 ? "text-red-600" : "text-gray-600"
                      )}>
                        {metrics.growthRate > 0 ? <ArrowUp className="h-4 w-4" /> : metrics.growthRate < 0 ? <ArrowDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        {Math.abs(metrics.growthRate).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(Math.abs(metrics.growthRate), 100)} 
                      className={cn(
                        "h-3",
                        metrics.growthRate > 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                        <p className="text-xl font-bold text-green-600">${metrics.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Órdenes</p>
                        <p className="text-xl font-bold text-blue-600">{metrics.totalOrders}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Dona */}
            <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChartIcon className="h-5 w-5 text-purple-600" />
                  Distribución por Categorías
                </CardTitle>
                <CardDescription>
                  Participación de cada categoría en las ventas totales
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={130}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percentage }: any) => `${name}: ${percentage}%`}
                        labelLine={{ stroke: 'currentColor', strokeWidth: 1 }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <PieChartIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No hay datos de categorías disponibles</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Lista de Categorías */}
            <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
              <CardHeader>
                <CardTitle className="text-lg">Rendimiento por Categoría</CardTitle>
                <CardDescription>
                  Métricas detalladas y tendencias de cada categoría
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryData.length > 0 ? (
                  categoryData.map((category, index) => (
                    <motion.div
                      key={category.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all border border-border/30 hover:border-border/50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-10 h-10 rounded-xl shadow-md flex items-center justify-center" 
                          style={{ backgroundColor: category.color }}
                        >
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{category.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ${category.value.toLocaleString()} • {category.items} productos
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="font-bold text-lg">{category.percentage}%</div>
                        <div className={cn(
                          "text-xs flex items-center justify-end gap-1 font-medium",
                          category.growth > 0 ? "text-green-600 dark:text-green-400" : category.growth < 0 ? "text-red-600 dark:text-red-400" : "text-gray-600"
                        )}>
                          {category.growth > 0 ? <ArrowUp className="h-3 w-3" /> : category.growth < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {Math.abs(category.growth).toFixed(1)}%
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No hay categorías para mostrar</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras Comparativo */}
            <Card className="lg:col-span-2 border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Comparación de Categorías
                </CardTitle>
                <CardDescription>
                  Análisis comparativo de ventas por categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Ventas ($)"
                        radius={[8, 8, 0, 0]}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        name="Participación (%)"
                        dot={{ fill: '#8B5CF6', r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No hay datos para comparar</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top 3 Productos Destacados */}
            {productData.slice(0, 3).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "border-2 shadow-lg bg-gradient-to-br overflow-hidden relative",
                  index === 0 && "from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30 border-yellow-300 dark:border-yellow-700",
                  index === 1 && "from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/30 border-gray-300 dark:border-gray-700",
                  index === 2 && "from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-300 dark:border-orange-700"
                )}>
                  <div className="absolute top-4 right-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg",
                      index === 0 && "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900",
                      index === 1 && "bg-gradient-to-br from-gray-400 to-gray-500 text-gray-900",
                      index === 2 && "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900"
                    )}>
                      #{index + 1}
                    </div>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="text-lg pr-16 truncate">{product.name}</CardTitle>
                    <CardDescription>{product.category}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                        <p className="text-xl font-bold text-green-600">${product.revenue.toLocaleString()}</p>
                      </div>
                      <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Ventas</p>
                        <p className="text-xl font-bold text-blue-600">{product.sales}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Margen:</span>
                        <span className="font-bold">{product.margin.toFixed(1)}%</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                        product.trend === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        product.trend === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        product.trend === 'stable' && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                      )}>
                        {product.trend === 'up' && <ArrowUp className="h-3 w-3" />}
                        {product.trend === 'down' && <ArrowDown className="h-3 w-3" />}
                        {product.trend === 'stable' && <Minus className="h-3 w-3" />}
                        {product.trend === 'up' ? 'Subiendo' : product.trend === 'down' ? 'Bajando' : 'Estable'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Lista Completa de Productos */}
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5 text-amber-600" />
                    Ranking Completo de Productos
                  </CardTitle>
                  <CardDescription>
                    Todos los productos ordenados por rendimiento
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {productData.length} productos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {productData.length > 0 ? (
                  productData.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all border border-border/30 hover:border-border/50 group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold shadow-md",
                          index === 0 && "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900",
                          index === 1 && "bg-gradient-to-br from-gray-400 to-gray-500 text-gray-900",
                          index === 2 && "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900",
                          index > 2 && "bg-gradient-to-br from-blue-400 to-blue-500 text-blue-900"
                        )}>
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{product.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            {product.category} • Stock: {product.stock}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600 dark:text-green-400">
                            ${product.revenue.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">{product.sales} ventas</div>
                        </div>
                        
                        <div className="text-right min-w-[60px]">
                          <div className="text-sm font-medium text-muted-foreground">Margen</div>
                          <div className="font-bold">{product.margin.toFixed(1)}%</div>
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold min-w-[80px] justify-center",
                          product.trend === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          product.trend === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          product.trend === 'stable' && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                        )}>
                          {product.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                          {product.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                          {product.trend === 'stable' && <Minus className="h-3 w-3" />}
                          {product.trend === 'up' ? 'Subiendo' : product.trend === 'down' ? 'Bajando' : 'Estable'}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No hay datos de productos disponibles</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
