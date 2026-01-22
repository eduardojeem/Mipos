'use client';

import { useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { Sale } from '@/types';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface SalesChartsProps {
  sales: Sale[];
  isFetching?: boolean;
  onRefresh?: () => void;
}

interface ChartData {
  date: string;
  sales: number;
  amount: number;
  count: number;
}

interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

function SalesChartsComponent({ sales, isFetching, onRefresh }: SalesChartsProps) {
  // Procesar datos para gráficos de tendencias (últimos 7 días)
  const salesTrendData = useMemo<ChartData[]>(() => {
    // Validar que sales sea un array
    if (!sales || !Array.isArray(sales)) {
      return [];
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const daySales = sales.filter(sale => 
        sale.created_at.split('T')[0] === date
      );
      
      return {
        date,
        sales: daySales.length,
        amount: daySales.reduce((sum, sale) => sum + sale.total_amount, 0),
        count: daySales.length
      };
    });
  }, [sales]);

  // Datos por método de pago
  const paymentMethodData = useMemo<CategoryData[]>(() => {
    // Validar que sales sea un array
    if (!sales || !Array.isArray(sales)) {
      return [];
    }

    const methods = ['CASH', 'CARD', 'TRANSFER'];
    const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    
    return methods.map(method => {
      const methodSales = sales.filter(sale => sale.payment_method === method);
      const amount = methodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      
      return {
        category: method === 'CASH' ? 'Efectivo' : method === 'CARD' ? 'Tarjeta' : 'Transferencia',
        amount,
        count: methodSales.length,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      };
    });
  }, [sales]);

  // Calcular crecimiento vs período anterior
  const growthData = useMemo(() => {
    // Validar que sales sea un array
    if (!sales || !Array.isArray(sales)) {
      return {
        current: 0,
        previous: 0,
        growth: 0,
        isPositive: true
      };
    }

    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentPeriodSales = sales.filter(sale => 
      new Date(sale.created_at) >= last7Days
    );
    const previousPeriodSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= previous7Days && saleDate < last7Days;
    });

    const currentAmount = currentPeriodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const previousAmount = previousPeriodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    
    const growth = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;

    return {
      current: currentAmount,
      previous: previousAmount,
      growth,
      isPositive: growth >= 0
    };
  }, [sales]);

  const maxAmount = Math.max(...salesTrendData.map(d => d.amount));
  const maxSales = Math.max(...salesTrendData.map(d => d.sales));

  return (
    <TooltipProvider>
    <div className="space-y-6 [content-visibility:auto] [contain-intrinsic-size:240px]">
      {/* Métricas de crecimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Semanal</CardTitle>
            {growthData.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {growthData.isPositive ? '+' : ''}{growthData.growth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. semana anterior
            </p>
            <div className="text-sm text-muted-foreground mt-1">
              <CurrencyDisplay value={growthData.current} /> vs <CurrencyDisplay value={growthData.previous} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Día</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(() => {
              const bestDay = salesTrendData.reduce((best, current) => 
                current.amount > best.amount ? current : best
              );
              return (
                <>
                  <div className="text-2xl font-bold">
                    <CurrencyDisplay value={bestDay.amount} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(bestDay.date)}
                  </p>
                  <div className="text-sm text-muted-foreground mt-1">
                    {bestDay.sales} ventas
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Método Preferido</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(() => {
              const topMethod = paymentMethodData.reduce((top, current) => 
                current.amount > top.amount ? current : top
              );
              return (
                <>
                  <div className="text-2xl font-bold">
                    {topMethod.category}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {topMethod.percentage.toFixed(1)}% del total
                  </p>
                  <div className="text-sm text-muted-foreground mt-1">
                    <CurrencyDisplay value={topMethod.amount} />
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de tendencias de ventas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendencia de Ventas (Últimos 7 días)
            </CardTitle>
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
          <CardDescription>
            Evolución diaria de ventas e ingresos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesTrendData.map((data, index) => (
              <div key={data.date} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">
                    {formatDate(data.date)}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {data.sales} ventas
                    </span>
                    <span className="font-semibold">
                      <CurrencyDisplay value={data.amount} />
                    </span>
                  </div>
                </div>
                
                {/* Barra de progreso para ventas */}
                <Tooltip>
                <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ingresos</span>
                    <span>{((data.amount / maxAmount) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(data.amount / maxAmount) * 100}%` }}
                    />
                  </div>
                </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div>{formatDate(data.date)}</div>
                    <div>Ingresos: <CurrencyDisplay value={data.amount} /></div>
                    <div>Ventas: {data.sales}</div>
                  </div>
                </TooltipContent>
                </Tooltip>

                {/* Barra de progreso para cantidad de ventas */}
                <Tooltip>
                <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cantidad</span>
                    <span>{((data.sales / maxSales) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(data.sales / maxSales) * 100}%` }}
                    />
                  </div>
                </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div>{formatDate(data.date)}</div>
                    <div>Ventas: {data.sales}</div>
                  </div>
                </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribución por método de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Distribución por Método de Pago
          </CardTitle>
          <CardDescription>
            Análisis de preferencias de pago de los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethodData.map((method, index) => (
              <div key={method.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: index === 0 ? '#3b82f6' : 
                                       index === 1 ? '#10b981' : '#f59e0b' 
                      }}
                    />
                    <span className="font-medium">{method.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      <CurrencyDisplay value={method.amount} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {method.count} ventas
                    </div>
                  </div>
                </div>
                
                <Tooltip>
                <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${method.percentage}%`,
                        backgroundColor: index === 0 ? '#3b82f6' : 
                                       index === 1 ? '#10b981' : '#f59e0b'
                      }}
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {method.percentage.toFixed(1)}%
                  </Badge>
                </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div>{method.category}</div>
                    <div>Monto: <CurrencyDisplay value={method.amount} /></div>
                    <div>Ventas: {method.count}</div>
                    <div>Porcentaje: {method.percentage.toFixed(1)}%</div>
                  </div>
                </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

export default memo(SalesChartsComponent);