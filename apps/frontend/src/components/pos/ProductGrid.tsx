import { useMemo } from 'react';
import { AlertTriangle, PackageSearch, RefreshCw } from 'lucide-react';
import ProductCard from './ProductCard';
import type { Product } from '@/types';

type PosProductGridItem = Product & {
  price?: number;
  stock?: number;
};

interface ProductGridProps {
  products: PosProductGridItem[];
  onAddToCart: (product: PosProductGridItem) => void;
  isLoading?: boolean;
  searchQuery?: string;
  selectedCategory?: string | null;
  // Nuevos props para estado de error real (vs "vacío legítimo").
  loadError?: Error | null;
  onRetry?: () => void;
}

export default function ProductGrid({
  products,
  onAddToCart,
  isLoading = false,
  searchQuery,
  selectedCategory,
  loadError,
  onRetry,
}: ProductGridProps) {
  // Antes había un useState + useEffect que volvía a filtrar localmente
  // los productos que el padre ya filtraba. Doble trabajo y un re-render
  // extra por cambio de filter. Ahora el padre filtra y este componente
  // solo renderiza — pero conservamos el filtro client-side defensivo
  // por si el padre le pasara productos sin filtrar.
  const displayed = useMemo(() => {
    let next = products;
    if (selectedCategory) {
      next = next.filter((p) => p.category_id === selectedCategory);
    }
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      next = next.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      );
    }
    return next;
  }, [products, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
        aria-busy="true"
        aria-label="Cargando productos"
      >
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm animate-pulse border border-gray-100 dark:border-slate-800"
          >
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

  // Error state — distinto al empty state: la API falló, hay que reintentar.
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-24 h-24 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12 text-rose-500 dark:text-rose-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No pudimos cargar los productos
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto">
          Algo falló al traer el catálogo desde el servidor. Podés reintentar o
          revisar la conexión.
        </p>
        {process.env.NODE_ENV === 'development' && loadError.message ? (
          <p className="mt-3 text-xs text-rose-500/80 dark:text-rose-400/70 max-w-md font-mono break-all">
            {loadError.message}
          </p>
        ) : null}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        ) : null}
      </div>
    );
  }

  if (displayed.length === 0) {
    // Distinguimos tres casos para mensaje claro:
    // 1) Hay productos pero el filtro/búsqueda no matchea
    // 2) Hay productos pero la categoría seleccionada está vacía
    // 3) No hay productos cargados en el catálogo
    const hasAnyProducts = products.length > 0;
    const isFiltering = Boolean(searchQuery?.trim() || selectedCategory);

    let title: string;
    let body: string;
    if (hasAnyProducts && searchQuery?.trim()) {
      title = 'No encontramos lo que buscás';
      body = `No hay coincidencias para "${searchQuery}". Probá con otro término.`;
    } else if (hasAnyProducts && selectedCategory) {
      title = 'Sin productos en esta categoría';
      body = 'Esta categoría aún no tiene productos. Cargá uno desde el módulo de Productos.';
    } else {
      title = 'Tu catálogo está vacío';
      body = 'Cargá tu primer producto desde el módulo de Productos para empezar a vender.';
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <PackageSearch className="w-12 h-12 text-gray-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
          {body}
        </p>
        {isFiltering && hasAnyProducts ? (
          <a
            href="/dashboard/pos"
            className="mt-6 text-emerald-600 dark:text-emerald-500 font-semibold hover:underline"
          >
            Limpiar filtros
          </a>
        ) : !hasAnyProducts ? (
          <a
            href="/dashboard/products"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 font-medium transition-colors"
          >
            Ir a Productos
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-24 md:pb-6">
      {displayed.map((product, index) => (
        <div
          key={product.id}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          // Cap delay at 10 para evitar 50 * N ms cuando hay muchos productos.
          style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
        >
          <ProductCard product={product} onAddToCart={onAddToCart} />
        </div>
      ))}
    </div>
  );
}
