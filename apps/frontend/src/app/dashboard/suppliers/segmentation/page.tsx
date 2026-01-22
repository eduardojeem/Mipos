'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, 
  Plus, 
  Settings, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Star,
  DollarSign,
  Clock,
  Truck,
  Shield,
  Award,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Brain,
  Filter,
  RefreshCw,
  Download,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import dynamic from 'next/dynamic'
const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false })
const BarChart = lazyRecharts('BarChart')
const Bar = lazyRecharts('Bar')
const XAxis = lazyRecharts('XAxis')
const YAxis = lazyRecharts('YAxis')
const CartesianGrid = lazyRecharts('CartesianGrid')
const Tooltip = lazyRecharts('Tooltip')
const Legend = lazyRecharts('Legend')
const ResponsiveContainer = lazyRecharts('ResponsiveContainer')
const RechartsPieChart = lazyRecharts('PieChart')
const Pie = lazyRecharts('Pie')
const Cell = lazyRecharts('Cell')
const ScatterChart = lazyRecharts('ScatterChart')
const Scatter = lazyRecharts('Scatter')
const LineChart = lazyRecharts('LineChart')
const Line = lazyRecharts('Line')

// Interfaces
interface Supplier {
  id: string
  name: string
  category: string
  status: 'active' | 'inactive' | 'pending'
  rating: number
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
  location: string
  contactPerson: string
  email: string
  phone: string
  registrationDate: string
  averageOrderValue: number
  orderFrequency: number
  paymentTerms: number
  deliveryPerformance: number
  qualityScore: number
  responseTime: number
  contractValue: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface SegmentationRule {
  id: string
  name: string
  description: string
  conditions: SegmentCondition[]
  isActive: boolean
  priority: number
  createdAt: string
  lastUpdated: string
  supplierCount: number
}

interface SegmentCondition {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

interface Segment {
  id: string
  name: string
  description: string
  color: string
  suppliers: string[]
  characteristics: string[]
  recommendations: string[]
  ruleId?: string
  isAutomatic: boolean
  createdAt: string
  lastUpdated: string
  performance: {
    averageRating: number
    totalValue: number
    averageOrderValue: number
    deliveryPerformance: number
    riskDistribution: { low: number; medium: number; high: number }
  }
}

interface BehaviorPattern {
  id: string
  name: string
  description: string
  pattern: string
  frequency: number
  suppliers: string[]
  impact: 'positive' | 'negative' | 'neutral'
  confidence: number
  lastDetected: string
}

interface SegmentationInsight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly'
  title: string
  description: string
  affectedSegments: string[]
  priority: 'high' | 'medium' | 'low'
  actionRequired: boolean
  recommendations: string[]
  createdAt: string
}

export default function SupplierSegmentationPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [segmentationRules, setSegmentationRules] = useState<SegmentationRule[]>([])
  const [behaviorPatterns, setBehaviorPatterns] = useState<BehaviorPattern[]>([])
  const [insights, setInsights] = useState<SegmentationInsight[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [showSegmentDialog, setShowSegmentDialog] = useState(false)
  const [newRule, setNewRule] = useState<Partial<SegmentationRule>>({
    name: '',
    description: '',
    conditions: [],
    isActive: true,
    priority: 1
  })
  const [newSegment, setNewSegment] = useState<Partial<Segment>>({
    name: '',
    description: '',
    color: '#3B82F6',
    isAutomatic: false
  })

  // Mock data
  useEffect(() => {
    const mockSuppliers: Supplier[] = [
      {
        id: '1',
        name: 'TechCorp Solutions',
        category: 'Tecnología',
        status: 'active',
        rating: 4.8,
        totalOrders: 156,
        totalSpent: 125000,
        lastOrderDate: '2024-01-15',
        location: 'Madrid, España',
        contactPerson: 'Ana García',
        email: 'ana@techcorp.com',
        phone: '+34 91 123 4567',
        registrationDate: '2022-03-15',
        averageOrderValue: 801.28,
        orderFrequency: 12.5,
        paymentTerms: 30,
        deliveryPerformance: 94.5,
        qualityScore: 92.3,
        responseTime: 2.5,
        contractValue: 150000,
        riskLevel: 'low'
      },
      {
        id: '2',
        name: 'Global Supplies Inc',
        category: 'Suministros',
        status: 'active',
        rating: 4.2,
        totalOrders: 89,
        totalSpent: 78000,
        lastOrderDate: '2024-01-12',
        location: 'Barcelona, España',
        contactPerson: 'Carlos López',
        email: 'carlos@globalsupplies.com',
        phone: '+34 93 987 6543',
        registrationDate: '2021-08-22',
        averageOrderValue: 876.40,
        orderFrequency: 8.2,
        paymentTerms: 45,
        deliveryPerformance: 78.2,
        qualityScore: 82.1,
        responseTime: 3.8,
        contractValue: 95000,
        riskLevel: 'medium'
      },
      {
        id: '3',
        name: 'Premium Materials',
        category: 'Materiales',
        status: 'active',
        rating: 4.6,
        totalOrders: 203,
        totalSpent: 189000,
        lastOrderDate: '2024-01-14',
        location: 'Valencia, España',
        contactPerson: 'María Rodríguez',
        email: 'maria@premiummaterials.com',
        phone: '+34 96 456 7890',
        registrationDate: '2020-11-10',
        averageOrderValue: 930.54,
        orderFrequency: 15.8,
        paymentTerms: 30,
        deliveryPerformance: 96.1,
        qualityScore: 95.2,
        responseTime: 1.8,
        contractValue: 220000,
        riskLevel: 'low'
      },
      {
        id: '4',
        name: 'FastLogistics Pro',
        category: 'Logística',
        status: 'active',
        rating: 3.9,
        totalOrders: 67,
        totalSpent: 45000,
        lastOrderDate: '2024-01-10',
        location: 'Sevilla, España',
        contactPerson: 'Juan Martín',
        email: 'juan@fastlogistics.com',
        phone: '+34 95 321 0987',
        registrationDate: '2023-02-28',
        averageOrderValue: 671.64,
        orderFrequency: 6.1,
        paymentTerms: 60,
        deliveryPerformance: 72.3,
        qualityScore: 75.8,
        responseTime: 5.2,
        contractValue: 55000,
        riskLevel: 'high'
      },
      {
        id: '5',
        name: 'EcoGreen Supplies',
        category: 'Sostenibilidad',
        status: 'active',
        rating: 4.4,
        totalOrders: 134,
        totalSpent: 98000,
        lastOrderDate: '2024-01-13',
        location: 'Bilbao, España',
        contactPerson: 'Laura Fernández',
        email: 'laura@ecogreen.com',
        phone: '+34 94 654 3210',
        registrationDate: '2021-05-18',
        averageOrderValue: 731.34,
        orderFrequency: 10.8,
        paymentTerms: 30,
        deliveryPerformance: 88.7,
        qualityScore: 86.4,
        responseTime: 3.2,
        contractValue: 115000,
        riskLevel: 'low'
      },
      {
        id: '6',
        name: 'Budget Solutions',
        category: 'Suministros',
        status: 'active',
        rating: 3.2,
        totalOrders: 45,
        totalSpent: 23000,
        lastOrderDate: '2024-01-08',
        location: 'Zaragoza, España',
        contactPerson: 'Pedro Sánchez',
        email: 'pedro@budgetsolutions.com',
        phone: '+34 97 789 0123',
        registrationDate: '2023-09-12',
        averageOrderValue: 511.11,
        orderFrequency: 4.2,
        paymentTerms: 15,
        deliveryPerformance: 65.8,
        qualityScore: 68.9,
        responseTime: 6.5,
        contractValue: 30000,
        riskLevel: 'high'
      }
    ]

    const mockSegments: Segment[] = [
      {
        id: '1',
        name: 'Proveedores Estratégicos',
        description: 'Proveedores de alto valor con excelente rendimiento',
        color: '#10B981',
        suppliers: ['1', '3'],
        characteristics: ['Alto volumen de pedidos', 'Excelente calidad', 'Entregas puntuales', 'Bajo riesgo'],
        recommendations: ['Fortalecer relación', 'Negociar contratos a largo plazo', 'Explorar nuevos productos'],
        ruleId: '1',
        isAutomatic: true,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-15',
        performance: {
          averageRating: 4.7,
          totalValue: 314000,
          averageOrderValue: 865.91,
          deliveryPerformance: 95.3,
          riskDistribution: { low: 100, medium: 0, high: 0 }
        }
      },
      {
        id: '2',
        name: 'Proveedores en Desarrollo',
        description: 'Proveedores con potencial de crecimiento',
        color: '#3B82F6',
        suppliers: ['2', '5'],
        characteristics: ['Rendimiento moderado', 'Potencial de mejora', 'Relación estable'],
        recommendations: ['Programas de desarrollo', 'Feedback regular', 'Incentivos por mejora'],
        ruleId: '2',
        isAutomatic: true,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-15',
        performance: {
          averageRating: 4.3,
          totalValue: 176000,
          averageOrderValue: 803.87,
          deliveryPerformance: 83.45,
          riskDistribution: { low: 50, medium: 50, high: 0 }
        }
      },
      {
        id: '3',
        name: 'Proveedores de Riesgo',
        description: 'Proveedores que requieren atención especial',
        color: '#EF4444',
        suppliers: ['4', '6'],
        characteristics: ['Bajo rendimiento', 'Entregas tardías', 'Problemas de calidad', 'Alto riesgo'],
        recommendations: ['Planes de mejora', 'Monitoreo estrecho', 'Buscar alternativas'],
        ruleId: '3',
        isAutomatic: true,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-15',
        performance: {
          averageRating: 3.55,
          totalValue: 68000,
          averageOrderValue: 591.38,
          deliveryPerformance: 69.05,
          riskDistribution: { low: 0, medium: 0, high: 100 }
        }
      },
      {
        id: '4',
        name: 'Proveedores Sostenibles',
        description: 'Proveedores enfocados en sostenibilidad',
        color: '#059669',
        suppliers: ['5'],
        characteristics: ['Certificaciones ambientales', 'Prácticas sostenibles', 'Innovación verde'],
        recommendations: ['Ampliar colaboración', 'Proyectos conjuntos', 'Promoción de marca'],
        isAutomatic: false,
        createdAt: '2024-01-05',
        lastUpdated: '2024-01-15',
        performance: {
          averageRating: 4.4,
          totalValue: 98000,
          averageOrderValue: 731.34,
          deliveryPerformance: 88.7,
          riskDistribution: { low: 100, medium: 0, high: 0 }
        }
      }
    ]

    const mockRules: SegmentationRule[] = [
      {
        id: '1',
        name: 'Proveedores Estratégicos',
        description: 'Identifica proveedores de alto valor y rendimiento',
        conditions: [
          { field: 'totalSpent', operator: 'greater_than', value: 100000 },
          { field: 'rating', operator: 'greater_than', value: 4.5, logicalOperator: 'AND' },
          { field: 'deliveryPerformance', operator: 'greater_than', value: 90, logicalOperator: 'AND' },
          { field: 'riskLevel', operator: 'equals', value: 'low', logicalOperator: 'AND' }
        ],
        isActive: true,
        priority: 1,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-15',
        supplierCount: 2
      },
      {
        id: '2',
        name: 'Proveedores en Desarrollo',
        description: 'Proveedores con rendimiento moderado y potencial',
        conditions: [
          { field: 'rating', operator: 'between', value: [3.8, 4.5] },
          { field: 'totalSpent', operator: 'between', value: [50000, 150000], logicalOperator: 'AND' },
          { field: 'riskLevel', operator: 'in', value: ['low', 'medium'], logicalOperator: 'AND' }
        ],
        isActive: true,
        priority: 2,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-15',
        supplierCount: 2
      },
      {
        id: '3',
        name: 'Proveedores de Riesgo',
        description: 'Proveedores que requieren atención especial',
        conditions: [
          { field: 'rating', operator: 'less_than', value: 4.0 },
          { field: 'deliveryPerformance', operator: 'less_than', value: 80, logicalOperator: 'OR' },
          { field: 'riskLevel', operator: 'equals', value: 'high', logicalOperator: 'OR' }
        ],
        isActive: true,
        priority: 3,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-15',
        supplierCount: 2
      }
    ]

    const mockPatterns: BehaviorPattern[] = [
      {
        id: '1',
        name: 'Pedidos Estacionales',
        description: 'Incremento de pedidos en Q4',
        pattern: 'seasonal_increase',
        frequency: 85,
        suppliers: ['1', '2', '3'],
        impact: 'positive',
        confidence: 92,
        lastDetected: '2024-01-15'
      },
      {
        id: '2',
        name: 'Deterioro de Calidad',
        description: 'Disminución gradual en puntuaciones de calidad',
        pattern: 'quality_decline',
        frequency: 23,
        suppliers: ['4', '6'],
        impact: 'negative',
        confidence: 78,
        lastDetected: '2024-01-14'
      },
      {
        id: '3',
        name: 'Mejora en Entregas',
        description: 'Mejora consistente en tiempos de entrega',
        pattern: 'delivery_improvement',
        frequency: 67,
        suppliers: ['2', '5'],
        impact: 'positive',
        confidence: 84,
        lastDetected: '2024-01-13'
      },
      {
        id: '4',
        name: 'Concentración de Riesgo',
        description: 'Dependencia excesiva de pocos proveedores',
        pattern: 'risk_concentration',
        frequency: 45,
        suppliers: ['1', '3'],
        impact: 'negative',
        confidence: 71,
        lastDetected: '2024-01-12'
      }
    ]

    const mockInsights: SegmentationInsight[] = [
      {
        id: '1',
        type: 'opportunity',
        title: 'Oportunidad de Consolidación',
        description: 'Los proveedores estratégicos muestran capacidad para manejar mayor volumen',
        affectedSegments: ['1'],
        priority: 'high',
        actionRequired: true,
        recommendations: ['Consolidar pedidos', 'Negociar mejores términos', 'Reducir base de proveedores'],
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        type: 'risk',
        title: 'Deterioro en Segmento de Riesgo',
        description: 'Los proveedores de riesgo muestran tendencia negativa continua',
        affectedSegments: ['3'],
        priority: 'high',
        actionRequired: true,
        recommendations: ['Implementar planes de mejora', 'Buscar proveedores alternativos', 'Establecer penalizaciones'],
        createdAt: '2024-01-14'
      },
      {
        id: '3',
        type: 'trend',
        title: 'Crecimiento en Sostenibilidad',
        description: 'Aumento en demanda de proveedores sostenibles',
        affectedSegments: ['4'],
        priority: 'medium',
        actionRequired: false,
        recommendations: ['Expandir criterios sostenibles', 'Buscar más proveedores verdes', 'Certificaciones ambientales'],
        createdAt: '2024-01-13'
      },
      {
        id: '4',
        type: 'anomaly',
        title: 'Patrón Inusual de Pedidos',
        description: 'Cambio inesperado en patrones de pedidos de proveedores en desarrollo',
        affectedSegments: ['2'],
        priority: 'medium',
        actionRequired: false,
        recommendations: ['Investigar causas', 'Ajustar pronósticos', 'Comunicación con proveedores'],
        createdAt: '2024-01-12'
      }
    ]

    setSuppliers(mockSuppliers)
    setSegments(mockSegments)
    setSegmentationRules(mockRules)
    setBehaviorPatterns(mockPatterns)
    setInsights(mockInsights)
  }, [])

  const runAutomaticSegmentation = async () => {
    setIsAnalyzing(true)
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsAnalyzing(false)
    
    // Here would be the actual ML/AI logic to analyze supplier behavior
    // and create/update segments automatically
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSegment = selectedSegment === 'all' || 
      segments.find(s => s.id === selectedSegment)?.suppliers.includes(supplier.id)
    return matchesSearch && matchesSegment
  })

  const getSupplierSegment = (supplierId: string) => {
    return segments.find(segment => segment.suppliers.includes(supplierId))
  }

  const getSegmentColor = (segmentId: string) => {
    return segments.find(s => s.id === segmentId)?.color || '#6B7280'
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'trend': return <BarChart3 className="h-4 w-4 text-blue-500" />
      case 'anomaly': return <Zap className="h-4 w-4 text-yellow-500" />
      default: return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const getPatternImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      case 'neutral': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  // Chart data
  const segmentDistributionData = segments.map(segment => ({
    name: segment.name,
    value: segment.suppliers.length,
    color: segment.color
  }))

  const performanceBySegmentData = segments.map(segment => ({
    name: segment.name.replace('Proveedores ', ''),
    rating: segment.performance.averageRating,
    delivery: segment.performance.deliveryPerformance,
    value: segment.performance.totalValue / 1000
  }))

  const riskDistributionData = [
    { name: 'Bajo Riesgo', value: suppliers.filter(s => s.riskLevel === 'low').length, color: '#10B981' },
    { name: 'Riesgo Medio', value: suppliers.filter(s => s.riskLevel === 'medium').length, color: '#F59E0B' },
    { name: 'Alto Riesgo', value: suppliers.filter(s => s.riskLevel === 'high').length, color: '#EF4444' }
  ]

  const behaviorTrendData = behaviorPatterns.map(pattern => ({
    name: pattern.name,
    frequency: pattern.frequency,
    confidence: pattern.confidence,
    impact: pattern.impact === 'positive' ? 1 : pattern.impact === 'negative' ? -1 : 0
  }))

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
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={runAutomaticSegmentation} disabled={isAnalyzing}>
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="patterns">Patrones de Comportamiento</TabsTrigger>
          <TabsTrigger value="rules">Reglas de Segmentación</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métricas Generales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Proveedores</p>
                    <p className="text-2xl font-bold">{suppliers.length}</p>
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
                    <p className="text-2xl font-bold">{segments.length}</p>
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
                    <p className="text-2xl font-bold">{behaviorPatterns.length}</p>
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
                    <p className="text-2xl font-bold">{insights.length}</p>
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
                        data={segmentDistributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                      >
                        {segmentDistributionData.map((entry, index) => (
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
                    <BarChart data={performanceBySegmentData}>
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
                        data={riskDistributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                      >
                        {riskDistributionData.map((entry, index) => (
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
                    <ScatterChart data={behaviorTrendData}>
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
                        Segmentos afectados: {insight.affectedSegments.map(id => 
                          segments.find(s => s.id === id)?.name
                        ).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los segmentos</SelectItem>
                  {segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={showSegmentDialog} onOpenChange={setShowSegmentDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Segmento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" aria-labelledby="segment-create-title">
                <DialogHeader>
                  <DialogTitle id="segment-create-title">Crear Nuevo Segmento</DialogTitle>
                  <DialogDescription>
                    Define un nuevo segmento de proveedores
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="segmentName">Nombre del Segmento</Label>
                      <Input
                        id="segmentName"
                        value={newSegment.name}
                        onChange={(e) => setNewSegment(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ej: Proveedores Premium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="segmentColor">Color</Label>
                      <Input
                        id="segmentColor"
                        type="color"
                        value={newSegment.color}
                        onChange={(e) => setNewSegment(prev => ({ ...prev, color: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="segmentDescription">Descripción</Label>
                    <Textarea
                      id="segmentDescription"
                      value={newSegment.description}
                      onChange={(e) => setNewSegment(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe las características de este segmento..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isAutomatic"
                      checked={newSegment.isAutomatic}
                      onCheckedChange={(checked) => setNewSegment(prev => ({ ...prev, isAutomatic: checked }))}
                    />
                    <Label htmlFor="isAutomatic">Segmentación automática</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowSegmentDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setShowSegmentDialog(false)}>
                      Crear Segmento
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Segmentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {segments.map((segment) => (
              <Card key={segment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <div>
                        <CardTitle className="text-lg">{segment.name}</CardTitle>
                        <CardDescription>{segment.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {segment.isAutomatic && (
                        <Badge variant="outline">
                          <Brain className="h-3 w-3 mr-1" />
                          Automático
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Métricas del Segmento */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{segment.suppliers.length}</div>
                      <div className="text-sm text-muted-foreground">Proveedores</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{segment.performance.averageRating.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Rating Promedio</div>
                    </div>
                  </div>

                  {/* Características */}
                  <div>
                    <h4 className="font-medium mb-2">Características</h4>
                    <div className="flex flex-wrap gap-1">
                      {segment.characteristics.map((char, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Recomendaciones */}
                  <div>
                    <h4 className="font-medium mb-2">Recomendaciones</h4>
                    <ul className="space-y-1">
                      {segment.recommendations.slice(0, 2).map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Distribución de Riesgo */}
                  <div>
                    <h4 className="font-medium mb-2">Distribución de Riesgo</h4>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Bajo</div>
                        <Progress value={segment.performance.riskDistribution.low} className="h-2" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Medio</div>
                        <Progress value={segment.performance.riskDistribution.medium} className="h-2" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Alto</div>
                        <Progress value={segment.performance.riskDistribution.high} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lista de Proveedores */}
          <Card>
            <CardHeader>
              <CardTitle>Proveedores por Segmento</CardTitle>
              <CardDescription>
                {filteredSuppliers.length} proveedores encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSuppliers.map((supplier) => {
                  const segment = getSupplierSegment(supplier.id)
                  return (
                    <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
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
                            <Badge className={`${getPatternImpactColor(pattern.impact)} bg-opacity-10`}>
                              {pattern.impact === 'positive' ? 'Positivo' : 
                               pattern.impact === 'negative' ? 'Negativo' : 'Neutral'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <div className="text-sm font-medium">Frecuencia</div>
                              <div className="text-2xl font-bold">{pattern.frequency}%</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Confianza</div>
                              <div className="text-2xl font-bold">{pattern.confidence}%</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Proveedores</div>
                              <div className="text-2xl font-bold">{pattern.suppliers.length}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Última detección: {pattern.lastDetected}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Reglas de Segmentación</h2>
              <p className="text-muted-foreground">
                Configura reglas automáticas para la segmentación de proveedores
              </p>
            </div>
            <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Regla
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl" aria-labelledby="segment-rule-create-title">
                <DialogHeader>
                  <DialogTitle id="segment-rule-create-title">Crear Nueva Regla de Segmentación</DialogTitle>
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
                        value={newRule.name}
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
                      value={newRule.description}
                      onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe el propósito de esta regla..."
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
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setShowRuleDialog(false)}>
                      Crear Regla
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
                        <h4 className="font-medium">Condiciones:</h4>
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {index > 0 && condition.logicalOperator && (
                              <Badge variant="outline" className="text-xs">
                                {condition.logicalOperator}
                              </Badge>
                            )}
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {condition.field} {condition.operator} {
                                Array.isArray(condition.value) 
                                  ? condition.value.join(' - ')
                                  : condition.value
                              }
                            </code>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Proveedores afectados: {rule.supplierCount}</span>
                        <span>Última actualización: {rule.lastUpdated}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
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
                              {insight.affectedSegments.map(segmentId => {
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
                              {insight.recommendations.map((rec, index) => (
                                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Generado el: {insight.createdAt}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
