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
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Carrito</h3>
                <p className="text-sm text-gray-500">{items.length} artículos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tu carrito está vacío</h3>
                <p className="text-sm text-gray-500">Agrega productos para comenzar una venta</p>
              </div>
            ) : (
              items.map((item) => {
                const itemId = item.id || item.product_id || '';
                const itemName = item.name || item.product_name || 'Producto';

                return (
                  <div key={itemId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start space-x-3">
                      {/* Imagen del producto */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={itemName}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">{itemName.substring(0, 1)}</span>
                        </div>
                      )}

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{itemName}</h4>
                        <p className="text-sm text-green-600 font-semibold">${item.price?.toFixed(2) || '0.00'}</p>
                      </div>

                      {/* Botón eliminar */}
                      <button
                        onClick={() => onRemoveItem(itemId)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleQuantityChange(itemId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-base font-medium text-gray-900 min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(itemId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-base font-semibold text-gray-900">
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
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
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
                className="w-full h-12 text-gray-600 hover:text-gray-800 text-base font-medium transition-colors border border-gray-200 rounded-lg"
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