import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Settings } from 'lucide-react'
import { SegmentationRule } from '../hooks/useSupplierSegmentation'

interface SegmentationRulesViewProps {
  segmentationRules: SegmentationRule[]
  isLoading?: boolean
  onCreateRule?: (rule: Partial<SegmentationRule>) => void
  onUpdateRule?: (id: string, rule: Partial<SegmentationRule>) => void
  onDeleteRule?: (id: string) => void
}

const SegmentationRulesView: React.FC<SegmentationRulesViewProps> = React.memo(({
  segmentationRules,
  isLoading = false,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}) => {
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<SegmentationRule | null>(null)
  const [newRule, setNewRule] = useState<Partial<SegmentationRule>>({
    name: '',
    description: '',
    conditions: [],
    isActive: true,
    priority: 1
  })

  const resetForm = useCallback(() => {
    setNewRule({
      name: '',
      description: '',
      conditions: [],
      isActive: true,
      priority: 1
    })
    setEditingRule(null)
  }, [])

  const handleCreateRule = useCallback(() => {
    if (onCreateRule && newRule.name && newRule.description) {
      onCreateRule({
        ...newRule,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        supplierCount: 0
      })
      resetForm()
      setShowRuleDialog(false)
    }
  }, [newRule, onCreateRule, resetForm])

  const handleEditRule = useCallback((rule: SegmentationRule) => {
    setEditingRule(rule)
    setNewRule({
      name: rule.name,
      description: rule.description,
      conditions: rule.conditions,
      isActive: rule.isActive,
      priority: rule.priority
    })
    setShowRuleDialog(true)
  }, [])

  const handleUpdateRule = useCallback(() => {
    if (onUpdateRule && editingRule && newRule.name && newRule.description) {
      onUpdateRule(editingRule.id, {
        ...newRule,
        lastUpdated: new Date().toISOString()
      })
      resetForm()
      setShowRuleDialog(false)
    }
  }, [editingRule, newRule, onUpdateRule, resetForm])

  const handleDeleteRule = useCallback((id: string) => {
    if (onDeleteRule && window.confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
      onDeleteRule(id)
    }
  }, [onDeleteRule])

  const formatConditionValue = (condition: any) => {
    if (Array.isArray(condition.value)) {
      return condition.value.join(' - ')
    }
    return condition.value.toString()
  }

  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      'equals': 'igual a',
      'greater_than': 'mayor que',
      'less_than': 'menor que',
      'between': 'entre',
      'contains': 'contiene',
      'in': 'en'
    }
    return labels[operator] || operator
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reglas de Segmentación</h2>
          <p className="text-muted-foreground">
            Configura reglas automáticas para la segmentación de proveedores
          </p>
        </div>
        <Dialog open={showRuleDialog} onOpenChange={(open) => {
          setShowRuleDialog(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl" aria-labelledby="segment-rule-create-title">
            <DialogHeader>
              <DialogTitle id="segment-rule-create-title">
                {editingRule ? 'Editar Regla de Segmentación' : 'Crear Nueva Regla de Segmentación'}
              </DialogTitle>
              <DialogDescription>
                Define condiciones automáticas para segmentar proveedores
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruleName">Nombre de la Regla</Label>
                  <Input
                    id="ruleName"
                    value={newRule.name || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Proveedores de Alto Valor"
                  />
                </div>
                <div>
                  <Label htmlFor="rulePriority">Prioridad</Label>
                  <Select 
                    value={newRule.priority?.toString()} 
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, priority: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Alta (1)</SelectItem>
                      <SelectItem value="2">Media (2)</SelectItem>
                      <SelectItem value="3">Baja (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="ruleDescription">Descripción</Label>
                <Textarea
                  id="ruleDescription"
                  value={newRule.description || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe el propósito de esta regla..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ruleActive"
                  checked={newRule.isActive}
                  onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="ruleActive">Regla activa</Label>
              </div>
              
              {/* Condiciones de la regla */}
              <div className="border-t pt-4">
                <Label className="text-base font-medium">Condiciones de la Regla</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Define las condiciones que deben cumplir los proveedores para pertenecer a este segmento
                </p>
                
                {/* Aquí se podrían agregar más campos para definir condiciones */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">
                    Las condiciones se configurarán en una versión futura de esta interfaz.
                    Por ahora, las reglas se crean con condiciones predeterminadas.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowRuleDialog(false)
                  resetForm()
                }}>
                  Cancelar
                </Button>
                <Button onClick={editingRule ? handleUpdateRule : handleCreateRule}>
                  {editingRule ? 'Actualizar Regla' : 'Crear Regla'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {segmentationRules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium">{rule.name}</h3>
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Badge variant="outline">
                      Prioridad {rule.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{rule.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Condiciones:
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      {rule.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm mb-2 last:mb-0">
                          {index > 0 && condition.logicalOperator && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {condition.logicalOperator}
                            </Badge>
                          )}
                          <code className="bg-white px-2 py-1 rounded text-xs border flex-1">
                            <span className="font-medium text-blue-600">{condition.field}</span>
                            <span className="mx-1 text-gray-500">{getOperatorLabel(condition.operator)}</span>
                            <span className="font-medium text-green-600">{formatConditionValue(condition)}</span>
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{rule.supplierCount}</div>
                      <div className="text-xs text-blue-600 font-medium">Proveedores Afectados</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-sm font-medium text-green-600">Creada</div>
                      <div className="text-xs text-green-600">
                        {new Date(rule.createdAt).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-sm font-medium text-purple-600">Actualizada</div>
                      <div className="text-xs text-purple-600">
                        {new Date(rule.lastUpdated).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditRule(rule)}
                    title="Editar regla"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Eliminar regla"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {segmentationRules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No hay reglas configuradas</div>
                <div className="text-sm">
                  Crea tu primera regla de segmentación para automatizar la clasificación de proveedores
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
})

SegmentationRulesView.displayName = 'SegmentationRulesView'

export default SegmentationRulesView