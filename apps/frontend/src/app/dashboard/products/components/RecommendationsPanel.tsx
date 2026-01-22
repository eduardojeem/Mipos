'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain,
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Package, 
  DollarSign,
  Target,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Clock,
  BarChart3,
  ShoppingCart,
  Zap,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMLRecommendations } from '../hooks/useMLRecommendations';
import type { Recommendation, MLInsights } from '../services/MLRecommendationEngine';
import type { Product } from '@/types';

interface RecommendationsPanelProps {
  products: Product[];
  categories: any[];
  className?: string;
}

export function RecommendationsPanel({ products, categories, className }: RecommendationsPanelProps) {
  const [showImplemented, setShowImplemented] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const {
    recommendations,
    insights,
    isGenerating,
    lastUpdated,
    error,
    computed,
    generateRecommendations,
    markAsImplemented,
    getRecommendationsByPriority,
    getRecommendationsByType,
    isReady,
    hasData
  } = useMLRecommendations({
    products,
    categories,
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'critical': return AlertTriangle;
      case 'high': return TrendingUp;
      case 'medium': return Target;
      case 'low': return Lightbulb;
      default: return Brain;
    }
  };

  const getTypeIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'restock': return Package;
      case 'price_adjustment': return DollarSign;
      case 'promotion': return Target;
      case 'discontinue': return TrendingDown;
      case 'cross_sell': return ShoppingCart;
      case 'upsell': return TrendingUp;
      case 'seasonal_boost': return Zap;
      default: return Brain;
    }
  };

  const handleImplementRecommendation = (recommendation: Recommendation) => {
    markAsImplemented(recommendation.id);
    setSelectedRecommendation(null);
  };

  if (!isReady) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Recomendaciones Inteligentes
          </CardTitle>
          <CardDescription>
            Cargando análisis de productos...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
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
            Error en Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={generateRecommendations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-500" />
            Recomendaciones Inteligentes
          </CardTitle>
          <CardDescription>
            ¡Excelente! No hay recomendaciones críticas en este momento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2 text-green-700">Sistema Optimizado</h3>
            <p className="text-muted-foreground">
              Tu inventario está bien gestionado según nuestro análisis de ML.
            </p>
          </div>
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
              <Brain className="h-5 w-5 text-purple-500" />
              Recomendaciones Inteligentes
              {isGenerating && <RefreshCw className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Análisis basado en {products.length} productos usando Machine Learning
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  • Actualizado {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImplemented(!showImplemented)}
            >
              {showImplemented ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showImplemented ? 'Ocultar' : 'Mostrar'} implementadas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generateRecommendations}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="recommendations">
              Recomendaciones ({computed.totalRecommendations})
            </TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {computed.criticalCount}
                </div>
                <p className="text-sm text-muted-foreground">Críticas</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {computed.highPriorityCount}
                </div>
                <p className="text-sm text-muted-foreground">Alta prioridad</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(computed.totalPotentialRevenue)}
                </div>
                <p className="text-sm text-muted-foreground">Impacto potencial</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(computed.averageConfidence * 100)}%
                </div>
                <p className="text-sm text-muted-foreground">Confianza promedio</p>
              </div>
            </div>

            {computed.hasCriticalIssues && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Atención Inmediata Requerida</h3>
                </div>
                <p className="text-sm text-red-700">
                  Hay {computed.criticalCount} recomendaciones críticas que requieren acción inmediata.
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 border rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Gestión de Stock</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {computed.stockIssuesCount} productos necesitan reabastecimiento
                </p>
              </div>
              <div className="p-3 border rounded">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Optimización de Precios</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {computed.pricingOpportunitiesCount} oportunidades de ajuste de precios
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No hay recomendaciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => {
                  const PriorityIcon = getPriorityIcon(rec.priority);
                  const TypeIcon = getTypeIcon(rec.type);
                  const isSelected = selectedRecommendation === rec.id;

                  return (
                    <div
                      key={rec.id}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'
                      } ${getPriorityColor(rec.priority)} border-l-4`}
                      onClick={() => setSelectedRecommendation(isSelected ? null : rec.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <PriorityIcon className="h-5 w-5" />
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <Badge variant={rec.priority === 'critical' ? 'destructive' : 'secondary'}>
                                {rec.priority === 'critical' ? 'Crítica' : 
                                 rec.priority === 'high' ? 'Alta' :
                                 rec.priority === 'medium' ? 'Media' : 'Baja'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(rec.confidence * 100)}% confianza
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {rec.description}
                            </p>
                            
                            {isSelected && (
                              <div className="mt-3 space-y-3">
                                <Separator />
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="p-3 bg-blue-50 rounded">
                                    <p className="font-medium text-sm text-blue-800">Acción Sugerida</p>
                                    <p className="text-sm text-blue-700">{rec.suggestedAction}</p>
                                  </div>
                                  <div className="p-3 bg-green-50 rounded">
                                    <p className="font-medium text-sm text-green-800">Impacto Esperado</p>
                                    {rec.expectedImpact.revenue && (
                                      <p className="text-sm text-green-700">
                                        Ingresos: {formatCurrency(rec.expectedImpact.revenue)}
                                      </p>
                                    )}
                                    {rec.expectedImpact.margin && (
                                      <p className="text-sm text-green-700">
                                        Margen: {formatCurrency(rec.expectedImpact.margin)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImplementRecommendation(rec);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Implementar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Open detailed view
                                    }}
                                  >
                                    Ver detalles
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {rec.createdAt.toLocaleTimeString()}
                          </div>
                          {rec.expiresAt && (
                            <div className="text-xs text-orange-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expira {rec.expiresAt.toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {insights ? (
              <div className="space-y-6">
                {/* Trends */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Análisis de Tendencias
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-600">Productos de Rápido Movimiento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {insights.trends.fastMoving.length > 0 ? (
                          <div className="space-y-2">
                            {insights.trends.fastMoving.slice(0, 3).map(product => (
                              <div key={product.id} className="flex justify-between text-sm">
                                <span>{product.name}</span>
                                <span className="text-green-600">{formatCurrency(product.sale_price)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay datos suficientes</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-orange-600">Productos de Lento Movimiento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {insights.trends.slowMoving.length > 0 ? (
                          <div className="space-y-2">
                            {insights.trends.slowMoving.slice(0, 3).map(product => (
                              <div key={product.id} className="flex justify-between text-sm">
                                <span>{product.name}</span>
                                <span className="text-orange-600">Stock: {product.stock_quantity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay productos identificados</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Opportunities */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Oportunidades de Negocio
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Cross-Sell</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {insights.opportunities.crossSell.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Oportunidades identificadas</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Up-Sell</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {insights.opportunities.upsell.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Productos con potencial</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Bundling</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {insights.opportunities.bundling.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Paquetes sugeridos</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Risks */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Análisis de Riesgos
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-red-600">Sobrestock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600 mb-1">
                          {insights.risks.overstock.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Productos en riesgo</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-orange-600">Falta de Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {insights.risks.understock.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Requieren reabastecimiento</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-yellow-600">Competencia de Precios</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600 mb-1">
                          {insights.risks.priceCompetition.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Productos vulnerables</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Generando insights...</p>
              </div>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Métricas del Motor ML</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Recomendaciones activas:</span>
                    <span className="font-medium">{computed.totalRecommendations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Confianza promedio:</span>
                    <span className="font-medium">{Math.round(computed.averageConfidence * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Productos analizados:</span>
                    <span className="font-medium">{products.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Categorías incluidas:</span>
                    <span className="font-medium">{categories.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Distribución por Prioridad</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Críticas</span>
                      <span className="text-red-600">{computed.criticalCount}</span>
                    </div>
                    <Progress 
                      value={computed.totalRecommendations > 0 ? (computed.criticalCount / computed.totalRecommendations) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Alta prioridad</span>
                      <span className="text-orange-600">{computed.highPriorityCount}</span>
                    </div>
                    <Progress 
                      value={computed.totalRecommendations > 0 ? (computed.highPriorityCount / computed.totalRecommendations) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default RecommendationsPanel;