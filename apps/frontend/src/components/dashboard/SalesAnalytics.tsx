'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Users, 
  ShoppingCart,
  DollarSign,
  Calendar,
  Award,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Sale } from '@/types';

interface SalesAnalyticsProps {
  sales: Sale[];
  isFetching?: boolean;
  onRefresh?: () => void;
}

interface AnalyticsData {
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
  conversionRate: number;
  topSellingHour: number;
  peakDay: string;
  monthlyGrowth: number;
  customerRetention: number;
  salesGoal: number;
  goalProgress: number;
}

interface TimeAnalysis {
  hour: number;
  sales: number;
  revenue: number;
}

interface DayAnalysis {
  day: string;
  sales: number;
  revenue: number;
}

export default function SalesAnalytics({ sales, isFetching, onRefresh }: SalesAnalyticsProps) {
  // Análisis por horas del día
  const hourlyAnalysis = useMemo<TimeAnalysis[]>(() => {
    const hourlyData: { [key: number]: { sales: number; revenue: number } } = {};
    
    // Inicializar todas las horas
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { sales: 0, revenue: 0 };
    }
    
    sales.forEach(sale => {
      const hour = new Date(sale.created_at).getHours();
      hourlyData[hour].sales += 1;
      hourlyData[hour].revenue += sale.total_amount;
    });
    
    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      sales: data.sales,
      revenue: data.revenue
    }));
  }, [sales]);

  // Análisis por días de la semana
  const weeklyAnalysis = useMemo<DayAnalysis[]>(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const weeklyData: { [key: string]: { sales: number; revenue: number } } = {};
    
    days.forEach(day => {
      weeklyData[day] = { sales: 0, revenue: 0 };
    });
    
    sales.forEach(sale => {
      const dayIndex = new Date(sale.created_at).getDay();
      const dayName = days[dayIndex];
      weeklyData[dayName].sales += 1;
      weeklyData[dayName].revenue += sale.total_amount;
    });
    
    return days.map(day => ({
      day,
      sales: weeklyData[day].sales,
      revenue: weeklyData[day].revenue
    }));
  }, [sales]);

  // Métricas principales
  const analytics = useMemo<AnalyticsData>(() => {
    // Validar que sales sea un array
    if (!sales || !Array.isArray(sales)) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        averageTicket: 0,
        conversionRate: 0,
        topSellingHour: 0,
        peakDay: 'Lunes',
        monthlyGrowth: 0,
        goalProgress: 0,
        customerRetention: 0,
        salesGoal: 100000
      };
    }

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalSales = sales.length;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Hora pico de ventas
    const topHour = hourlyAnalysis.reduce((max, current) => 
      current.sales > max.sales ? current : max
    );
    
    // Día pico de ventas
    const topDay = weeklyAnalysis.reduce((max, current) => 
      current.sales > max.sales ? current : max
    );
    
    // Crecimiento mensual (comparar últimos 30 días vs 30 días anteriores)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const currentPeriodSales = sales.filter(sale => 
      new Date(sale.created_at) >= last30Days
    );
    const previousPeriodSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= previous30Days && saleDate < last30Days;
    });
    
    const currentRevenue = currentPeriodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const previousRevenue = previousPeriodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    
    const monthlyGrowth = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    // Meta de ventas (ejemplo: 100,000 por mes)
    const salesGoal = 100000;
    const goalProgress = (currentRevenue / salesGoal) * 100;
    
    // Clientes únicos (simulado)
    const uniqueCustomers = new Set(sales.map(sale => sale.customer_id).filter(Boolean)).size;
    const customerRetention = uniqueCustomers > 0 ? (uniqueCustomers / totalSales) * 100 : 0;
    
    return {
      totalRevenue,
      totalSales,
      averageTicket,
      conversionRate: 85, // Simulado
      topSellingHour: topHour.hour,
      peakDay: topDay.day,
      monthlyGrowth,
      customerRetention,
      salesGoal,
      goalProgress: Math.min(goalProgress, 100)
    };
  }, [sales, hourlyAnalysis, weeklyAnalysis]);

  const maxHourlySales = Math.max(...hourlyAnalysis.map(h => h.sales));
  const maxWeeklySales = Math.max(...weeklyAnalysis.map(d => d.sales));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Analítica de Ventas</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={!!isFetching}
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted"
            title={isFetching ? 'Actualizando...' : 'Actualizar'}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Actualizando' : 'Actualizar'}
          </button>
        )}
      </div>
      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Mensual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.goalProgress.toFixed(1)}%
            </div>
            <Progress value={analytics.goalProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatCurrency(analytics.totalRevenue)} / {formatCurrency(analytics.salesGoal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            {analytics.monthlyGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analytics.monthlyGrowth >= 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.averageTicket)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por transacción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.conversionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Visitantes a clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análisis Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Análisis por Horas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ventas por Hora del Día
            </CardTitle>
            <CardDescription>
              Identifica las horas pico de actividad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hourlyAnalysis
                .filter(hour => hour.sales > 0)
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 8)
                .map((hour) => (
                <div key={hour.hour} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={hour.hour === analytics.topSellingHour ? "default" : "secondary"}>
                      {hour.hour.toString().padStart(2, '0')}:00
                    </Badge>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(hour.sales / maxHourlySales) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{hour.sales}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(hour.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Award className="h-4 w-4" />
                <span className="font-medium">Hora Pico</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                {analytics.topSellingHour.toString().padStart(2, '0')}:00 - Mayor actividad de ventas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Análisis por Días de la Semana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ventas por Día de la Semana
            </CardTitle>
            <CardDescription>
              Patrones de comportamiento semanal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyAnalysis
                .sort((a, b) => b.sales - a.sales)
                .map((day) => (
                <div key={day.day} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={day.day === analytics.peakDay ? "default" : "secondary"}>
                      {day.day.slice(0, 3)}
                    </Badge>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(day.sales / maxWeeklySales) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{day.sales}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <Award className="h-4 w-4" />
                <span className="font-medium">Mejor Día</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                {analytics.peakDay} - Día con más ventas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Insights y Recomendaciones
          </CardTitle>
          <CardDescription>
            Análisis automático y sugerencias de mejora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recomendación de horarios */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-700">Optimización de Horarios</span>
              </div>
              <p className="text-sm text-gray-600">
                Tu hora pico es a las {analytics.topSellingHour.toString().padStart(2, '0')}:00. 
                Considera tener más personal disponible durante este período.
              </p>
            </div>

            {/* Meta de ventas */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">Meta Mensual</span>
              </div>
              <p className="text-sm text-gray-600">
                {analytics.goalProgress >= 100 ? 
                  '¡Felicidades! Has superado tu meta mensual.' :
                  `Necesitas ${formatCurrency(analytics.salesGoal - analytics.totalRevenue)} más para alcanzar tu meta.`
                }
              </p>
            </div>

            {/* Crecimiento */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {analytics.monthlyGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`font-medium ${
                  analytics.monthlyGrowth >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  Tendencia de Crecimiento
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {analytics.monthlyGrowth >= 0 ? 
                  `Excelente crecimiento del ${analytics.monthlyGrowth.toFixed(1)}% este mes.` :
                  `Hay una disminución del ${Math.abs(analytics.monthlyGrowth).toFixed(1)}%. Revisa las estrategias de ventas.`
                }
              </p>
            </div>

            {/* Día pico */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-700">Día Más Productivo</span>
              </div>
              <p className="text-sm text-gray-600">
                Los {analytics.peakDay}s son tus mejores días. 
                Planifica promociones especiales para maximizar las ventas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}