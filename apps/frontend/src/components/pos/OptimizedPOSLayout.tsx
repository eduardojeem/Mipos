'use client';

import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useDebounce } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { toast } from '@/lib/toast';
import {
  ShoppingCart,
  Search,
  Zap,
  Users,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Package,
  Grid3X3,
  List,
  X,
  Clock,
  Keyboard,
  Minimize2,
  PauseCircle,
  PackagePlus,
  ChevronDown
} from 'lucide-react';
import { usePOSStore } from '@/store';
import { useCart } from '@/hooks/useCart';
import { usePOSData } from '@/hooks/use-optimized-data';
import { usePOSKeyboard } from '@/hooks/usePOSKeyboard';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { type SaleResponse } from '@/lib/api';
const ProcessSaleModal = lazy(() => import('./ProcessSaleModal'));
const ReceiptModal = lazy(() => import('./ReceiptModal').then(m => ({ default: m.ReceiptModal })));
import type { Product, Customer } from '@/types';
import { usePOSRealtimeSync } from '@/hooks/usePOSRealtimeSync';
import { useDeviceType } from '@/components/ui/responsive-layout';
import { useOrientation, useIsLandscape } from '@/hooks/useOrientation';
import { AnimatedMobileCartDrawer } from './AnimatedMobileCartDrawer';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

import { POSProductsViewport } from './optimized/POSProductsViewport';
import { POSCartItem } from './optimized/POSCartItem';
import { POSCartSummary } from './optimized/POSCartSummary';
import { POSCartFooter } from './POSCartFooter';
import { SwipeableCategories } from './SwipeableCategories';
import { POSStats } from './POSStats';
import { CustomItemModal } from './CustomItemModal';
import { HeldSalesModal } from './HeldSalesModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThemeToggle } from '@/components/theme-toggle';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useCashSessionValidation } from '@/hooks/useCashSessionValidation';
import CashActionDialogs from '@/components/cash/CashActionDialogs';

// Loading fallback para lazy modales
const ModalLoadingFallback = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-background p-6 rounded-lg shadow-xl">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-sm text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

export default function OptimizedPOSLayout() {
  // Business Config
  const { config } = useBusinessConfig();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [isWholesaleMode, setIsWholesaleMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartFullscreen, setIsCartFullscreen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [recentlyAddedProductId, setRecentlyAddedProductId] = useState<string | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [isOpenSessionDialogOpen, setOpenSessionDialogOpen] = useState(false);
  const [autoRetryProcessing, setAutoRetryProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos.filters.open');
      if (saved !== null) setFiltersOpen(saved === '1');
    } catch { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pos.filters.open', filtersOpen ? '1' : '0');
    } catch { }
  }, [filtersOpen]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [isRealtimeOpen, setIsRealtimeOpen] = useState(true);
  const [productsLoadMode, setProductsLoadMode] = useState<'infinite' | 'pagination'>('infinite');
  const [productsPageSize, setProductsPageSize] = useState(10);
  const [productsBatchSize, setProductsBatchSize] = useState(12);
  const [productsPage, setProductsPage] = useState(1);


  // Store state
  const paymentMethod = usePOSStore((s) => s.paymentMethod);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const discount = usePOSStore((s) => s.discount);
  const setDiscount = usePOSStore((s) => s.setDiscount);
  const discountType = usePOSStore((s) => s.discountType);
  const setDiscountType = usePOSStore((s) => s.setDiscountType);
  const notes = usePOSStore((s) => s.notes);
  const setNotes = usePOSStore((s) => s.setNotes);
  const heldSales = usePOSStore((s) => s.heldSales);
  const addHeldSale = usePOSStore((s) => s.addHeldSale);
  const removeHeldSale = usePOSStore((s) => s.removeHeldSale);

  // Device detection
  const deviceType = useDeviceType();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const orientation = useOrientation();
  const isLandscape = useIsLandscape();

  // Data hooks
  const {
    products = [],
    categories = [],
    customers = [],
    loading,
    refetchAll
  } = usePOSData();

  // Cash session validation
  const { validateCashPayment } = useCashSessionValidation();

  // Índices optimizados para búsqueda y filtrado ultra-rápidos
  const productIndices = useMemo(() => {
    // Índice de búsqueda: pre-computar texto searchable
    // Mantenemos referencia al producto original para evitar duplicación
    const searchIndex = products.map(p => ({
      // id no es estrictamente necesario si tenemos referencia al producto, pero ayuda
      searchText: `${p.name} ${p.sku || ''} ${p.barcode || ''} ${p.brand || ''}`.toLowerCase(),
      categoryId: p.category_id || 'uncategorized',
      product: p,
      isActive: p.is_active !== false
    }));

    return {
      searchIndex,
      totalCount: products.length
    };
  }, [products]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos.quickAddMode');
      if (saved === '1') setQuickAddMode(true);
    } catch { }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos.realtimeSectionOpen');
      if (saved === '0') setIsRealtimeOpen(false);
    } catch { }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('pos.realtimeSectionOpen', isRealtimeOpen ? '1' : '0'); } catch { }
  }, [isRealtimeOpen]);

  useEffect(() => {
    try { localStorage.setItem('pos.quickAddMode', quickAddMode ? '1' : '0'); } catch { }
  }, [quickAddMode]);

  // Cart management
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCartItems
  } = useCart({
    products,
    selectedCustomer,
    isWholesaleMode,
    discount
  });

  // Filter products
  // Filtrado optimizado usando índices pre-computados
  const filteredProducts = useMemo(() => {
    const { searchIndex } = productIndices;

    // Comenzamos con todos los productos (o el índice)
    let candidates = searchIndex;

    // Filtro 1: Activos
    candidates = candidates.filter(item => item.isActive);

    // Filtro 2: Categoría
    if (selectedCategory !== 'all') {
      candidates = candidates.filter(item => item.categoryId === selectedCategory);
    }

    // Filtro 3: Búsqueda
    if (debouncedSearchQuery) {
      const searchLower = debouncedSearchQuery.toLowerCase();
      candidates = candidates.filter(item => item.searchText.includes(searchLower));
    }

    // Mapear de vuelta a productos
    return candidates.map(item => item.product);
  }, [productIndices, selectedCategory, debouncedSearchQuery]);

  // Cart calculations
  const cartCalculations = useMemo(() => {
    return calculateCartWithIva(cart, products, discount, discountType);
  }, [cart, products, discount, discountType]);

  // Handlers
  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
    setRecentlyAddedProductId(product.id);
    setTimeout(() => setRecentlyAddedProductId(null), 1500);

    // Feedback visual
    toast.success(`${product.name} agregado`, {
      description: 'Producto añadido al carrito',
    });

    // En móvil, abrir el drawer automáticamente
    if (deviceType === 'mobile') {
      setIsCartOpen(true);
    }
  }, [addToCart, deviceType]);

  const handleClearCart = useCallback(() => {
    clearCart();
    setDiscount(0);
    setNotes('');
    setSelectedCustomer(null);
    toast.success('Carrito limpiado');
  }, [clearCart, setDiscount, setNotes]);

  const handleHoldSale = useCallback(() => {
    if (cart.length === 0) return;

    const sale = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      cart: [...cart],
      customer: selectedCustomer,
      discount,
      discountType,
      notes
    };

    addHeldSale(sale);
    handleClearCart();
    toast.success('Venta puesta en espera');
  }, [cart, selectedCustomer, discount, discountType, notes, addHeldSale, handleClearCart]);

  const handleRestoreSale = useCallback((sale: any) => {
    if (cart.length > 0) {
      if (!window.confirm('Hay productos en el carrito actual. ¿Deseas descartarlos y restaurar la venta en espera?')) {
        return;
      }
    }

    setCartItems(sale.cart);
    setSelectedCustomer(sale.customer || null);
    setDiscount(sale.discount);
    setDiscountType(sale.discountType);
    setNotes(sale.notes || '');
    removeHeldSale(sale.id);
    toast.success('Venta restaurada');
  }, [cart.length, setCartItems, setDiscount, setDiscountType, setNotes, removeHeldSale]);

  const handleAddCustomItem = useCallback((item: { name: string; price: number; quantity: number }) => {
    const tempProduct: Product = {
      id: `custom-${Date.now()}`,
      name: item.name,
      sale_price: item.price,
      stock_quantity: 9999,
      category_id: 'custom',
      is_active: true,
      min_stock: 0,
      sku: 'CUSTOM',
      description: 'Item personalizado',
      cost_price: 0,
      wholesale_price: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addToCart(tempProduct, item.quantity);
  }, [addToCart]);

  const handleProcessSale = useCallback(() => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    // Abrir modal de procesamiento de venta
    setShowSaleModal(true);
  }, [cart.length]);

  const handleConfirmProcessSale = useCallback(async (
    newDiscount: number,
    newType: 'PERCENTAGE' | 'FIXED_AMOUNT',
    paymentDetails?: { transferReference?: string; cashReceived?: number; change?: number }
  ) => {
    try {
      // Validate cash session if payment method is CASH
      if (paymentMethod === 'CASH') {
        const isValid = await validateCashPayment();
        if (!isValid) {
          setOpenSessionDialogOpen(true);
          toast.error('Caja cerrada: abre una sesión de caja para aceptar pagos en efectivo.');
          return;
        }
      }

      const totals = calculateCartWithIva(cart, products, newDiscount, newType);

      const payload: any = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: 0
        })),
        customer_id: selectedCustomer?.id || null,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        discount_type: newType,
        payment_method: paymentMethod,
        sale_type: isWholesaleMode ? 'WHOLESALE' : 'RETAIL',
        notes: notes,
        total_amount: totals.total
      };

      // Add payment details if provided
      if (paymentDetails) {
        if (paymentDetails.transferReference) {
          payload.transfer_reference = paymentDetails.transferReference;
        }
        if (paymentDetails.cashReceived !== undefined) {
          payload.cashReceived = paymentDetails.cashReceived;
        }
        if (paymentDetails.change !== undefined) {
          payload.change = paymentDetails.change;
        }
      }

      const response = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la venta');
      }

      const data = await response.json();
      const sale = data.sale;

      setLastSale(sale);
      handleClearCart();
      setShowSaleModal(false);
      setShowReceiptModal(true);
      toast.success(`¡Venta procesada exitosamente!`);
    } catch (error: any) {
      console.error('Error processing sale:', error);
      toast.error(error.message || 'Error al procesar la venta');
      throw error;
    }
  }, [cart, products, paymentMethod, selectedCustomer, notes, handleClearCart, isWholesaleMode, validateCashPayment]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isConnected,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lastUpdate,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    newSalesCount,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refresh,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    markSalesAsViewed,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    notificationsEnabled,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toggleNotifications,
  } = usePOSRealtimeSync({ onRefresh: refetchAll, refreshDebounceMs: 1000 });

  // Calculate grid columns based on device and orientation
  const getGridColumns = () => {
    if (deviceType === 'mobile') {
      return isLandscape ? 2 : 1; // 2 columnas en landscape móvil
    }
    if (deviceType === 'tablet') {
      return isLandscape ? 3 : 2; // 3 columnas en landscape tablet
    }
    return 4; // Desktop siempre 4+
  };

  const gridColumns = getGridColumns();

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
      {/* Header - Ultra Premium */}
      <header className="relative">
        {/* Gradient Background Layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 dark:from-primary/10 dark:via-primary/15 dark:to-primary/10" />

        {/* Glassmorphism Overlay */}
        <div className="relative backdrop-blur-xl bg-card/90 dark:bg-card/95 border-b border-border shadow-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
            {/* Left Side - Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {/* Logo with glow effect */}
                <div className="relative p-1.5 sm:p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-primary/50 transition-shadow">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-xl blur-md opacity-50 animate-glow-pulse" />
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
                </div>

                {/* Title with gradient */}
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent truncate">
                  Punto de Venta
                </h1>
              </div>

              {/* Mini Stats - Desktop/Tablet Only */}
              <div className="hidden lg:block">
                <POSStats
                  productsCount={products.length}
                  cartItemsCount={cart.length}
                  cartTotal={cartCalculations.total}
                />
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-2">
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                {/* Theme Toggle */}
                <ThemeToggle />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="items-center gap-2 glass hover:bg-muted"
                >
                  <Keyboard className="w-4 h-4" />
                  Atajos
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchAll}
                  className="items-center gap-2 glass hover:bg-muted"
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

              {/* Mobile Menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass">
                    <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsWholesaleMode(v => !v)}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {isWholesaleMode ? 'Modo Minorista' : 'Modo Mayorista'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={refetchAll}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualizar Datos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowKeyboardShortcuts(true)}>
                      <Keyboard className="w-4 h-4 mr-2" />
                      Ver Atajos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Held Sales Indicator */}
                {heldSales.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:flex items-center gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                    onClick={() => setShowHeldSalesModal(true)}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{heldSales.length} en espera</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col overflow-hidden",
          deviceType === 'mobile' && "pb-24" // Espacio para el botón flotante
        )}>
          {/* Search and Controls - Ultra Premium */}
          <div className="glass dark:glass-dark border-b border-border p-2 sm:p-3 space-y-2 sm:space-y-3">
            {/* Search Bar - Ultra Premium */}
            <div className="relative group" role="search">
              {/* Focus ring animado con gradiente */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/70 to-primary/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />

              <div className="relative">
                {/* Ícono animado */}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 
                  text-muted-foreground transition-all duration-300
                  group-focus-within:text-primary 
                  group-focus-within:scale-110" />
                <label htmlFor="product-search" className="sr-only">Buscar productos</label>

                <input
                  id="product-search"
                  type="text"
                  placeholder="Buscar productos por nombre, código o categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 
                    border border-border rounded-xl
                    bg-card
                    focus:ring-4 focus:ring-primary/10 
                    focus:border-primary 
                    focus:shadow-lg
                    transition-all duration-300
                    shadow-sm hover:shadow-md
                    placeholder:text-muted-foreground"
                />

                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-muted"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3">
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="lg:col-span-8">
                <div className="flex items-center justify-between">
                  <h3 id="filters-title" className="text-sm font-semibold text-foreground">Filtros</h3>
                  <CollapsibleTrigger
                    aria-controls="filters-content"
                    aria-expanded={filtersOpen}
                    className="inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-md border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <span className="hidden sm:inline">{filtersOpen ? 'Ocultar' : 'Mostrar'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : 'rotate-0'}`} />
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent id="filters-content" className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden space-y-2 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                    {/* Desktop/Tablet: Select tradicional */}
                    <div className="hidden md:block md:col-span-2 min-w-[200px]">
                      <label htmlFor="category-filter" className="sr-only">Filtrar por categoría</label>
                      <select
                        id="category-filter"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="all">Todas las categorías</option>
                        {(categories as any[]).map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Móvil: Swipeable categories */}
                    <div className="md:hidden col-span-full">
                      <SwipeableCategories
                        categories={[
                          { id: 'all', name: 'Todas las categorías' },
                          ...(categories as any[]).map(cat => ({ id: cat.id, name: cat.name }))
                        ]}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-center gap-1 bg-muted/50 dark:bg-muted rounded-lg p-1 border border-border shadow-sm">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="flex-1 sm:flex-none transition-all duration-200 hover:scale-105 min-h-[44px] sm:min-h-0"
                        aria-label="Vista en cuadrícula"
                      >
                        <Grid3X3 className="w-4 h-4" />
                        <span className="ml-1 sm:hidden text-xs">Grid</span>
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="flex-1 sm:flex-none transition-all duration-200 hover:scale-105 min-h-[44px] sm:min-h-0"
                        aria-label="Vista en lista"
                      >
                        <List className="w-4 h-4" />
                        <span className="ml-1 sm:hidden text-xs">Lista</span>
                      </Button>
                      <Button
                        variant={quickAddMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setQuickAddMode(v => !v)}
                        className="ml-auto items-center gap-2 min-h-[44px] sm:min-h-0"
                      >
                        <Zap className="w-4 h-4" />
                        <span className="hidden sm:inline">Modo rápido</span>
                      </Button>
                    </div>
                  </div>

                  <section aria-labelledby="load-title" className="space-y-1">
                    <h4 id="load-title" className="text-sm font-semibold text-foreground">Carga de productos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2 bg-muted/50 dark:bg-muted/30 rounded-lg p-3 sm:p-2 border border-border shadow-sm">
                      <div className="space-y-1">
                        <label htmlFor="load-mode" className="text-xs text-muted-foreground">Modo</label>
                        <select
                          id="load-mode"
                          value={productsLoadMode}
                          onChange={(e) => { const v = e.target.value as 'infinite' | 'pagination'; setProductsLoadMode(v); if (v === 'pagination') setProductsPage(1); }}
                          className="w-full px-3 py-2.5 sm:py-2 border border-border rounded-lg text-sm sm:text-xs bg-card dark:bg-card/50 min-h-[44px] sm:min-h-0"
                        >
                          <option value="infinite">Scroll infinito</option>
                          <option value="pagination">Paginación</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="page-size" className="text-xs text-muted-foreground">Tamaño de página</label>
                        <select
                          id="page-size"
                          value={productsPageSize}
                          onChange={(e) => { setProductsPageSize(Number(e.target.value)); setProductsPage(1); }}
                          className="w-full px-3 py-2.5 sm:py-2 border border-border rounded-lg text-sm sm:text-xs bg-card dark:bg-card/50 min-h-[44px] sm:min-h-0"
                        >
                          <option value={10}>10</option>
                          <option value={12}>12</option>
                          <option value={20}>20</option>
                          <option value={24}>24</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="batch-size" className="text-xs text-muted-foreground">Lote</label>
                        <select
                          id="batch-size"
                          value={productsBatchSize}
                          onChange={(e) => setProductsBatchSize(Number(e.target.value))}
                          className="w-full px-3 py-2.5 sm:py-2 border border-border rounded-lg text-sm sm:text-xs bg-card dark:bg-card/50 min-h-[44px] sm:min-h-0"
                        >
                          <option value={12}>12</option>
                          <option value={24}>24</option>
                          <option value={36}>36</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </CollapsibleContent>
              </Collapsible>

              <section aria-labelledby="actions-title" className="lg:col-span-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="actions-title" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones rápidas</h3>
                  <Badge variant="secondary">{filteredProducts.length} resultados</Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-2 sm:p-1 border border-blue-200/50 dark:border-blue-800/30 shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomItemModal(true)}
                    className="w-full sm:w-auto justify-start sm:justify-center hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200 min-h-[44px] sm:min-h-0"
                  >
                    <PackagePlus className="w-4 h-4 mr-1.5" />
                    Item Manual
                  </Button>
                  <div className="hidden sm:block w-px h-6 bg-blue-200 dark:bg-blue-800" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHoldSale}
                    disabled={cart.length === 0}
                    className="w-full sm:w-auto justify-start sm:justify-center hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200 min-h-[44px] sm:min-h-0"
                  >
                    <PauseCircle className="w-4 h-4 mr-1.5" />
                    Espera
                  </Button>
                </div>
                {heldSales.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHeldSalesModal(true)}
                    className="justify-self-end relative overflow-hidden border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 text-orange-700 dark:text-orange-400 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/40 dark:hover:to-amber-900/40 transition-all duration-300 group"
                  >
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <Clock className="w-4 h-4 mr-1.5" />
                    <span className="font-semibold">{heldSales.length}</span>
                    <span className="ml-1">en espera</span>
                  </Button>
                )}
              </section>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ contentVisibility: 'auto', containIntrinsicSize: '1000px' }}>
            <POSProductsViewport
              products={filteredProducts}
              viewMode={viewMode}
              onAddToCart={handleAddToCart}
              isWholesaleMode={isWholesaleMode}
              quickAddMode={quickAddMode}
              highlightProductId={recentlyAddedProductId || undefined}
              loading={loading}
              gridColumns={gridColumns}
              controls={{
                mode: productsLoadMode,
                pageSize: productsPageSize,
                batchSize: productsBatchSize,
                page: productsPage,
                onModeChange: setProductsLoadMode,
                onPageSizeChange: setProductsPageSize,
                onBatchSizeChange: setProductsBatchSize,
                onPageChange: setProductsPage,
              }}
            />
          </div>
        </main>

        {/* Desktop/Tablet Cart Sidebar */}
        {deviceType !== 'mobile' && (
          <aside id="pos-cart-panel" role="complementary" aria-label="Carrito de compras" className={cn(
            isCartFullscreen
              ? 'fixed inset-0 z-50 w-full'
              : 'w-96 border-l border-border',
            isCartOpen ? 'translate-x-0' : 'translate-x-full',
            'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen',
            'bg-card/95 backdrop-blur-sm',
            'transition-transform duration-300 ease-in-out',
            'flex flex-col'
          )}>
            {/* Cart Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cart.length > 99 ? '99+' : cart.length}
                    </Badge>
                  )}
                </div>
                <div>
                  <h2 id="cart-title" className="font-semibold">Carrito</h2>
                  <p className="text-sm text-muted-foreground" aria-live="polite">
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
                    aria-label="Salir de pantalla completa"
                    aria-controls="pos-cart-panel"
                    className="h-9"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCartOpen(false)}
                  className="lg:hidden h-9"
                  aria-label="Cerrar carrito"
                  aria-controls="pos-cart-panel"
                  aria-expanded={false}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-28">
              {cart.length === 0 ? (
                <div className="text-center py-8" role="status" aria-live="polite">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">El carrito está vacío</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Agrega productos para comenzar
                  </p>
                </div>
              ) : (
                <div role="list" className="space-y-3 sm:space-y-4">
                  {cart.map(item => (
                    <div role="listitem" key={item.product_id}>
                      <POSCartItem
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemoveItem={removeFromCart}
                        isRecentlyAdded={item.product_id === recentlyAddedProductId}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer - Smart Collapsible */}
            <POSCartFooter
              cartLength={cart.length}
              cartCalculations={cartCalculations}
              onProcessSale={handleProcessSale}
              onClearCart={handleClearCart}
              onHoldSale={handleHoldSale}
              onToggleFullscreen={() => setIsCartFullscreen(true)}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              customerSearchOpen={customerSearchOpen}
              setCustomerSearchOpen={setCustomerSearchOpen}
              customerQuery={customerQuery}
              setCustomerQuery={setCustomerQuery}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={(method) => setPaymentMethod(method as any)}
            />
          </aside>
        )}
      </div>


      {/* Mobile Cart Integration */}
      {deviceType === 'mobile' && (
        <>
          {/* Floating Cart Button */}
          {!isCartOpen && (
            <Button
              className="fixed bottom-6 right-6 z-50 rounded-full w-16 h-16 shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
              onClick={() => setIsCartOpen(true)}
              aria-label="Abrir carrito"
            >
              <div className="relative">
                <ShoppingCart className="w-7 h-7 text-white" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs border-2 border-white animate-in zoom-in">
                    {cart.length > 99 ? '99+' : cart.length}
                  </Badge>
                )}
              </div>
            </Button>
          )}

          {/* Mobile Drawer - Animated */}
          <AnimatedMobileCartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          >
            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Tu carrito está vacío
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Agrega productos para comenzar una venta
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <POSCartItem
                      key={item.product_id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemoveItem={removeFromCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary - Sticky Bottom */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 z-10 bg-background border-t border-border px-4 py-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                <POSCartSummary calculations={cartCalculations} />
                <POSCartFooter
                  cartLength={cart.length}
                  cartCalculations={cartCalculations}
                  onProcessSale={handleProcessSale}
                  onClearCart={handleClearCart}
                  onHoldSale={handleHoldSale}
                  onToggleFullscreen={() => setIsCartFullscreen(true)}
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  customerSearchOpen={customerSearchOpen}
                  setCustomerSearchOpen={setCustomerSearchOpen}
                  customerQuery={customerQuery}
                  setCustomerQuery={setCustomerQuery}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={(method) => setPaymentMethod(method as any)}
                />
              </div>
            )}
          </AnimatedMobileCartDrawer>
        </>
      )}

      {/* Keyboard Shortcuts Modal */}
      {
        showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-popover rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Atajos de Teclado</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKeyboardShortcuts(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Buscar productos</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Procesar venta</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Limpiar carrito</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + L</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Cambiar vista</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + V</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Modo rápido</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + Q</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Abrir/cerrar carrito</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + C</kbd>
                </div>
              </div>
            </div>
          </div>
        )
      }


      {/* Sale Processing Modal (lazy loaded) */}
      {
        showSaleModal && (
          <Suspense fallback={<ModalLoadingFallback />}>
            <ProcessSaleModal
              isOpen={showSaleModal}
              onClose={() => setShowSaleModal(false)}
              cart={cart}
              products={products}
              initialDiscount={discount}
              initialDiscountType={discountType}
              customer={selectedCustomer}
              customers={customers}
              onSelectCustomer={setSelectedCustomer}
              paymentMethod={paymentMethod as any}
              onPaymentMethodChange={(m) => setPaymentMethod(m as any)}
              enableSplitPayment={true}
              onRemoveItem={(id) => removeFromCart(id)}
              onConfirm={async (d, t) => {
                await handleConfirmProcessSale(d, t);
              }}
            />
          </Suspense>
        )
      }

      {/* Receipt Modal (lazy loaded) */}
      {
        showReceiptModal && lastSale && (
          <Suspense fallback={<ModalLoadingFallback />}>
            <ReceiptModal
              isOpen={showReceiptModal}
              onClose={() => setShowReceiptModal(false)}
              saleData={lastSale}
              businessInfo={{
                name: config.businessName,
                address: `${config.address.street}, ${config.address.city}`,
                phone: config.contact.phone,
                taxId: config.legalInfo.ruc || '',
                email: config.contact.email,
                website: config.contact.website,
                logo: config.branding.logo
              }}
              thermalPrinter={true}
              onPrint={() => {
                if (lastSale) {
                  // Abrir ventana de impresión con el recibo
                  const printWindow = window.open(`/receipt/${lastSale.id}`, '_blank', 'width=800,height=600');
                  printWindow?.focus();
                }
              }}
              onDownload={() => {
                if (lastSale) {
                  // Descargar recibo como PDF
                  const link = document.createElement('a');
                  link.href = `/api/receipts/${lastSale.id}/download`;
                  link.download = `recibo-venta-${lastSale.saleNumber}.pdf`;
                  link.click();
                }
              }}
            />
          </Suspense>
        )
      }

      <CustomItemModal
        isOpen={showCustomItemModal}
        onClose={() => setShowCustomItemModal(false)}
        onAdd={handleAddCustomItem}
      />

      <HeldSalesModal
        isOpen={showHeldSalesModal}
        onClose={() => setShowHeldSalesModal(false)}
        heldSales={heldSales}
        onRestore={handleRestoreSale}
        onDiscard={removeHeldSale}
      />

      <CashActionDialogs
        isOpenSessionDialogOpen={isOpenSessionDialogOpen}
        setOpenSessionDialogOpen={setOpenSessionDialogOpen}
        isCloseSessionDialogOpen={false}
        setCloseSessionDialogOpen={() => { }}
        isNewMovementDialogOpen={false}
        setNewMovementDialogOpen={() => { }}
        onOpenSession={async (amount: number, notes?: string) => {
          try {
            const res = await (await import('@/lib/api')).default.post('/cash/session/open', {
              openingAmount: amount,
              notes: (notes || 'Apertura de caja').slice(0, 200)
            });
            if (res.status >= 200 && res.status < 300) {
              const apiClient = (await import('@/lib/api')).default;
              const verifyRes = await apiClient.get('/cash/session/current');
              const status = (verifyRes?.data?.session?.status || '').toLowerCase();
              if (status === 'open') {
                toast.success('Caja abierta: ya puedes aceptar pagos en efectivo.');
                setOpenSessionDialogOpen(false);
                if (showSaleModal && paymentMethod === 'CASH') {
                  try {
                    setAutoRetryProcessing(true);
                    await handleConfirmProcessSale(discount, discountType);
                  } catch { }
                  finally { setAutoRetryProcessing(false); }
                }
              } else {
                toast.error('No se confirmó la apertura de caja. Intenta nuevamente.');
              }
            } else {
              toast.error('Error abriendo sesión de caja');
            }
          } catch (e: any) {
            const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error abriendo sesión de caja';
            toast.error(msg);
          }
        }}
        onRequestCloseSession={() => { }}
        onRequestRegisterMovement={() => { }}
        loadingOpening={false}
        loadingClosing={false}
        loadingRegistering={false}
        currentBalance={0}
      />

      {
        autoRetryProcessing && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-popover rounded-xl p-6 shadow-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Procesando venta...</span>
            </div>
          </div>
        )
      }
    </div >
  );
}
