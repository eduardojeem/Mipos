import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Barcode } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  searchResults?: Array<{
    id: string;
    name: string;
    price: number;
    image_url?: string;
  }>;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, searchResults = [], isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length > 0) {
      onSearch(value);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  // Limpiar búsqueda
  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    onSearch('');
  };

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full group" ref={searchRef}>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-gray-400 group-focus-within:text-green-500 transition-colors">
          <Search className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Busca por nombre, SKU o escanea código..."
          className="pos-search-bar w-full h-12 pl-12 pr-12 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500/50 focus:bg-white dark:focus:bg-slate-900 text-sm font-medium transition-all dark:text-slate-200"
          onFocus={() => query.trim().length > 0 && setShowResults(true)}
        />

        <div className="absolute right-4 flex items-center space-x-2">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 transition-colors bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden md:flex items-center space-x-1 px-2 py-1 bg-gray-100/50 dark:bg-slate-800/50 rounded-lg border border-gray-200/50 dark:border-slate-700/50">
              <Barcode className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Scanner</span>
            </div>
          )}
        </div>
      </div>

      {/* Resultados de búsqueda */}
      {showResults && query && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[400px] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Sugerencias Rápidas</span>
            <span className="text-[10px] font-bold text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">{searchResults.length} Resultados</span>
          </div>

          <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
            {searchResults.length > 0 ? (
              <div className="p-2 space-y-1">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="px-4 py-3 hover:bg-green-50/50 dark:hover:bg-green-900/10 rounded-xl cursor-pointer flex items-center space-x-4 transition-all group"
                    onClick={() => {
                      setShowResults(false);
                      // Custom event or handler can be added here if needed to directly add to cart
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-800 flex-shrink-0 border border-gray-100 dark:border-slate-700">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Barcode className="w-5 h-5 text-gray-200 dark:text-slate-700" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors uppercase tracking-tight">{product.name}</p>
                      <p className="text-xs font-black text-green-600 dark:text-green-500">{formatCurrency(product.price)}</p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
                        <Search className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-200 dark:text-slate-700" />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-200">No hay coincidencias</p>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Prueba con otro término de búsqueda</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}