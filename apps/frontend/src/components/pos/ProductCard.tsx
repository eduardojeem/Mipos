import { useState } from 'react';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  stock?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatPrice = (val: unknown) => {
    const num = typeof val === 'number' ? val : typeof val === 'string' ? Number(val) : 0;
    if (!Number.isFinite(num)) return '0.00';
    return num.toFixed(2);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className="pos-product-card bg-white rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagen del producto */}
      <div className="relative aspect-[3/2] overflow-hidden">
        {product.image_url && !imageError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-gray-400 text-xs">IMG</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Botón agregar - aparece en hover */}
        <button
          onClick={() => onAddToCart(product)}
          className={`pos-add-button absolute top-2 right-2 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Indicador de stock bajo */}
        {product.stock !== undefined && product.stock <= 5 && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
            Stock: {product.stock}
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className="p-4">
        <h3 className="pos-product-name text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="pos-product-price text-lg font-semibold text-green-600">
            ${formatPrice((product as any)?.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
