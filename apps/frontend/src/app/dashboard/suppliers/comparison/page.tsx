'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, 
  Plus, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus,
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
  LineChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false });
const BarChart = lazyRecharts('BarChart');
const Bar = lazyRecharts('Bar');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const CartesianGrid = lazyRecharts('CartesianGrid');
const Tooltip = lazyRecharts('Tooltip');
const Legend = lazyRecharts('Legend');
const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const RadarChart = lazyRecharts('RadarChart');
const PolarGrid = lazyRecharts('PolarGrid');
const PolarAngleAxis = lazyRecharts('PolarAngleAxis');
const PolarRadiusAxis = lazyRecharts('PolarRadiusAxis');
const Radar = lazyRecharts('Radar');
const RechartsLineChart = lazyRecharts('LineChart');
const Line = lazyRecharts('Line');
const RechartsPieChart = lazyRecharts('PieChart');
const Cell = lazyRecharts('Cell');
const Pie = lazyRecharts('Pie');

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
}

interface ComparisonMetric {
  id: string
  name: string
  category: string
  unit: string
  description: string
  weight: number
  higherIsBetter: boolean
}

interface SupplierComparison {
  supplierId: string
  metrics: {
    [metricId: string]: {
      value: number
      score: number
      trend: 'up' | 'down' | 'stable'
      benchmark: number
    }
  }
  overallScore: number
  rank: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

interface ComparisonReport {
  id: string
  name: string
  suppliers: string[]
  metrics: string[]
  createdAt: string
  createdBy: string
  summary: {
    winner: string
    topMetrics: string[]
    keyInsights: string[]
  }
}

export default function SupplierComparisonPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [availableMetrics, setAvailableMetrics] = useState<ComparisonMetric[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<SupplierComparison[]>([])
  const [savedReports, setSavedReports] = useState<ComparisonReport[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [reportName, setReportName] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'radar' | 'bar' | 'detailed'>('table')

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
        phone: '+34 91 123 4567'
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
        phone: '+34 93 987 6543'
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
        phone: '+34 96 456 7890'
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
        phone: '+34 95 321 0987'
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
        phone: '+34 94 654 3210'
      }
    ]

    const mockMetrics: ComparisonMetric[] = [
      {
        id: 'price_competitiveness',
        name: 'Competitividad de Precios',
        category: 'Financiero',
        unit: 'score',
        description: 'Evaluación de precios comparados con el mercado',
        weight: 0.25,
        higherIsBetter: true
      },
      {
        id: 'delivery_performance',
        name: 'Rendimiento de Entrega',
        category: 'Operacional',
        unit: '%',
        description: 'Porcentaje de entregas a tiempo',
        weight: 0.20,
        higherIsBetter: true
      },
      {
        id: 'quality_score',
        name: 'Puntuación de Calidad',
        category: 'Calidad',
        unit: 'score',
        description: 'Evaluación general de calidad de productos/servicios',
        weight: 0.20,
        higherIsBetter: true
      },
      {
        id: 'response_time',
        name: 'Tiempo de Respuesta',
        category: 'Servicio',
        unit: 'horas',
        description: 'Tiempo promedio de respuesta a consultas',
        weight: 0.15,
        higherIsBetter: false
      },
      {
        id: 'reliability_score',
        name: 'Confiabilidad',
        category: 'Operacional',
        unit: 'score',
        description: 'Consistencia en el cumplimiento de compromisos',
        weight: 0.10,
        higherIsBetter: true
      },
      {
        id: 'innovation_index',
        name: 'Índice de Innovación',
        category: 'Estratégico',
        unit: 'score',
        description: 'Capacidad de innovación y mejora continua',
        weight: 0.10,
        higherIsBetter: true
      }
    ]

    const mockComparisonData: SupplierComparison[] = [
      {
        supplierId: '1',
        metrics: {
          price_competitiveness: { value: 85, score: 85, trend: 'up', benchmark: 75 },
          delivery_performance: { value: 94, score: 94, trend: 'stable', benchmark: 85 },
          quality_score: { value: 92, score: 92, trend: 'up', benchmark: 80 },
          response_time: { value: 2.5, score: 88, trend: 'down', benchmark: 4 },
          reliability_score: { value: 89, score: 89, trend: 'stable', benchmark: 82 },
          innovation_index: { value: 78, score: 78, trend: 'up', benchmark: 70 }
        },
        overallScore: 87.6,
        rank: 1,
        strengths: ['Excelente calidad', 'Entregas puntuales', 'Innovación tecnológica'],
        weaknesses: ['Precios ligeramente altos'],
        recommendations: ['Negociar descuentos por volumen', 'Explorar nuevos productos']
      },
      {
        supplierId: '2',
        metrics: {
          price_competitiveness: { value: 92, score: 92, trend: 'up', benchmark: 75 },
          delivery_performance: { value: 78, score: 78, trend: 'down', benchmark: 85 },
          quality_score: { value: 82, score: 82, trend: 'stable', benchmark: 80 },
          response_time: { value: 3.8, score: 72, trend: 'stable', benchmark: 4 },
          reliability_score: { value: 76, score: 76, trend: 'down', benchmark: 82 },
          innovation_index: { value: 65, score: 65, trend: 'stable', benchmark: 70 }
        },
        overallScore: 77.5,
        rank: 4,
        strengths: ['Precios muy competitivos', 'Buena relación calidad-precio'],
        weaknesses: ['Entregas inconsistentes', 'Baja innovación'],
        recommendations: ['Mejorar logística', 'Establecer SLAs más estrictos']
      },
      {
        supplierId: '3',
        metrics: {
          price_competitiveness: { value: 78, score: 78, trend: 'stable', benchmark: 75 },
          delivery_performance: { value: 96, score: 96, trend: 'up', benchmark: 85 },
          quality_score: { value: 95, score: 95, trend: 'up', benchmark: 80 },
          response_time: { value: 1.8, score: 95, trend: 'up', benchmark: 4 },
          reliability_score: { value: 93, score: 93, trend: 'up', benchmark: 82 },
          innovation_index: { value: 82, score: 82, trend: 'stable', benchmark: 70 }
        },
        overallScore: 89.8,
        rank: 1,
        strengths: ['Calidad excepcional', 'Muy confiable', 'Excelente servicio'],
        weaknesses: ['Precios premium'],
        recommendations: ['Considerar para productos críticos', 'Negociar contratos a largo plazo']
      },
      {
        supplierId: '4',
        metrics: {
          price_competitiveness: { value: 88, score: 88, trend: 'stable', benchmark: 75 },
          delivery_performance: { value: 72, score: 72, trend: 'down', benchmark: 85 },
          quality_score: { value: 75, score: 75, trend: 'down', benchmark: 80 },
          response_time: { value: 5.2, score: 58, trend: 'down', benchmark: 4 },
          reliability_score: { value: 68, score: 68, trend: 'down', benchmark: 82 },
          innovation_index: { value: 58, score: 58, trend: 'stable', benchmark: 70 }
        },
        overallScore: 69.8,
        rank: 5,
        strengths: ['Precios competitivos'],
        weaknesses: ['Baja confiabilidad', 'Entregas tardías', 'Servicio lento'],
        recommendations: ['Revisar contrato', 'Buscar alternativas', 'Establecer penalizaciones']
      },
      {
        supplierId: '5',
        metrics: {
          price_competitiveness: { value: 82, score: 82, trend: 'up', benchmark: 75 },
          delivery_performance: { value: 88, score: 88, trend: 'up', benchmark: 85 },
          quality_score: { value: 86, score: 86, trend: 'stable', benchmark: 80 },
          response_time: { value: 3.2, score: 78, trend: 'stable', benchmark: 4 },
          reliability_score: { value: 84, score: 84, trend: 'up', benchmark: 82 },
          innovation_index: { value: 91, score: 91, trend: 'up', benchmark: 70 }
        },
        overallScore: 84.8,
        rank: 2,
        strengths: ['Alta innovación', 'Sostenibilidad', 'Mejora continua'],
        weaknesses: ['Tiempo de respuesta mejorable'],
        recommendations: ['Ampliar colaboración', 'Explorar productos sostenibles']
      }
    ]

    const mockReports: ComparisonReport[] = [
      {
        id: '1',
        name: 'Comparativa Q4 2023',
        suppliers: ['1', '2', '3'],
        metrics: ['price_competitiveness', 'delivery_performance', 'quality_score'],
        createdAt: '2024-01-10',
        createdBy: 'Admin',
        summary: {
          winner: '3',
          topMetrics: ['quality_score', 'delivery_performance'],
          keyInsights: ['Premium Materials lidera en calidad', 'TechCorp mejor en innovación']
        }
      },
      {
        id: '2',
        name: 'Análisis de Proveedores Tecnológicos',
        suppliers: ['1', '5'],
        metrics: ['innovation_index', 'quality_score', 'response_time'],
        createdAt: '2024-01-08',
        createdBy: 'Manager',
        summary: {
          winner: '5',
          topMetrics: ['innovation_index'],
          keyInsights: ['EcoGreen destaca en innovación sostenible']
        }
      }
    ]

    setSuppliers(mockSuppliers)
    setAvailableMetrics(mockMetrics)
    setComparisonData(mockComparisonData)
    setSavedReports(mockReports)
    setSelectedMetrics(['price_competitiveness', 'delivery_performance', 'quality_score'])
  }, [])

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || supplier.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleSupplierToggle = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    )
  }

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    )
  }

  const runComparison = async () => {
    if (selectedSuppliers.length < 2) {
      alert('Selecciona al menos 2 proveedores para comparar')
      return
    }
    if (selectedMetrics.length === 0) {
      alert('Selecciona al menos 1 métrica para comparar')
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  const saveReport = () => {
    if (!reportName.trim()) {
      alert('Ingresa un nombre para el reporte')
      return
    }

    const newReport: ComparisonReport = {
      id: Date.now().toString(),
      name: reportName,
      suppliers: selectedSuppliers,
      metrics: selectedMetrics,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: 'Usuario Actual',
      summary: {
        winner: selectedSuppliers[0],
        topMetrics: selectedMetrics.slice(0, 2),
        keyInsights: ['Análisis personalizado generado']
      }
    }

    setSavedReports(prev => [newReport, ...prev])
    setReportName('')
    setShowSaveDialog(false)
  }

  const getSupplierName = (id: string) => {
    return suppliers.find(s => s.id === id)?.name || 'Desconocido'
  }

  const getMetricName = (id: string) => {
    return availableMetrics.find(m => m.id === id)?.name || 'Desconocido'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800'
    if (score >= 80) return 'bg-blue-100 text-blue-800'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Prepare chart data
  const selectedSuppliersData = selectedSuppliers.map(supplierId => {
    const supplier = suppliers.find(s => s.id === supplierId)
    const comparison = comparisonData.find(c => c.supplierId === supplierId)
    return {
      name: supplier?.name || 'Desconocido',
      ...selectedMetrics.reduce((acc, metricId) => {
        acc[metricId] = comparison?.metrics[metricId]?.score || 0
        return acc
      }, {} as any),
      overallScore: comparison?.overallScore || 0
    }
  })

  const radarData = selectedMetrics.map(metricId => {
    const metric = availableMetrics.find(m => m.id === metricId)
    const dataPoint: any = {
      metric: metric?.name || metricId,
      fullMark: 100
    }
    
    selectedSuppliers.forEach(supplierId => {
      const supplier = suppliers.find(s => s.id === supplierId)
      const comparison = comparisonData.find(c => c.supplierId === supplierId)
      dataPoint[supplier?.name || supplierId] = comparison?.metrics[metricId]?.score || 0
    })
    
    return dataPoint
  })

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Button 
          variant="ghost" 
          className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Análisis Comparativo de Proveedores</h1>
          <p className="text-muted-foreground">
            Compara proveedores con métricas detalladas y análisis avanzado
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button disabled={selectedSuppliers.length < 2}>
                <Download className="h-4 w-4 mr-2" />
                Guardar Reporte
              </Button>
            </DialogTrigger>
            <DialogContent aria-labelledby="save-report-title">
              <DialogHeader>
                <DialogTitle id="save-report-title">Guardar Reporte de Comparación</DialogTitle>
                <DialogDescription>
                  Guarda esta comparación para futuras referencias
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportName">Nombre del Reporte</Label>
                  <Input
                    id="reportName"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Ej: Comparativa Q1 2024"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveReport}>
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">Configuración</TabsTrigger>
          <TabsTrigger value="comparison" disabled={selectedSuppliers.length < 2}>
            Comparación
          </TabsTrigger>
          <TabsTrigger value="reports">Reportes Guardados</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selección de Proveedores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Seleccionar Proveedores
                </CardTitle>
                <CardDescription>
                  Elige los proveedores que deseas comparar (mínimo 2)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar proveedores..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      <SelectItem value="Tecnología">Tecnología</SelectItem>
                      <SelectItem value="Suministros">Suministros</SelectItem>
                      <SelectItem value="Materiales">Materiales</SelectItem>
                      <SelectItem value="Logística">Logística</SelectItem>
                      <SelectItem value="Sostenibilidad">Sostenibilidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {filteredSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSuppliers.includes(supplier.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => handleSupplierToggle(supplier.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedSuppliers.includes(supplier.id)}
                              onChange={() => {}}
                            />
                            <div>
                              <div className="font-medium">{supplier.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {supplier.category} • {supplier.location}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{supplier.rating}</span>
                            </div>
                            <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                              {supplier.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="text-sm text-muted-foreground">
                  {selectedSuppliers.length} proveedores seleccionados
                </div>
              </CardContent>
            </Card>

            {/* Selección de Métricas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Seleccionar Métricas
                </CardTitle>
                <CardDescription>
                  Elige las métricas para la comparación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {availableMetrics.map((metric) => (
                      <div
                        key={metric.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMetrics.includes(metric.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => handleMetricToggle(metric.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedMetrics.includes(metric.id)}
                            onChange={() => {}}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{metric.name}</div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {metric.description}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Categoría: {metric.category}</span>
                              <span>Peso: {(metric.weight * 100).toFixed(0)}%</span>
                              <Badge variant="outline" className="text-xs">
                                {metric.unit}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="text-sm text-muted-foreground mt-4">
                  {selectedMetrics.length} métricas seleccionadas
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={runComparison}
              disabled={selectedSuppliers.length < 2 || selectedMetrics.length === 0 || isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ejecutar Comparación
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {selectedSuppliers.length >= 2 && (
            <>
              {/* Resumen General */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Comparación</CardTitle>
                  <CardDescription>
                    Comparando {selectedSuppliers.length} proveedores con {selectedMetrics.length} métricas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedSuppliers.map((supplierId, index) => {
                      const supplier = suppliers.find(s => s.id === supplierId)
                      const comparison = comparisonData.find(c => c.supplierId === supplierId)
                      return (
                        <div key={supplierId} className="text-center p-4 border rounded-lg">
                          <div className="font-medium text-lg">{supplier?.name}</div>
                          <div className={`text-2xl font-bold ${getScoreColor(comparison?.overallScore || 0)}`}>
                            {(comparison?.overallScore || 0).toFixed(1)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Ranking #{comparison?.rank}
                          </div>
                          <Badge className={getScoreBadgeColor(comparison?.overallScore || 0)}>
                            {(comparison?.overallScore || 0) >= 90 ? 'Excelente' :
                             (comparison?.overallScore || 0) >= 80 ? 'Muy Bueno' :
                             (comparison?.overallScore || 0) >= 70 ? 'Bueno' : 'Regular'}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Modos de Visualización */}
              <Card>
                <CardHeader>
                  <CardTitle>Visualización de Datos</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      Tabla
                    </Button>
                    <Button
                      variant={viewMode === 'radar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('radar')}
                    >
                      Radar
                    </Button>
                    <Button
                      variant={viewMode === 'bar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('bar')}
                    >
                      Barras
                    </Button>
                    <Button
                      variant={viewMode === 'detailed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('detailed')}
                    >
                      Detallado
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Proveedor</th>
                            {selectedMetrics.map(metricId => (
                              <th key={metricId} className="text-center p-2">
                                {getMetricName(metricId)}
                              </th>
                            ))}
                            <th className="text-center p-2">Puntuación General</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSuppliers.map(supplierId => {
                            const supplier = suppliers.find(s => s.id === supplierId)
                            const comparison = comparisonData.find(c => c.supplierId === supplierId)
                            return (
                              <tr key={supplierId} className="border-b hover:bg-muted/50">
                                <td className="p-2 font-medium">{supplier?.name}</td>
                                {selectedMetrics.map(metricId => {
                                  const metric = comparison?.metrics[metricId]
                                  return (
                                    <td key={metricId} className="text-center p-2">
                                      <div className="flex items-center justify-center gap-1">
                                        <span className={getScoreColor(metric?.score ?? 0)}>
                                          {(metric?.score ?? 0).toFixed(0)}
                                        </span>
                                        {getTrendIcon(metric?.trend || 'stable')}
                                      </div>
                                    </td>
                                  )
                                })}
                                <td className="text-center p-2">
                                  <span className={`font-bold ${getScoreColor(comparison?.overallScore || 0)}`}>
                                    {(comparison?.overallScore || 0).toFixed(1)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {viewMode === 'radar' && (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          {selectedSuppliers.map((supplierId, index) => {
                            const supplier = suppliers.find(s => s.id === supplierId)
                            return (
                              <Radar
                                key={supplierId}
                                name={supplier?.name || `Supplier ${index + 1}`}
                                dataKey={supplier?.name || `supplier_${supplierId}`}
                                stroke={COLORS[index % COLORS.length]}
                                fill={COLORS[index % COLORS.length]}
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                            )
                          })}
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {viewMode === 'bar' && (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedSuppliersData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {selectedMetrics.map((metricId, index) => (
                            <Bar
                              key={metricId}
                              dataKey={metricId}
                              name={getMetricName(metricId)}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {viewMode === 'detailed' && (
                    <div className="space-y-6">
                      {selectedSuppliers.map(supplierId => {
                        const supplier = suppliers.find(s => s.id === supplierId)
                        const comparison = comparisonData.find(c => c.supplierId === supplierId)
                        return (
                          <Card key={supplierId}>
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle>{supplier?.name}</CardTitle>
                                  <CardDescription>
                                    {supplier?.category} • Ranking #{comparison?.rank}
                                  </CardDescription>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${getScoreColor(comparison?.overallScore || 0)}`}>
                                    {(comparison?.overallScore || 0).toFixed(1)}
                                  </div>
                                  <Badge className={getScoreBadgeColor(comparison?.overallScore || 0)}>
                                    {(comparison?.overallScore || 0) >= 90 ? 'Excelente' :
                                     (comparison?.overallScore || 0) >= 80 ? 'Muy Bueno' :
                                     (comparison?.overallScore || 0) >= 70 ? 'Bueno' : 'Regular'}
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Métricas */}
                              <div>
                                <h4 className="font-medium mb-3">Métricas Detalladas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedMetrics.map(metricId => {
                                    const metric = availableMetrics.find(m => m.id === metricId)
                                    const data = comparison?.metrics[metricId]
                                    return (
                                      <div key={metricId} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-medium">{metric?.name}</span>
                                          <div className="flex items-center gap-1">
                                            <span className={getScoreColor(data?.score ?? 0)}>
                                              {(data?.score ?? 0).toFixed(0)}
                                            </span>
                                            {getTrendIcon(data?.trend || 'stable')}
                                          </div>
                                        </div>
                                        <Progress value={data?.score || 0} className="h-2" />
                                        <div className="text-xs text-muted-foreground">
                                          Valor: {data?.value} {metric?.unit} • Benchmark: {data?.benchmark}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              <Separator />

                              {/* Fortalezas y Debilidades */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2 text-green-600">Fortalezas</h4>
                                  <ul className="space-y-1">
                                    {(comparison?.strengths ?? []).map((strength, index) => (
                                      <li key={index} className="text-sm flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        {strength}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2 text-red-600">Áreas de Mejora</h4>
                                  <ul className="space-y-1">
                                    {(comparison?.weaknesses ?? []).map((weakness, index) => (
                                      <li key={index} className="text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        {weakness}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <Separator />

                              {/* Recomendaciones */}
                              <div>
                                <h4 className="font-medium mb-2">Recomendaciones</h4>
                                <ul className="space-y-1">
                                  {(comparison?.recommendations ?? []).map((recommendation, index) => (
                                    <li key={index} className="text-sm flex items-center gap-2">
                                      <Award className="h-4 w-4 text-blue-500" />
                                      {recommendation}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reportes Guardados</CardTitle>
              <CardDescription>
                Historial de comparaciones anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedReports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-medium">{report.name}</h3>
                          <div className="text-sm text-muted-foreground">
                            Creado el {report.createdAt} por {report.createdBy}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {report.suppliers.length} proveedores
                            </Badge>
                            <Badge variant="outline">
                              {report.metrics.length} métricas
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <strong>Ganador:</strong> {getSupplierName(report.summary.winner)}
                          </div>
                          <div className="text-sm">
                            <strong>Métricas destacadas:</strong> {report.summary.topMetrics.map(getMetricName).join(', ')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Ver Detalles
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
