import { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';

interface CartItem {
  id?: string;
  product_id?: string;
  name?: string;
  product_name?: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface MobileCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  subtotal: number;
  taxAmount: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProcessPayment: () => void;
  isProcessing?: boolean;
  cashSessionOpen?: boolean;
}

export default function MobileCartSheet({
  isOpen,
  onClose,
  items,
  total,
  subtotal,
  taxAmount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProcessPayment,
  isProcessing = false,
  cashSessionOpen = true
}: MobileCartSheetProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      setTimeout(() => setIsAnimating(false), 300);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
    } else {
      onUpdateQuantity(itemId, newQuantity);
    }
  };

  if (!isAnimating && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0'
          }`}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background text-foreground shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="sticky top-0 rounded-t-2xl border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-foreground">Carrito</h3>
                <p className="text-sm text-muted-foreground">{items.length} artículos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col" style={{ height: 'calc(85vh - 120px)' }}>
          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {items.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
                <h3 className="mb-2 text-lg font-medium text-foreground">Tu carrito está vacío</h3>
                <p className="text-sm text-muted-foreground">Agrega productos para comenzar una venta</p>
              </div>
            ) : (
              items.map((item) => {
                const itemId = item.id || item.product_id || '';
                const itemName = item.name || item.product_name || 'Producto';

                return (
                  <div key={itemId} className="rounded-lg border border-border/60 bg-muted/40 p-3">
                    <div className="flex items-start space-x-3">
                      {/* Imagen del producto */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={itemName}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                          <span className="text-xs text-muted-foreground">{itemName.substring(0, 1)}</span>
                        </div>
                      )}

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <h4 className="truncate text-sm font-medium text-foreground">{itemName}</h4>
                        <p className="text-sm text-green-600 font-semibold">${item.price?.toFixed(2) || '0.00'}</p>
                      </div>

                      {/* Botón eliminar */}
                      <button
                        onClick={() => onRemoveItem(itemId)}
                        className="p-1 text-muted-foreground transition-colors hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleQuantityChange(itemId, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="min-w-[2rem] text-center text-base font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(itemId, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-base font-semibold text-foreground">
                        ${((item.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="sticky bottom-0 space-y-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
              {/* Totals Breakdown */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border/40 pb-2">
                  <span>IVA (10%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">Total:</span>
                <span className="text-2xl font-black text-green-600">${total.toFixed(2)}</span>
              </div>

              {/* Botón de pago */}
              <button
                onClick={onProcessPayment}
                disabled={isProcessing || !cashSessionOpen}
                className={`w-full h-14 rounded-xl font-semibold text-white text-lg transition-colors ${!cashSessionOpen
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isProcessing
                    ? 'bg-green-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                  }`}
              >
                {isProcessing ? 'Procesando...' :
                  !cashSessionOpen ? 'Caja Cerrada' : 'Cobrar'}
              </button>

              {/* Botón limpiar */}
              <button
                onClick={onClearCart}
                disabled={isProcessing}
                className="h-12 w-full rounded-lg border border-border text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Limpiar carrito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
