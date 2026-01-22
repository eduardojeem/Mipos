'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Calendar,
  Target,
  Zap
} from 'lucide-react';

// Interfaces para los datos de los gráficos
export interface CategoryData {
  name: string;
  count: number;
  percentage: number;
  value?: number;
  color?: string;
}

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  products: number;
}

// Componente de Gráfico de Barras para Categorías
interface CategoryBarChartProps {
  data: CategoryData[];
  title?: string;
  description?: string;
  showValues?: boolean;
}

export function CategoryBarChart({ 
  data, 
  title = "Distribución por Categorías", 
  description = "Análisis de productos por categoría",
  showValues = true 
}: CategoryBarChartProps) {
  const maxCount = Math.max(...data.map(item => item.count));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((category, index) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: category.color || `hsl(${index * 45}, 70%, 50%)` 
                    }}
                  />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{category.count}</div>
                  {showValues && (
                    <div className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
              <Progress 
                value={category.percentage} 
                className="h-2"
                style={{
                  '--progress-background': category.color || `hsl(${index * 45}, 70%, 50%)`
                } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Gráfico Circular (Donut)
interface DonutChartProps {
  data: CategoryData[];
  title?: string;
  description?: string;
  centerValue?: string;
  centerLabel?: string;
}

export function DonutChart({ 
  data, 
  title = "Distribución", 
  description = "Vista general de la distribución",
  centerValue,
  centerLabel 
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-purple-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          {/* Simulación visual del donut chart */}
          <div className="relative w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{centerValue || total}</div>
              <div className="text-xs text-muted-foreground">{centerLabel || 'Total'}</div>
            </div>
          </div>
          
          {/* Leyenda */}
          <div className="grid grid-cols-2 gap-2 w-full">
            {data.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || `hsl(${index * 90}, 70%, 50%)` }}
                />
                <span className="text-xs font-medium truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Gráfico de Tendencias
interface TrendChartProps {
  data: TrendData[];
  title?: string;
  description?: string;
  type?: 'line' | 'area';
}

export function TrendChart({ 
  data, 
  title = "Tendencias", 
  description = "Análisis de tendencias temporales",
  type = 'line' 
}: TrendChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simulación visual del gráfico de líneas */}
          <div className="h-32 bg-gradient-to-t from-green-50 to-transparent rounded-lg p-4 relative overflow-hidden">
            <div className="flex items-end justify-between h-full">
              {data.map((point, index) => {
                const height = ((point.value - minValue) / (maxValue - minValue)) * 100;
                return (
                  <div key={point.period} className="flex flex-col items-center gap-1">
                    <div 
                      className="bg-green-500 rounded-t-sm min-w-[8px] transition-all duration-300"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-xs text-muted-foreground rotate-45 origin-bottom-left">
                      {point.period}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Estadísticas de tendencia */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{maxValue}</div>
              <div className="text-xs text-muted-foreground">Máximo</div>
            </div>
            <div>
              <div className="text-lg font-bold">{Math.round(data.reduce((sum, item) => sum + item.value, 0) / data.length)}</div>
              <div className="text-xs text-muted-foreground">Promedio</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{minValue}</div>
              <div className="text-xs text-muted-foreground">Mínimo</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Métricas de Ventas
interface SalesMetricsProps {
  data: SalesData[];
  title?: string;
  description?: string;
}

export function SalesMetrics({ 
  data, 
  title = "Métricas de Ventas", 
  description = "Resumen de rendimiento de ventas" 
}: SalesMetricsProps) {
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgSales = totalSales / data.length;
  const lastPeriod = data[data.length - 1];
  const previousPeriod = data[data.length - 2];
  const growth = previousPeriod ? ((lastPeriod.sales - previousPeriod.sales) / previousPeriod.sales) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Ventas Totales</span>
            </div>
            <div className="text-2xl font-bold">{totalSales}</div>
            <div className="flex items-center gap-1">
              {growth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(growth).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Promedio Diario</span>
            </div>
            <div className="text-2xl font-bold">{Math.round(avgSales)}</div>
            <Badge variant={avgSales > 50 ? "default" : "secondary"}>
              {avgSales > 50 ? "Excelente" : "Regular"}
            </Badge>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Progreso del período</div>
          <Progress value={Math.min((totalSales / (avgSales * data.length * 1.2)) * 100, 100)} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Dashboard de Gráficos Combinado
interface ChartDashboardProps {
  categoryData: CategoryData[];
  trendData: TrendData[];
  salesData: SalesData[];
}

export function ChartDashboard({ categoryData, trendData, salesData }: ChartDashboardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <CategoryBarChart data={categoryData} />
      <DonutChart 
        data={categoryData} 
        title="Vista Circular"
        description="Distribución visual por categorías"
      />
      <TrendChart data={trendData} />
      <div className="md:col-span-2 lg:col-span-1">
        <SalesMetrics data={salesData} />
      </div>
    </div>
  );
}