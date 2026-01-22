'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Lightbulb
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  Legend
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductPerformance, ProductPerformanceData, Suggestion } from '@/hooks/useProductPerformance';
import { formatCurrency } from '@/lib/utils';

// Props interface - kept for compatibility but made optional
interface ProductChartsProps {
  data?: any; 
  isLoading?: boolean;
  className?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#6366f1'];

export default function ProductCharts({ className = '' }: ProductChartsProps) {
  const { data, isLoading, error, refetch } = useProductPerformance();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return <DashboardSkeleton className={className} />;
  }

  if (error || !data) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700">Error al cargar datos</h3>
          <p className="text-red-600 mb-4">{error || 'No se pudieron obtener los datos de rendimiento.'}</p>
          <Button variant="outline" onClick={refetch} className="border-red-300 text-red-700 hover:bg-red-100">
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
              {kpi.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : kpi.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className={`text-xs ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}% vs mes anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Charts Area */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="inventory">Inventario</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia de Ventas</CardTitle>
                  <CardDescription>Ventas diarias en los últimos 30 días</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.salesTrend}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `${value}`} 
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`${value} ventas`, 'Ventas']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorSales)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Productos</CardTitle>
                    <CardDescription>Más vendidos por cantidad</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topProducts} layout="vertical" margin={{ left: 40 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="label" 
                            type="category" 
                            width={100}
                            tick={{ fontSize: 11 }} 
                            interval={0}
                          />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {data.topProducts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribución</CardTitle>
                    <CardDescription>Por categoría</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.categoryDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="products"
                          >
                            {data.categoryDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos Mensuales</CardTitle>
                  <CardDescription>Evolución de ingresos en los últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Salud del Inventario</CardTitle>
                  <CardDescription>Estado actual de stock por niveles</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.stockLevels}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                           {data.stockLevels.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Suggestions Panel */}
        <div className="space-y-6">
          <Card className="h-full border-indigo-100 bg-indigo-50/30">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-indigo-900">Sugerencias IA</CardTitle>
              </div>
              <CardDescription>Recomendaciones para mejorar tu gestión</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {data.suggestions.map((suggestion) => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))}
                  {data.suggestions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>¡Todo se ve excelente!</p>
                      <p className="text-sm">No hay sugerencias urgentes por ahora.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'danger': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'success': return <TrendingUp className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (suggestion.type) {
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'danger': return 'border-red-200 bg-red-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getBorderColor()} transition-all hover:shadow-sm`}>
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-sm">{suggestion.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {suggestion.description}
          </p>
          {suggestion.action && (
            <Button variant="link" className="h-auto p-0 text-xs font-medium flex items-center mt-2">
              {suggestion.action}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
