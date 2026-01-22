import { useState, useEffect, useCallback, useMemo } from 'react'

// Enhanced interfaces with better type safety
export interface Supplier {
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

export interface SegmentCondition {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export interface SegmentationRule {
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

export interface SegmentPerformance {
  averageRating: number
  totalValue: number
  averageOrderValue: number
  deliveryPerformance: number
  riskDistribution: { low: number; medium: number; high: number }
}

export interface Segment {
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
  performance: SegmentPerformance
}

export interface BehaviorPattern {
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

export interface SegmentationInsight {
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

export interface SegmentationFilters {
  searchTerm: string
  selectedSegment: string
  riskLevel?: 'low' | 'medium' | 'high'
  category?: string
  status?: 'active' | 'inactive' | 'pending'
}

export interface SegmentationState {
  suppliers: Supplier[]
  segments: Segment[]
  segmentationRules: SegmentationRule[]
  behaviorPatterns: BehaviorPattern[]
  insights: SegmentationInsight[]
  isLoading: boolean
  isAnalyzing: boolean
  error: string | null
  filters: SegmentationFilters
}

// Custom hook with retry logic and performance optimizations
export function useSupplierSegmentation() {
  const [state, setState] = useState<SegmentationState>({
    suppliers: [],
    segments: [],
    segmentationRules: [],
    behaviorPatterns: [],
    insights: [],
    isLoading: true,
    isAnalyzing: false,
    error: null,
    filters: {
      searchTerm: '',
      selectedSegment: 'all'
    }
  })

  // Retry logic with exponential backoff
  const fetchWithRetry = useCallback(async (
    fetchFn: () => Promise<any>,
    maxRetries = 3,
    baseDelay = 1000
  ) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fetchFn()
      } catch (error) {
        if (attempt === maxRetries - 1) throw error
        
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }, [])

  // Mock data generation with error simulation
  const generateMockData = useCallback(async (): Promise<Partial<SegmentationState>> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
    
    // Simulate occasional errors (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Failed to fetch segmentation data')
    }

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

    return {
      suppliers: mockSuppliers,
      segments: mockSegments,
      segmentationRules: mockRules,
      behaviorPatterns: mockPatterns,
      insights: mockInsights
    }
  }, [])

  // Load data with retry logic
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const data = await fetchWithRetry(generateMockData)
      setState(prev => ({
        ...prev,
        ...data,
        isLoading: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }))
    }
  }, [fetchWithRetry, generateMockData])

  // Run automatic segmentation analysis
  const runAutomaticSegmentation = useCallback(async () => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }))
    
    try {
      // Simulate AI analysis with potential failure
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000))
      
      if (Math.random() < 0.1) {
        throw new Error('AI analysis failed')
      }
      
      // In a real implementation, this would call the ML/AI service
      setState(prev => ({ ...prev, isAnalyzing: false }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }))
    }
  }, [])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SegmentationFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }))
  }, [])

  // Memoized filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return state.suppliers.filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(state.filters.searchTerm.toLowerCase())
      const matchesSegment = state.filters.selectedSegment === 'all' || 
        state.segments.find(s => s.id === state.filters.selectedSegment)?.suppliers.includes(supplier.id)
      const matchesRisk = !state.filters.riskLevel || supplier.riskLevel === state.filters.riskLevel
      const matchesCategory = !state.filters.category || supplier.category === state.filters.category
      const matchesStatus = !state.filters.status || supplier.status === state.filters.status
      
      return matchesSearch && matchesSegment && matchesRisk && matchesCategory && matchesStatus
    })
  }, [state.suppliers, state.segments, state.filters])

  // Memoized chart data
  const chartData = useMemo(() => {
    const segmentDistributionData = state.segments.map(segment => ({
      name: segment.name,
      value: segment.suppliers.length,
      color: segment.color
    }))

    const performanceBySegmentData = state.segments.map(segment => ({
      name: segment.name.replace('Proveedores ', ''),
      rating: segment.performance.averageRating,
      delivery: segment.performance.deliveryPerformance,
      value: segment.performance.totalValue / 1000
    }))

    const riskDistributionData = [
      { name: 'Bajo Riesgo', value: state.suppliers.filter(s => s.riskLevel === 'low').length, color: '#10B981' },
      { name: 'Riesgo Medio', value: state.suppliers.filter(s => s.riskLevel === 'medium').length, color: '#F59E0B' },
      { name: 'Alto Riesgo', value: state.suppliers.filter(s => s.riskLevel === 'high').length, color: '#EF4444' }
    ]

    const behaviorTrendData = state.behaviorPatterns.map(pattern => ({
      name: pattern.name,
      frequency: pattern.frequency,
      confidence: pattern.confidence,
      impact: pattern.impact === 'positive' ? 1 : pattern.impact === 'negative' ? -1 : 0
    }))

    return {
      segmentDistributionData,
      performanceBySegmentData,
      riskDistributionData,
      behaviorTrendData
    }
  }, [state.segments, state.suppliers, state.behaviorPatterns])

  // Utility functions
  const getSupplierSegment = useCallback((supplierId: string) => {
    return state.segments.find(segment => segment.suppliers.includes(supplierId))
  }, [state.segments])

  const getSegmentColor = useCallback((segmentId: string) => {
    return state.segments.find(s => s.id === segmentId)?.color || '#6B7280'
  }, [state.segments])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    ...state,
    filteredSuppliers,
    chartData,
    loadData,
    runAutomaticSegmentation,
    updateFilters,
    getSupplierSegment,
    getSegmentColor
  }
}