'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import {
  Search, Package, Check, Loader2, FilterX, AlertTriangle,
  TrendingUp, DollarSign, Grid, List, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { createLogger } from '@/lib/logger'
import api from '@/lib/api'
import { getSelectedOrganizationId } from '@/lib/organization-context'

const MAX_PRODUCTS = 50
const PAGE_SIZE = 18

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
  brand?: string
}

interface ProductSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (productIds: string[]) => void
  excludeProductIds?: string[]
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  maxProducts?: number
}

const logger = createLogger('ProductSelectionDialog')

// ── ProductCard as a proper top-level component ──────────────────────────────

interface ProductCardProps {
  product: Product
  isSelected: boolean
  isDisabled: boolean
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  viewMode: 'grid' | 'list'
  onToggle: (id: string) => void
}

const ProductCard = memo(function ProductCard({
  product, isSelected, isDisabled, discountType, discountValue, viewMode, onToggle,
}: ProductCardProps) {
  const discountedPrice = discountType === 'PERCENTAGE'
    ? product.price * (1 - discountValue / 100)
    : Math.max(0, product.price - discountValue)
  const savings = product.price - discountedPrice
  const savingsPct = product.price > 0 ? (savings / product.price) * 100 : 0

  return (
    <div
      role="button"
      tabIndex={isDisabled && !isSelected ? -1 : 0}
      aria-pressed={isSelected}
      onClick={() => !isDisabled && onToggle(product.id)}
      onKeyDown={(e) => e.key === 'Enter' && !isDisabled && onToggle(product.id)}
      className={[
        'relative flex rounded-lg border transition-all duration-150 cursor-pointer select-none',
        viewMode === 'grid' ? 'flex-col p-3 min-h-[180px]' : 'flex-row items-center p-3 gap-3',
        isSelected
          ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-900/15 ring-1 ring-violet-600'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-300 hover:shadow-sm',
        isDisabled && !isSelected ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {/* Checkbox */}
      <div className="absolute top-2 right-2 z-10">
        <Checkbox
          checked={isSelected}
          disabled={isDisabled && !isSelected}
          onCheckedChange={() => onToggle(product.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
        />
      </div>

      {/* Image */}
      <div className={`flex-shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${viewMode === 'grid' ? 'w-full h-24 mb-2' : 'w-12 h-12'}`}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Package className="h-6 w-6 text-slate-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-6">
        <p className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight">
          {product.name}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {product.category && (
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {product.category}
            </span>
          )}
          {product.brand && (
            <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
              {product.brand}
            </span>
          )}
        </div>
        {product.stock != null && product.stock <= 5 && product.stock > 0 && (
          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Stock bajo: {product.stock}
          </p>
        )}
      </div>

      {/* Pricing */}
      {product.price > 0 ? (
        <div className={`${viewMode === 'grid' ? 'mt-auto pt-2 border-t border-dashed border-slate-200 dark:border-slate-700' : 'flex-shrink-0 text-right'}`}>
          <p className="text-xs text-slate-400 line-through">${product.price.toFixed(2)}</p>
          <p className="text-base font-bold text-green-600">${discountedPrice.toFixed(2)}</p>
          <p className="text-xs text-green-600/80 flex items-center gap-0.5">
            <TrendingUp className="h-3 w-3" />
            -{savingsPct.toFixed(0)}%
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Sin precio</p>
      )}
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

export function ProductSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  excludeProductIds = [],
  discountType,
  discountValue,
  maxProducts = MAX_PRODUCTS,
}: ProductSelectionDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'savings'>('savings')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showOnlyInStock, setShowOnlyInStock] = useState(false)

  const { toast } = useToast()
  const debouncedSearch = useDebounce(searchTerm, 400)

  // Stable refs to avoid stale closures without adding to useCallback deps
  const excludeIdsRef = useRef(excludeProductIds)
  excludeIdsRef.current = excludeProductIds

  const isAtMaxLimit = selectedIds.size >= maxProducts

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (page: number) => {
    setLoading(true)
    setError(null)
    try {
      const sortColumnMap: Record<string, string> = {
        savings: 'sale_price', price: 'sale_price', name: 'name',
      }
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        sortBy: sortColumnMap[sortBy] ?? 'updated_at',
        sortOrder,
      }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (categoryFilter !== 'all') params.categoryId = categoryFilter

      const orgId = getSelectedOrganizationId()
      const { data } = await api.get('/products', {
        params,
        headers: orgId ? { 'x-organization-id': orgId } : {},
      })

      const normalized: Product[] = (data.products || []).map((p: Record<string, unknown>) => ({
        id: String(p.id || ''),
        name: String(p.name || ''),
        price: Number(p.sale_price ?? p.price ?? 0),
        imageUrl: (p.image_url || p.imageUrl) as string | undefined,
        stock: p.stock_quantity != null ? Number(p.stock_quantity) : undefined,
        brand: (p.brand as string) || undefined,
        category: p.category && typeof p.category === 'object'
          ? ((p.category as Record<string, unknown>).name as string)
          : (p.categoryName as string) || undefined,
      }))

      const excluded = excludeIdsRef.current
      const available = normalized.filter((p) => !excluded.includes(p.id))

      // Client-side in-stock filter (not worth a server round-trip)
      const filtered = showOnlyInStock ? available.filter((p) => (p.stock ?? 1) > 0) : available

      setProducts(filtered)
      setTotalItems(Number(data.total ?? 0))
      setTotalPages(Number(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE)))
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } }; message?: string }
      const status = e?.response?.status
      const msg = e?.response?.data?.error || e?.message || ''
      logger.error('Error fetching products:', { status, msg })
      setError(
        status === 401 ? 'Sesión no válida. Inicia sesión nuevamente.' :
        status === 403 ? 'Sin permiso para listar productos.' :
        'No se pudieron cargar los productos.'
      )
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryFilter, sortBy, sortOrder, showOnlyInStock])

  const fetchCategories = useCallback(async () => {
    try {
      const orgId = getSelectedOrganizationId()
      const { data } = await api.get('/products/categories', {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      })
      if (Array.isArray(data.categories)) {
        setCategories(data.categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
    } catch {
      setCategories([])
    }
  }, [])

  // Reset on open
  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedIds(new Set())
      setSearchTerm('')
      setCategoryFilter('all')
      setCurrentPage(1)
      setError(null)
      fetchCategories()
    }
    prevOpenRef.current = open
  }, [open, fetchCategories])

  // Fetch products when dialog is open and filters change
  useEffect(() => {
    if (!open) return
    fetchProducts(currentPage)
  }, [open, currentPage, fetchProducts])

  // Reset to page 1 when filters change (not page itself)
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, categoryFilter, sortBy, sortOrder, showOnlyInStock])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleProduct = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= maxProducts) {
          toast({ description: `Máximo ${maxProducts} productos por promoción`, variant: 'destructive' })
          return prev
        }
        next.add(id)
      }
      return next
    })
  }, [maxProducts, toast])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (products.every((p) => prev.has(p.id))) {
        // deselect all on current page
        const next = new Set(prev)
        products.forEach((p) => next.delete(p.id))
        return next
      }
      const next = new Set(prev)
      for (const p of products) {
        if (next.size >= maxProducts) break
        next.add(p.id)
      }
      return next
    })
  }, [products, maxProducts])

  const handleConfirm = useCallback(() => {
    if (selectedIds.size === 0) {
      toast({ description: 'Selecciona al menos un producto', variant: 'destructive' })
      return
    }
    onConfirm(Array.from(selectedIds))
  }, [selectedIds, onConfirm, toast])

  // ── Derived state ──────────────────────────────────────────────────────────

  const allPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id))
  const somePageSelected = products.some((p) => selectedIds.has(p.id))
  const startItem = (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, totalItems)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:z-50">

        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Seleccionar Productos</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Elige los productos que aplicarán el descuento de esta promoción
          </DialogDescription>
        </DialogHeader>

        {/* Filters bar */}
        <div className="px-5 py-3 border-b flex-shrink-0 space-y-3 bg-muted/30">
          {/* Row 1: search + category + view toggle */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => {
              const [s, o] = v.split(':')
              setSortBy(s as typeof sortBy)
              setSortOrder(o as typeof sortOrder)
            }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings:desc">Mayor ahorro</SelectItem>
                <SelectItem value="price:asc">Menor precio</SelectItem>
                <SelectItem value="price:desc">Mayor precio</SelectItem>
                <SelectItem value="name:asc">Nombre A-Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Checkbox
                id="in-stock"
                checked={showOnlyInStock}
                onCheckedChange={(v) => setShowOnlyInStock(v === true)}
              />
              <label htmlFor="in-stock" className="text-sm cursor-pointer select-none">Solo en stock</label>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setViewMode((v) => v === 'grid' ? 'list' : 'grid')}
              title={viewMode === 'grid' ? 'Vista lista' : 'Vista cuadrícula'}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>

          {/* Row 2: select-all + selection count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allPageSelected}
                ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(somePageSelected && !allPageSelected) }}
                onCheckedChange={toggleAll}
                disabled={products.length === 0}
                className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
              />
              <span className="text-sm text-muted-foreground">
                Seleccionar página
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {selectedIds.size} / {maxProducts} seleccionados
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                    Limpiar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 flex-shrink-0 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Products grid */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                  <p className="text-sm">Cargando productos...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <FilterX className="h-10 w-10 mb-3 opacity-40" />
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-sm mt-1">
                    {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay productos disponibles'}
                  </p>
                  {(searchTerm || categoryFilter !== 'all') && (
                    <Button variant="link" size="sm" className="mt-2 text-violet-600" onClick={() => {
                      setSearchTerm('')
                      setCategoryFilter('all')
                    }}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
                    : 'flex flex-col gap-2'
                }>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isSelected={selectedIds.has(product.id)}
                      isDisabled={isAtMaxLimit}
                      discountType={discountType}
                      discountValue={discountValue}
                      viewMode={viewMode}
                      onToggle={toggleProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-2 border-t flex-shrink-0 flex items-center justify-between text-sm text-muted-foreground">
            <span>{startItem}–{endItem} de {totalItems}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t flex-shrink-0 bg-muted/20">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedIds.size > 0 && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Total con descuento:{' '}
                  <strong className="text-green-600">
                    ${Array.from(selectedIds).reduce((sum, id) => {
                      const p = products.find((x) => x.id === id)
                      if (!p || p.price <= 0) return sum
                      const dp = discountType === 'PERCENTAGE'
                        ? p.price * (1 - discountValue / 100)
                        : Math.max(0, p.price - discountValue)
                      return sum + dp
                    }, 0).toFixed(2)}
                  </strong>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                <Check className="h-4 w-4" />
                Asociar {selectedIds.size > 0 ? `${selectedIds.size} producto${selectedIds.size !== 1 ? 's' : ''}` : ''}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
