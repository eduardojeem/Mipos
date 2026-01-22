"use client";

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import CheckoutModal from '@/components/catalog/CheckoutModal';

export function CartButton() {
  const { cart, cartTotal, cartItemsCount, removeFromCart, updateQuantity, clearCart } = useCatalogCart();
  const [isOpen, setIsOpen] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const { config } = useBusinessConfig();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const totalItems = cartItemsCount;
  const totalDisplay = formatPrice(cartTotal || 0, config);

  const handleRemoveItem = useCallback((productId: string) => {
    setRemovingItemId(productId);
    setTimeout(() => {
      removeFromCart(productId);
      setRemovingItemId(null);
    }, 200);
  }, [removeFromCart]);

  const handleClearCart = useCallback(() => {
    setShowClearConfirm(false);
    setIsClearing(true);
    
    // Animar la eliminación de cada item
    cart.forEach((item, index) => {
      setTimeout(() => {
        setRemovingItemId(item.product.id);
      }, index * 50);
    });
    
    // Limpiar el carrito después de las animaciones
    setTimeout(() => {
      clearCart();
      setIsClearing(false);
      setRemovingItemId(null);
    }, cart.length * 50 + 200);
  }, [cart, clearCart]);

  const cartAnnouncement = `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'} en el carrito. Total: ${totalDisplay}`;

  const handleCheckout = () => {
    setIsOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      {/* Cart Button */}
      <Button
        className="relative h-10 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all duration-200 hover:shadow-md"
        aria-label={cartAnnouncement}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {totalItems > 0 && (
              <span 
                className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-white text-red-600 text-[10px] font-bold"
                aria-hidden="true"
              >
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-[10px] opacity-90" aria-hidden="true">Cart</span>
            <span className="text-sm font-bold" aria-hidden="true">{totalDisplay}</span>
          </div>
        </div>
      </Button>

      {/* Anuncio para lectores de pantalla */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {cartAnnouncement}
      </div>

      {/* Cart Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Header Rojo */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <div>
                <h2 className="text-base font-bold">Mi Carrito</h2>
                <p className="text-xs opacity-90">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">Total</p>
              <p className="text-xl font-bold">{totalDisplay}</p>
            </div>
          </div>

          {/* Cart Content */}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Tu carrito está vacío
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                Agrega productos para comenzar
              </p>
              <Button 
                onClick={() => setIsOpen(false)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm h-9"
              >
                Seguir Comprando
              </Button>
            </div>
          ) : (
            <>
              {/* Products List */}
              <ScrollArea className="max-h-[300px]">
                <div className="p-3 space-y-2">
                  {cart.map((item, index) => (
                    <div 
                      key={item.product.id}
                      className={`flex gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-200 ${
                        removingItemId === item.product.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Product Image */}
                      {item.product.image_url && (
                        <div className="relative w-16 h-16 flex-shrink-0 bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs text-gray-900 dark:text-gray-100 line-clamp-2 mb-1.5">
                          {item.product.name}
                        </h3>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="h-6 w-6 p-0 rounded border-gray-300 dark:border-gray-600"
                            disabled={item.quantity <= 1}
                            aria-label={`Disminuir cantidad de ${item.product.name}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="h-6 w-6 p-0 rounded border-gray-300 dark:border-gray-600"
                            disabled={item.quantity >= Number(item.product.stock_quantity || 0)}
                            aria-label={`Aumentar cantidad de ${item.product.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Price and Remove */}
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                          aria-label={`Eliminar ${item.product.name} del carrito`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(Number(item.product.offer_price ?? item.product.sale_price ?? (item.product as any).price ?? 0) * item.quantity, config)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                {/* Subtotal */}
                <div className="flex items-center justify-between py-2 bg-white dark:bg-gray-800 px-3 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Subtotal:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {totalDisplay}
                  </span>
                </div>

                {/* Proceed to Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white text-base font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Proceder al Pago
                </Button>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 text-center text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline transition-colors py-1"
                  >
                    Guardar para después
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    disabled={isClearing}
                    className="flex-1 text-center text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline transition-colors py-1 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClearing ? 'Vaciando...' : 'Vaciar Carrito'}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Modal */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <h2 className="text-base font-bold">Vaciar Carrito</h2>
            </div>
            <button 
              onClick={() => setShowClearConfirm(false)}
              className="text-white hover:bg-red-700 transition-colors p-1 rounded"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ¿Vaciar el carrito?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Se eliminarán <span className="font-semibold text-red-600 dark:text-red-500">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</span> del carrito.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowClearConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleClearCart}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Sí, Vaciar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartItems={cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.offer_price ?? item.product.sale_price ?? 0),
          quantity: item.quantity,
          image: item.product.image_url,
        }))}
        cartTotal={cartTotal}
        onOrderSuccess={() => {
          try {
            clearCart();
          } catch {}
        }}
      />
    </>
  );
}
