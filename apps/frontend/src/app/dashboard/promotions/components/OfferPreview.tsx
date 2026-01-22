'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ExternalLink, Eye, Smartphone, Tablet, Monitor, AlertCircle, Package, Star, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/lib/api'

// Constants for configuration
const INITIAL_DISPLAY_COUNT = 4
const PRODUCTS_PER_LOAD = 4
const MAX_DISPLAY_COUNT = 12

interface Promotion {
  id: string
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
}

interface OfferPreviewProps {
  promotion: Promotion
}

interface OfferProduct {
  id: string
  name: string
  price: number
  stock: number
  brand?: string
  imageUrl?: string
  category?: string
  discountedPrice: number
  savings: number
  isAvailable: boolean
  rating?: number
  reviewCount?: number
}

export function OfferPreview({ promotion }: OfferPreviewProps) {
  const [products, setProducts] = useState<OfferProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT)
  const [sortBy, setSortBy] = useState<'savings' | 'price' | 'name' | 'stock'>('savings')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showOutOfStock, setShowOutOfStock] = useState(true)

  // Memoized calculation function for performance
  const calculateDiscountedPrice = useCallback((price: number) => {
    if (promotion.discountType === 'PERCENTAGE') {
      return price * (1 - promotion.discountValue / 100)
    }
    return Math.max(0, price - promotion.discountValue)
  }, [promotion.discountType, promotion.discountValue])

  // Memoized status calculation
  const status = useMemo(() => {
    const now = new Date()
    const start = new Date(promotion.startDate)
    const end = new Date(promotion.endDate)

    if (!promotion.isActive) return 'inactive'
    if (now < start) return 'scheduled'
    if (now > end) return 'expired'
    return 'active'
  }, [promotion.isActive, promotion.startDate, promotion.endDate])

  useEffect(() => {
    fetchOfferProducts()
  }, [promotion.id])

  const fetchOfferProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[OfferPreview] Fetching products for promotion:', promotion.id)
      
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const response = await api.get(`/promotions/${promotion.id}/products`)
      
      if (response.data?.success) {
        const productsData = response.data.data || []
        const productsWithDiscount = productsData.map((p: any) => ({
          ...p,
          stock: p.stock || Math.floor(Math.random() * 50) + 1, // Mock stock if not provided
          brand: p.brand || 'Marca Genérica',
          isAvailable: (p.stock || Math.floor(Math.random() * 50) + 1) > 0,
          rating: p.rating || (Math.random() * 2 + 3), // 3-5 stars
          reviewCount: p.reviewCount || Math.floor(Math.random() * 100) + 5,
          discountedPrice: calculateDiscountedPrice(p.price),
          savings: p.price - calculateDiscountedPrice(p.price)
        }))
        setProducts(productsWithDiscount)
      } else {
        console.log('[OfferPreview] API returned unsuccessful response')
        setProducts([])
      }
    } catch (error) {
      console.error('[OfferPreview] Error fetching products:', error)
      setError('Error al cargar productos. Mostrando datos de ejemplo.')
      
      // Enhanced fallback with more realistic mock data
      const mockProducts: OfferProduct[] = [
        {
          id: 'mock-offer-1',
          name: 'Laptop Gaming ROG Strix',
          price: 1200,
          stock: 3,
          brand: 'ASUS',
          imageUrl: '',
          category: 'Electrónicos',
          isAvailable: true,
          rating: 4.5,
          reviewCount: 89,
          discountedPrice: calculateDiscountedPrice(1200),
          savings: 1200 - calculateDiscountedPrice(1200)
        },
        {
          id: 'mock-offer-2', 
          name: 'Mouse Gaming Wireless',
          price: 80,
          stock: 15,
          brand: 'Logitech',
          imageUrl: '',
          category: 'Accesorios',
          isAvailable: true,
          rating: 4.2,
          reviewCount: 156,
          discountedPrice: calculateDiscountedPrice(80),
          savings: 80 - calculateDiscountedPrice(80)
        },
        {
          id: 'mock-offer-3',
          name: 'Monitor 4K 27"',
          price: 350,
          stock: 0,
          brand: 'Dell',
          imageUrl: '',
          category: 'Electrónicos',
          isAvailable: false,
          rating: 4.7,
          reviewCount: 203,
          discountedPrice: calculateDiscountedPrice(350),
          savings: 350 - calculateDiscountedPrice(350)
        },
        {
          id: 'mock-offer-4',
          name: 'Teclado Mecánico RGB',
          price: 120,
          stock: 8,
          brand: 'Corsair',
          imageUrl: '',
          category: 'Accesorios',
          isAvailable: true,
          rating: 4.3,
          reviewCount: 67,
          discountedPrice: calculateDiscountedPrice(120),
          savings: 120 - calculateDiscountedPrice(120)
        },
        {
          id: 'mock-offer-5',
          name: 'Auriculares Bluetooth Premium',
          price: 200,
          stock: 2,
          brand: 'Sony',
          imageUrl: '',
          category: 'Audio',
          isAvailable: true,
          rating: 4.6,
          reviewCount: 134,
          discountedPrice: calculateDiscountedPrice(200),
          savings: 200 - calculateDiscountedPrice(200)
        },
        {
          id: 'mock-offer-6',
          name: 'Webcam HD 1080p',
          price: 60,
          stock: 25,
          brand: 'Logitech',
          imageUrl: '',
          category: 'Accesorios',
          isAvailable: true,
          rating: 4.1,
          reviewCount: 78,
          discountedPrice: calculateDiscountedPrice(60),
          savings: 60 - calculateDiscountedPrice(60)
        }
      ]
      setProducts(mockProducts)
    } finally {
      setLoading(false)
    }
  }, [promotion.id, calculateDiscountedPrice])

  // Memoized filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    // Filter out of stock products if needed
    if (!showOutOfStock) {
      filtered = filtered.filter(p => p.stock > 0)
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'savings':
          return b.savings - a.savings
        case 'price':
          return a.discountedPrice - b.discountedPrice
        case 'name':
          return a.name.localeCompare(b.name)
        case 'stock':
          return b.stock - a.stock
        default:
          return 0
      }
    })

    return filtered
  }, [products, categoryFilter, showOutOfStock, sortBy])

  // Memoized displayed products with pagination
  const displayedProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(0, displayCount)
  }, [filteredAndSortedProducts, displayCount])

  // Extract categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))
    return uniqueCategories.sort()
  }, [products])

  // Pagination functions
  const showMoreProducts = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + PRODUCTS_PER_LOAD, filteredAndSortedProducts.length, MAX_DISPLAY_COUNT))
  }, [filteredAndSortedProducts.length])

  const showLessProducts = useCallback(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT)
  }, [])

  const viewModeConfig = {
    desktop: { width: '100%', icon: Monitor, label: 'Desktop', description: 'Vista completa de escritorio' },
    tablet: { width: '768px', icon: Tablet, label: 'Tablet', description: 'Vista de tablet (768px)' },
    mobile: { width: '375px', icon: Smartphone, label: 'Móvil', description: 'Vista móvil (375px)' }
  }

  const handleOpenInPublicSite = useCallback(() => {
    window.open(`/offers?promotion=${promotion.id}`, '_blank')
  }, [promotion.id])

  // Enhanced ProductCard component
  const ProductCard = useMemo(() => {
    return ({ product }: { product: OfferProduct }) => (
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
        <CardContent className="p-0">
          {/* Product Image with overlays */}
          <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-12 w-12 text-slate-400" />
              </div>
            )}
            
            {/* Badges overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              <Badge className="bg-red-600 text-white text-xs">
                -{promotion.discountType === 'PERCENTAGE' 
                  ? `${promotion.discountValue}%`
                  : `$${promotion.discountValue}`
                }
              </Badge>
              {product.stock <= 5 && product.stock > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Solo {product.stock}
                </Badge>
              )}
              {product.stock === 0 && (
                <Badge variant="secondary" className="text-xs">
                  Agotado
                </Badge>
              )}
            </div>

            {/* Rating overlay */}
            {product.rating && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {product.rating.toFixed(1)} ({product.reviewCount || 0})
              </div>
            )}
          </div>

          {/* Enhanced Product Info */}
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                {product.name}
              </h3>
              {product.brand && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {product.brand}
                </Badge>
              )}
            </div>
            
            {product.category && (
              <Badge variant="secondary" className="text-xs">
                {product.category}
              </Badge>
            )}
            
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-green-600">
                ${product.discountedPrice.toFixed(2)}
              </span>
              <span className="text-sm text-slate-500 line-through">
                ${product.price.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-600 font-medium">
                Ahorra ${product.savings.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {product.isAvailable ? 'Disponible' : 'No disponible'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [promotion.discountType, promotion.discountValue])

  // Enhanced ProductSkeleton component
  const ProductSkeleton = useMemo(() => {
    return () => (
      <Card className="overflow-hidden">
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 animate-pulse relative">
          {/* Skeleton badges */}
          <div className="absolute top-2 right-2 space-y-1">
            <div className="w-12 h-5 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
            <div className="w-16 h-4 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
          </div>
          {/* Skeleton rating */}
          <div className="absolute bottom-2 left-2 w-20 h-6 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1" />
            <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="flex gap-2 items-baseline">
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </Card>
    )
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-violet-600" />
            Vista Previa de Oferta
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Así se verá esta promoción en el sitio público
          </p>
        </div>
        
        <Button
          onClick={handleOpenInPublicSite}
          variant="outline"
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir en sitio público
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-200 text-sm">
                {error}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Selector */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Object.entries(viewModeConfig).map(([mode, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode as any)}
                className="gap-2"
                title={config.description}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </Button>
            )
          })}
        </div>
        
        {/* Viewport Info */}
        <div className="text-center text-sm text-slate-500">
          Vista: {viewModeConfig[viewMode].description}
        </div>
      </div>

      {/* Filter Controls */}
      {!loading && filteredAndSortedProducts.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center justify-center">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Mayor ahorro</SelectItem>
              <SelectItem value="price">Menor precio</SelectItem>
              <SelectItem value="name">Nombre A-Z</SelectItem>
              <SelectItem value="stock">Mayor stock</SelectItem>
            </SelectContent>
          </Select>

          {categories.length > 1 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.filter(cat => cat && cat.trim()).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-out-of-stock"
              checked={showOutOfStock}
              onCheckedChange={(checked) => setShowOutOfStock(checked === true)}
            />
            <label htmlFor="show-out-of-stock" className="text-sm">
              Mostrar sin stock
            </label>
          </div>
        </div>
      )}

      {/* Status Warning */}
      {status !== 'active' && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-200 text-sm">
                {status === 'scheduled' && 'Esta promoción aún no ha comenzado'}
                {status === 'expired' && 'Esta promoción ha expirado'}
                {status === 'inactive' && 'Esta promoción está inactiva'}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Los clientes no podrán ver esta oferta en el sitio público hasta que esté activa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Container */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6 flex justify-center">
        <div
          style={{ 
            width: viewModeConfig[viewMode].width,
            maxWidth: '100%',
            transition: 'width 0.3s ease'
          }}
          className="bg-white dark:bg-slate-950 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Offer Card Preview */}
          <div className="p-6 space-y-4">
            {/* Promotion Header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {promotion.name}
                </h2>
                <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                  {promotion.discountType === 'PERCENTAGE' 
                    ? `-${promotion.discountValue}%`
                    : `-$${promotion.discountValue}`
                  }
                </Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {promotion.description}
              </p>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-3" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No hay productos asociados a esta promoción
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    Agrega productos en la pestaña "Productos" para verlos aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.slice(0, 4).map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-400 text-sm">Sin imagen</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-600 text-white">
                            -{promotion.discountType === 'PERCENTAGE' 
                              ? `${promotion.discountValue}%`
                              : `$${promotion.discountValue}`
                            }
                          </Badge>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {product.name}
                        </h3>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-green-600">
                            ${product.discountedPrice.toFixed(2)}
                          </span>
                          <span className="text-sm text-slate-500 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-green-600">
                          Ahorra ${product.savings.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {products.length > 4 && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-500 pt-4">
                Y {products.length - 4} producto{products.length - 4 !== 1 ? 's' : ''} más...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Nota:</strong> Esta es una vista previa aproximada. El diseño final puede variar ligeramente según el dispositivo y navegador del cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
