import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryNav({ categories, selectedCategory, onSelectCategory }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Limitar a 8 categorías principales para un mejor diseño
  const displayCategories = categories.slice(0, 8);
  const hasMoreCategories = categories.length > 8;

  // Verificar scroll
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const handleScroll = () => checkScroll();
    const currentRef = scrollRef.current;

    currentRef?.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      currentRef?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories]);

  // Scroll functions
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative h-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-colors duration-300">
      {/* Flecha izquierda con gradiente */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 flex items-center px-1 pointer-events-none">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-400 hover:text-green-500 transition-all pointer-events-auto active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Contenedor de categorías con Scroll Suave */}
      <div
        ref={scrollRef}
        className="flex items-center space-x-3 px-6 h-full overflow-x-auto scrollbar-hide no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Chips de Categorías */}
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "flex-shrink-0 flex items-center space-x-2 h-10 px-5 rounded-xl border transition-all duration-300 font-bold text-xs uppercase tracking-wider",
            selectedCategory === null
              ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30 active:shadow-none"
              : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-700 hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-900/10 active:scale-95"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Todos</span>
        </button>

        {displayCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "flex-shrink-0 flex items-center space-x-2 h-10 px-5 rounded-xl border transition-all duration-300 font-bold text-xs uppercase tracking-wider",
              selectedCategory === category.id
                ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30 scale-105 active:shadow-none"
                : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-700 hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-900/10 active:scale-95"
            )}
          >
            <span className="text-base leading-none translate-y-[1px]">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}

        {/* Botón Ver Más */}
        {hasMoreCategories && (
          <button
            className="flex-shrink-0 flex items-center space-x-1 h-10 px-4 rounded-xl border bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 border-gray-100 dark:border-slate-700 hover:text-green-500 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <span>+</span>
            <span>Más</span>
          </button>
        )}

        {/* Espaciador final para el gradiente derecho */}
        <div className="flex-shrink-0 w-8" />
      </div>

      {/* Flecha derecha con gradiente */}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 flex items-center justify-end px-1 pointer-events-none">
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-400 hover:text-green-500 transition-all pointer-events-auto active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}