'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { ShoppingCart } from 'lucide-react';
import { toast } from '@/lib/toast';
import { usePOSStore } from '@/store';
import { useCart } from '@/hooks/useCart';
import { usePOSData } from '@/hooks/use-optimized-data';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { useCashSessionValidation } from '@/hooks/useCashSessionValidation';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product, Customer } from '@/types';
import type { SaleResponse } from '@/lib/api';

// Importar componentes del nuevo diseño
import CompactHeader from './CompactHeader';
import SearchBar from './SearchBar';
import CategoryNav from './CategoryNav';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import MobileCartSheet from './MobileCartSheet';
import ProcessSaleModal from './ProcessSaleModal';
import { ReceiptModal } from './ReceiptModal';

// Device detection hook
import { useDeviceType } from '@/components/ui/responsive-layout';

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

  // Device detection
  const deviceType = useDeviceType();

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

  // Cash session validation
  const { validateCashPayment, hasOpenSession, session } = useCashSessionValidation();

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
    discount
  });

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

  // Loading state
  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <CompactHeader />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 bg-white border-b border-gray-200">
            <SearchBar
              onSearch={handleSearch}
              searchResults={searchResults}
              isLoading={isSearching}
            />
          </div>

          {/* Category Navigation */}
          <div className="bg-white border-b border-gray-200">
            <CategoryNav
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <ProductGrid
              products={filteredProducts}
              onAddToCart={handleAddToCart}
              searchQuery={debouncedSearchQuery}
              selectedCategory={selectedCategory}
            />
          </div>
        </main>

        {/* Right Panel - Cart (Desktop only) */}
        {deviceType !== 'mobile' && (
          <CartPanel
            items={cart}
            total={cartCalculations.total}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={handleClearCart}
            onProcessSale={handleProcessSale}
            cashSessionOpen={hasOpenSession}
          />
        )}
      </div>

      {/* Mobile Cart Button */}
      {deviceType === 'mobile' && cart.length > 0 && (
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length > 99 ? '99+' : cart.length}
            </span>
          </div>
        </button>
      )}

      {/* Mobile Cart Sheet */}
      {deviceType === 'mobile' && (
        <MobileCartSheet
          isOpen={isMobileCartOpen}
          onClose={() => setIsMobileCartOpen(false)}
          items={cart}
          total={cartCalculations.total}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={handleClearCart}
          onProcessSale={handleProcessSale}
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
        />
      )}
    </div>
  );
}