'use client';

import React, { useMemo, useCallback, memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Pagination from '@/components/catalog/Pagination';

let FixedSizeGrid: any;
let FixedSizeList: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactWindow = require('react-window');
  FixedSizeGrid = ReactWindow.FixedSizeGrid;
  FixedSizeList = ReactWindow.FixedSizeList;
} catch (err) {
  // Fallback will render non-virtualized list/grid when modules are unavailable
}
import { formatCurrency } from '@/lib/utils';
import { ProductComparison } from '@/components/catalog/ProductComparison';
import { ProductRecommendations } from '@/components/catalog/ProductRecommendations';
import { Package, Plus, AlertTriangle, Search, Filter, SortAsc, SortDesc, Grid3X3, List, Star, TrendingUp, Clock, Zap } from 'lucide-react';
import type { Product } from '@/types';

interface OptimizedProductCatalogProps {
   products: Product[];
   onAddToCart: (product: Product, quantity?: number, options?: { openCart?: boolean; highlightCartItem?: boolean }) => void;
   searchQuery: string;
   selectedCategory: string;
   viewMode: 'grid' | 'list';
   loading?: boolean;
   isWholesaleMode?: boolean;
   quickAddMode?: boolean;
   highlightProductId?: string | undefined;
   onViewProduct?: (productId: string) => void;
   // Enhanced props
   showAdvancedFilters?: boolean;
   enableSmartSearch?: boolean;
   showProductAnalytics?: boolean;
   onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
   onFilterChange?: (filters: Record<string, any>) => void;
   // Infinite scroll option
   infiniteScroll?: boolean;
}

// Componente de producto individual memoizado
const ProductCard = memo(({ 
  product,
  onAddToCart,
  isWholesaleMode = false,
  quickAddMode = false,
  highlightProductId,
  onViewProduct,
  handleQuickAdd,
  onOpenDetail,
  showProductAnalytics,
  onToggleCompare,
  isCompared,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
  isWholesaleMode?: boolean;
  quickAddMode?: boolean;
  highlightProductId?: string | undefined;
  onViewProduct?: (productId: string) => void;
  handleQuickAdd?: (product: Product) => void;
  onOpenDetail?: (product: Product) => void;
  showProductAnalytics?: boolean;
  onToggleCompare?: (productId: string) => void;
  isCompared?: boolean;
}) => {
  const price = isWholesaleMode && product.wholesale_price 
    ? product.wholesale_price 
    : product.sale_price;

  const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
  const isOutOfStock = (product.stock_quantity || 0) === 0;
  const hasDiscount = (product as any).discount_percentage && (product as any).discount_percentage > 0;
  const discountedPrice = hasDiscount ? price * (1 - ((product as any).discount_percentage! / 100)) : price;

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-sm hover:-translate-y-[1px] border border-border bg-card ${
      isOutOfStock ? 'opacity-50' : ''
    } ${highlightProductId === product.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <CardContent className="p-2">
        <div
          className="flex flex-col h-full"
          style={{ contentVisibility: 'auto' }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (quickAddMode && handleQuickAdd) {
                handleQuickAdd(product);
              } else {
                onAddToCart(product);
              }
            }
          }}
          aria-label={`Producto ${product.name}. Precio ${formatCurrency(discountedPrice)}`}
        >
          {/* Imagen del producto */}
          <div className="relative mb-2 bg-muted/40 rounded-md aspect-square flex items-center justify-center">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-contain rounded-lg transition-transform duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                sizes="(max-width: 1024px) 50vw, 25vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`${product.images && product.images.length > 0 ? 'hidden' : ''} text-muted-foreground`}>
              <Package className="h-10 w-10" />
            </div>
            {hasDiscount && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">-{(product as any).discount_percentage}%</Badge>
              </div>
            )}
            {/* Badges de estado */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {isWholesaleMode && (
                <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-800">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Mayorista
                </Badge>
              )}
              {isLowStock && !isOutOfStock && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Bajo Stock
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-[10px]">
                  <Package className="h-3 w-3 mr-1" />
                  Sin Stock
                </Badge>
              )}
              {showProductAnalytics && (product as any).is_featured && (
                <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Destacado
                </Badge>
              )}
            </div>
          </div>

          {/* Información del producto */}
          <div className="flex-1 flex flex-col">
            <h3 className={`font-medium text-xs mb-1 line-clamp-2 text-foreground ${onViewProduct ? 'cursor-pointer hover:text-primary' : ''}`}
                onClick={() => onViewProduct?.(product.id)}>
              {product.name}
            </h3>
            
            {product.sku && (
              <p className="text-[11px] text-muted-foreground mb-1">
                SKU: {product.sku}
              </p>
            )}

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-baseline gap-2">
                  {hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through">{formatCurrency(price)}</span>
                  )}
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(discountedPrice)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Stock: {product.stock_quantity || 0}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                  aria-disabled={isOutOfStock}
                  aria-label={isOutOfStock ? 'Sin Stock' : 'Agregar al carrito'}
                  size="sm"
                  className="flex-1 h-8 px-2"
                  variant={isOutOfStock ? "outline" : "default"}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isOutOfStock ? 'Sin Stock' : 'Agregar'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  aria-label="Ver detalle del producto"
                  onClick={() => onOpenDetail?.(product)}
                >
                  Ver detalle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isCompared ? 'default' : 'outline'}
                  className={`h-8 px-2 ${isCompared ? 'bg-primary text-primary-foreground' : ''}`}
                  aria-label={isCompared ? 'Quitar de comparación' : 'Agregar a comparación'}
                  onClick={() => onToggleCompare?.(product.id)}
                >
                  {isCompared ? 'Comparando' : 'Comparar'}
                </Button>
                {quickAddMode && handleQuickAdd && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 transition-transform active:scale-95 hover:ring-2 hover:ring-primary/20"
                    disabled={isOutOfStock}
                    aria-label="Añadir rápido +1"
                    onClick={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      btn.classList.add('ring-2','ring-green-400','animate-pulse');
                      setTimeout(() => {
                        btn.classList.remove('ring-2','ring-green-400','animate-pulse');
                      }, 400);
                      handleQuickAdd(product);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

// Componente de skeleton para carga
const ProductSkeleton = memo(() => (
  <Card className="h-full">
    <CardContent className="p-3">
      <div className="flex flex-col h-full">
        <Skeleton className="aspect-square mb-3 rounded-lg" />
        <Skeleton className="h-4 mb-2" />
        <Skeleton className="h-3 mb-2 w-2/3" />
        <div className="mt-auto">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
));

ProductSkeleton.displayName = 'ProductSkeleton';

// Componente principal optimizado
export default function OptimizedProductCatalog({
   products,
   onAddToCart,
   searchQuery,
   selectedCategory,
   viewMode,
   loading = false,
   isWholesaleMode = false,
   quickAddMode = false,
   highlightProductId,
   onViewProduct,
   showAdvancedFilters = false,
   enableSmartSearch = true,
   showProductAnalytics = false,
   onSortChange,
   onFilterChange,
   infiniteScroll = false,
}: OptimizedProductCatalogProps) {
  // Enhanced filtering and search with analytics
  const filteredProducts = useMemo(() => {
    let filtered = Array.isArray(products) ? products : [];

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();
      if (enableSmartSearch) {
        // Smart search: split query and search in multiple fields with weights
        const terms = query.split(/\s+/);
        filtered = filtered.filter(product => {
          const searchableText = [
            product.name || '',
            product.sku || '',
            product.barcode || '',
            product.brand || '',
            product.description || '',
            product.category?.name || ''
          ].join(' ').toLowerCase();

          return terms.every(term => searchableText.includes(term));
        });
      } else {
        // Basic search
        filtered = filtered.filter(product =>
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query)
        );
      }
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Advanced filters (when enabled)
    if (showAdvancedFilters) {
      // Add price range, stock level, featured filters here
      // For now, just return filtered
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, enableSmartSearch, showAdvancedFilters]);

  // Paginación cliente para listas/grillas
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Conteo visible para scroll infinito
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  React.useEffect(() => {
    // Reiniciar al cambiar filtros/búsqueda o el tamaño de página
    setVisibleCount(itemsPerPage);
  }, [filteredProducts, itemsPerPage, infiniteScroll, searchQuery, selectedCategory]);
  const visibleProducts = useMemo(() => {
    return infiniteScroll ? filteredProducts.slice(0, visibleCount) : paginatedProducts;
  }, [infiniteScroll, filteredProducts, visibleCount, paginatedProducts]);
  const canLoadMore = infiniteScroll && visibleCount < filteredProducts.length;
  const loadMore = useCallback(() => {
    if (!canLoadMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + itemsPerPage, filteredProducts.length));
      setIsLoadingMore(false);
    }, 200);
  }, [canLoadMore, itemsPerPage, filteredProducts.length]);

  const handleAddToCart = useCallback((product: Product) => {
    onAddToCart(product, 1);
  }, [onAddToCart]);

  const handleQuickAdd = useCallback((product: Product) => {
    onAddToCart(product, 1, { openCart: false, highlightCartItem: true });
  }, [onAddToCart]);

  // Parámetros comunes de layout
  const ITEM_WIDTH = 112; // ~30% más compacto vs 160
  const ITEM_HEIGHT = 168; // ~30% más compacto vs 240
  const GAP = 6; // espacio entre items (compactado)
  const LIST_ITEM_HEIGHT = 100; // alto de fila en vista lista

  // Estado del modal de detalle (nivel superior, compartido)
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailProduct, setDetailProduct] = React.useState<Product | null>(null);
  const openDetail = useCallback((p: Product) => {
    setDetailProduct(p);
    setDetailOpen(true);
  }, []);

  // Estado de comparación
  const [compareList, setCompareList] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const toggleCompare = useCallback((productId: string) => {
    setCompareList(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else if (next.size < 4) {
        next.add(productId);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-1 lg:gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <ProductSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-muted/30 rounded-full mb-4">
          <Search className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No se encontraron productos
        </h3>
        <p className="text-muted-foreground max-w-md">
          {searchQuery || selectedCategory !== 'all'
            ? 'Intenta ajustar los filtros de búsqueda o busca con términos diferentes'
            : 'No hay productos disponibles en este momento'
          }
        </p>
        {enableSmartSearch && searchQuery && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-sm">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Zap className="h-4 w-4" />
              <span>Búsqueda inteligente activada</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Busca por nombre, SKU, código de barras, marca o descripción
            </p>
          </div>
        )}
      </div>
    );
  }

  // Umbral para activar virtualización
  const USE_VIRTUALIZATION = visibleProducts.length > 40;

  // Vista de grilla optimizada
  if (viewMode === 'grid') {
    if (!USE_VIRTUALIZATION) {
      // Modal controlado a nivel superior

      return (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-1 lg:gap-2">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                isWholesaleMode={isWholesaleMode}
                quickAddMode={quickAddMode}
                highlightProductId={highlightProductId}
                onViewProduct={onViewProduct}
                handleQuickAdd={handleQuickAdd}
                onOpenDetail={openDetail}
                showProductAnalytics={showProductAnalytics}
                onToggleCompare={toggleCompare}
                isCompared={compareList.has(product.id)}
              />
            ))}
          </div>

          {/* Controles de paginación / carga progresiva */}
          {infiniteScroll ? (
            canLoadMore && (
              <div className="flex justify-center pt-3">
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  size="sm"
                  variant="outline"
                  aria-label="Cargar más productos"
                >
                  {isLoadingMore ? 'Cargando…' : 'Cargar más'}
                </Button>
              </div>
            )
          ) : (
            totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
                onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                className="pt-4"
                compact
              />
            )
          )}

          {/* Modal de detalle */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg">{detailProduct?.name}</DialogTitle>
                <DialogDescription className="sr-only">Detalles del producto seleccionado</DialogDescription>
              </DialogHeader>
              {detailProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
                    {detailProduct.images && detailProduct.images.length > 0 ? (
                      <img
                        src={detailProduct.images[0]}
                        alt={detailProduct.name}
                        className="w-full h-full object-contain rounded-md transition-opacity duration-200"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                    ) : (
                      <div className="text-gray-400">
                        <Package className="h-16 w-16" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {detailProduct.description && (
                      <div>
                        <h4 className="font-medium text-sm">Descripción</h4>
                        <p className="text-sm text-muted-foreground">{detailProduct.description}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-sm">Especificaciones</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {detailProduct.sku && (<li><span className="font-medium">SKU:</span> {detailProduct.sku}</li>)}
                        {detailProduct.brand && (<li><span className="font-medium">Marca:</span> {detailProduct.brand}</li>)}
                        {detailProduct.volume && (<li><span className="font-medium">Volumen:</span> {detailProduct.volume}</li>)}
                        {typeof detailProduct.spf === 'number' && (<li><span className="font-medium">SPF:</span> {detailProduct.spf}</li>)}
                        
                      </ul>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Precio</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(
                          (isWholesaleMode && detailProduct.wholesale_price) ? detailProduct.wholesale_price! : detailProduct.sale_price
                        )}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            if (detailProduct) handleAddToCart(detailProduct);
                            setDetailOpen(false);
                          }}
                          className="transition-all duration-200"
                          aria-label="Agregar al carrito desde detalle"
                        >
                          Agregar al carrito
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDetailOpen(false)}
                          aria-label="Cerrar detalle"
                        >
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      );
    }

    return (
      <>
      <div style={{ height: '100%', width: '100%' }}>
        <AutoSizer>
          {({ height, width }) => {
            // Mantener 2 columnas en móvil y 4 en desktop
            const columnCount = width < 768 ? 2 : 4;
            const rowCount = Math.ceil(visibleProducts.length / columnCount);
            const columnWidth = Math.floor((width - GAP) / columnCount);
            const rowHeight = ITEM_HEIGHT + GAP;

            const Cell = ({ columnIndex, rowIndex, style }: any) => {
              const index = rowIndex * columnCount + columnIndex;
              const product = visibleProducts[index];
              if (!product) return null;
              return (
                <div style={{ ...style, padding: GAP / 2 }}>
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    isWholesaleMode={isWholesaleMode}
                    quickAddMode={quickAddMode}
                    highlightProductId={highlightProductId}
                    onViewProduct={onViewProduct}
                    handleQuickAdd={handleQuickAdd}
                    onOpenDetail={openDetail}
                    showProductAnalytics={showProductAnalytics}
                    onToggleCompare={toggleCompare}
                    isCompared={compareList.has(product.id)}
                  />
                </div>
              );
            };

            return (
              <FixedSizeGrid
                height={height}
                width={width}
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={rowHeight}
              >
                {Cell as any}
              </FixedSizeGrid>
            );
          }}
        </AutoSizer>
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
          className="pt-4"
          compact
        />
      )}

      {/* Modal de detalle compartido */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{detailProduct?.name}</DialogTitle>
            <DialogDescription className="sr-only">Detalles del producto seleccionado</DialogDescription>
          </DialogHeader>
          {detailProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
                {detailProduct.images && detailProduct.images.length > 0 ? (
                  <img
                    src={detailProduct.images[0]}
                    alt={detailProduct.name}
                    className="w-full h-full object-contain rounded-md transition-opacity duration-200"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    sizes="(max-width: 768px) 90vw, 40vw"
                  />
                ) : (
                  <div className="text-gray-400">
                    <Package className="h-16 w-16" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {detailProduct.description && (
                  <div>
                    <h4 className="font-medium text-sm">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{detailProduct.description}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm">Especificaciones</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {detailProduct.sku && (<li><span className="font-medium">SKU:</span> {detailProduct.sku}</li>)}
                    {detailProduct.brand && (<li><span className="font-medium">Marca:</span> {detailProduct.brand}</li>)}
                    {detailProduct.volume && (<li><span className="font-medium">Volumen:</span> {detailProduct.volume}</li>)}
                    {typeof detailProduct.spf === 'number' && (<li><span className="font-medium">SPF:</span> {detailProduct.spf}</li>)}
                    
                  </ul>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Precio</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(
                      (isWholesaleMode && detailProduct.wholesale_price) ? detailProduct.wholesale_price! : detailProduct.sale_price
                    )}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        if (detailProduct) handleAddToCart(detailProduct);
                        setDetailOpen(false);
                      }}
                      className="transition-all duration-200"
                      aria-label="Agregar al carrito desde detalle"
                    >
                      Agregar al carrito
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDetailOpen(false)}
                      aria-label="Cerrar detalle"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {compareList.size > 0 && (
        <div className="fixed bottom-20 right-4 z-30">
          <div className="flex items-center gap-2 bg-background/95 border border-border shadow-lg rounded-full px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <span className="text-sm">{compareList.size} en comparación</span>
            <Button size="sm" onClick={() => setCompareOpen(true)}>Comparar ahora</Button>
            <Button size="sm" variant="ghost" onClick={() => setCompareList(new Set())}>Limpiar</Button>
          </div>
        </div>
      )}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Comparar productos</DialogTitle>
            <DialogDescription className="sr-only">Comparación lado a lado</DialogDescription>
          </DialogHeader>
          <ProductComparison
            products={filteredProducts.filter(p => compareList.has(p.id)) as any}
            onRemoveProduct={(id) => setCompareList(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            })}
            onAddToCart={(p) => onAddToCart(p as any, 1)}
          />
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // Vista de lista optimizada
  if (!USE_VIRTUALIZATION) {
    return (
      <div className="space-y-1.5">
        {visibleProducts.map((product) => {
          const price = isWholesaleMode && product.wholesale_price
            ? product.wholesale_price
            : product.sale_price;
          const isOutOfStock = (product.stock_quantity || 0) === 0;
          const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
          const hasDiscount = (product as any).discount_percentage && (product as any).discount_percentage > 0;
          const discountedPrice = hasDiscount ? price * (1 - ((product as any).discount_percentage! / 100)) : price;

          return (
            <Card key={product.id} className={`transition-all duration-200 hover:shadow-sm ${
              isOutOfStock ? 'opacity-50' : ''
            } ${highlightProductId === product.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
            <CardContent className="p-3">
                <div
                  className="flex items-center gap-3"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (quickAddMode) {
                        handleQuickAdd(product);
                      } else {
                        handleAddToCart(product);
                      }
                    }
                  }}
                  aria-label={`Producto ${product.name}. Precio ${formatCurrency(discountedPrice)}`}
                >
                  {/* Imagen pequeña */}
                  <div className="relative w-14 h-14 bg-muted/40 rounded-md flex items-center justify-center flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-contain rounded-lg"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${product.images && product.images.length > 0 ? 'hidden' : ''} text-muted-foreground`}>
                      <Package className="h-8 w-8" />
                    </div>
                    {hasDiscount && (
                      <div className="absolute -top-1 -left-1">
                        <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 px-1">-{(product as any).discount_percentage}%</Badge>
                      </div>
                    )}
                  </div>

                  {/* Información del producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm mb-1 line-clamp-2 text-foreground ${onViewProduct ? 'cursor-pointer hover:text-primary' : ''}`}
                            onClick={() => onViewProduct?.(product.id)}>
                          {product.name}
                        </h3>

                        {product.sku && (
                          <p className="text-xs text-muted-foreground mb-2">
                            SKU: {product.sku}
                          </p>
                        )}

                        <div className="flex items-center gap-4">
                          <div className="flex items-baseline gap-2">
                            {hasDiscount && (
                              <span className="text-sm text-muted-foreground line-through">{formatCurrency(price)}</span>
                            )}
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(discountedPrice)}
                          </span>
                        </div>
                          <span className="text-sm text-muted-foreground">
                            Stock: {product.stock_quantity || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {isWholesaleMode && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            Mayorista
                          </Badge>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Bajo Stock
                          </Badge>
                        )}
                        {isOutOfStock && (
                          <Badge variant="destructive" className="text-xs">
                            Sin Stock
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-baseline gap-2">
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">{formatCurrency(price)}</span>
                          )}
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(discountedPrice)}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.stock_quantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {/* Controles de paginación */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            className="pt-4"
            compact
          />
        )}

        {compareList.size > 0 && (
          <div className="fixed bottom-20 right-4 z-30">
            <div className="flex items-center gap-2 bg-background/95 border border-border shadow-lg rounded-full px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <span className="text-sm">{compareList.size} en comparación</span>
              <Button size="sm" onClick={() => setCompareOpen(true)}>Comparar ahora</Button>
              <Button size="sm" variant="ghost" onClick={() => setCompareList(new Set())}>Limpiar</Button>
            </div>
          </div>
        )}

        <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle className="text-lg">Comparar productos</DialogTitle>
              <DialogDescription className="sr-only">Comparación lado a lado</DialogDescription>
            </DialogHeader>
            <ProductComparison
              products={filteredProducts.filter(p => compareList.has(p.id)) as any}
              onRemoveProduct={(id) => setCompareList(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              })}
              onAddToCart={(p) => onAddToCart(p as any, 1)}
            />
          </DialogContent>
        </Dialog>

        <div className="mt-4">
          <ProductRecommendations
            userHistory={filteredProducts.slice(0, 20) as any}
            onAddToCart={(p) => onAddToCart(p as any, 1)}
            onViewProduct={(p) => onViewProduct?.(p.id)}
          />
        </div>
      </div>
    );
  }

  // Lista virtualizada
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => {
          const Row = ({ index, style }: any) => {
            const product = filteredProducts[index];
            const priceBase = isWholesaleMode && product.wholesale_price
              ? product.wholesale_price
              : product.sale_price;
            const isOutOfStock = (product.stock_quantity || 0) === 0;
            const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
            const hasDiscount = (product as any).discount_percentage && (product as any).discount_percentage > 0;
            const discountedPrice = hasDiscount ? priceBase * (1 - ((product as any).discount_percentage! / 100)) : priceBase;

            return (
              <div style={{ ...style, padding: 8 }} data-product-id={product.id}>
                <Card className={`transition-all duration-200 hover:shadow-sm ${
                  isOutOfStock ? 'opacity-50' : ''
                }`}>
                  <CardContent className="p-4">
                    <div
                      className="flex items-center gap-3"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (quickAddMode) {
                            handleQuickAdd(product);
                          } else {
                            handleAddToCart(product);
                          }
                        }
                      }}
                      aria-label={`Producto ${product.name}. Precio ${formatCurrency(discountedPrice)}`}
                    >
                      <div className="relative w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-contain rounded-lg"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                        {hasDiscount && (
                          <div className="absolute -top-1 -left-1">
                            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 px-1">-{(product as any).discount_percentage}%</Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {product.name}
                            </h3>
                            {product.sku && (
                              <p className="text-sm text-gray-500">
                                SKU: {product.sku}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {isWholesaleMode && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                Mayorista
                              </Badge>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <Badge variant="destructive" className="text-xs">
                                Bajo Stock
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-4">
                            <div className="flex items-baseline gap-2">
                              {hasDiscount && (
                                <span className="text-sm text-muted-foreground line-through">{formatCurrency(priceBase)}</span>
                              )}
                              <span className="text-lg font-bold text-green-600">
                                {formatCurrency(discountedPrice)}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              Stock: {product.stock_quantity || 0}
                            </span>
                            
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleAddToCart(product)}
                              disabled={isOutOfStock}
                              aria-disabled={isOutOfStock}
                              aria-label={isOutOfStock ? 'Sin Stock' : 'Agregar al carrito'}
                              size="sm"
                              variant={isOutOfStock ? 'outline' : 'default'}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {isOutOfStock ? 'Sin Stock' : 'Agregar'}
                            </Button>
                            {quickAddMode && handleQuickAdd && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 transition-transform active:scale-95 hover:ring-2 hover:ring-primary/20"
                                disabled={isOutOfStock}
                                aria-label="Añadir rápido +1"
                                onClick={(e) => {
                                  const btn = e.currentTarget as HTMLButtonElement;
                                  btn.classList.add('ring-2','ring-green-400','animate-pulse');
                                  setTimeout(() => {
                                    btn.classList.remove('ring-2','ring-green-400','animate-pulse');
                                  }, 400);
                                  handleQuickAdd(product);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          };

          return (
            <FixedSizeList
              height={height}
              width={width}
              itemCount={visibleProducts.length}
              itemSize={LIST_ITEM_HEIGHT}
            >
              {Row as any}
            </FixedSizeList>
          );
        }}
      </AutoSizer>
      {/* Controles de paginación / carga progresiva */}
      {infiniteScroll ? (
        canLoadMore && (
          <div className="flex justify-center pt-3">
            <Button
              onClick={loadMore}
              disabled={isLoadingMore}
              size="sm"
              variant="outline"
              aria-label="Cargar más productos"
            >
              {isLoadingMore ? 'Cargando…' : 'Cargar más'}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}