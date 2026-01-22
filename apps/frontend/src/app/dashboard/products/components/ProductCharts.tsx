'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface ChartData {
  salesTrend: Array<{
    month: string;
    sales: number;
    revenue: number;
    products: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    value: number;
    totalValue: number;
    percentage: number;
  }>;
  stockLevels: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    totalValue: number;
    stock_quantity: number;
    sale_price: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

interface ProductChartsProps {
  data: ChartData;
  className?: string;
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
];

export default function ProductCharts({ data, className }: ProductChartsProps) {
  // Custom tooltip formatters
  const formatTooltip = (value: any, name: string) => {
    if (name.includes('revenue') || name.includes('cost') || name.includes('profit') || name.includes('Value')) {
      return [formatCurrency(value), name];
    }
    return [value?.toLocaleString(), name];
  };

  // Prepare data for different charts
  const chartData = useMemo(() => {
    return {
      // Sales trend with moving average
      salesTrendWithMA: data.salesTrend.map((item, index, arr) => {
        const windowSize = 3;
        const start = Math.max(0, index - windowSize + 1);
        const window = arr.slice(start, index + 1);
        const movingAverage = window.reduce((sum, w) => sum + w.sales, 0) / window.length;
        
        return {
          ...item,
          movingAverage: Math.round(movingAverage)
        };
      }),

      // Category distribution with enhanced data
      categoryDistributionEnhanced: data.categoryDistribution.map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length],
        averageValue: item.value > 0 ? item.totalValue / item.value : 0
      })),

      // Stock levels for pie chart
      stockLevelsForPie: data.stockLevels.map((item, index) => ({
        ...item,
        percentage: data.stockLevels.reduce((sum, s) => sum + s.value, 0) > 0 
          ? (item.value / data.stockLevels.reduce((sum, s) => sum + s.value, 0)) * 100 
          : 0
      })),

      // Top products with ranking
      topProductsRanked: data.topProducts.map((product, index) => ({
        ...product,
        rank: index + 1,
        efficiency: product.stock_quantity > 0 ? product.totalValue / product.stock_quantity : 0
      }))
    };
  }, [data]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sales Trend Chart */}
      {data.salesTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Tendencia de Ventas
              <Badge variant="outline">Últimos 12 meses</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData.salesTrendWithMA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={formatTooltip} />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" fill="#8884d8" name="Ventas" />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="movingAverage" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                  name="Promedio Móvil"
                  dot={false}
                />
                <Area 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="revenue" 
                  fill="#82ca9d" 
                  fillOpacity={0.3}
                  stroke="#82ca9d"
                  name="Ingresos"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Distribution Pie Chart */}
        {data.categoryDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.categoryDistributionEnhanced}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.categoryDistributionEnhanced.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Productos']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Stock Levels Chart */}
        {data.stockLevels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Niveles de Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.stockLevelsForPie} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(value) => [value, 'Productos']} />
                  <Bar dataKey="value" fill="#8884d8">
                    {chartData.stockLevelsForPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Products Performance */}
      {data.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento de Top Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData.topProductsRanked}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={formatTooltip}
                  labelFormatter={(label) => `Producto: ${label}`}
                />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="totalValue" 
                  fill="#8884d8" 
                  name="Valor Total"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="stock_quantity" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                  name="Stock"
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Eficiencia (Valor/Stock)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Revenue Analysis */}
      {data.monthlyRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={formatTooltip} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="1"
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                  name="Ingresos"
                />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stackId="2"
                  stroke="#ff7300" 
                  fill="#ff7300" 
                  fillOpacity={0.6}
                  name="Costos"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#82ca9d" 
                  strokeWidth={3}
                  name="Ganancia"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categoría Líder</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryDistribution.length > 0 ? (
              <div>
                <p className="text-2xl font-bold">
                  {data.categoryDistribution[0]?.name || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.categoryDistribution[0]?.value || 0} productos 
                  ({data.categoryDistribution[0]?.percentage.toFixed(1) || 0}%)
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Producto Top</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length > 0 ? (
              <div>
                <p className="text-lg font-bold truncate">
                  {data.topProducts[0]?.name || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.topProducts[0]?.totalValue || 0)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stockLevels.length > 0 ? (
              <div>
                <p className="text-2xl font-bold">
                  {data.stockLevels.find(s => s.name === 'En Stock')?.value || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  productos con stock normal
                </p>
                {(data.stockLevels.find(s => s.name === 'Sin Stock')?.value ?? 0) > 0 && (
                  <Badge variant="destructive" className="mt-1">
                    {(data.stockLevels.find(s => s.name === 'Sin Stock')?.value ?? 0)} sin stock
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
