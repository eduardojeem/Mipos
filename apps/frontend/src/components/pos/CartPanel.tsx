import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CartPanelProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProcessPayment: () => void;
  isProcessing?: boolean;
  cashSessionOpen?: boolean;
}

export default function CartPanel({
  items,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProcessPayment,
  isProcessing = false,
  cashSessionOpen = true
}: CartPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
    } else {
      onUpdateQuantity(itemId, newQuantity);
    }
  };

  return (
    <div className={`pos-cart-panel fixed right-0 top-[60px] bottom-0 bg-white border-l border-gray-200 transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header del carrito */}
      <div className="pos-cart-header h-12 border-b border-gray-200 px-4 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Carrito ({items.length})</span>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isCollapsed ? 
            <ShoppingCart className="w-5 h-5" /> : 
            <X className="w-5 h-5" />
          }
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Items del carrito */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">El carrito está vacío</p>
                <p className="text-gray-400 text-xs mt-1">Agrega productos para comenzar</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    {/* Imagen del producto */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">IMG</span>
                      </div>
                    )}
                    
                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-green-600 font-semibold">${item.price.toFixed(2)}</p>
                    </div>
                    
                    {/* Botón eliminar */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Controles de cantidad */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer con total y acciones */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">Total:</span>
                <span className="pos-cart-total text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
              </div>
              
              {/* Botón de pago */}
              <button
                onClick={onProcessPayment}
                disabled={isProcessing || !cashSessionOpen}
                className={`pos-pay-button w-full h-12 rounded-lg font-semibold text-white transition-colors ${
                  !cashSessionOpen
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
                className="w-full h-10 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Limpiar carrito
              </button>
            </div>
          )}
        </>
      )}

      {/* Indicador cuando está colapsado */}
      {isCollapsed && items.length > 0 && (
        <div className="absolute top-16 left-2 right-2">
          <div className="bg-green-500 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center">
            {items.length}
          </div>
        </div>
      )}
    </div>
  );
}