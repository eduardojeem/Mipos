'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer, Suspense, lazy } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import {
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Settings,
  Package,
  Receipt,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  History,
  RefreshCw,
  Maximize2,
  Minimize2,
  Mail,
  Zap,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
  Search,
  Barcode,
  Trash2,
  CreditCard,
  Keyboard,

} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import POSHeaderBar from '@/components/pos/POSHeaderBar';
import POSHeader from '@/components/pos/POSHeader';
import POSQuickActions from '@/components/pos/POSQuickActions';
import POSMainContent from '@/components/pos/POSMainContent';
import POSNavigationBar from '@/components/pos/POSNavigationBar';
import SummaryMetricsBar from '@/components/pos/SummaryMetricsBar';
import StockAlertBanner from '@/components/pos/StockAlertBanner';
import ProductToolbar from '@/components/pos/ProductToolbar';
import { LazyProductCatalog } from '@/components/lazy';
import QuickAccessTopProducts from '@/components/pos/QuickAccessTopProducts';
import EnhancedCart from '@/components/pos/EnhancedCart';
// Lazy-loaded heavy components to reduce initial bundle
const CustomerManagementLazy = lazy(() => import('@/components/pos/CustomerManagement'));
const ProcessSaleModalLazy = lazy(() => import('@/components/pos/ProcessSaleModal'));
// ReceiptPrint is not directly used here; removing static import
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { usePOSKeyboard } from '@/hooks/usePOSKeyboard';
import { usePOSModals } from '@/hooks/usePOSModals';
import { usePOSFilters } from '@/hooks/usePOSFilters';
import { usePOSDraft } from '@/hooks/usePOSDraft';
import { useCart } from '@/hooks/useCart';
import { usePOSCustomers } from '@/hooks/usePOSCustomers';
import { useCheckout } from '@/hooks/useCheckout';
import { usePOSData, usePreloadCriticalData } from '@/hooks/use-optimized-data';
import { usePOSRealtimeSync } from '@/hooks/usePOSRealtimeSync';
import { usePerfMetrics } from '@/hooks/usePerfMetrics';
import { logPerformanceMetric } from '@/lib/analytics';
import { usePrint } from '@/hooks/usePrint';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { usePOSStore } from '@/store';
import type { Product, Category, Customer } from '@/types';
import type { CartItem } from '@/hooks/useCart';

import { Skeleton } from '@/components/ui/skeleton';

// Types for useReducer
type UiState = {
  isWholesaleMode: boolean;
  barcodeMode: boolean;
  viewMode: 'grid' | 'list';
  quickAddMode: boolean;
  isCartOpen: boolean;
  isCartFullscreen: boolean;
  dbStatus: 'verifying' | 'ok' | 'error';
  dbError: string | null;
  recentlyAddedProductId: string | null;
  isCartCollapsed: boolean;
  isProcessSaleOpen: boolean;
  showQuickActions: boolean;
  performanceMode: boolean;
  lastActivity: Date;
};

type UiAction =
  | { type: 'SET_WHOLESALE_MODE'; payload: boolean }
  | { type: 'SET_BARCODE_MODE'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_QUICK_ADD_MODE'; payload: boolean }
  | { type: 'SET_CART_OPEN'; payload: boolean }
  | { type: 'SET_CART_FULLSCREEN'; payload: boolean }
  | { type: 'SET_DB_STATUS'; payload: { status: 'verifying' | 'ok' | 'error'; error: string | null } }
  | { type: 'SET_RECENTLY_ADDED_PRODUCT'; payload: string | null }
  | { type: 'SET_CART_COLLAPSED'; payload: boolean }
  | { type: 'SET_PROCESS_SALE_OPEN'; payload: boolean }
  | { type: 'SET_SHOW_QUICK_ACTIONS'; payload: boolean }
  | { type: 'SET_PERFORMANCE_MODE'; payload: boolean }
  | { type: 'SET_LAST_ACTIVITY'; payload: Date };

// ProcessSaleModal is loaded lazily above

interface POSLayoutProps {
  children?: React.ReactNode;
}

// (Se eliminó el panel de Transacciones Recientes a solicitud del usuario)
type CatalogSectionProps = {
  catalogSectionRef: React.RefObject<HTMLElement | null>
  searchQuery: string
  onChangeSearch: (v: string) => void
  viewMode: 'grid' | 'list'
  onChangeViewMode: (m: 'grid' | 'list') => void
  barcodeMode: boolean
  onToggleBarcodeMode: () => void
  onBarcodeEnter: (code: string) => void
  barcodeInputRef: React.RefObject<HTMLInputElement | null>
  categories: Category[]
  selectedCategory: string
  onChangeCategory: (id: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  resultCount: number
  quickAddMode: boolean
  onToggleQuickAddMode: () => void
  products: Product[]
  customers: Customer[]
  onQuickAdd: (p: Product) => void
  loading: boolean
  sortBy: 'name' | 'price' | 'stock'
  sortOrder: 'asc' | 'desc'
  onChangeSortBy: (v: 'name' | 'price' | 'stock') => void
  onToggleSortOrder: () => void
  filteredProducts: Product[]
  isWholesaleMode: boolean
  onAddToCart: (p: Product) => void
  highlightProductId?: string
  onViewProduct: (productId: string) => void
}

function CatalogSection(props: CatalogSectionProps) {
  const {
    catalogSectionRef,
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
    quickAddMode,
    onToggleQuickAddMode,
    products,
    customers,
    onQuickAdd,
    loading,
    sortBy,
    sortOrder,
    onChangeSortBy,
    onToggleSortOrder,
    filteredProducts,
    isWholesaleMode,
    onAddToCart,
    highlightProductId,
    onViewProduct,
  } = props

  return (
    <section
      ref={catalogSectionRef}
      aria-labelledby="catalog-title"
      className={`flex flex-col min-w-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-200 motion-reduce:transition-none`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '800px' }}
      role="main"
      aria-label="Catálogo de productos"
    >
      <h2 id="catalog-title" className="sr-only scroll-mt-16 sm:scroll-mt-24">Catálogo y búsqueda de productos</h2>
      <div className="border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 bg-card/80 dark:bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 rounded-t-xl">
        <ProductToolbar
          searchQuery={searchQuery}
          onChangeSearch={onChangeSearch}
          viewMode={viewMode}
          onChangeViewMode={onChangeViewMode}
          barcodeMode={barcodeMode}
          onToggleBarcodeMode={onToggleBarcodeMode}
          onBarcodeEnter={onBarcodeEnter}
          barcodeInputRef={barcodeInputRef}
          categories={categories}
          selectedCategory={selectedCategory}
          onChangeCategory={onChangeCategory}
          searchInputRef={searchInputRef}
          resultCount={resultCount}
          quickAddMode={quickAddMode}
          onToggleQuickAddMode={onToggleQuickAddMode}
          products={products}
          customers={customers}
          showSuggestions={true}
          onQuickAdd={onQuickAdd}
          loading={loading}
          sortBy={sortBy as 'name' | 'price' | 'stock'}
          sortOrder={sortOrder}
          onChangeSortBy={onChangeSortBy}
          onToggleSortOrder={onToggleSortOrder}
        />
        <div id="quick-access-top-products" aria-label="Accesos rápidos: más vendidos" className="scroll-mt-16 sm:scroll-mt-24">
          <QuickAccessTopProducts products={products} onQuickAdd={onQuickAdd} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar p-2 sm:p-3 lg:p-4" style={{ contentVisibility: 'auto' }}>
        <LazyProductCatalog
          products={filteredProducts}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          viewMode={viewMode}
          isWholesaleMode={isWholesaleMode}
          quickAddMode={quickAddMode}
          onAddToCart={onAddToCart}
          loading={loading}
          highlightProductId={highlightProductId}
          onViewProduct={onViewProduct}
          infiniteScroll={true}
        />
      </div>
    </section>
  )
}

type CartAsideProps = {
  isCartOpen: boolean
  isCartFullscreen: boolean
  isCartCollapsed: boolean
  performanceMode: boolean
  cart: CartItem[]
  onCloseCart: () => void
  onToggleFullscreen: () => void
  onToggleCollapsed: () => void
  selectedCustomer: Customer | null
  discount: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
  notes: string
  processing: boolean
  isWholesaleMode: boolean
  onUpdateQuantity: (id: string, q: number) => void
  onRemoveItem: (id: string) => void
  onClearCart: () => void
  onSelectCustomer: (c: Customer | null) => void
  onSetDiscount: (v: number) => void
  onSetDiscountType: (v: 'PERCENTAGE' | 'FIXED_AMOUNT') => void
  onSetPaymentMethod: (v: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER') => void
  onSetNotes: (v: string) => void
  onProcessSale: () => void
  products: Product[]
  highlightProductId?: string
  onViewInCatalog: (productId: string) => void
  onAddToCart: (product: any, quantity: number) => void
  onToggleCartFullscreen: () => void
  customers: Customer[]
  onToggleWholesaleMode: () => void
}

function CartAside(props: CartAsideProps) {
  const {
    isCartOpen,
    isCartFullscreen,
    isCartCollapsed,
    performanceMode,
    cart,
    onCloseCart,
    onToggleFullscreen,
    onToggleCollapsed,
    selectedCustomer,
    discount,
    discountType,
    paymentMethod,
    notes,
    processing,
    isWholesaleMode,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onSelectCustomer,
    onSetDiscount,
    onSetDiscountType,
    onSetPaymentMethod,
    onSetNotes,
    onProcessSale,
    products,
    highlightProductId,
    onViewInCatalog,
    onAddToCart,
    onToggleCartFullscreen,
    customers,
    onToggleWholesaleMode,
  } = props

  return (
    <aside
      aria-labelledby="cart-title"
      className={`
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
        ${isCartFullscreen ? 'fixed inset-0 w-full z-[60] rounded-none border-0 shadow-2xl' : 'fixed inset-y-0 right-0 z-50 w-full sm:w-96 lg:w-auto'}
        ${isCartFullscreen ? '' : 'lg:sticky lg:top-16 lg:translate-x-0 lg:z-auto'}
        bg-card ${isCartFullscreen ? '' : 'border-l border-border'} shadow-xl lg:shadow-sm ${isCartFullscreen ? 'rounded-none' : 'rounded-xl lg:rounded-none'} ${isCartFullscreen ? 'p-2 sm:p-4' : ''}
        ${performanceMode ? 'transition-none' : 'transition-transform duration-300 ease-in-out'} motion-reduce:transition-none motion-reduce:transform-none
        flex flex-col ${!isCartFullscreen && isCartCollapsed ? 'lg:max-w-[60px] lg:min-w-[60px]' : ''}
      `}
      role="complementary"
      aria-label="Carrito de compras"
    >
      <div className={`flex items-center justify-between p-3 sm:p-4 border-b border-border bg-background ${isCartFullscreen ? 'hidden' : ''}`}>
        <div className={`flex items-center gap-2 ${isCartCollapsed ? 'hidden lg:hidden' : ''}`}>
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <h2 id="cart-title" className="text-lg font-semibold text-gray-900">
            Carrito ({cart.length})
          </h2>
        </div>
        <div className={`flex items-center gap-1 lg:hidden ${isCartCollapsed ? 'hidden' : ''}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseCart}
            className="p-2"
            aria-label="Cerrar carrito"
          >
            <X className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="p-2"
            aria-label={isCartFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isCartFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
        <div className="hidden lg:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="p-2"
            aria-label={isCartCollapsed ? 'Expandir carrito' : 'Colapsar carrito'}
          >
            {isCartCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="p-2"
            aria-label={isCartFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isCartFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div className={`flex-1 overflow-hidden ${isCartCollapsed ? 'hidden lg:hidden' : ''}`}>
        <div className={`${isCartFullscreen ? 'mx-auto max-w-[1100px] h-full' : ''}`}>
          <EnhancedCart
            cart={cart}
            customers={customers}
            selectedCustomer={selectedCustomer}
            discount={discount}
            discountType={discountType}
            paymentMethod={paymentMethod}
            notes={notes}
            processing={processing}
            isWholesaleMode={isWholesaleMode}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onClearCart={onClearCart}
            onSelectCustomer={onSelectCustomer}
            onSetDiscount={onSetDiscount}
            onSetDiscountType={onSetDiscountType}
            onSetPaymentMethod={onSetPaymentMethod}
            onSetNotes={onSetNotes}
            onProcessSale={onProcessSale}
            onToggleWholesaleMode={onToggleWholesaleMode}
            products={products}
            highlightProductId={highlightProductId}
            onViewInCatalog={onViewInCatalog}
            onAddToCart={onAddToCart}
            onToggleCartFullscreen={onToggleCartFullscreen}
          />
        </div>
      </div>
    </aside>
  )
}

const POSLayout = React.memo(function POSLayout({ children }: POSLayoutProps) {
    // Performance optimizations
    usePreloadCriticalData();

    // Perf metrics: track mount and first data load
    const perf = usePerfMetrics('POSLayout');

    // Data hooks - memoized to prevent unnecessary re-renders
    const data = usePOSData();
    const {
      products = [],
      categories = [],
      customers = [],
      salesStats,
      loading,
      error,
      refetchAll,
      isStale
    } = data;

    const realtimeSync = usePOSRealtimeSync({ onRefresh: refetchAll, refreshDebounceMs: 1000 });
    const {
      isConnected,
      lastUpdate,
      newSalesCount,
      refresh,
      notificationsEnabled,
      toggleNotifications,
      markSalesAsViewed,
    } = realtimeSync;

    // State management (centralizado en store) - optimized selectors
    const storeState = usePOSStore();
    const paymentMethod = storeState.paymentMethod;
    const setPaymentMethod = storeState.setPaymentMethod;
    const discount = storeState.discount;
    const setDiscount = storeState.setDiscount;
    const discountType = storeState.discountType;
    const setDiscountType = storeState.setDiscountType;
    const notes = storeState.notes;
    const setNotes = storeState.setNotes;
    const promotions = storeState.items as any[];
    const fetchPromotions = storeState.fetchPromotions;
    const couponCode = storeState.couponCode;
    const setCouponData = storeState.setCouponData;

    // Local state - optimized with useReducer for complex state management
    const initialUiState: UiState = {
      isWholesaleMode: false,
      barcodeMode: false,
      viewMode: 'grid' as 'grid' | 'list',
      quickAddMode: false,
      isCartOpen: false,
      isCartFullscreen: false,
      dbStatus: 'verifying' as 'verifying' | 'ok' | 'error',
      dbError: null as string | null,
      recentlyAddedProductId: null as string | null,
      isCartCollapsed: false,
      isProcessSaleOpen: false,
      showQuickActions: false,
      performanceMode: false,
      lastActivity: new Date()
    };

    const [uiState, dispatch] = useReducer((state: UiState, action: UiAction) => {
      switch (action.type) {
        case 'SET_WHOLESALE_MODE':
          return { ...state, isWholesaleMode: action.payload };
        case 'SET_BARCODE_MODE':
          return { ...state, barcodeMode: action.payload };
        case 'SET_VIEW_MODE':
          return { ...state, viewMode: action.payload };
        case 'SET_QUICK_ADD_MODE':
          return { ...state, quickAddMode: action.payload };
        case 'SET_CART_OPEN':
          return { ...state, isCartOpen: action.payload };
        case 'SET_CART_FULLSCREEN':
          return { ...state, isCartFullscreen: action.payload };
        case 'SET_DB_STATUS':
          return { ...state, dbStatus: action.payload.status, dbError: action.payload.error };
        case 'SET_RECENTLY_ADDED_PRODUCT':
          return { ...state, recentlyAddedProductId: action.payload };
        case 'SET_CART_COLLAPSED':
          return { ...state, isCartCollapsed: action.payload };
        case 'SET_PROCESS_SALE_OPEN':
          return { ...state, isProcessSaleOpen: action.payload };
        case 'SET_SHOW_QUICK_ACTIONS':
          return { ...state, showQuickActions: action.payload };
        case 'SET_PERFORMANCE_MODE':
          return { ...state, performanceMode: action.payload };
        case 'SET_LAST_ACTIVITY':
          return { ...state, lastActivity: action.payload };
        default:
          return state;
      }
    }, initialUiState);

    // Extract state values for easier access
    const {
      isWholesaleMode,
      barcodeMode,
      viewMode,
      quickAddMode,
      isCartOpen,
      isCartFullscreen,
      dbStatus,
      dbError,
      recentlyAddedProductId,
      isCartCollapsed,
      isProcessSaleOpen,
      showQuickActions,
      performanceMode,
      lastActivity
    } = uiState;

    // Persistencia del estado del panel de cliente (cerrado por defecto)
    const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState<boolean>(() => {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem('pos_customer_panel_open');
        return v ? v === 'true' : false; // cerrado por defecto
      }
      return false;
    });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_customer_panel_open', String(isCustomerPanelOpen));
    }
  }, [isCustomerPanelOpen]);

  useEffect(() => {
    fetchPromotions({ status: 'active' }).catch(() => {});
  }, [fetchPromotions]);


  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const catalogSectionRef = useRef<HTMLElement>(null);

  // Custom hooks
  const { customersList, selectedCustomer, setSelectedCustomer, selectCustomer } = usePOSCustomers(
    Array.isArray(customers) ? customers : []
  );

  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart({
    products,
    selectedCustomer,
    isWholesaleMode,
    discount,
  });

  const { processing, processSale, processSaleWithOverrides } = useCheckout({
    products,
    discount,
    discountType,
    paymentMethod,
    notes,
    selectedCustomer,
  });

  const { printRef, handlePrint } = usePrint();

  const categoriesList = Array.isArray(categories) ? categories : [];

  // Persistencia: pantalla completa del carrito
  useEffect(() => {
    try {
      const savedFs = localStorage.getItem('pos.cart.fullscreen');
      if (savedFs === '1') {
        dispatch({ type: 'SET_CART_FULLSCREEN', payload: true });
        dispatch({ type: 'SET_CART_OPEN', payload: true });
      }
    } catch {}
  }, []);

  // Persistencia del modo de añadir rápido
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos.quickAddMode');
      if (saved === '1') dispatch({ type: 'SET_QUICK_ADD_MODE', payload: true });
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('pos.quickAddMode', quickAddMode ? '1' : '0'); } catch {}
  }, [quickAddMode]);
  useEffect(() => {
    try {
      localStorage.setItem('pos.cart.fullscreen', isCartFullscreen ? '1' : '0');
      // Si se activa pantalla completa, asegurar que el carrito esté abierto
      if (isCartFullscreen) dispatch({ type: 'SET_CART_OPEN', payload: true });
    } catch {}
  }, [isCartFullscreen]);

  // Filters hook
  const {
    searchQuery,
    selectedCategory,
    filteredProducts,
    handleSearchChange,
    handleCategoryChange,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
  } = usePOSFilters({ products, categories: categoriesList });

  // Modals hook
  const {
    showCustomerModal,
    showReceiptModal,
    showKeyboardShortcuts,
    lastSale,
    openCustomerModal,
    closeCustomerModal,
    openReceiptModal,
    closeReceiptModal,
    toggleKeyboardShortcuts,
    handleCustomerSelect,
  } = usePOSModals({
    onCustomerSelect: selectCustomer,
  });

  const handleSendReceiptEmail = React.useCallback(() => {
    try {
      if (!lastSale) {
        toast.show({ title: 'No hay recibo disponible', description: 'Procesa una venta para generar el comprobante.', variant: 'destructive' });
        return;
      }
      if (!selectedCustomer?.email) {
        toast.show({ title: 'Cliente sin email', description: 'Selecciona un cliente con email para enviar el comprobante.' });
        return;
      }

      const subject = `Recibo de venta - ${new Date().toLocaleString()}`;
      const items = Array.isArray(lastSale.items) ? lastSale.items : [];

      const lines: string[] = [];
      lines.push(`Hola ${selectedCustomer?.name || ''},`);
      lines.push('Adjunto el resumen de tu compra:');
      lines.push('');
      items.forEach((it: any) => {
        lines.push(`• ${it.product_name} x${it.quantity} = ${formatCurrency(it.total)}`);
      });
      lines.push('');
      lines.push(`Subtotal: ${formatCurrency(lastSale.subtotal)}`);
      if (lastSale.discount > 0) {
        lines.push(`Descuento: -${formatCurrency(lastSale.discount)} (${lastSale.discount_type === 'PERCENTAGE' ? '%' : 'Monto'})`);
      }
      lines.push(`IVA: ${formatCurrency(lastSale.tax)}`);
      lines.push(`Total: ${formatCurrency(lastSale.total)}`);
      lines.push(`Método de pago: ${lastSale.payment_method}`);
      if (lastSale.notes) {
        lines.push(`Notas: ${lastSale.notes}`);
      }
      if (lastSale.coupon_code) {
        lines.push(`Cupón aplicado: ${lastSale.coupon_code}`);
      }

      const body = encodeURIComponent(lines.join('\n'));
      const mailtoUrl = `mailto:${selectedCustomer.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.location.href = mailtoUrl;

      toast.show({ title: 'Comprobante preparado', description: `Abriendo tu cliente de correo para ${selectedCustomer.email}` });
    } catch (err) {
      toast.show({ title: 'Error al preparar email', description: 'Inténtalo nuevamente o verifica tu configuración de correo.', variant: 'destructive' });
    }
  }, [lastSale, selectedCustomer]);

  // Draft hook
  const { hasDraft, saveDraft, restoreDraft } = usePOSDraft();

  // Keyboard shortcuts will be initialized after functions are defined

  // Stats calculation
  const stats = React.useMemo(() => {
    const safe = salesStats && typeof salesStats === 'object' && !Array.isArray(salesStats)
      ? salesStats
      : { total_sales: 0, transaction_count: 0, average_ticket: 0, top_selling_product: '' };
    return {
      todaySales: safe.total_sales || 0,
      todayTransactions: safe.transaction_count || 0,
      averageTicket: safe.average_ticket || 0,
      topProduct: safe.top_selling_product || ''
    };
  }, [salesStats]);

  // Cart calculations - optimized with memo
  const cartCalculations = React.useMemo(() => {
    return calculateCartWithIva(cart, products, discount, discountType);
  }, [cart, discount, discountType, products]);

  // Low stock count for metrics panel
  const lowStockCount = React.useMemo(() => {
    try {
      const list = Array.isArray(products) ? products : [];
      return list.filter((p: any) => typeof p?.stock_quantity === 'number' && typeof p?.min_stock === 'number' && p.stock_quantity <= p.min_stock).length;
    } catch {
      return 0;
    }
  }, [products]);

  // Database verification
  useEffect(() => {
    let cancelled = false;
    async function verifyDatabase() {
      try {
        dispatch({ type: 'SET_DB_STATUS', payload: { status: 'verifying', error: null } });
        const resp = await fetch('/api/sales/setup');
        const data = await resp.json();
        const status = (data?.success ? 'ok' : 'error') as string;
        if (!cancelled) {
          dispatch({ type: 'SET_DB_STATUS', payload: { status: status === 'ok' || status === 'ready' ? 'ok' : 'error', error: null } });
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: 'SET_DB_STATUS', payload: { status: 'error', error: err instanceof Error ? err.message : 'Error desconocido' } });
        }
      }
    }
    verifyDatabase();
    return () => { cancelled = true; };
  }, []);

  // Focus management
  useEffect(() => {
    searchInputRef.current?.focus();
    // Mark start of data load window for first render
    perf.mark('pos-data-start');
  }, []);

  // Cart bottom sheet escape handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCartFullscreen) {
          dispatch({ type: 'SET_CART_FULLSCREEN', payload: false });
        } else {
          dispatch({ type: 'SET_CART_OPEN', payload: false });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCartFullscreen]);

  // Activity tracking for performance monitoring
  const trackActivity = useCallback(() => {
    dispatch({ type: 'SET_LAST_ACTIVITY', payload: new Date() });
  }, []);

  // Performance mode toggle
  const togglePerformanceMode = useCallback(() => {
    dispatch({ type: 'SET_PERFORMANCE_MODE', payload: !performanceMode });
    toast.show({
      title: performanceMode ? "Modo rendimiento desactivado" : "Modo rendimiento activado",
      description: performanceMode
        ? "Se muestran todas las características"
        : "Optimizado para máxima velocidad",
    });
  }, [performanceMode]);

  // Functions
  const loadData = React.useCallback(async () => {
    try {
      await refetchAll();
      toast.show({
        title: "Datos actualizados",
        description: "La información ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error('Error reloading data:', error);
      toast.show({
        title: "Error",
        description: "No se pudieron actualizar los datos",
        variant: "destructive"
      });
    }
  }, [refetchAll]);

  const handleToggleWholesaleMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_WHOLESALE_MODE', payload: enabled });
    toast.show({
      title: enabled ? "Modo mayorista activado" : "Modo mayorista desactivado",
      description: enabled
        ? "Se aplicarán precios mayoristas a los productos"
        : "Se aplicarán precios normales a los productos",
    });
  }, []);

  const handleAddToCart = React.useCallback((product: Product, quantity: number = 1, options?: { openCart?: boolean; highlightCartItem?: boolean }) => {
    if (cart.length === 0) {
      perf.mark('pos-first-item');
    }
    addToCart(product, quantity);
    trackActivity();
    const open = options?.openCart ?? true;
    const highlight = options?.highlightCartItem ?? true;
    if (open) {
      dispatch({ type: 'SET_CART_OPEN', payload: true });
    }
    if (highlight) {
      dispatch({ type: 'SET_RECENTLY_ADDED_PRODUCT', payload: product.id });
      setTimeout(() => dispatch({ type: 'SET_RECENTLY_ADDED_PRODUCT', payload: null }), 1600);
    }
  }, [addToCart, trackActivity]);

  const handleUpdateQuantity = React.useCallback((productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  }, [updateQuantity]);

  const handleRemoveFromCart = React.useCallback((productId: string) => {
    removeFromCart(productId);
  }, [removeFromCart]);

  const handleClearCart = React.useCallback(() => {
    clearCart();
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes('');
  }, [clearCart]);

  const handleBarcodeSearch = React.useCallback(async (barcode: string) => {
    const clean = (s: string) => s.replace(/\r|\n/g, '').trim();
    const code = clean(barcode);
    if (!code) return;

    try {
      const response = await fetch(`/api/products/barcode/${code}`);
      const data = await response.json();
      const product = data;

      if (product) {
        handleAddToCart(product);
        if (barcodeInputRef.current) {
          barcodeInputRef.current.value = '';
        }
      } else {
        toast.show({
          title: "Producto no encontrado",
          description: `No se encontró un producto con el código ${code}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast.show({
        title: "Error",
        description: "Error al buscar el producto",
        variant: "destructive"
      });
    }
  }, [handleAddToCart]);

  const toggleBarcodeMode = React.useCallback(() => {
    dispatch({ type: 'SET_BARCODE_MODE', payload: !barcodeMode });
    setTimeout(() => {
      if (!barcodeMode && barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  }, [barcodeMode]);

  const handleViewModeChange = React.useCallback((m: 'grid' | 'list') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: m });
  }, []);

  const handleViewInCatalog = React.useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    // Enfocar búsqueda y filtrar por nombre
    const query = product.name || '';
    if (searchInputRef.current) {
      searchInputRef.current.value = query;
    }
    handleSearchChange(query);
    // Opcional: mostrar todas las categorías para asegurar coincidencia
    handleCategoryChange('all' as any);
    // Cerrar el carrito para ver el catálogo
    dispatch({ type: 'SET_CART_OPEN', payload: false });
    // Desplazar hasta el producto en el catálogo
    setTimeout(() => {
      const el = document.querySelector(`[data-product-id="${productId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 1500);
      }
    }, 250);
  }, [products, handleSearchChange, handleCategoryChange]);

  const handleOpenProcessSaleModal = React.useCallback(() => {
    dispatch({ type: 'SET_PROCESS_SALE_OPEN', payload: true });
  }, []);

  const handleConfirmProcessSale = React.useCallback(async (
    newDiscount: number,
    newType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  ) => {
    perf.mark('pos-sale-start');
    const result = await processSaleWithOverrides(cart, newDiscount, newType);
    if (!result) return;

    const { subtotalWithIva, totalIva, discountAmount, finalTotal } = result;

    const items = cart.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        product_name: product?.name || 'Producto',
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      };
    });

    const displaySale = {
      customer_id: selectedCustomer?.id,
      sale_type: isWholesaleMode ? 'WHOLESALE' : 'RETAIL',
      items,
      subtotal: subtotalWithIva,
      tax: totalIva,
      discount: discountAmount,
      total: finalTotal,
      payment_method: paymentMethod,
      notes: notes,
      discount_type: newType,
      coupon_code: usePOSStore.getState().couponCode || undefined,
    };

    openReceiptModal(displaySale);
    dispatch({ type: 'SET_PROCESS_SALE_OPEN', payload: false });
    handleClearCart();
    loadData();

    const duration = perf.measureAndLog('pos-sale-duration', 'pos-sale-start');
    try { await logPerformanceMetric('pos-transaction', 'other', duration, true); } catch {}

    toast.show({
      title: 'Venta procesada',
      description: `Venta por ${formatCurrency(finalTotal)} procesada exitosamente`,
    });
  }, [processSaleWithOverrides, cart, products, selectedCustomer, isWholesaleMode, paymentMethod, notes, openReceiptModal, handleClearCart, loadData]);

  const handleSaveDraft = React.useCallback(() => {
    saveDraft(cart as any, discount, discountType, notes, isWholesaleMode, selectedCustomer);
  }, [cart, discount, discountType, notes, isWholesaleMode, selectedCustomer, saveDraft]);

  const handleRestoreDraft = React.useCallback(() => {
    restoreDraft((draft) => {
      setDiscount(draft.discount);
      setNotes(draft.notes);
      setDiscountType(draft.discountType);
      dispatch({ type: 'SET_WHOLESALE_MODE', payload: draft.isWholesaleMode });

      if (draft.selectedCustomerId) {
        const found = customersList.find((c) => c.id === draft.selectedCustomerId);
        if (found) selectCustomer(found);
      }

      clearCart();
      draft.cart.forEach((item: any) => {
        const product = products.find((p) => p.id === item.product_id);
        if (product) {
          addToCart(product, item.quantity);
        }
      });
    });
  }, [restoreDraft, customersList, products, addToCart, clearCart, selectCustomer]);

  // Initialize keyboard shortcuts after all functions are defined
  usePOSKeyboard({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onProcessSale: handleOpenProcessSaleModal,
    onClearCart: handleClearCart,
    onOpenCustomerModal: openCustomerModal,
    onRefreshData: loadData,
    onToggleViewMode: () => dispatch({ type: 'SET_VIEW_MODE', payload: viewMode === 'grid' ? 'list' : 'grid' }),
    onToggleBarcodeMode: toggleBarcodeMode,
    onToggleQuickAddMode: () => dispatch({ type: 'SET_QUICK_ADD_MODE', payload: !quickAddMode }),
    onToggleCart: () => dispatch({ type: 'SET_CART_OPEN', payload: !isCartOpen }),
    onToggleShortcutsModal: toggleKeyboardShortcuts,
    onCatalogFocus: () => {
      const first = catalogSectionRef.current?.querySelector('div[tabindex="0"]') as HTMLElement | null;
      first?.focus();
    },
    cartLength: cart.length,
    quickAddMode,
  });

  // Measure first data loaded after initial mount
  useEffect(() => {
    if (!loading) {
      perf.measureAndLog('pos-first-data', 'pos-data-start');
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Encabezado POS estructurado con indicadores globales */}
          <POSHeader
            dbStatus={dbStatus}
            error={error}
            isWholesaleMode={isWholesaleMode}
            cartCount={cart.length}
            totalAmount={cartCalculations.total}
            stats={stats}
            onShowShortcuts={toggleKeyboardShortcuts}
            onRefresh={loadData}
            loading={loading}
            performanceMode={performanceMode}
            actions={(
              <div className="flex items-center gap-2">
                <Button
                  variant={performanceMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={togglePerformanceMode}
                  className="hidden md:flex"
                  aria-label={performanceMode ? 'Desactivar modo rendimiento' : 'Activar modo rendimiento'}
                >
                  <Zap className={`h-4 w-4 mr-2 ${performanceMode ? 'text-yellow-400' : ''}`} />
                  Rendimiento
                </Button>
              </div>
            )}
            realtime={{
              isConnected,
              lastUpdate,
              newSalesCount,
              notificationsEnabled,
              onRefresh: refresh,
              onMarkAsViewed: markSalesAsViewed,
              onToggleNotifications: toggleNotifications,
              dataSource: 'supabase',
            }}
          />

          {/* Barra de Acciones Rápidas como componente separado */}
          <POSQuickActions
            searchInputRef={searchInputRef}
            barcodeInputRef={barcodeInputRef}
            onFocusSearch={() => {
              const first = catalogSectionRef.current?.querySelector('div[tabindex="0"]') as HTMLElement | null;
              first?.focus();
            }}
            onBarcodeEnter={handleBarcodeSearch}
            onToggleBarcodeMode={() => dispatch({ type: 'SET_BARCODE_MODE', payload: !barcodeMode })}
            barcodeMode={barcodeMode}
            onToggleQuickAdd={() => dispatch({ type: 'SET_QUICK_ADD_MODE', payload: !quickAddMode })}
            quickAddMode={quickAddMode}
            onRefreshData={loadData}
            onShowShortcuts={toggleKeyboardShortcuts}
            onToggleCart={() => dispatch({ type: 'SET_CART_OPEN', payload: !isCartOpen })}
            cartCount={cart.length}
          />

          {/* Quick Actions Bar: elementos más usados y accesibles */}
          <div role="region" aria-label="Acciones rápidas del POS" className="px-md py-sm border-b border-border bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
            <div role="toolbar" aria-label="Acciones principales del POS" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-xs">
              {/* Grupo principal: búsqueda, código de barras, añadir rápido, foco catálogo */}
              <div className="col-span-2 md:col-span-2 lg:col-span-8 flex flex-wrap items-center gap-2" aria-label="Acciones del catálogo">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchInputRef.current?.focus()}
                  title="Buscar productos (Ctrl+K)"
                  aria-label="Buscar productos"
                >
                  <Search className="w-4 h-4 mr-1" />
                  Buscar
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_BARCODE_MODE', payload: !barcodeMode })}
                  title="Modo código de barras (F6)"
                  aria-label="Alternar modo código de barras"
                >
                  <Barcode className="w-4 h-4 mr-1" />
                  {barcodeMode ? 'Código: ON' : 'Código: OFF'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_QUICK_ADD_MODE', payload: !quickAddMode })}
                  title="Modo añadir rápido"
                  aria-label="Alternar añadir rápido"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  {quickAddMode ? 'Añadir rápido: ON' : 'Añadir rápido: OFF'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const first = catalogSectionRef.current?.querySelector('div[tabindex=\"0\"]') as HTMLElement | null;
                    first?.focus();
                  }}
                  title="Ir al catálogo"
                  aria-label="Ir al catálogo"
                >
                  Catálogo
                </Button>
              </div>

              {/* Grupo secundario: cliente, limpiar, cobrar, carrito, atajos, actualizar */}
              <div className="col-span-2 md:col-span-1 lg:col-span-4 flex flex-wrap justify-end items-center gap-2" aria-label="Acciones de operación">
                <Button
                  size="sm"
                  onClick={openCustomerModal}
                  title="Seleccionar cliente (F4)"
                  aria-label="Seleccionar cliente"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Cliente
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCart}
                  title="Limpiar carrito (F3)"
                  aria-label="Limpiar carrito"
                  disabled={!cart.length}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar ({cart.length})
                </Button>

                <Button
                  size="sm"
                  onClick={handleOpenProcessSaleModal}
                  title="Procesar venta"
                  aria-label="Procesar venta"
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Cobrar
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: !isCartOpen })}
                  title="Abrir/Cerrar carrito"
                  aria-label="Abrir o cerrar carrito"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {isCartOpen ? 'Cerrar carrito' : 'Abrir carrito'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleKeyboardShortcuts}
                  title="Mostrar atajos (F12)"
                  aria-label="Mostrar atajos de teclado"
                >
                  <Keyboard className="w-4 h-4 mr-1" />
                  Atajos
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadData}
                  title="Actualizar datos (F9)"
                  aria-label="Actualizar datos"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Actualizar
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main
            id="main-content"
            role="main"
            aria-label="Área principal del Punto de Venta"
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-md xl:gap-lg px-md overflow-hidden"
          >
            {/* Skip links for keyboard users */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1 bg-primary text-primary-foreground fixed top-2 left-2 z-50"
            >
              Saltar al contenido principal
            </a>
            <a
              href="#cart-title"
              className="sr-only focus:not-sr-only focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1 bg-primary text-primary-foreground fixed top-2 left-40 z-50"
            >
              Ir al carrito
            </a>

            {/* Performance Indicator */}
            {performanceMode && (
              <div className="col-span-12 mb-2">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Modo rendimiento activado</p>
                      <p className="text-sm text-blue-700">Optimizado para máxima velocidad</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="h-4 w-4" />
                    <span>Última actividad: {lastActivity.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Barra de navegación accesible (componente) */}
            <div className="col-span-12">
              <POSNavigationBar cartCount={cart.length} onProcessSale={handleOpenProcessSaleModal} />
            </div>

            {/* Panel de métricas y accesos rápidos (resumen) */}
            <div className="col-span-12">
              <StockAlertBanner />
              <SummaryMetricsBar
                todaySales={stats.todaySales}
                averageTicket={stats.averageTicket}
                newSalesCount={newSalesCount}
                topSellingProduct={stats.topProduct}
                lowStockCount={lowStockCount}
                onRefresh={loadData}
                onGoToReports={() => { try { window.location.href = '/dashboard/reports'; } catch {} }}
              />
            </div>

            {/* Información del cliente (colapsable y accesible, con persistencia) */}
            <aside id="customer-panel" role="complementary" aria-label="Información del cliente" className="col-span-12">
              <details className="bg-card rounded-xl border border-border shadow-sm" open={isCustomerPanelOpen} onToggle={(e) => {
                const next = (e.currentTarget as HTMLDetailsElement).open;
                setIsCustomerPanelOpen(next);
              }}>
                <summary aria-expanded={isCustomerPanelOpen} className="list-none cursor-pointer select-none p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-semibold text-foreground">Cliente</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </summary>
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-start justify-between">
                  <div className="space-y-1">
                    {selectedCustomer ? (
                      <div className="text-sm text-muted-foreground">
                        <p className="text-foreground font-medium">{selectedCustomer.name}</p>
                        {selectedCustomer.email && (
                          <p className="text-xs">{selectedCustomer.email}</p>
                        )}
                        {selectedCustomer.phone && (
                          <p className="text-xs">{selectedCustomer.phone}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay cliente seleccionado</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={openCustomerModal}
                      aria-label={selectedCustomer ? 'Cambiar cliente' : 'Seleccionar cliente'}
                      title={selectedCustomer ? 'Cambiar cliente (F4)' : 'Seleccionar cliente (F4)'}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      {selectedCustomer ? 'Cambiar' : 'Seleccionar'}
                    </Button>
                  </div>
                </div>
              </details>
            </aside>

            {/* Totales rápidos (visible en móvil) */}
            <aside
              role="complementary"
              aria-label="Totales rápidos"
              className="col-span-12 lg:hidden"
            >
              <div className="bg-card rounded-xl border border-border shadow-sm p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="text-sm font-medium">{formatCurrency(cartCalculations.subtotalWithIva)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground">IVA</p>
                    <p className="text-sm">{formatCurrency(cartCalculations.taxAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Descuento</p>
                    <p className="text-sm">-{formatCurrency(cartCalculations.discountAmount)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-base font-bold text-primary">{formatCurrency(cartCalculations.total)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={handleOpenProcessSaleModal}
                    aria-label="Procesar venta"
                    title="Procesar venta"
                    disabled={!cart.length}
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Cobrar
                  </Button>
                </div>
              </div>
            </aside>

            {/* Estado de la venta (compacto, accesible) */}
            <section id="sale-status" role="status" aria-label="Estado de la venta" aria-live="polite" className="col-span-12">
              <div className="bg-muted/40 border border-border rounded-xl p-3 sm:p-3 flex items-center justify-between" aria-live="polite" aria-atomic="true">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-xs sm:text-sm">{cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}</Badge>
                  <div className="flex items-center gap-4 text-sm sm:text-base">
                    <div>
                      Subtotal: <span className="font-medium">{formatCurrency(cartCalculations.subtotalWithIva)}</span>
                    </div>
                    {cartCalculations.discountAmount > 0 && (
                      <div className="text-red-600">
                        Descuento: <span className="font-medium">-{formatCurrency(cartCalculations.discountAmount)}</span>
                      </div>
                    )}
                    <div>
                      Total: <span className="font-semibold text-foreground">{formatCurrency(cartCalculations.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: true })} aria-label="Ver carrito">
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Ver carrito
                  </Button>
                  <Button size="sm" onClick={handleOpenProcessSaleModal} aria-label="Cobrar" disabled={!cart.length}>
                    <CreditCard className="w-4 h-4 mr-1" />
                    Cobrar
                  </Button>
                </div>
              </div>

              {/* Breadcrumbs contextuales */}
              <nav role="navigation" aria-label="Ruta de flujo de venta" className="col-span-12">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="breadcrumb-trail">
                    <span>Selección</span>
                    <span aria-hidden="true">→</span>
                    <span className="font-semibold text-foreground">Carrito ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                    <span aria-hidden="true">→</span>
                    <span>Pago</span>
                  </div>
                </div>
              </nav>
            </section>

            {/* Contenido principal refactorizado */}
            <POSMainContent
              left={(
                <CatalogSection
                  catalogSectionRef={catalogSectionRef}
                  searchQuery={searchQuery}
                  onChangeSearch={handleSearchChange}
                  viewMode={viewMode}
                  onChangeViewMode={(m) => dispatch({ type: 'SET_VIEW_MODE', payload: m })}
                  barcodeMode={barcodeMode}
                  onToggleBarcodeMode={() => dispatch({ type: 'SET_BARCODE_MODE', payload: !barcodeMode })}
                  onBarcodeEnter={handleBarcodeSearch}
                  barcodeInputRef={barcodeInputRef}
                  categories={categoriesList}
                  selectedCategory={selectedCategory}
                  onChangeCategory={handleCategoryChange}
                  searchInputRef={searchInputRef}
                  resultCount={filteredProducts.length}
                  quickAddMode={quickAddMode}
                  onToggleQuickAddMode={() => dispatch({ type: 'SET_QUICK_ADD_MODE', payload: !quickAddMode })}
                  products={products}
                  customers={customersList}
                  onQuickAdd={(p) => handleAddToCart(p)}
                  loading={loading}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onChangeSortBy={setSortBy}
                  onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  filteredProducts={filteredProducts}
                  isWholesaleMode={isWholesaleMode}
                  onAddToCart={handleAddToCart}
                  highlightProductId={recentlyAddedProductId || undefined}
                  onViewProduct={handleViewInCatalog}
                />
              )}
              right={(
                <CartAside
                  isCartOpen={isCartOpen}
                  isCartFullscreen={isCartFullscreen}
                  isCartCollapsed={isCartCollapsed}
                  performanceMode={performanceMode}
                  cart={cart}
                  onCloseCart={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
                  onToggleFullscreen={() => dispatch({ type: 'SET_CART_FULLSCREEN', payload: !isCartFullscreen })}
                  onToggleCollapsed={() => dispatch({ type: 'SET_CART_COLLAPSED', payload: !isCartCollapsed })}
                  selectedCustomer={selectedCustomer}
                  discount={discount}
                  discountType={discountType}
                  paymentMethod={paymentMethod}
                  notes={notes}
                  processing={processing}
                  isWholesaleMode={isWholesaleMode}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveFromCart}
                  onClearCart={handleClearCart}
                  onSelectCustomer={selectCustomer}
                  onSetDiscount={setDiscount}
                  onSetDiscountType={setDiscountType}
                  onSetPaymentMethod={setPaymentMethod}
                  onSetNotes={setNotes}
                  onProcessSale={handleOpenProcessSaleModal}
                  products={products}
                  highlightProductId={recentlyAddedProductId || undefined}
                  onViewInCatalog={handleViewInCatalog}
                  onAddToCart={(p, q) => handleAddToCart(p as any, q ?? 1)}
                  onToggleCartFullscreen={() => dispatch({ type: 'SET_CART_FULLSCREEN', payload: !isCartFullscreen })}
                  customers={customersList}
                  onToggleWholesaleMode={() => handleToggleWholesaleMode(!isWholesaleMode)}
                />
              )}
            />

            {/* (Se removió el aside de Transacciones recientes) */}

            {/* Mobile Cart Overlay (disabled in fullscreen) */}
            {isCartOpen && !isCartFullscreen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
                aria-hidden="true"
              />
            )}

            {/* Enhanced Mobile Floating Cart Button */}
            {!isCartOpen && (
              <Button
                onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: true })}
                className={`fixed bottom-4 right-4 z-30 lg:hidden w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-2 border-white transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 ${performanceMode ? 'transition-none' : ''}`}
                aria-label={`Abrir carrito (${cart.length} productos)`}
              >
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-white" />
                  {cart.length > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 bg-red-500 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white animate-pulse"
                    >
                      {cart.length > 99 ? '99+' : cart.length}
                    </Badge>
                  )}
                  {/* Performance indicator */}
                  {performanceMode && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                      <Zap className="w-2 h-2 text-yellow-800" />
                    </div>
                  )}
                </div>
              </Button>
            )}

            {/* Quick Actions Floating Button (Mobile) */}
            <Button
              onClick={() => dispatch({ type: 'SET_SHOW_QUICK_ACTIONS', payload: !showQuickActions })}
              className="
                fixed bottom-20 right-4 z-30 lg:hidden
                w-12 h-12 rounded-full shadow-lg
                bg-gradient-to-r from-purple-600 to-purple-700
                hover:from-purple-700 hover:to-purple-800
                border-2 border-white
                transition-all duration-200 ease-in-out
                hover:scale-105 active:scale-95
              "
              aria-label="Acciones rápidas"
              aria-expanded={showQuickActions}
              aria-controls="quick-actions-menu-mobile"
            >
              <BarChart3 className="w-5 h-5 text-white" />
              {showQuickActions && (
                <div id="quick-actions-menu-mobile" role="menu" className="absolute bottom-full right-0 mb-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 p-2">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        dispatch({ type: 'SET_SHOW_QUICK_ACTIONS', payload: false });
                        handleSaveDraft();
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Guardar borrador
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        dispatch({ type: 'SET_SHOW_QUICK_ACTIONS', payload: false });
                        handleRestoreDraft();
                      }}
                      disabled={!hasDraft}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restaurar borrador
                    </Button>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        dispatch({ type: 'SET_SHOW_QUICK_ACTIONS', payload: false });
                        dispatch({ type: 'SET_WHOLESALE_MODE', payload: !isWholesaleMode });
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {isWholesaleMode ? 'Modo normal' : 'Modo mayorista'}
                    </Button>
                  </div>
                </div>
              )}
            </Button>
          </main>
        </div>

      {/* Modals */}
        <Dialog open={showKeyboardShortcuts} onOpenChange={toggleKeyboardShortcuts}>
          <DialogContent className="max-w-md bg-card border-border" aria-labelledby="keyboard-shortcuts-title">
            <DialogHeader>
              <DialogTitle id="keyboard-shortcuts-title" className="text-foreground">Atajos de Teclado</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buscar productos</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F1</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Procesar venta</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F2</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limpiar carrito</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F3</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seleccionar cliente</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F4</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cambiar vista</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F5</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código de barras</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F6</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizar datos</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F9</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mostrar atajos</span>
                <Badge variant="outline" className="border-border text-muted-foreground">F12</Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCustomerModal} onOpenChange={(v) => v ? openCustomerModal() : closeCustomerModal()}>
          <DialogContent className="max-w-4xl bg-card border-border" aria-labelledby="customer-management-title">
            <DialogHeader>
              <DialogTitle id="customer-management-title" className="text-foreground">Gestión de Clientes</DialogTitle>
            </DialogHeader>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <CustomerManagementLazy
                customers={customersList}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={handleCustomerSelect}
              />
            </Suspense>
          </DialogContent>
        </Dialog>

        <Dialog open={showReceiptModal} onOpenChange={closeReceiptModal}>
          <DialogContent className="max-w-md" aria-labelledby="receipt-title">
            <DialogHeader>
              <DialogTitle id="receipt-title" className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Recibo de Venta
              </DialogTitle>
            </DialogHeader>

            {lastSale && (
              <div ref={printRef} className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h3 className="font-bold">BeautyPOS</h3>
                  <p className="text-sm text-gray-600">Recibo de Venta</p>
                  <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
                </div>

                {selectedCustomer && (
                  <div className="border-b pb-2">
                    <p className="text-sm"><strong>Cliente:</strong> {selectedCustomer.name}</p>
                    <p className="text-xs text-gray-600">{selectedCustomer.email}</p>
                  </div>
                )}

                <div className="space-y-2">
                  {(Array.isArray(lastSale?.items) ? lastSale.items : []).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-gray-600">{item.quantity} x {formatCurrency(item.price)}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(lastSale.subtotal)}</span>
                  </div>
                  {lastSale.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Descuento ({lastSale.discount_type === 'PERCENTAGE' ? '%' : 'Monto'}):</span>
                      <span>-{formatCurrency(lastSale.discount)}</span>
                    </div>
                  )}
                  {lastSale.coupon_code && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Cupón aplicado:</span>
                      <span>{lastSale.coupon_code}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>IVA:</span>
                    <span>{formatCurrency(lastSale.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(lastSale.total)}</span>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Método de pago: {lastSale.payment_method}</p>
                  {lastSale.notes && <p>Notas: {lastSale.notes}</p>}
                </div>

                <Button
                  onClick={handlePrint}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  onClick={handleSendReceiptEmail}
                  variant="outline"
                  className="w-full mt-2"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar por email
                </Button>
              </div>
            )}
          </DialogContent>
         </Dialog>
         {/* Process Sale Modal */}
         <Suspense fallback={<Skeleton className="h-32 w-full" />}>
           <ProcessSaleModalLazy
             isOpen={isProcessSaleOpen}
             onClose={() => dispatch({ type: 'SET_PROCESS_SALE_OPEN', payload: false })}
             cart={cart}
             products={products}
             initialDiscount={discount}
             initialDiscountType={discountType}
            customer={selectedCustomer}
            paymentMethod={paymentMethod as any}
            onPaymentMethodChange={setPaymentMethod as any}
            enableSplitPayment={true}
            onRemoveItem={removeFromCart}
            onConfirm={async (d, t) => {
              await handleConfirmProcessSale(d, t);
            }}
          />
         </Suspense>
       </div>
     </ErrorBoundary>
   );
 }
);

export default POSLayout;
