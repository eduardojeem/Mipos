import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Download } from 'lucide-react'
import { BehaviorPattern } from '../hooks/useSupplierSegmentation'

interface BehaviorPatternsViewProps {
  behaviorPatterns: BehaviorPattern[]
  isLoading?: boolean
}

const BehaviorPatternsView: React.FC<BehaviorPatternsViewProps> = React.memo(({
  behaviorPatterns,
  isLoading = false
}) => {
  const getPatternImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      case 'neutral': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'positive': return 'Positivo'
      case 'negative': return 'Negativo'
      case 'neutral': return 'Neutral'
      default: return 'Desconocido'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
        <CardTitle>Patrones de Comportamiento Detectados</CardTitle>
        <CardDescription>
          Análisis automático de patrones en el comportamiento de proveedores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {behaviorPatterns.map((pattern) => (
            <Card key={pattern.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{pattern.name}</h3>
                      <Badge className={getPatternImpactColor(pattern.impact)}>
                        {getImpactLabel(pattern.impact)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">Frecuencia</div>
                        <div className="text-2xl font-bold text-blue-600">{pattern.frequency}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${pattern.frequency}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">Confianza</div>
                        <div className="text-2xl font-bold text-green-600">{pattern.confidence}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${pattern.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">Proveedores</div>
                        <div className="text-2xl font-bold text-purple-600">{pattern.suppliers.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          afectados
                        </div>
                      </div>
                    </div>

                    {/* Detalles del patrón */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Tipo de Patrón:</span>
                          <div className="mt-1">
                            <code className="bg-white px-2 py-1 rounded text-xs border">
                              {pattern.pattern}
                            </code>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Última Detección:</span>
                          <div className="mt-1 text-sm">
                            {new Date(pattern.lastDetected).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proveedores afectados */}
                    <div className="mb-3">
                      <span className="text-sm font-medium text-muted-foreground">Proveedores Afectados:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pattern.suppliers.slice(0, 5).map((supplierId, index) => (
                          <Badge key={supplierId} variant="outline" className="text-xs">
                            Proveedor {supplierId}
                          </Badge>
                        ))}
                        {pattern.suppliers.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{pattern.suppliers.length - 5} más
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Indicador de impacto */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            pattern.impact === 'positive' ? 'bg-green-500' : 
                            pattern.impact === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                        />
                        <span>
                          Impacto {getImpactLabel(pattern.impact).toLowerCase()} en el rendimiento
                        </span>
                      </div>
                      <span>•</span>
                      <span>Confianza: {pattern.confidence}%</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" title="Ver detalles">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Descargar reporte">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {behaviorPatterns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-lg font-medium mb-2">No se encontraron patrones</div>
              <div className="text-sm">
                Los patrones de comportamiento aparecerán aquí cuando se detecten automáticamente
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

BehaviorPatternsView.displayName = 'BehaviorPatternsView'

export default BehaviorPatternsView