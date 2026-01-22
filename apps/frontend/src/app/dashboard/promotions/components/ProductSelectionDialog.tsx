'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Package, Check, Loader2, FilterX, AlertTriangle, Star, TrendingUp, DollarSign, Zap, Filter, SortAsc, SortDesc, Grid, List, Bookmark, BookmarkCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/useDebounce'

// Business Rules Constants
const MAX_PRODUCTS_PER_PROMOTION = 50
const MIN_PRODUCTS_FOR_PROMOTION = 1
const PRODUCTS_PER_PAGE = 18 // Increased from 12 to 18 for better visibility

interface Product {
  id: string
  name: string
  price?: number // Made optional to handle API variations
  imageUrl?: string
  category?: string
  categoryName?: string // Backend might return category object or name
  stock?: number // Made optional to handle API variations
  salePrice?: number // Backend might use salePrice
  brand?: string
  rating?: number
  reviewCount?: number
  isPopular?: boolean
  isFeatured?: boolean
  tags?: string[]
}

interface ProductSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (productIds: string[]) => void
  excludeProductIds?: string[]
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  maxProducts?: number // Allow customization of max products
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  excludeProductIds = [],
  discountType,
  discountValue,
  maxProducts = MAX_PRODUCTS_PER_PROMOTION,
}: ProductSelectionDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Advanced filtering and sorting
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating' | 'popularity' | 'savings'>('savings')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1600])
  const [showOnlyInStock, setShowOnlyInStock] = useState(false)
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Quick filters
  const [quickFilter, setQuickFilter] = useState<'all' | 'popular' | 'featured' | 'high-rated' | 'best-savings'>('all')
  
  // Favorites/bookmarks
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  const { toast } = useToast()
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Calculate discounted price helper
  const calculateDiscountedPrice = useCallback((price: number) => {
    if (discountType === 'PERCENTAGE') {
      return price * (1 - discountValue / 100)
    } else {
      return Math.max(0, price - discountValue)
    }
  }, [discountType, discountValue])

  // Server-side filtering and pagination - products come pre-filtered from API
  const filteredProducts = products
  const paginatedProducts = products // Products are already paginated from server

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, categoryFilter])

  // Validation helpers
  const isSelectionValid = selectedIds.size >= MIN_PRODUCTS_FOR_PROMOTION && selectedIds.size <= maxProducts
  const isAtMaxLimit = selectedIds.size >= maxProducts
  const selectionError = useMemo(() => {
    if (selectedIds.size === 0) return null
    if (selectedIds.size > maxProducts) return `Máximo ${maxProducts} productos permitidos`
    return null
  }, [selectedIds.size, maxProducts])

  // Fetch products from Supabase API with advanced filtering and pagination
  const fetchProducts = useCallback(async (pageNum: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[ProductSelectionDialog] Loading products from API...', {
        page: pageNum,
        search: debouncedSearch,
        category: categoryFilter,
        priceRange,
        sortBy,
        sortOrder
      })
      
      // Build API parameters
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: PRODUCTS_PER_PAGE.toString(),
        sortBy,
        sortOrder,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
        showOnlyInStock: showOnlyInStock.toString(),
        showOnlyFeatured: showOnlyFeatured.toString()
      })
      
      if (debouncedSearch && debouncedSearch.trim()) {
        params.append('q', debouncedSearch.trim())
      }
      
      if (categoryFilter !== 'all') {
        params.append('categoryId', categoryFilter)
      }
      
      const response = await fetch(`/api/products/public?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Error loading products')
      }
      
      if (!data.success) {
        throw new Error(data.message || 'API returned error')
      }
      
      // Filter out already associated products
      const availableProducts = (data.products || []).filter(
        (p: Product) => !excludeProductIds.includes(String(p.id))
      )
      
      setProducts(availableProducts)
      
      // Update pagination info from server
      if (data.pagination) {
        setTotalProducts(data.pagination.total)
        setTotalPages(data.pagination.pages)
      }
      
      console.log('[ProductSelectionDialog] Products loaded successfully', {
        count: availableProducts.length,
        total: data.pagination?.total || 0,
        page: pageNum
      })
      
    } catch (error) {
      console.error('Error fetching products from API:', error)
      setError('Error al cargar productos. Intentando con datos de respaldo...')
      
      // Fallback to mock data if API fails
      const fallbackProducts: Product[] = [
        {
          id: 'mock-1',
          name: 'Producto de Respaldo 1',
          price: 100,
          imageUrl: '',
          category: 'General',
          stock: 10,
          brand: 'Fallback',
          rating: 4.0,
          reviewCount: 50,
          isPopular: false,
          isFeatured: false,
          tags: ['respaldo', 'offline']
        },
        {
          id: 'mock-2',
          name: 'Producto de Respaldo 2',
          price: 200,
          imageUrl: '',
          category: 'General',
          stock: 5,
          brand: 'Fallback',
          rating: 3.8,
          reviewCount: 25,
          isPopular: false,
          isFeatured: false,
          tags: ['respaldo', 'offline']
        }
      ]

      // Filter out already associated products
      const availableProducts = fallbackProducts.filter(
        (p: Product) => !excludeProductIds.includes(String(p.id))
      )

      setProducts(availableProducts)
      
      // Set fallback categories
      setCategories(['General'])
    } finally {
      setLoading(false)
    }
  }, [excludeProductIds, debouncedSearch, categoryFilter, priceRange, sortBy, sortOrder, showOnlyInStock, showOnlyFeatured])

  const fetchCategories = useCallback(async () => {
    try {
      console.log('[ProductSelectionDialog] Loading categories from API...')
      
      const response = await fetch('/api/products/categories')
      const data = await response.json()
      
      if (response.ok && data.success) {
        const categoryNames = (data.categories || []).map((cat: any) => cat.name)
        setCategories(categoryNames.sort())
        console.log('[ProductSelectionDialog] Categories loaded:', categoryNames.length)
      } else {
        console.warn('Failed to load categories, using fallback')
        setCategories(['General', 'Electrónicos', 'Accesorios'])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories(['General', 'Electrónicos', 'Accesorios'])
    }
  }, [])

  // Initial fetch for categories and default products
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
      setSearchTerm('')
      setCategoryFilter('all')
      setCurrentPage(1)
      setError(null)
      fetchCategories()
      fetchProducts(1)
    }
  }, [open, fetchCategories, fetchProducts])

  // Fetch products when filters change
  useEffect(() => {
    if (open) {
      fetchProducts(currentPage)
    }
  }, [open, currentPage, debouncedSearch, categoryFilter, priceRange, sortBy, sortOrder, showOnlyInStock, showOnlyFeatured, fetchProducts])


  const toggleProduct = useCallback((productId: string) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(productId)) {
        newSelected.delete(productId)
      } else {
        // Check if adding this product would exceed the limit
        if (newSelected.size >= maxProducts) {
          toast({
            title: "Límite alcanzado",
            description: `Máximo ${maxProducts} productos por promoción`,
            variant: "destructive"
          })
          return prev
        }
        newSelected.add(productId)
      }
      return newSelected
    })
  }, [maxProducts, toast])

  const toggleFavorite = useCallback((productId: string) => {
    setFavoriteIds(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId)
      } else {
        newFavorites.add(productId)
      }
      return newFavorites
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === paginatedProducts.length) {
      setSelectedIds(new Set())
    } else {
      const newSelection = new Set(selectedIds)
      paginatedProducts.forEach(p => {
        if (newSelection.size < maxProducts) {
          newSelection.add(p.id)
        }
      })
      
      if (newSelection.size >= maxProducts && paginatedProducts.length > maxProducts - selectedIds.size) {
        toast({
          title: "Límite alcanzado",
          description: `Solo se pueden seleccionar ${maxProducts} productos máximo`,
          variant: "destructive"
        })
      }
      
      setSelectedIds(newSelection)
    }
  }, [selectedIds, paginatedProducts, maxProducts, toast])

  const handleConfirm = useCallback(() => {
    // Validation
    if (selectedIds.size === 0) {
      toast({
        title: "Selección requerida",
        description: "Selecciona al menos un producto para continuar",
        variant: "destructive"
      })
      return
    }

    if (selectedIds.size < MIN_PRODUCTS_FOR_PROMOTION) {
      toast({
        title: "Selección insuficiente",
        description: `Selecciona al menos ${MIN_PRODUCTS_FOR_PROMOTION} producto(s)`,
        variant: "destructive"
      })
      return
    }

    if (selectedIds.size > maxProducts) {
      toast({
        title: "Demasiados productos",
        description: `Máximo ${maxProducts} productos permitidos`,
        variant: "destructive"
      })
      return
    }

    // Success feedback
    toast({
      title: "Productos seleccionados",
      description: `${selectedIds.size} producto(s) serán asociados a la promoción`,
    })

    onConfirm(Array.from(selectedIds))
  }, [selectedIds, maxProducts, toast, onConfirm])

  // Memoized ProductCard component for performance
  const ProductCard = useMemo(() => {
    return ({ product, isSelected, onToggle }: { 
      product: Product; 
      isSelected: boolean; 
      onToggle: (id: string) => void 
    }) => {
      // Ensure price is a valid number - handle multiple price field names
      const productPrice = Number(product.salePrice || product.price || 0)
      const discountedPrice = productPrice > 0 ? calculateDiscountedPrice(productPrice) : 0
      const savings = productPrice > 0 ? productPrice - discountedPrice : 0
      const isFavorite = favoriteIds.has(product.id)

      return (
        <div
          className={`
            group relative flex p-3 rounded-lg border transition-all duration-200 cursor-pointer
            ${isSelected
              ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-900/10 shadow-[0_0_0_1px_rgba(124,58,237,1)]'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md'
            }
            ${isAtMaxLimit && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
            ${viewMode === 'list' ? 'flex-row items-center min-h-[80px]' : 'flex-col min-h-[200px]'}
          `}
        >
          {/* Top Row: Selection Checkbox and Favorite */}
          <div className="absolute top-3 right-3 z-10 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(product.id)
              }}
              className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isFavorite ? (
                <BookmarkCheck className="h-4 w-4 text-yellow-500" />
              ) : (
                <Bookmark className="h-4 w-4 text-slate-400" />
              )}
            </Button>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(product.id)}
              onClick={(e) => e.stopPropagation()}
              disabled={isAtMaxLimit && !isSelected}
              className={`
                h-5 w-5 border-2 
                ${isSelected
                  ? 'data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }
              `}
            />
          </div>

          <div 
            onClick={() => onToggle(product.id)}
            className={`flex gap-3 mb-3 ${viewMode === 'list' ? 'flex-1' : ''}`}
          >
            {/* Product Image */}
            <div className="flex-shrink-0">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={`object-cover rounded-lg border border-slate-100 dark:border-slate-800 ${
                    viewMode === 'list' ? 'w-10 h-10' : 'w-12 h-12'
                  }`}
                  loading="lazy"
                />
              ) : (
                <div className={`bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 ${
                  viewMode === 'list' ? 'w-10 h-10' : 'w-12 h-12'
                }`}>
                  <Package className={viewMode === 'list' ? 'h-5 w-5' : 'h-6 w-6'} />
                </div>
              )}
            </div>

            <div className="flex-1 pr-8">
              {/* Product Name and Badges */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100 line-clamp-2">
                  {product.name}
                </h4>
                <div className="flex gap-1 ml-2">
                  {product.isPopular && (
                    <div title="Popular">
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                    </div>
                  )}
                  {product.isFeatured && (
                    <div title="Destacado">
                      <Star className="h-3 w-3 text-yellow-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Rating and Reviews */}
              {product.rating && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">
                      {product.rating.toFixed(1)}
                    </span>
                  </div>
                  {product.reviewCount && (
                    <span className="text-xs text-slate-500">
                      ({product.reviewCount} reviews)
                    </span>
                  )}
                </div>
              )}

              {/* Tags and Category */}
              <div className="flex gap-1 flex-wrap mb-2">
                {product.category && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                )}
                {product.brand && (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    {product.brand}
                  </span>
                )}
                {product.tags?.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Stock Warning */}
              {(product.stock || 0) <= 5 && (product.stock || 0) > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mb-2">
                  <AlertTriangle className="h-3 w-3" />
                  Stock bajo: {product.stock || 0} unidades
                </div>
              )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className={`mt-auto pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 ${
            viewMode === 'list' ? 'min-w-[200px] flex-shrink-0' : ''
          }`}>
            {productPrice > 0 ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Precio Regular</span>
                  <span className="text-xs text-slate-500 line-through">${productPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Precio Promo
                    </span>
                    <span className="text-[10px] text-green-600/80">
                      Ahorras ${savings.toFixed(2)} ({((savings / productPrice) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600">${discountedPrice.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-2">
                <div className="text-center">
                  <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                    Precio no disponible
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Contactar para cotización</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Indication Border */}
          {isSelected && (
            <div className="absolute inset-0 border-2 border-violet-600 rounded-xl pointer-events-none" />
          )}
        </div>
      )
    }
  }, [calculateDiscountedPrice, isAtMaxLimit, favoriteIds, viewMode, toggleFavorite])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b bg-white dark:bg-slate-900 z-10 flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Seleccionar Productos
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Selecciona los productos que deseas asociar a esta promoción
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Fixed Controls Section */}
          <div className="p-4 pb-3 space-y-3 flex-shrink-0 bg-slate-50 dark:bg-slate-950">
          {/* Error Display */}
          {error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Search and Basic Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
              <Input
                placeholder="Buscar por nombre, marca, categoría o tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-violet-500/20 transition-all"
              />
            </div>

            {categories.length > 0 && (
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-full sm:w-[200px] h-11 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-11 px-3"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </TabsTrigger>
              <TabsTrigger value="sorting" className="flex items-center gap-2">
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                Ordenar
              </TabsTrigger>
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Rápido
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-2 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Rango de Precio: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    max={1600}
                    min={0}
                    step={25}
                    className="w-full"
                  />
                </div>

                {/* Stock Filter */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="in-stock"
                    checked={showOnlyInStock}
                    onCheckedChange={(checked) => setShowOnlyInStock(checked === true)}
                  />
                  <label htmlFor="in-stock" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Solo en stock
                  </label>
                </div>

                {/* Featured Filter */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={showOnlyFeatured}
                    onCheckedChange={(checked) => setShowOnlyFeatured(checked === true)}
                  />
                  <label htmlFor="featured" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Solo destacados
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sorting" className="space-y-2 mt-2">
              <div className="flex flex-wrap gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">💰 Mayor ahorro</SelectItem>
                    <SelectItem value="name">📝 Nombre</SelectItem>
                    <SelectItem value="price">💵 Precio</SelectItem>
                    <SelectItem value="rating">⭐ Calificación</SelectItem>
                    <SelectItem value="popularity">🔥 Popularidad</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-2"
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="quick" className="space-y-2 mt-2">
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                {[
                  { value: 'all', label: 'Todos', icon: '📦' },
                  { value: 'popular', label: 'Populares', icon: '🔥' },
                  { value: 'featured', label: 'Destacados', icon: '⭐' },
                  { value: 'high-rated', label: 'Mejor valorados', icon: '👍' },
                  { value: 'best-savings', label: 'Mayor ahorro', icon: '💰' }
                ].map(filter => (
                  <Button
                    key={filter.value}
                    variant={quickFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuickFilter(filter.value as any)}
                    className="flex items-center gap-1"
                  >
                    <span>{filter.icon}</span>
                    {filter.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Selection Status and Controls */}
          {filteredProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0}
                    onCheckedChange={toggleAll}
                    id="select-all"
                    disabled={isAtMaxLimit && selectedIds.size === 0}
                    className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    Seleccionar página ({selectedIds.size} de {filteredProducts.length})
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={`${
                        selectionError 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      }`}
                    >
                      {selectedIds.size} seleccionados
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500">
                    Máx: {maxProducts}
                  </span>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">{selectedIds.size} productos seleccionados</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                      className="h-7 text-xs"
                    >
                      Limpiar todo
                    </Button>
                    {favoriteIds.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSelection = new Set(selectedIds)
                          Array.from(favoriteIds).forEach(id => {
                            if (newSelection.size < maxProducts && filteredProducts.some(p => p.id === id)) {
                              newSelection.add(id)
                            }
                          })
                          setSelectedIds(newSelection)
                        }}
                        className="h-7 text-xs flex items-center gap-1"
                      >
                        <BookmarkCheck className="h-3 w-3" />
                        Agregar favoritos
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Selection Error/Warning */}
              {selectionError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                  <p className="text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {selectionError}
                  </p>
                </div>
              )}

              {/* Pagination Info */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Mostrando {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}
                  </span>
                  <span>
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Scrollable Products Section */}
          <div className="flex-1 min-h-0 px-4 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="pb-4 pr-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
                    <p className="text-sm text-slate-500 animate-pulse">Cargando productos...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <FilterX className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      No se encontraron productos
                    </h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                      {searchTerm
                        ? `No hay resultados para "${searchTerm}"`
                        : 'No hay productos disponibles para asociar'}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-violet-600 decoration-violet-600/30"
                      >
                        Borrar búsqueda
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={
                      viewMode === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 auto-rows-fr"
                        : "flex flex-col gap-3"
                    }>
                      {paginatedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          isSelected={selectedIds.has(product.id)}
                          onToggle={toggleProduct}
                        />
                      ))}
                    </div>

                    {/* Enhanced Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        {/* Pagination Info */}
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>
                            Mostrando {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>Productos por página:</span>
                            <Select
                              value={PRODUCTS_PER_PAGE.toString()}
                              onValueChange={(value) => {
                                // This would require updating the constant, for now just show the option
                                console.log('Products per page changed to:', value)
                              }}
                            >
                              <SelectTrigger className="w-16 h-7">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12">12</SelectItem>
                                <SelectItem value="18">18</SelectItem>
                                <SelectItem value="24">24</SelectItem>
                                <SelectItem value="36">36</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Pagination Navigation */}
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="h-8 px-3"
                          >
                            Primera
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 px-3"
                          >
                            Anterior
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                              let pageNum
                              if (totalPages <= 7) {
                                pageNum = i + 1
                              } else if (currentPage <= 4) {
                                pageNum = i + 1
                              } else if (currentPage >= totalPages - 3) {
                                pageNum = totalPages - 6 + i
                              } else {
                                pageNum = currentPage - 3 + i
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="h-8 w-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              )
                            })}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 px-3"
                          >
                            Siguiente
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="h-8 px-3"
                          >
                            Última
                          </Button>
                        </div>
                        
                        {/* Quick Jump */}
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="text-slate-500">Ir a página:</span>
                          <Input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value)
                              if (page >= 1 && page <= totalPages) {
                                setCurrentPage(page)
                              }
                            }}
                            className="w-16 h-7 text-center"
                          />
                          <span className="text-slate-500">de {totalPages}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 pt-3 border-t bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Selection Summary */}
            <div className="flex-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              {selectedIds.size > 0 && (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span>
                    {selectedIds.size} de {maxProducts} productos seleccionados
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-green-600 font-medium">
                      (${Array.from(selectedIds).reduce((total, id) => {
                        const product = products.find(p => p.id === id)
                        const productPrice = Number(product?.salePrice || product?.price || 0)
                        return total + (productPrice > 0 ? calculateDiscountedPrice(productPrice) : 0)
                      }, 0).toFixed(2)} total con descuento)
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="h-11 px-6"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isSelectionValid || !!selectionError}
                className={`
                  h-11 px-8 gap-2 transition-all duration-300
                  ${isSelectionValid && !selectionError
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                  }
                `}
              >
                <Check className="h-4 w-4" />
                <span>
                  {selectedIds.size === 0
                    ? 'Seleccionar productos'
                    : selectionError
                    ? 'Corregir selección'
                    : `Asociar ${selectedIds.size} producto${selectedIds.size !== 1 ? 's' : ''}`}
                </span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
