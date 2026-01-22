'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Filter, 
  X, 
  Calendar,
  Package,
  Users,
  TrendingUp,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterState {
  dateRange: string
  category: string
  status: string
  minAmount: string
  maxAmount: string
  searchTerm: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface InteractiveFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  className?: string
}

interface Category {
  id: string
  name: string
  count: number
}

interface FilterOption {
  value: string
  label: string
  count?: number
  color?: string
}

const DATE_RANGES: FilterOption[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'custom', label: 'Personalizado' }
]

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Todos', color: 'bg-gray-100' },
  { value: 'active', label: 'Activos', color: 'bg-green-100' },
  { value: 'low_stock', label: 'Stock Bajo', color: 'bg-yellow-100' },
  { value: 'out_of_stock', label: 'Sin Stock', color: 'bg-red-100' }
]

const SORT_OPTIONS: FilterOption[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'sales', label: 'Ventas' },
  { value: 'revenue', label: 'Ingresos' },
  { value: 'stock', label: 'Stock' },
  { value: 'date', label: 'Fecha' }
]

export default function InteractiveFilters({ onFiltersChange, className }: InteractiveFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30d',
    category: 'all',
    status: 'all',
    minAmount: '',
    maxAmount: '',
    searchTerm: '',
    sortBy: 'sales',
    sortOrder: 'desc'
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Simular carga de categorías
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true)
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockCategories: Category[] = [
        { id: 'all', name: 'Todas las categorías', count: 156 },
        { id: 'electronics', name: 'Electrónicos', count: 45 },
        { id: 'clothing', name: 'Ropa', count: 32 },
        { id: 'food', name: 'Alimentos', count: 28 },
        { id: 'books', name: 'Libros', count: 21 },
        { id: 'home', name: 'Hogar', count: 18 },
        { id: 'sports', name: 'Deportes', count: 12 }
      ]
      
      setCategories(mockCategories)
      setLoading(false)
    }

    loadCategories()
  }, [])

  // Contar filtros activos
  useEffect(() => {
    let count = 0
    if (filters.dateRange !== '30d') count++
    if (filters.category !== 'all') count++
    if (filters.status !== 'all') count++
    if (filters.minAmount) count++
    if (filters.maxAmount) count++
    if (filters.searchTerm) count++
    if (filters.sortBy !== 'sales' || filters.sortOrder !== 'desc') count++
    
    setActiveFiltersCount(count)
  }, [filters])

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      dateRange: '30d',
      category: 'all',
      status: 'all',
      minAmount: '',
      maxAmount: '',
      searchTerm: '',
      sortBy: 'sales',
      sortOrder: 'desc'
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const exportData = () => {
    // Implementar exportación de datos
    console.log('Exportando datos con filtros:', filters)
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} activos
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4" />
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
        
        <CardDescription>
          Personaliza la vista de datos con filtros inteligentes
        </CardDescription>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-6">
              {/* Búsqueda rápida */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Búsqueda rápida
                </Label>
                <Input
                  placeholder="Buscar productos, categorías..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilter('searchTerm', e.target.value)}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* Filtros principales */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Rango de fechas */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Período
                  </Label>
                  <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Categoría
                  </Label>
                  <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{category.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {category.count}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Estado
                  </Label>
                  <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", status.color)} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ordenamiento */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ordenar por
                  </Label>
                  <div className="flex gap-2">
                    <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3"
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Filtros de rango */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Rango de montos</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Monto mínimo</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount}
                      onChange={(e) => updateFilter('minAmount', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Monto máximo</Label>
                    <Input
                      type="number"
                      placeholder="Sin límite"
                      value={filters.maxAmount}
                      onChange={(e) => updateFilter('maxAmount', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filtros activos */}
              {activeFiltersCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium">Filtros activos</Label>
                  <div className="flex flex-wrap gap-2">
                    {filters.dateRange !== '30d' && (
                      <Badge variant="secondary" className="gap-1">
                        Período: {DATE_RANGES.find(r => r.value === filters.dateRange)?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => updateFilter('dateRange', '30d')}
                        />
                      </Badge>
                    )}
                    
                    {filters.category !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Categoría: {categories.find(c => c.id === filters.category)?.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => updateFilter('category', 'all')}
                        />
                      </Badge>
                    )}
                    
                    {filters.status !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Estado: {STATUS_OPTIONS.find(s => s.value === filters.status)?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => updateFilter('status', 'all')}
                        />
                      </Badge>
                    )}
                    
                    {filters.searchTerm && (
                      <Badge variant="secondary" className="gap-1">
                        Búsqueda: "{filters.searchTerm}"
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => updateFilter('searchTerm', '')}
                        />
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export type { FilterState }