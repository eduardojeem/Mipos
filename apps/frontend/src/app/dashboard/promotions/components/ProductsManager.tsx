'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Package, Plus, ShoppingCart, Trash2, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Tooltip } from '@/components/ui/tooltip-simple'
import { cn } from '@/lib/utils'
import { usePromotionProducts } from '../hooks/usePromotionProducts'
import { ProductSelectionDialog } from './ProductSelectionDialog'
import { ProductFilters } from './ProductFilters'
import { ProductCard, ProductCardSkeleton } from './ProductCard'
import { useProductFilters, useFilteredProducts } from '@/hooks/useProductFilters'
import { usePaginatedData } from '@/hooks/usePagination'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { ErrorState, EmptyState } from '@/components/ui/states'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ProductsManagerProps {
  promotionId: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
}

export function ProductsManager({ promotionId, discountType, discountValue }: ProductsManagerProps) {
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false)
  const [productToRemove, setProductToRemove] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const { isMobile } = useResponsiveLayout()
  
  const { products, loading, error, refetch, addProducts, removeProduct } = usePromotionProducts(promotionId)
  
  // Filtros y búsqueda
  const { filters, setFilters, debouncedSearch, resetFilters, hasActiveFilters } = useProductFilters({
    sortBy: 'name',
    sortOrder: 'asc'
  })
  
  // Obtener categorías únicas
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))] as string[]
    return uniqueCategories.sort()
  }, [products])
  
  // Aplicar filtros
  const filteredProducts = useFilteredProducts(products, filters, debouncedSearch)
  
  // Paginación
  const {
    data: paginatedProducts,
    pagination,
    setPage,
    nextPage,
    prevPage
  } = usePaginatedData(filteredProducts, 1, isMobile ? 4 : 8)

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + p.price, 0)
    const totalDiscountedValue = products.reduce((sum, p) => {
      const discountedPrice = discountType === 'PERCENTAGE' 
        ? p.price * (1 - discountValue / 100)
        : Math.max(0, p.price - discountValue)
      return sum + discountedPrice
    }, 0)
    const totalSavings = totalValue - totalDiscountedValue
    const averageSavings = totalValue > 0 ? (totalSavings / totalValue) * 100 : 0
    
    return {
      totalValue,
      totalDiscountedValue,
      totalSavings,
      averageSavings,
      productCount: products.length
    }
  }, [products, discountType, discountValue])

  const handleAddProducts = useCallback(async (productIds: string[]) => {
    const result = await addProducts(productIds)
    
    if (result.success) {
      toast({
        title: 'Productos asociados',
        description: result.message || `${productIds.length} producto(s) asociado(s) exitosamente`,
      })
      setIsSelectionDialogOpen(false)
    } else {
      toast({
        title: 'Error',
        description: result.message || 'No se pudieron asociar los productos',
        variant: 'destructive',
      })
    }
  }, [addProducts, toast])

  const handleRemoveProduct = useCallback(async () => {
    if (!productToRemove) return

    const result = await removeProduct(productToRemove)
    
    if (result.success) {
      toast({
        title: 'Producto desasociado',
        description: result.message || 'Producto desasociado exitosamente',
      })
    } else {
      toast({
        title: 'Error',
        description: result.message || 'No se pudo desasociar el producto',
        variant: 'destructive',
      })
    }
    
    setProductToRemove(null)
  }, [productToRemove, removeProduct, toast])

  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }, [])

  const handleBulkRemove = useCallback(async () => {
    const promises = Array.from(selectedProducts).map(id => removeProduct(id))
    const results = await Promise.all(promises)
    
    const successCount = results.filter(r => r.success).length
    const errorCount = results.length - successCount
    
    if (successCount > 0) {
      toast({
        title: 'Productos desasociados',
        description: `${successCount} producto(s) desasociado(s) exitosamente`,
      })
    }
    
    if (errorCount > 0) {
      toast({
        title: 'Algunos errores',
        description: `${errorCount} producto(s) no pudieron ser desasociados`,
        variant: 'destructive',
      })
    }
    
    setSelectedProducts(new Set())
  }, [selectedProducts, removeProduct, toast])

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + A para seleccionar todos
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && filteredProducts.length > 0) {
        event.preventDefault()
        const allIds = new Set(filteredProducts.map(p => p.id))
        setSelectedProducts(allIds)
        toast({
          title: 'Productos seleccionados',
          description: `${allIds.size} productos seleccionados`,
        })
      }
      
      // Escape para deseleccionar todos
      if (event.key === 'Escape' && selectedProducts.size > 0) {
        setSelectedProducts(new Set())
        toast({
          title: 'Selección limpiada',
          description: 'Todos los productos deseleccionados',
        })
      }
      
      // Ctrl/Cmd + N para agregar productos
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        setIsSelectionDialogOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredProducts, selectedProducts.size, toast])

  if (error) {
    return (
      <ErrorState
        error={error}
        title="Error al cargar productos"
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header simplificado y claro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Productos en Promoción
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {metrics.productCount} productos
                {metrics.productCount > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                    • {metrics.averageSavings.toFixed(1)}% ahorro promedio
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Métricas destacadas solo si hay productos */}
          {metrics.productCount > 0 && (
            <div className="hidden lg:flex items-center gap-4 ml-6 pl-6 border-l border-slate-200 dark:border-slate-700">
              <Tooltip content={`Ahorro total de todos los productos: $${metrics.totalSavings.toFixed(2)}`}>
                <div className="text-center cursor-help transition-transform duration-200 hover:scale-105">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    ${metrics.totalSavings.toFixed(0)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Ahorro total
                  </div>
                </div>
              </Tooltip>
              <Tooltip content={`Valor final después de aplicar descuentos: $${metrics.totalDiscountedValue.toFixed(2)}`}>
                <div className="text-center cursor-help transition-transform duration-200 hover:scale-105">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    ${metrics.totalDiscountedValue.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Valor final
                  </div>
                </div>
              </Tooltip>
            </div>
          )}
        </div>
        
        <Tooltip content="Agregar productos (Ctrl+N)">
          <Button
            onClick={() => setIsSelectionDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span className="hidden sm:inline">Agregar Productos</span>
            <span className="sm:hidden">Agregar</span>
          </Button>
        </Tooltip>
      </div>

      {/* Filtros y búsqueda */}
      {products.length > 0 && (
        <ProductFilters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
      )}

      {/* Acciones masivas mejoradas */}
      {selectedProducts.size > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-violet-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                {selectedProducts.size}
              </div>
              <div>
                <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                </span>
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  Acciones disponibles para la selección
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProducts(new Set())}
                className="h-8 px-3 text-xs border-violet-300 text-violet-700 hover:bg-violet-100"
              >
                Deseleccionar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRemove}
                className="h-8 px-3 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remover seleccionados
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products List compacto */}
      {loading ? (
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {[...Array(Math.min(8, pagination.limit))].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 animate-pulse hover:animate-bounce transition-all duration-300">
            <ShoppingCart className="h-10 w-10 text-violet-500 dark:text-violet-400 animate-pulse" />
          </div>
          
          {products.length === 0 ? (
            <>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                ¡Agrega productos a tu promoción!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Los productos que agregues aquí aparecerán con el descuento aplicado automáticamente. 
                Tus clientes verán el precio rebajado en la tienda.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => setIsSelectionDialogOpen(true)}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Explorar Productos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {/* Scroll to preview or switch tab */}}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Vista Previa
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No se encontraron productos
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Intenta ajustar los filtros o términos de búsqueda
              </p>
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar Filtros
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                discountType={discountType}
                discountValue={discountValue}
                isSelected={selectedProducts.has(product.id)}
                onSelect={handleProductSelect}
                onRemove={setProductToRemove}
                showSelection={selectedProducts.size > 0}
              />
            ))}
          </div>

          {/* Paginación mejorada */}
          {pagination.totalPages > 1 && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">
                      {pagination.startIndex + 1}-{Math.min(pagination.endIndex + 1, pagination.total)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400"> de </span>
                    <span className="font-medium">{pagination.total}</span>
                    <span className="text-slate-500 dark:text-slate-400"> productos</span>
                  </div>
                  
                  {filteredProducts.length !== products.length && (
                    <Badge variant="outline" className="text-xs">
                      {filteredProducts.length} filtrados
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={!pagination.hasPreviousPage}
                    className="h-8 px-3 text-xs"
                  >
                    ← Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 2) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 1) {
                        pageNum = pagination.totalPages - 2 + i;
                      } else {
                        pageNum = pagination.page - 1 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "w-8 h-8 p-0 text-xs",
                            pageNum === pagination.page && "bg-violet-600 hover:bg-violet-700"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    {pagination.totalPages > 3 && pagination.page < pagination.totalPages - 1 && (
                      <>
                        <span className="text-xs text-slate-400 px-1">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(pagination.totalPages)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          {pagination.totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!pagination.hasNextPage}
                    className="h-8 px-3 text-xs"
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Selection Dialog */}
      <ProductSelectionDialog
        open={isSelectionDialogOpen}
        onOpenChange={setIsSelectionDialogOpen}
        onConfirm={handleAddProducts}
        excludeProductIds={products.map(p => p.id)}
        discountType={discountType}
        discountValue={discountValue}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!productToRemove} onOpenChange={() => setProductToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasociar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Este producto ya no aparecerá en esta promoción. Esta acción no afecta el producto en sí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Desasociar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
