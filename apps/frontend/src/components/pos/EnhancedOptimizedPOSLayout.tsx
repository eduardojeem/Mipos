'use client';

import React, { useState, useCallback, memo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import {
  ShoppingCart,
  Search,
  Barcode,
  Zap,
  Users,
  CreditCard,
  RefreshCw,
  Settings,
  TrendingUp,
  Package,
  Calculator,
  Filter,
  Grid3X3,
  List,
  X,
  Plus,
  Minus,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  Keyboard,
  Maximize2,
  Minimize2,
  BarChart3,
  DollarSign,
  Receipt,
  History
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_IVA_RATE_PARAGUAY } from '@/lib/pos/constants';
import { usePOSStore } from '@/store';
import { useCart } from '@/hooks/useCart';
import { usePOSData } from '@/hooks/use-optimized-data';
import { usePOSKeyboard } from '@/hooks/usePOSKeyboard';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import type { Product, Customer, Category } from '@/types';
import type { CartItem } from '@/hooks/useCart';
import QuickActionsPanel from './QuickActionsPanel';

// Memoized sub-components for better performance
const ProductCard = memo(({ 
  product,
  onAddToCart,
  isWholesaleMode,
  quickAddMode,
  highlightProductId
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
  isWholesaleMode?: boolean;
  quickAddMode?: boolean;
  highlightProductId?: string;
}) => {
  const priceBase = isWholesaleMode && product.wholesale_price 
    ? product.wholesale_price 
    : product.sale_price;

  const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
  const isOutOfStock = (product.stock_quantity || 0) === 0;
  const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
  const discountedPrice = hasDiscount ? priceBase * (1 - (product.discount_percentage! / 100)) : priceBase;
  const ivaRate = (product.iva_rate ?? DEFAULT_IVA_RATE_PARAGUAY) as number;

  return (
    <Card className={`group relative overflow-hidden transition-all duration-150 hover:shadow-lg hover:scale-[1.01] border-2 ${
      isOutOfStock ? 'opacity-60' : ''
    } ${highlightProductId === product.id ? 'ring-4 ring-primary ring-offset-2 animate-pulse' : 'hover:border-primary/50'}`}>
      <div className="p-3 h-full flex flex-col">
        {/* Stock indicator */}
        {isLowStock && !isOutOfStock && (
          <Badge variant="destructive" className="absolute top-2 right-2 text-xs animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Stock bajo
          </Badge>
        )}
        {isOutOfStock && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            Agotado
          </Badge>
        )}

        {/* Product image placeholder */}
        <div className="aspect-square bg-muted/40 rounded-md mb-2 flex items-center justify-center transition-colors duration-150">
          <Package aria-hidden="true" className="w-9 h-9 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {/* Product info */}
        <div className="flex-1 space-y-1.5">
          <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          {product.sku && (
            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
          )}

          <div className="flex items-center gap-1.5">
            {hasDiscount && (
              <Badge variant="secondary" className="text-[11px] bg-green-100 text-green-800">
                -{product.discount_percentage}%
              </Badge>
            )}
            {product.category && (
              <Badge variant="outline" className="text-[11px]">
                {product.category.name}
              </Badge>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-primary">
                {formatCurrency(discountedPrice)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatCurrency(priceBase)}
                </span>
              )}
            </div>
            
            {isWholesaleMode && product.wholesale_price && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                Precio mayorista
              </Badge>
            )}
          </div>

          {/* Stock info */}
          <div className="flex items-center justify-between text-[11px]">
            <span className={isLowStock ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              Stock: {product.stock_quantity || 0}
            </span>
            {product.min_stock && (
              <span className="text-muted-foreground">
                Mín: {product.min_stock}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 space-y-1.5">
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            size="sm"
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
          
          {quickAddMode && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
            >
              <Zap className="w-4 h-4 mr-2" />
              Rápido
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default function EnhancedOptimizedPOSLayout() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [isWholesaleMode, setIsWholesaleMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(true); // Start open on desktop
  const [isCartFullscreen, setIsCartFullscreen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [recentlyAddedProductId, setRecentlyAddedProductId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Store state
  const paymentMethod = usePOSStore((s) => s.paymentMethod);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const discount = usePOSStore((s) => s.discount);
  const setDiscount = usePOSStore((s) => s.setDiscount);
  const discountType = usePOSStore((s) => s.discountType);
  const setDiscountType = usePOSStore((s) => s.setDiscountType);
  const notes = usePOSStore((s) => s.notes);
  const setNotes = usePOSStore((s) => s.setNotes);

  // Data hooks
  const {
    products = [],
    categories = [],
    customers = [],
    loading,
    refetchAll
  } = usePOSData();

  // Cart management
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart({
    products,
    selectedCustomer,
    isWholesaleMode,
    discount,
  });

  // Filter products
  const filteredProducts = React.useMemo(() => {
    let filtered = products;
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.category?.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const cartCalculations = React.useMemo(() => {
    return calculateCartWithIva(cart, products, discount, discountType);
  }, [cart, products, discount, discountType]);

  // Handlers
  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
    setRecentlyAddedProductId(product.id);
    setTimeout(() => setRecentlyAddedProductId(null), 1500);
    // Auto-open cart on mobile when adding items
    if (window.innerWidth < 1024) {
      setIsCartOpen(true);
    }
  }, [addToCart]);

  const handleClearCart = useCallback(() => {
    clearCart();
    setDiscount(0);
    setNotes('');
    setSelectedCustomer(null);
    toast.success('Carrito limpiado');
  }, [clearCart]);

  const handleProcessSale = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    try {
      // Simulate sale processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('¡Venta procesada exitosamente!', {
        description: `Total: ${formatCurrency(cartCalculations.total)}`,
      });
      
      handleClearCart();
    } catch (error) {
      toast.error('Error al procesar la venta');
    }
  }, [cart.length, cartCalculations.total, handleClearCart]);

  // Keyboard shortcuts
  usePOSKeyboard({
    onSearchFocus: () => document.getElementById('product-search')?.focus(),
    onProcessSale: handleProcessSale,
    onClearCart: handleClearCart,
    onToggleViewMode: () => setViewMode(v => v === 'grid' ? 'list' : 'grid'),
    onToggleQuickAddMode: () => setQuickAddMode(v => !v),
    onToggleCart: () => setIsCartOpen(v => !v),
    onToggleShortcutsModal: () => setShowKeyboardShortcuts(v => !v),
    cartLength: cart.length,
    quickAddMode,
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando punto de venta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Punto de Venta
            </h1>
          </div>
          
          <Badge variant="secondary" className="hidden sm:flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {products.length} productos
          </Badge>
          
          <Badge variant="outline" className="hidden md:flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {cart.length} en carrito
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="hidden lg:flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Acciones
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyboardShortcuts(true)}
            className="hidden sm:flex items-center gap-2"
          >
            <Keyboard className="w-4 h-4" />
            Atajos
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            className="items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>

          <Button
            variant={isWholesaleMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsWholesaleMode(v => !v)}
            className="items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            {isWholesaleMode ? 'Mayorista' : 'Minorista'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Quick Actions Panel - Desktop */}
        {showQuickActions && (
          <div className="hidden lg:block w-80 bg-popover/50 backdrop-blur-sm border-r border-border p-4 overflow-y-auto">
            <QuickActionsPanel
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onProcessSale={handleProcessSale}
              cartTotal={cartCalculations.total}
              cartItemCount={cart.length}
              disabled={cart.length === 0}
            />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Controls */}
          <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="product-search"
                type="text"
                placeholder="Buscar productos por nombre, código o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Add Mode */}
              <Button
                variant={quickAddMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickAddMode(v => !v)}
                className="items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Modo rápido
              </Button>

              {/* Results Count */}
              <Badge variant="secondary" className="ml-auto">
                {filteredProducts.length} resultados
              </Badge>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-muted-foreground">
                  Intenta ajustar tus filtros de búsqueda
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    isWholesaleMode={isWholesaleMode}
                    quickAddMode={quickAddMode}
                    highlightProductId={recentlyAddedProductId || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Cart Sidebar */}
        <aside className={`
          ${isCartFullscreen 
            ? 'fixed inset-0 z-50 w-full' 
            : 'w-96 border-l border-border'
          }
          ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0 lg:static
          bg-card/95 backdrop-blur-sm
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}>
          {/* Cart Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-primary" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse">
                    {cart.length > 99 ? '99+' : cart.length}
                  </Badge>
                )}
              </div>
              <div>
                <h2 className="font-semibold">Carrito</h2>
                <p className="text-sm text-muted-foreground">
                  {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isCartFullscreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCartFullscreen(false)}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">El carrito está vacío</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Agrega productos para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product_id} className="bg-card rounded-lg border p-3 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                          {item.product_name}
                        </h4>
                        {item.product?.sku && (
                          <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-semibold text-primary text-sm">
                            {formatCurrency(item.price)}
                          </span>
                          <span className="text-xs text-muted-foreground">c/u</span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-70 hover:opacity-100 transition-opacity p-1 h-6 w-6"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        
                        <span className="font-semibold min-w-[2rem] text-center text-sm">
                          {item.quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= (item.product?.stock_quantity || 999)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-4 bg-card">
              {/* Summary */}
              <div className="space-y-2 bg-muted rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(cartCalculations.subtotalWithIva)}</span>
                </div>
                
                {cartCalculations.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-medium text-green-600">-{formatCurrency(cartCalculations.discountAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span className="font-medium">{formatCurrency(cartCalculations.taxAmount)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(cartCalculations.total)}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCart}
                  className="items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCartFullscreen(true)}
                  className="items-center gap-2 lg:hidden"
                >
                  <Maximize2 className="w-4 h-4" />
                  Pantalla completa
                </Button>
              </div>

              {/* Quick Actions Panel - Mobile */}
              <div className="lg:hidden">
                <QuickActionsPanel
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  onProcessSale={handleProcessSale}
                  cartTotal={cartCalculations.total}
                  cartItemCount={cart.length}
                  disabled={cart.length === 0}
                />
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all"
                onClick={handleProcessSale}
                disabled={cart.length === 0}
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Procesar Venta</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {formatCurrency(cartCalculations.total)}
                  </Badge>
                </div>
              </Button>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile Cart Toggle */}
      {!isCartOpen && (
        <Button
          className="fixed bottom-6 right-6 lg:hidden z-30 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl transition-all"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-white" />
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse">
                {cart.length > 99 ? '99+' : cart.length}
              </Badge>
            )}
          </div>
        </Button>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-popover rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Atajos de Teclado
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeyboardShortcuts(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Buscar productos
                </span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Procesar venta
                </span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + Enter</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Limpiar carrito
                </span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + L</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Cambiar vista
                </span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + V</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Modo rápido
                </span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + Q</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Abrir/cerrar carrito
                </span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + C</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
