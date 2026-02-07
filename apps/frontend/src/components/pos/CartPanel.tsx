import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, CreditCard, Eraser, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface CartItem {
  id?: string;
  product_id?: string;
  name?: string;
  product_name?: string;
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
  onProcessSale: () => void;
  isProcessing?: boolean;
  cashSessionOpen?: boolean;
}

export default function CartPanel({
  items,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProcessSale,
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

  // Calculate subtotal and tax for the new footer structure
  // Assuming tax is 0 for now, or needs to be passed as a prop
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = 0; // Placeholder, adjust as needed

  return (
    <div
      className={cn(
        "fixed right-0 top-[64px] bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-gray-200/50 dark:border-slate-800/50 transition-all duration-500 ease-in-out z-40 flex flex-col shadow-2xl shadow-black/5 dark:shadow-black/20",
        isCollapsed ? "w-[70px]" : "w-[380px]"
      )}
    >
      {/* Botón para colapsar/expandir */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-lg text-gray-400 hover:text-green-500 transition-colors z-50"
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Cabecera del Carrito */}
      <div className={cn("p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-opacity duration-300", isCollapsed && "opacity-0")}>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-gray-800 dark:text-white" />
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              {items.length}
            </span>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Carrito</h2>
        </div>
        <button
          onClick={onClearCart}
          disabled={items.length === 0}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-30"
          title="Vaciar carrito (Esc)"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Items */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className={cn("flex flex-col items-center justify-center h-full text-center space-y-4 transition-opacity", isCollapsed ? "opacity-0" : "opacity-100")}>
            <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-gray-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Tu carrito está vacío</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Agrega productos para comenzar</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const itemId = item.id || item.product_id || '';
            const itemName = item.name || item.product_name || 'Producto';

            return (
              <div
                key={itemId}
                className={cn(
                  "group relative flex items-center space-x-4 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 hover:border-green-500/30 dark:hover:border-green-500/30 hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300",
                  isCollapsed && "px-2"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-slate-700 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-slate-600">
                  {item.image_url ? (
                    <img src={item.image_url} alt={itemName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600 font-bold text-xs">
                      {itemName.substring(0, 1)}
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2 uppercase tracking-tight">{itemName}</h4>
                      <span className="text-sm font-black text-green-600 dark:text-green-500">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center bg-gray-50 dark:bg-slate-900 rounded-xl p-1 border border-gray-100 dark:border-slate-800">
                        <button
                          onClick={() => handleQuantityChange(itemId, item.quantity - 1)}
                          className="p-1 hover:text-green-600 dark:hover:text-green-500 transition-colors text-gray-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(itemId, item.quantity + 1)}
                          className="p-1 hover:text-green-600 dark:hover:text-green-500 transition-colors text-gray-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(itemId)}
                        className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}

                {/* Mini view cuando está colapsado */}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                    x{item.quantity} {itemName}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resumen y Botón de Pago */}
      {!isCollapsed && (
        <div className="p-6 bg-white/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 backdrop-blur-md">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-slate-500 font-medium">Subtotal</span>
              <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-slate-500 font-medium">Impuestos</span>
              <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(tax)}</span>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-green-600 dark:text-green-500">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onProcessSale}
              disabled={items.length === 0 || isProcessing || !cashSessionOpen}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/30 active:shadow-none active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center space-x-3 group"
            >
              <CreditCard className="w-5 h-5" />
              <span className="uppercase tracking-widest text-sm">
                {!cashSessionOpen ? 'Caja Cerrada' : isProcessing ? 'Procesando...' : 'Pagar'}
              </span>
              <div className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] hidden md:flex items-center space-x-1 group-hover:bg-white/30 transition-colors">
                <kbd className="font-sans">Enter</kbd>
              </div>
            </button>
            <button
              onClick={onClearCart}
              disabled={items.length === 0 || isProcessing}
              className="p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-gray-200 dark:border-slate-700"
              title="Limpiar Carrito (Esc)"
            >
              <Eraser className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[10px] text-center text-gray-400 dark:text-slate-500 mt-4 font-bold uppercase tracking-widest">
            Transacción Segura • POS Premium
          </p>
        </div>
      )}

      {/* Mini view inferior cuando está colapsado */}
      {isCollapsed && items.length > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col items-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
            <span className="text-[10px] font-black">{items.length}</span>
          </div>
          <button
            onClick={onProcessSale}
            disabled={!cashSessionOpen || isProcessing}
            className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            <CreditCard className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}