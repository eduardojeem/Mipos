import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Target, 
  Brain, 
  Zap,
  Star,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Segment, SegmentationInsight } from '../hooks/useSupplierSegmentation'

// Dynamic imports for charts
const ResponsiveContainer = dynamic<any>(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })
const RechartsPieChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false })
const Pie = dynamic<any>(() => import('recharts').then((m) => m.Pie as any), { ssr: false })
const Cell = dynamic<any>(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false })
const Tooltip = dynamic<any>(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })
const BarChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false })
const Bar = dynamic<any>(() => import('recharts').then((m) => m.Bar as any), { ssr: false })
const XAxis = dynamic<any>(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false })
const YAxis = dynamic<any>(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false })
const CartesianGrid = dynamic<any>(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false })
const Legend = dynamic<any>(() => import('recharts').then(m => ({ default: m.Legend })), { ssr: false })
const ScatterChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.ScatterChart })), { ssr: false })
const Scatter = dynamic<any>(() => import('recharts').then(m => ({ default: m.Scatter })), { ssr: false })

interface SegmentationOverviewProps {
  totalSuppliers: number
  totalSegments: number
  totalPatterns: number
  totalInsights: number
  chartData: {
    segmentDistributionData: Array<{ name: string; value: number; color: string }>
    performanceBySegmentData: Array<{ name: string; rating: number; delivery: number; value: number }>
    riskDistributionData: Array<{ name: string; value: number; color: string }>
    behaviorTrendData: Array<{ name: string; frequency: number; confidence: number; impact: number }>
  }
  segments: Segment[]
  insights: SegmentationInsight[]
}

const SegmentationOverview: React.FC<SegmentationOverviewProps> = React.memo(({
  totalSuppliers,
  totalSegments,
  totalPatterns,
  totalInsights,
  chartData,
  segments,
  insights
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'trend': return <BarChart3 className="h-4 w-4 text-blue-500" />
      case 'anomaly': return <Zap className="h-4 w-4 text-yellow-500" />
      default: return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Proveedores</p>
                <p className="text-2xl font-bold">{totalSuppliers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Segmentos Activos</p>
                <p className="text-2xl font-bold">{totalSegments}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patrones Detectados</p>
                <p className="text-2xl font-bold">{totalPatterns}</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Insights Generados</p>
                <p className="text-2xl font-bold">{totalInsights}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Segmentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    dataKey="value"
                    data={chartData.segmentDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                  >
                    {chartData.segmentDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.performanceBySegmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rating" name="Rating" fill="#3B82F6" />
                  <Bar dataKey="delivery" name="Entrega %" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    dataKey="value"
                    data={chartData.riskDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                  >
                    {chartData.riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencias de Comportamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={chartData.behaviorTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frequency" name="Frecuencia" />
                  <YAxis dataKey="confidence" name="Confianza" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Patrones" dataKey="confidence" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Segmentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {segments.map((segment) => (
          <Card key={segment.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <h3 className="font-medium text-sm">{segment.name}</h3>
                <Badge variant={segment.isAutomatic ? 'default' : 'secondary'} className="text-xs">
                  {segment.isAutomatic ? 'Auto' : 'Manual'}
                </Badge>
              </div>

              {/* Métricas del Segmento */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Proveedores</span>
                  <span className="font-medium">{segment.suppliers.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rating Promedio</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{segment.performance.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="font-medium">€{(segment.performance.totalValue / 1000).toFixed(0)}K</span>
                </div>
              </div>

              {/* Características */}
              <div className="mb-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Características</h4>
                <div className="flex flex-wrap gap-1">
                  {segment.characteristics.slice(0, 2).map((char, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {char}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recomendaciones */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Recomendaciones</h4>
                <ul className="space-y-1">
                  {segment.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-2 w-2 text-green-500 flex-shrink-0" />
                      <span className="truncate">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Distribución de Riesgo */}
              <div className="mt-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Distribución de Riesgo</h4>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Bajo</div>
                    <Progress value={segment.performance.riskDistribution.low} className="h-1" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Medio</div>
                    <Progress value={segment.performance.riskDistribution.medium} className="h-1" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Alto</div>
                    <Progress value={segment.performance.riskDistribution.high} className="h-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights Destacados */}
      <Card>
        <CardHeader>
          <CardTitle>Insights Destacados</CardTitle>
          <CardDescription>
            Análisis automático de patrones y oportunidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.slice(0, 3).map((insight) => (
              <div key={insight.id} className="flex items-start gap-3 p-4 border rounded-lg">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                      {insight.priority}
                    </Badge>
                    {insight.actionRequired && (
                      <Badge variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Acción Requerida
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                  <div className="text-xs text-muted-foreground">
                    {insight.recommendations.slice(0, 2).join(' • ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

SegmentationOverview.displayName = 'SegmentationOverview'

export default SegmentationOverview