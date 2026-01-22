"use client";
import React, { RefObject, memo, useCallback, useMemo, useState } from 'react'
import { Search, Grid3X3, List, Scan, X, Zap, Package, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Category } from '@/types'
import type { Product } from '@/types'
import type { Customer } from '@/types'

interface ProductToolbarProps {
  searchQuery: string
  onChangeSearch: (value: string) => void
  viewMode: 'grid' | 'list'
  onChangeViewMode: (mode: 'grid' | 'list') => void
  barcodeMode: boolean
  onToggleBarcodeMode: () => void
  onBarcodeEnter: (code: string) => void
  barcodeInputRef?: RefObject<HTMLInputElement | null>
  categories: Category[]
  selectedCategory: string
  onChangeCategory: (id: string) => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  resultCount?: number
  quickAddMode?: boolean
  onToggleQuickAddMode?: () => void
  // Opcionales para sugerencias y acceso rápido
  products?: Product[]
  showSuggestions?: boolean
  onQuickAdd?: (product: Product) => void
  // Ordenamiento
  sortBy?: 'name' | 'price' | 'stock'
  sortOrder?: 'asc' | 'desc'
  onChangeSortBy?: (v: 'name' | 'price' | 'stock') => void
  onToggleSortOrder?: () => void
  // Datos adicionales
  customers?: Customer[]
  loading?: boolean
}

function ProductToolbar({
  searchQuery,
  onChangeSearch,
  viewMode,
  onChangeViewMode,
  barcodeMode,
  onToggleBarcodeMode,
  onBarcodeEnter,
  barcodeInputRef,
  categories,
  selectedCategory,
  onChangeCategory,
  searchInputRef,
  resultCount,
  quickAddMode = false,
  onToggleQuickAddMode,
  products = [],
  showSuggestions = true,
  onQuickAdd,
  customers = [],
  loading = false,
  sortBy = 'name',
  sortOrder = 'asc',
  onChangeSortBy,
  onToggleSortOrder,
}: ProductToolbarProps) {
  const [openSuggestions, setOpenSuggestions] = useState(false)
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChangeSearch(e.target.value),
    [onChangeSearch]
  );

  const handleClearSearch = useCallback(() => onChangeSearch(''), [onChangeSearch]);

  const handleViewModeChange = useCallback(
    (v: string) => onChangeViewMode(v as 'grid' | 'list'),
    [onChangeViewMode]
  );

  const handleBarcodeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const v = (e.target as HTMLInputElement).value;
        onBarcodeEnter(v);
      }
    },
    [onBarcodeEnter]
  );

  const handleCategoryClick = useCallback((id: string) => onChangeCategory(id), [onChangeCategory]);

  // Sugerencias predictivas agrupadas por tipo
  const groupedSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!showSuggestions || q.length < 2) return { products: [], categories: [], customers: [] } as {
      products: Array<{ type: 'product'; title: string; subtitle?: string; data: any }>
      categories: Array<{ type: 'category'; title: string; subtitle?: string; data: any }>
      customers: Array<{ type: 'customer'; title: string; subtitle?: string; data: any }>
    };

    const productMatches = (products || [])
      .filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q))
      .slice(0, 6)
      .map(p => ({ type: 'product' as const, title: p.name, subtitle: `SKU: ${p.sku ?? '-'} • Stock: ${p.stock_quantity ?? 0}`, data: p }))

    const categoryMatches = (categories || [])
      .filter(c => c.name?.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ type: 'category' as const, title: c.name, subtitle: 'Categoría', data: c }))

    const customerMatches = (customers || [])
      .filter((c: any) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ type: 'customer' as const, title: c.name || 'Cliente', subtitle: `${c.email || ''} ${c.phone ? '• ' + c.phone : ''}`.trim(), data: c }))

    return { products: productMatches, categories: categoryMatches, customers: customerMatches };
  }, [searchQuery, products, categories, customers, showSuggestions])

  const handleSuggestionClick = useCallback((s: { type: 'product' | 'category' | 'customer'; title: string; data: any }) => {
    if (s.type === 'product') {
      onChangeSearch(s.title)
      if (onQuickAdd) onQuickAdd(s.data)
    } else {
      if (s.type === 'category') {
        onChangeSearch(s.title)
        onChangeCategory(s.data.id)
      } else {
        onChangeSearch(s.title)
      }
    }
    setOpenSuggestions(false)
  }, [onChangeSearch, onQuickAdd, onChangeCategory])

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-4">
         {/* Búsqueda principal */}
          <div className="flex-1 relative">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
           <Input
              aria-label="Buscar productos"
              placeholder="Buscar productos por nombre, código o categoría..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="pl-10 h-10 sm:h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ref={searchInputRef}
              onFocus={() => setOpenSuggestions(true)}
              onBlur={() => setTimeout(() => setOpenSuggestions(false), 150)}
           />
           {searchQuery && (
             <Button
               variant="ghost"
               size="sm"
               onClick={handleClearSearch}
               className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
               aria-label="Limpiar búsqueda"
               >
               <X className="h-4 w-4" />
             </Button>
           )}
            {loading && (
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-muted">
                <div className="h-1 bg-blue-500 animate-pulse" style={{ width: '60%' }} />
              </div>
            )}

            {openSuggestions && (groupedSuggestions.products.length + groupedSuggestions.categories.length + groupedSuggestions.customers.length) > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-64 overflow-auto">
                {groupedSuggestions.products.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">Productos</div>
                    {groupedSuggestions.products.map((s, idx) => (
                      <button
                        key={`prod-${idx}-${s.title}`}
                        type="button"
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted text-left"
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={() => handleSuggestionClick(s)}
                      >
                        <div className="flex-shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{s.title}</div>
                          {s.subtitle && <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>}
                        </div>
                        <div className="flex-shrink-0">
                          <Button variant="secondary" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSuggestionClick(s)}>
                            Agregar
                          </Button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {groupedSuggestions.categories.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">Categorías</div>
                    {groupedSuggestions.categories.map((s, idx) => (
                      <button
                        key={`cat-${idx}-${s.title}`}
                        type="button"
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted text-left"
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={() => handleSuggestionClick(s)}
                      >
                        <div className="flex-shrink-0">
                          <Tag className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{s.title}</div>
                          {s.subtitle && <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {groupedSuggestions.customers.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">Clientes</div>
                    {groupedSuggestions.customers.map((s, idx) => (
                      <button
                        key={`cust-${idx}-${s.title}`}
                        type="button"
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted text-left"
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={() => handleSuggestionClick(s)}
                      >
                        <div className="flex-shrink-0">
                          <Tag className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{s.title}</div>
                          {s.subtitle && <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
         </div>

         {/* Controles de vista y modo */}
         <div className="flex items-center gap-1 sm:gap-2">
           <Tabs value={viewMode} onValueChange={handleViewModeChange} className="w-auto">
             <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
               <TabsTrigger value="grid" className="flex items-center gap-2" aria-label="Cambiar a vista cuadrícula">
                 <Grid3X3 className="h-4 w-4" />
                 <span className="hidden sm:inline">Cuadrícula</span>
               </TabsTrigger>
               <TabsTrigger value="list" className="flex items-center gap-2" aria-label="Cambiar a vista lista">
                 <List className="h-4 w-4" />
                 <span className="hidden sm:inline">Lista</span>
               </TabsTrigger>
             </TabsList>
           </Tabs>

           {/* Modo código de barras */}
           <Button
             variant={barcodeMode ? 'default' : 'outline'}
             size="sm"
             onClick={onToggleBarcodeMode}
             className="flex items-center gap-2 h-10 sm:h-11"
             aria-pressed={barcodeMode}
             aria-label="Alternar modo código de barras"
           >
             <Scan className="h-4 w-4" />
             <span className="hidden sm:inline">Barras</span>
           </Button>

           {/* Modo agregación rápida */}
           {onToggleQuickAddMode && (
             <Button
               variant={quickAddMode ? 'default' : 'outline'}
               size="sm"
               onClick={onToggleQuickAddMode}
               className="flex items-center gap-2 h-10 sm:h-11"
               aria-pressed={quickAddMode}
               aria-label="Alternar modo agregación rápida"
             >
               <Zap className="h-4 w-4" />
               <span className="hidden sm:inline">Exprés</span>
             </Button>
           )}

           {/* Contador de resultados */}
           {typeof resultCount === 'number' && (
             <div className="hidden sm:flex items-center ml-2 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-sm">
               Resultados: <span className="font-semibold ml-1">{resultCount}</span>
             </div>
           )}
         </div>

         {/* Input de código de barras */}
         {barcodeMode && (
           <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
             <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
             <Input
               aria-label="Ingresar código de barras"
               ref={barcodeInputRef}
               placeholder="Escanear código de barras y presionar Enter"
               onKeyDown={handleBarcodeKeyDown}
               className="pl-10 h-10 sm:h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
             />
           </div>
         )}
       </div>

       {/* Filtros visuales activos */}
       <div className="mt-2 flex items-center gap-2 flex-wrap">
         {searchQuery && (
           <Button variant="outline" size="sm" className="h-8 px-2 rounded-full" onClick={handleClearSearch}>
             Buscar: "{searchQuery}"
             <X className="h-3.5 w-3.5 ml-2" />
           </Button>
         )}
         {selectedCategory !== 'all' && (
           <Button variant="outline" size="sm" className="h-8 px-2 rounded-full" onClick={() => onChangeCategory('all')}>
             Categoría: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
             <X className="h-3.5 w-3.5 ml-2" />
           </Button>
         )}
         {(searchQuery || selectedCategory !== 'all') && (
           <Button variant="ghost" size="sm" className="h-8" onClick={() => { handleClearSearch(); onChangeCategory('all'); }}>
             Limpiar todo
           </Button>
         )}
       </div>

       {/* Filtros de categoría */}
       <div className="flex items-center gap-1 sm:gap-2 mt-3 sm:mt-4 overflow-x-auto pb-2 -mx-1 px-1" role="toolbar" aria-label="Filtros de categoría">
         <Button
           variant={selectedCategory === 'all' ? 'default' : 'outline'}
           size="sm"
           onClick={() => handleCategoryClick('all')}
           className="whitespace-nowrap px-2 sm:px-3"
           aria-label="Todas las categorías"
         >
           Todas las categorías
         </Button>
         {categories.map((category) => (
           <Button
             key={category.id}
             variant={selectedCategory === category.id ? 'default' : 'outline'}
             size="sm"
             onClick={() => handleCategoryClick(category.id)}
             className="whitespace-nowrap px-2 sm:px-3"
             aria-label={`Categoría: ${category.name}`}
           >
             {category.name}
           </Button>
         ))}
         {selectedCategory !== 'all' && (
           <Button
             variant="ghost"
             size="sm"
             onClick={() => handleCategoryClick('all')}
             className="ml-auto whitespace-nowrap"
             aria-label="Limpiar filtro de categoría"
           >
             Limpiar filtros
           </Button>
         )}
       </div>
     </div>
   )
}

const propsAreEqual = (prev: ProductToolbarProps, next: ProductToolbarProps) => {
  if (
    prev.searchQuery !== next.searchQuery ||
    prev.viewMode !== next.viewMode ||
    prev.barcodeMode !== next.barcodeMode ||
    prev.selectedCategory !== next.selectedCategory ||
    prev.resultCount !== next.resultCount ||
    prev.quickAddMode !== next.quickAddMode
  ) {
    return false;
  }

  if (prev.categories.length !== next.categories.length) return false;
  for (let i = 0; i < prev.categories.length; i++) {
    const a = prev.categories[i];
    const b = next.categories[i];
    if (a.id !== b.id || a.name !== b.name) return false;
  }

  return true;
};

export default memo(ProductToolbar, propsAreEqual);