import { useState, useEffect } from 'react';
import { PackageSearch } from 'lucide-react';
import ProductCard from './ProductCard';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  stock?: number;
  category_id?: string;
  sku?: string;
}

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  isLoading?: boolean;
  searchQuery?: string;
  selectedCategory?: string | null;
}

export default function ProductGrid({
  products,
  onAddToCart,
  isLoading = false,
  searchQuery,
  selectedCategory
}: ProductGridProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);

  // Filtrar productos según búsqueda y categoría
  useEffect(() => {
    let filtered = products;

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Filtrar por búsqueda
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm animate-pulse border border-gray-100 dark:border-slate-800">
            <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-800"></div>
            <div className="p-4 space-y-3">
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <PackageSearch className="w-12 h-12 text-gray-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {searchQuery ? 'No encontramos lo que buscas' : 'Sin productos en esta categoría'}
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
          {searchQuery
            ? `No hay coincidencias para "${searchQuery}". Intenta con otro término.`
            : 'Esta categoría aún no tiene productos registrados.'
          }
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-green-600 dark:text-green-500 font-semibold hover:underline"
        >
          Limpiar todos los filtros
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-24 md:pb-6">
      {filteredProducts.map((product, index) => (
        <div
          key={product.id}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
          />
        </div>
      ))}
    </div>
  );
}