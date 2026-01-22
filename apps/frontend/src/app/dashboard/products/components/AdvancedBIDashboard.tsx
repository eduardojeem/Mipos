'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3,
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Target,
  DollarSign,
  Package,
  Users,
  RefreshCw,
  Download,
  Eye,
  Zap,
  Brain,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Calendar,
  Filter,
  Settings
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAdvancedBI } from '../hooks/useAdvancedBI';
// Temporary inline components until TypeScript recognizes the files
const BIMetricCard = ({ metric, detailed = false }: { metric: any; detailed?: boolean }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-sm">{metric.name}</h4>
        <div className="text-2xl font-bold">{formatCurrency(metric.value)}</div>
      </div>
      <Badge variant="outline">{metric.priority}</Badge>
    </div>
  </Card>
);

const BIChartPanel = ({ title, type, data, height = 300, showControls }: { title: string; type: string; data: any[]; height?: number; showControls?: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div style={{ height }} className="flex items-center justify-center text-muted-foreground">
        Gráfico {type} - {data.length} puntos de datos {showControls && '(con controles)'}
      </div>
    </CardContent>
  </Card>
);

const BIInsightsPanel = ({ insights, onInsightAction }: { insights: any[]; onInsightAction?: (insight: any, action: string) => void }) => (
  <Card>
    <CardHeader>
      <CardTitle>Insights de Negocio</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {insights.slice(0, 3).map((insight, index) => (
          <div key={index} className="p-3 border rounded">
            <h4 className="font-semibold">{insight.title}</h4>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const BIDrillDownTable = ({ title, data, categories, dimension }: { title: string; data: any[]; categories: any[]; dimension?: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center py-8 text-muted-foreground">
        Tabla drill-down - {data.length} productos en {categories.length} categorías {dimension && `(dimensión: ${dimension})`}
      </div>
    </CardContent>
  </Card>
);
import type { Product, Category } from '@/types';
import type { BIMetric } from '../services/AdvancedBIEngine';

interface AdvancedBIDashboardProps {
  products: Product[];
  categories: Category[];
  className?: string;
}

export function AdvancedBIDashboard({ products, categories, className }: AdvancedBIDashboardProps) {
  const [selectedRole, setSelectedRole] = useState<'executive' | 'manager' | 'analyst' | 'operator'>('executive');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedMetricCategory, setSelectedMetricCategory] = useState<'all' | BIMetric['category']>('all');

  const {
    metrics,
    dimensions,
    timeSeriesData,
    insights,
    dashboardConfig,
    isGenerating,
    lastUpdated,
    error,
    computed,
    generateAnalysis,
    getMetricsByCategory,
    getInsightsByType,
    getInsightsByPriority,
    getDimensionById,
    getTimeSeriesForMetric,
    exportData,
    isReady,
    hasData
  } = useAdvancedBI({
    products,
    categories,
    role: selectedRole,
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000
  });

  const handleRoleChange = (role: string) => {
    setSelectedRole(role as typeof selectedRole);
  };

  const handleExportData = (format: 'json' | 'csv' | 'excel') => {
    const data = exportData(format);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bi-dashboard-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'executive': return Users;
      case 'manager': return Target;
      case 'analyst': return BarChart3;
      case 'operator': return Package;
      default: return Activity;
    }
  };

  const filteredMetrics = selectedMetricCategory === 'all' 
    ? metrics 
    : getMetricsByCategory(selectedMetricCategory);

  if (!isReady) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Dashboard BI Avanzado
          </CardTitle>
          <CardDescription>
            Cargando análisis de inteligencia de negocios...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Error en Dashboard BI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={generateAnalysis} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Dashboard BI Avanzado
              {isGenerating && <RefreshCw className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Análisis inteligente de {products.length} productos • Vista {selectedRole}
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  • Actualizado {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Role Selector */}
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Ejecutivo
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Gerencial
                  </div>
                </SelectItem>
                <SelectItem value="analyst">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analista
                  </div>
                </SelectItem>
                <SelectItem value="operator">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Operativo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportData('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={generateAnalysis}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="metrics">
              Métricas ({computed.totalMetrics})
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="insights">
              Insights ({computed.totalInsights})
            </TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Health Score & Key Indicators */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className={`p-4 ${getHealthScoreColor(computed.healthScore)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Health Score</p>
                    <p className="text-2xl font-bold">{computed.healthScore}%</p>
                  </div>
                  <Activity className="h-8 w-8 opacity-60" />
                </div>
                <Progress value={computed.healthScore} className="mt-2" />
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Insights Críticos</p>
                    <p className="text-2xl font-bold text-red-600">{computed.criticalInsightsCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500 opacity-60" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Oportunidades</p>
                    <p className="text-2xl font-bold text-green-600">{computed.opportunitiesCount}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500 opacity-60" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Métricas Positivas</p>
                    <p className="text-2xl font-bold text-blue-600">{computed.metricsWithPositiveTrend}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500 opacity-60" />
                </div>
              </Card>
            </div>

            {/* Critical Alerts */}
            {computed.hasCriticalIssues && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas Críticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getInsightsByPriority('critical').slice(0, 3).map(insight => (
                      <div key={insight.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-red-800">{insight.title}</p>
                          <p className="text-sm text-red-700">{insight.description}</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {Math.round(insight.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Metrics Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {metrics.slice(0, 8).map(metric => (
                <BIMetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            {/* Quick Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <BIChartPanel
                title="Tendencia de Ingresos"
                type="line"
                data={getTimeSeriesForMetric('revenue')}
                height={300}
              />
              <BIChartPanel
                title="Distribución por Categorías"
                type="pie"
                data={getDimensionById('category_revenue')?.values || []}
                height={300}
              />
            </div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={selectedMetricCategory} onValueChange={(value) => setSelectedMetricCategory(value as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las métricas</SelectItem>
                    <SelectItem value="financial">Financieras</SelectItem>
                    <SelectItem value="operational">Operacionales</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="strategic">Estratégicas</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">
                  {filteredMetrics.length} métricas
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMetrics.map(metric => (
                <BIMetricCard key={metric.id} metric={metric} detailed />
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <BIChartPanel
                title="Evolución Temporal"
                type="line"
                data={timeSeriesData}
                height={400}
                showControls
              />
              <BIChartPanel
                title="Análisis Dimensional"
                type="bar"
                data={dimensions}
                height={400}
                showControls
              />
            </div>

            <BIDrillDownTable
              title="Análisis Detallado por Categorías"
              data={products}
              categories={categories}
              dimension="category"
            />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <BIInsightsPanel
              insights={insights}
              onInsightAction={(insight: any, action: string) => {
                console.log('Insight action:', insight.id, action);
              }}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Reportes Automáticos</h3>
              <p className="text-muted-foreground mb-4">
                Genera reportes ejecutivos automáticos basados en el análisis BI
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => handleExportData('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Reporte JSON
                </Button>
                <Button onClick={() => handleExportData('csv')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reporte CSV
                </Button>
                <Button onClick={() => handleExportData('excel')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reporte Excel
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdvancedBIDashboard;