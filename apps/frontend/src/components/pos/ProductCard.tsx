import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price?: number;
  sale_price?: number;
  offer_price?: number;
  regular_price?: number;
  image_url?: string;
  stock?: number;
  sku?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const isLowStock = product.stock !== undefined && product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all duration-300 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-green-500/10 dark:hover:shadow-green-500/5 hover:-translate-y-1 active:scale-[0.98]",
        isOutOfStock && "opacity-75 grayscale"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isOutOfStock && onAddToCart(product)}
    >
      {/* Imagen del producto con Overlay suave */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-slate-800">
        {product.image_url && !imageError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
            <div className="text-center group-hover:scale-110 transition-transform duration-300">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mx-auto mb-2 flex items-center justify-center text-gray-300 dark:text-slate-600">
                <ShoppingCart className="w-8 h-8 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Capa de protección para el texto en la imagen (opcional) */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Botón rápido de agregar - Glassmorphism */}
        <div className={cn(
          "absolute top-3 right-3 transition-all duration-300 transform",
          isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90 translate-x-2"
        )}>
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-white/20 dark:border-slate-700/50 text-green-600 dark:text-green-500">
            <Plus className="w-5 h-5" />
          </div>
        </div>

        {/* Insignia de Stock */}
        {product.stock !== undefined && (
          <div className={cn(
            "absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-300",
            isOutOfStock
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : isLowStock
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 opacity-0 group-hover:opacity-100"
          )}>
            {isOutOfStock ? 'Agotado' : isLowStock ? `Stock: ${product.stock}` : 'En Stock'}
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-auto">
          {product.sku && (
            <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500 mb-1 uppercase tracking-tight">
              {product.sku}
            </p>
          )}
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-black text-gray-900 dark:text-white">
            {formatCurrency(Number(((product as any).offer_price ?? (product as any).sale_price ?? product.price ?? (product as any).regular_price ?? 0)))}
          </span>

          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Indicador visual inferior */}
      <div className="h-1 w-0 bg-green-500 transition-all duration-500 group-hover:w-full" />
    </div>
  );
}
