'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { ShoppingCart, Clock, Wallet } from 'lucide-react';
import { toast } from '@/lib/toast';
import { usePOSStore } from '@/store';
import { useCart } from '@/hooks/useCart';
import { usePOSData } from '@/hooks/use-optimized-data';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { useCashSessionValidation } from '@/hooks/useCashSessionValidation';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useAuth } from '@/hooks/use-auth';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { OrganizationSelector } from '@/components/organizations/OrganizationSelector';
import type { Product } from '@/types';
import type { SaleResponse } from '@/lib/api';

// Importar componentes del nuevo diseño
import SearchBar from './SearchBar';
import CategoryNav from './CategoryNav';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import MobileCartSheet from './MobileCartSheet';
import ProcessSaleModal from './ProcessSaleModal';
import { ReceiptModal } from './ReceiptModal';
import OpenCashSessionModal from './OpenCashSessionModal';
import { api } from '@/lib/api';
import CloseCashSessionModal from './CloseCashSessionModal';

// Device detection hook
import { useDeviceType } from '@/components/ui/responsive-layout';

// Cash session hooks
import { useCashSession } from '@/app/dashboard/cash/hooks/useCashSession';
import { useCashMutations } from '@/app/dashboard/cash/hooks/useCashMutations';

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando punto de venta...</p>
    </div>
  </div>
);

export default function OptimizedPOSLayout() {
  // Business Config
  const { config } = useBusinessConfig();

  // Auth & Organization
  const { user } = useAuth();
  const { selectedOrganization } = useUserOrganizations(user?.id);

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [showCloseCashModal, setShowCloseCashModal] = useState(false);

  // Device detection
  const deviceType = useDeviceType();

  // Store state
  const paymentMethod = usePOSStore((s) => s.paymentMethod);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const discount = usePOSStore((s) => s.discount);
  const setDiscount = usePOSStore((s) => s.setDiscount);
  const discountType = usePOSStore((s) => s.discountType);
  const _setDiscountType = usePOSStore((s) => s.setDiscountType);
  const _notes = usePOSStore((s) => s.notes);
  const setNotes = usePOSStore((s) => s.setNotes);

  // Data hooks
  const {
    products = [],
    categories = [],
    customers: _customers = [],
    loading,
    refetchAll: _refetchAll
  } = usePOSData();

  // Cash session management
  const { session: cashSession, isLoading: _cashSessionLoading, refetch: refetchCashSession } = useCashSession();
  const cashSessionSummary = useMemo(() => ({
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    in: 0,
    out: 0,
    adjustment: 0,
    sale: 0,
    return: 0,
  }), []);

  const { 
    requestCloseSession,
    loadingStates,
    ConfirmationDialog 
  } = useCashMutations({
    session: cashSession,
    summary: cashSessionSummary,
    onSuccess: () => {
      refetchCashSession();
      setShowOpenCashModal(false);
      setShowCloseCashModal(false);
    }
  });

  // Cash session validation
  const { validateCashPayment, hasOpenSession } = useCashSessionValidation();

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
    discount,
    isWholesaleMode: false
  });

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
  }, [updateQuantity]);

  // Cart calculations
  const cartCalculations = useMemo(() => {
    return calculateCartWithIva(cart, products, discount, discountType);
  }, [cart, products, discount, discountType]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.is_active !== false);

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Filter by search
    if (debouncedSearchQuery) {
      const searchLower = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [products, selectedCategory, debouncedSearchQuery]);

  // Handle search with instant results
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const searchLower = query.toLowerCase();

    // Simulate instant search results
    const results = products.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchLower))
    ).slice(0, 10); // Limit to 10 results

    setSearchResults(results);
    setIsSearching(false);
  }, [products]);

  // Handlers
  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
    toast.success(`${product.name} agregado`, {
      description: 'Producto añadido al carrito',
    });
  }, [addToCart]);

  const handleClearCart = useCallback(() => {
    clearCart();
    setDiscount(0);
    setNotes('');
    toast.success('Carrito limpiado');
  }, [clearCart, setDiscount, setNotes]);

  const handleProcessSale = useCallback(() => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
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
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        discount_type: newType,
        payment_method: paymentMethod,
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
  }, [cart, products, paymentMethod, handleClearCart, validateCashPayment]);

  // Handler para abrir sesión de caja (sin confirmación redundante)
  const handleOpenCashSession = useCallback(async (amount: number, notes?: string) => {
    try {
      // Validar que hay organización seleccionada
      if (!selectedOrganization) {
        toast.error('Selecciona una organización antes de abrir caja');
        return;
      }

      const res = await fetch('/api/cash/session/open', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': selectedOrganization.id
        },
        body: JSON.stringify({
          openingAmount: amount,
          notes: notes || 'Apertura de caja'
        })
      });
      
      if (!res.ok) {
        let payload: any = null;
        try { payload = await res.json(); } catch { try { const txt = await res.text(); payload = { error: txt }; } catch { payload = { error: '' }; } }
        const errorMsg = payload?.error || 'Error al abrir caja';
        const details = payload?.details ? `\n${payload.details}` : '';
        const code = payload?.code ? ` (${payload.code})` : '';
        console.error('Error opening cash session:', {
          status: res.status,
          organizationId: selectedOrganization.id,
          error: errorMsg,
          details: payload?.details,
          code: payload?.code
        });
        if (String(payload?.code).toUpperCase() === 'PGRST205' || String(errorMsg).toLowerCase().includes('could not find the table')) {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL;
          if (backendUrl) {
            try {
              const beResp = await fetch(`${backendUrl}/cash/session/open`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-organization-id': selectedOrganization.id,
                },
                body: JSON.stringify({ openingAmount: amount, notes: notes || 'Apertura de caja' })
              });
              if (beResp.ok) {
                // success through backend
                return;
              }
            } catch {}
          }
          throw new Error(`${errorMsg}${code}${details}`);
        }
      }
      
      toast.success('Sesión de caja abierta exitosamente');
      refetchCashSession();
      setShowOpenCashModal(false);
    } catch (error: any) {
      console.error('Error opening cash session:', {
        message: error?.message,
        organizationId: selectedOrganization?.id
      });
      toast.error(error.message || 'Error al abrir la caja');
    }
  }, [refetchCashSession, selectedOrganization]);

  // Handler para cerrar sesión de caja
  const handleCloseSession = useCallback((data: { closingAmount: number; notes?: string }) => {
    requestCloseSession(data.closingAmount);
  }, [requestCloseSession]);

  // Held sales state
  const [heldSales, setHeldSales] = useState<{ id: string, items: any[], total: number, date: Date }[]>([]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input (except for specific search triggers)
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);

      if (isInput && e.key !== 'Enter' && e.key !== 'Escape') return;

      if (e.key === 'Enter' && cart.length > 0 && !showSaleModal && !showReceiptModal) {
        handleProcessSale();
      }

      if (e.key === 'Escape') {
        if (showSaleModal) setShowSaleModal(false);
        else if (showReceiptModal) setShowReceiptModal(false);
        else if (cart.length > 0) handleClearCart();
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.pos-search-bar')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showSaleModal, showReceiptModal, handleProcessSale, handleClearCart]);

  // Held Sales Logics
  const handleHoldSale = useCallback(() => {
    if (cart.length === 0) return;
    const newHeldSale = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total: cartCalculations.total,
      date: new Date()
    };
    setHeldSales(prev => [newHeldSale, ...prev]);
    clearCart();
    toast.success('Venta puesta en espera');
  }, [cart, cartCalculations.total, clearCart]);

  const handleRestoreHeldSale = useCallback((heldSale: any) => {
    // If current cart is not empty, ask or just merge? Let's replace for now.
    setCartItems(heldSale.items);
    setHeldSales(prev => prev.filter(s => s.id !== heldSale.id));
    toast.success('Venta recuperada');
  }, [setCartItems]);

  // Loading state
  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden">
      {/* Header optimizado */}
      <header className="h-16 flex items-center justify-between px-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 z-50">
        <div className="flex items-center space-x-6 flex-1">
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <span className="font-black text-xs">POS</span>
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">Premium</h1>
          </div>

          <div className="flex-1 max-w-xl">
            <SearchBar
              onSearch={setSearchQuery}
              isLoading={loading}
              searchResults={[]} // Podrías conectar con resultados reales del store si es necesario
            />
          </div>
          {!selectedOrganization && (
            <div className="hidden md:flex items-center ml-4">
              <OrganizationSelector className="w-64 h-9" />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 ml-4">
          {/* Indicador y Botón de Caja */}
          {!hasOpenSession ? (
            <button
              onClick={() => {
                if (!selectedOrganization) {
                  toast.error('Selecciona una organización antes de abrir caja');
                  return;
                }
                setShowOpenCashModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/20 active:scale-95 transition-all"
              title="Abrir sesión de caja"
              disabled={!selectedOrganization}
            >
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-bold uppercase hidden sm:inline">Abrir Caja</span>
            </button>
          ) : (
            <>
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase hidden sm:inline">
                  Caja Abierta
                </span>
              </div>
              <button
                onClick={() => setShowCloseCashModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                title="Cerrar sesión de caja"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-bold uppercase hidden sm:inline">Cerrar Caja</span>
              </button>
            </>
          )}

          {/* Botón de Venta en Espera */}
          <button
            onClick={handleHoldSale}
            disabled={cart.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
            title="Poner venta en espera"
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase hidden sm:inline">Hold</span>
          </button>

          {/* Ventas en Espera Guardadas */}
          {heldSales.length > 0 && (
            <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-slate-800 pl-3">
              {heldSales.slice(0, 3).map((sale, index) => (
                <button
                  key={sale.id}
                  onClick={() => handleRestoreHeldSale(sale)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-[10px] font-black hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-500 transition-all active:scale-90 flex items-center justify-center shadow-sm"
                  title={`Restaurar Venta ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Lado Izquierdo: Productos */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950">
          {/* Navegación de Categorías Header */}
          <CategoryNav
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <ProductGrid
              products={products as any}
              onAddToCart={addToCart as any}
              isLoading={loading}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
            />
          </div>
        </div>

        {/* Lado Derecho: Carrito (Desktop) */}
        <div className="hidden lg:block">
          <CartPanel
            items={cart as any}
            total={cartCalculations.total}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={handleClearCart}
            onProcessSale={handleProcessSale}
            isProcessing={showSaleModal}
            cashSessionOpen={hasOpenSession} // Ajustar segun permiso/estado real
          />
        </div>
      </main>

      {/* Mobile Cart Floating Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-green-500 text-white rounded-full shadow-2xl shadow-green-500/40 flex items-center justify-center z-[60] active:scale-90 transition-transform animate-bounce-in"
        >
          <div className="relative">
            <ShoppingCart className="w-8 h-8" />
            <span className="absolute -top-2 -right-2 bg-white text-green-600 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">
              {cart.length}
            </span>
          </div>
        </button>
      )}

      {/* Mobile Cart Sheet */}
      {deviceType === 'mobile' && (
        <MobileCartSheet
          isOpen={isMobileCartOpen}
          onClose={() => setIsMobileCartOpen(false)}
          items={cart as any}
          total={cartCalculations.total}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={handleClearCart}
          onProcessPayment={handleProcessSale}
          cashSessionOpen={hasOpenSession}
        />
      )}

      {/* Sale Processing Modal */}
      {showSaleModal && (
        <ProcessSaleModal
          isOpen={showSaleModal}
          onClose={() => setShowSaleModal(false)}
          cart={cart}
          products={products}
          initialDiscount={discount}
          initialDiscountType={discountType}
          paymentMethod={paymentMethod as any}
          onPaymentMethodChange={(method) => setPaymentMethod(method as any)}
          onConfirm={handleConfirmProcessSale}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastSale && (
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
          onPrint={() => toast.success('Imprimiendo comprobante...')}
          onDownload={() => toast.success('Descargando comprobante...')}
        />
      )}

      {/* Open Cash Session Modal */}
      <OpenCashSessionModal
        isOpen={showOpenCashModal}
        onClose={() => setShowOpenCashModal(false)}
        onConfirm={handleOpenCashSession}
        isLoading={false}
      />

      {/* Close Cash Session Modal */}
      <CloseCashSessionModal
        isOpen={showCloseCashModal}
        onClose={() => setShowCloseCashModal(false)}
        onConfirm={handleCloseSession}
        isLoading={loadingStates.closingSession}
        sessionData={{
          openingAmount: cashSession?.openingAmount || 0,
          openedAt: cashSession?.openedAt || '',
          expectedBalance: cashSession?.openingAmount || 0,
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
}
