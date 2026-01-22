'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

interface ChartData {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface TrendData {
  date: string;
  sales: number;
  stock: number;
  revenue: number;
}

interface CategoryData {
  name: string;
  products: number;
  revenue: number;
  growth: number;
  color: string;
}

interface ProductChartsData {
  salesTrend: TrendData[];
  categoryDistribution: CategoryData[];
  stockLevels: ChartData[];
  topProducts: ChartData[];
  monthlyRevenue: TrendData[];
}

interface SimpleBarChartProps {
  data: ChartData[];
  title: string;
  height?: number;
  showValues?: boolean;
}

function getTokenColor(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

function SimpleBarChart({ data, title, height = 200, showValues = true }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const from = getTokenColor('--chart-1', '#667eea');
  const to = getTokenColor('--chart-2', '#764ba2');
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="space-y-3" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-20 text-xs text-right text-muted-foreground truncate">
              {item.label}
            </div>
            <div className="flex-1 relative">
              <div className="w-full bg-muted rounded-full h-6">
                <div
                  className="h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(item.value / maxValue) * 100}%`, backgroundImage: `linear-gradient(to right, ${from}, ${to})` }}
                >
                  {showValues && (
                    <span className="text-xs text-white font-medium">
                      {typeof item.value === 'number' && item.value > 1000 
                        ? formatCurrency(item.value)
                        : item.value.toLocaleString()
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SimplePieChartProps {
  data: CategoryData[];
  title: string;
}

function SimplePieChart({ data, title }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.products, 0);
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = (item.products / total) * 100;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{item.products}</div>
                <div className="text-xs text-muted-foreground">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: TrendData[];
  title: string;
  dataKey: keyof TrendData;
  color?: string;
}

function SimpleLineChart({ data, title, dataKey, color = '#3b82f6' }: LineChartProps) {
  const values = data.map(d => d[dataKey] as number);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue;
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="relative h-32 bg-card rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 400 100">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="400"
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          ))}
          
          {/* Line path */}
          <path
            d={`M ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 400;
              const y = 100 - (((d[dataKey] as number) - minValue) / range) * 100;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Area fill */}
          <path
            d={`M ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 400;
              const y = 100 - (((d[dataKey] as number) - minValue) / range) * 100;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L 400 100 L 0 100 Z`}
            fill={`url(#gradient-${dataKey})`}
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 400;
            const y = 100 - (((d[dataKey] as number) - minValue) / range) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

interface ProductChartsProps {
  data: ProductChartsData;
  isLoading?: boolean;
  className?: string;
}

export default function ProductCharts({ data, isLoading = false, className = '' }: ProductChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('trends');

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
              <SelectItem value="1y">1 año</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Último mes</span>
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Charts Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <span>Tendencia de Ventas</span>
                </CardTitle>
                <CardDescription>
                  Evolución de las ventas en los últimos {selectedPeriod}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart
                  data={data.salesTrend}
                  title="Ventas por día"
                  dataKey="sales"
                  color={getTokenColor('--chart-1', '#3b82f6')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  <span>Ingresos Mensuales</span>
                </CardTitle>
                <CardDescription>
                  Ingresos generados por ventas de productos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart
                  data={data.monthlyRevenue}
                  title="Ingresos por mes"
                  dataKey="revenue"
                  color={getTokenColor('--chart-2', '#10b981')}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-purple-500" />
                <span>Productos Más Vendidos</span>
              </CardTitle>
              <CardDescription>
                Top 10 productos por cantidad vendida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={data.topProducts}
                title="Unidades vendidas"
                showValues={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-orange-500" />
                  <span>Distribución por Categorías</span>
                </CardTitle>
                <CardDescription>
                  Número de productos por categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimplePieChart
                  data={data.categoryDistribution}
                  title="Productos por categoría"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Categoría</CardTitle>
                <CardDescription>
                  Ingresos y crecimiento por categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.categoryDistribution.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.products} productos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(category.revenue)}</p>
                        <div className={`text-sm flex items-center ${
                          category.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {category.growth >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(category.growth)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <span>Niveles de Stock</span>
              </CardTitle>
              <CardDescription>
                Distribución actual del inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={data.stockLevels}
                title="Productos por nivel de stock"
                showValues={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Hook para obtener datos de gráficos
export function useProductCharts() {
  const [data, setData] = React.useState<ProductChartsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchChartData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Importar Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Obtener datos reales del backend
      const [
        productsResult,
        categoriesResult,
        salesResult
      ] = await Promise.allSettled([
        supabase
          .from('products')
          .select('id, name, stock_quantity, min_stock, sale_price, category_id, categories(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name, products(id, sale_price)')
          .order('name'),
        supabase
          .from('sales')
          .select('id, total, created_at, sale_items(quantity, product_id, products(name))')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
      ]);

      const products = productsResult.status === 'fulfilled' ? productsResult.value.data || [] : [];
      const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value.data || [] : [];
      const sales = salesResult.status === 'fulfilled' ? salesResult.value.data || [] : [];

      // Procesar datos para gráficos
      const processedData: ProductChartsData = {
        salesTrend: generateSalesTrend(sales),
        categoryDistribution: generateCategoryDistribution(categories, products),
        stockLevels: generateStockLevels(products),
        topProducts: generateTopProducts(sales),
        monthlyRevenue: generateMonthlyRevenue(sales)
      };
      
      setData(processedData);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos de gráficos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return { data, isLoading, error, refetch: fetchChartData };
}

// Funciones auxiliares para procesar datos
function generateSalesTrend(sales: any[]): TrendData[] {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  return last7Days.map(date => {
    const daySales = sales.filter(sale => 
      sale.created_at.startsWith(date)
    );
    
    return {
      date,
      sales: daySales.length,
      stock: 0, // Se puede calcular si se necesita
      revenue: daySales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    };
  });
}

function generateCategoryDistribution(categories: any[], products: any[]): CategoryData[] {
  const palette = [
    getTokenColor('--chart-1', '#3b82f6'),
    getTokenColor('--chart-2', '#10b981'),
    getTokenColor('--chart-3', '#f59e0b'),
    getTokenColor('--chart-4', '#8b5cf6'),
    getTokenColor('--chart-5', '#ef4444')
  ];
  
  return categories.map((category, index) => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    const revenue = categoryProducts.reduce((sum, p) => sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0);
    
    return {
      name: category.name,
      products: categoryProducts.length,
      revenue,
      growth: Math.random() * 20 - 5, // Placeholder - se puede calcular con datos históricos
      color: palette[index % palette.length]
    };
  });
}

function generateStockLevels(products: any[]): ChartData[] {
  const stockHigh = products.filter(p => (p.stock_quantity || 0) > (p.min_stock || 0) * 2).length;
  const stockNormal = products.filter(p => {
    const stock = p.stock_quantity || 0;
    const minStock = p.min_stock || 0;
    return stock > minStock && stock <= minStock * 2;
  }).length;
  const stockLow = products.filter(p => {
    const stock = p.stock_quantity || 0;
    const minStock = p.min_stock || 0;
    return stock > 0 && stock <= minStock;
  }).length;
  const stockOut = products.filter(p => (p.stock_quantity || 0) === 0).length;

  return [
    { label: 'Stock Alto', value: stockHigh },
    { label: 'Stock Normal', value: stockNormal },
    { label: 'Stock Bajo', value: stockLow },
    { label: 'Sin Stock', value: stockOut }
  ];
}

function generateTopProducts(sales: any[]): ChartData[] {
  const productSales: { [key: string]: number } = {};
  
  sales.forEach(sale => {
    if (sale.sale_items) {
      sale.sale_items.forEach((item: any) => {
        const productName = item.products?.name || 'Producto desconocido';
        productSales[productName] = (productSales[productName] || 0) + (item.quantity || 0);
      });
    }
  });

  return Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
}

function generateMonthlyRevenue(sales: any[]): TrendData[] {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  const currentMonth = new Date().getMonth();
  
  return months.slice(0, currentMonth + 1).map((month, index) => {
    const monthSales = sales.filter(sale => {
      const saleMonth = new Date(sale.created_at).getMonth();
      return saleMonth === index;
    });
    
    return {
      date: month,
      sales: 0,
      stock: 0,
      revenue: monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    };
  });
}
