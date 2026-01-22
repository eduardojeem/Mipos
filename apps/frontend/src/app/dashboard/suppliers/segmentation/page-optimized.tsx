'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  RefreshCw,
  Brain,
  Star,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle,
  Filter
} from 'lucide-react'

// Import custom components
import { useSupplierSegmentation } from './hooks/useSupplierSegmentation'
import SegmentationOverview from './components/SegmentationOverview'
import BehaviorPatternsView from './components/BehaviorPatternsView'
import SegmentationRulesView from './components/SegmentationRulesView'

// Loading skeleton component
const LoadingSkeleton: React.FC = React.memo(() => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
))

LoadingSkeleton.displayName = 'LoadingSkeleton'

// Error component
const ErrorDisplay: React.FC<{ error: string; onRetry: () => void }> = React.memo(({ error, onRetry }) => (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span>{error}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Reintentar
      </Button>
    </AlertDescription>
  </Alert>
))

ErrorDisplay.displayName = 'ErrorDisplay'

// Supplier list component
const SuppliersList: React.FC<{
  suppliers: any[]
  segments: any[]
  getSupplierSegment: (id: string) => any
  isLoading: boolean
}> = React.memo(({ suppliers, segments, getSupplierSegment, isLoading }) => {
  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {suppliers.map((supplier) => {
        const segment = getSupplierSegment(supplier.id)
        return (
          <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment?.color || '#6B7280' }}
              />
              <div>
                <div className="font-medium">{supplier.name}</div>
                <div className="text-sm text-muted-foreground">
                  {supplier.category} • {supplier.location}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{supplier.rating}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  €{supplier.totalSpent.toLocaleString()}
                </div>
              </div>
              <Badge className={getRiskBadgeColor(supplier.riskLevel)}>
                {supplier.riskLevel}
              </Badge>
              <Badge variant="outline">
                {segment?.name || 'Sin segmento'}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
})

SuppliersList.displayName = 'SuppliersList'

// Insights view component
const InsightsView: React.FC<{ insights: any[]; segments: any[]; isLoading: boolean }> = React.memo(({ 
  insights, 
  segments, 
  isLoading 
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'trend': return <Brain className="h-4 w-4 text-blue-500" />
      case 'anomaly': return <Brain className="h-4 w-4 text-yellow-500" />
      default: return <Brain className="h-4 w-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="animate-pulse flex items-start gap-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights de Segmentación</CardTitle>
        <CardDescription>
          Análisis automático y recomendaciones basadas en IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{insight.title}</h3>
                      <Badge variant={
                        insight.priority === 'high' ? 'destructive' : 
                        insight.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {insight.priority}
                      </Badge>
                      {insight.actionRequired && (
                        <Badge variant="outline">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Acción Requerida
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                    
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1">Segmentos Afectados:</h4>
                      <div className="flex gap-1">
                        {insight.affectedSegments.map((segmentId: string) => {
                          const segment = segments.find(s => s.id === segmentId)
                          return (
                            <Badge key={segmentId} variant="outline" className="text-xs">
                              {segment?.name}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1">Recomendaciones:</h4>
                      <ul className="space-y-1">
                        {insight.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Generado el: {new Date(insight.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {insights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">No hay insights disponibles</div>
              <div className="text-sm">
                Los insights aparecerán aquí cuando se generen automáticamente
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

InsightsView.displayName = 'InsightsView'

// Main component
export default function SupplierSegmentationPageOptimized() {
  const {
    suppliers,
    segments,
    segmentationRules,
    behaviorPatterns,
    insights,
    filteredSuppliers,
    chartData,
    isLoading,
    isAnalyzing,
    error,
    filters,
    loadData,
    runAutomaticSegmentation,
    updateFilters,
    getSupplierSegment
  } = useSupplierSegmentation()

  // Memoized filter handlers
  const handleSearchChange = useCallback((value: string) => {
    updateFilters({ searchTerm: value })
  }, [updateFilters])

  const handleSegmentChange = useCallback((value: string) => {
    updateFilters({ selectedSegment: value })
  }, [updateFilters])

  const handleRiskLevelChange = useCallback((value: string) => {
    updateFilters({ riskLevel: value === 'all' ? undefined : value as any })
  }, [updateFilters])

  const handleCategoryChange = useCallback((value: string) => {
    updateFilters({ category: value === 'all' ? undefined : value })
  }, [updateFilters])

  // Get unique categories for filter
  const categories = React.useMemo(() => {
    const uniqueCategories = [...new Set(suppliers.map(s => s.category))]
    return uniqueCategories
  }, [suppliers])

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <ErrorDisplay error={error} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Segmentación Avanzada de Proveedores</h1>
          <p className="text-muted-foreground">
            Análisis automático por comportamiento y características
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={runAutomaticSegmentation} disabled={isAnalyzing || isLoading}>
            {isAnalyzing ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                Analizando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Análisis IA
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="segments">Segmentos</TabsTrigger>
            <TabsTrigger value="patterns">Patrones de Comportamiento</TabsTrigger>
            <TabsTrigger value="rules">Reglas de Segmentación</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SegmentationOverview
              totalSuppliers={suppliers.length}
              totalSegments={segments.length}
              totalPatterns={behaviorPatterns.length}
              totalInsights={insights.length}
              chartData={chartData}
              segments={segments}
              insights={insights}
            />
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros de Segmentación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Buscar Proveedor</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre..."
                        value={filters.searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Segmento</label>
                    <Select value={filters.selectedSegment} onValueChange={handleSegmentChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los segmentos</SelectItem>
                        {segments.map(segment => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nivel de Riesgo</label>
                    <Select value={filters.riskLevel || 'all'} onValueChange={handleRiskLevelChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los niveles</SelectItem>
                        <SelectItem value="low">Bajo Riesgo</SelectItem>
                        <SelectItem value="medium">Riesgo Medio</SelectItem>
                        <SelectItem value="high">Alto Riesgo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoría</label>
                    <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Proveedores */}
            <Card>
              <CardHeader>
                <CardTitle>Proveedores por Segmento</CardTitle>
                <CardDescription>
                  {filteredSuppliers.length} proveedores encontrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SuppliersList
                  suppliers={filteredSuppliers}
                  segments={segments}
                  getSupplierSegment={getSupplierSegment}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <BehaviorPatternsView
              behaviorPatterns={behaviorPatterns}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <SegmentationRulesView
              segmentationRules={segmentationRules}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <InsightsView
              insights={insights}
              segments={segments}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}