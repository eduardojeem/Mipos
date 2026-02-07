import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Limitar a 7 categorías principales según especificaciones
  const displayCategories = categories.slice(0, 7);
  const hasMoreCategories = categories.length > 7;

  // Verificar scroll
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const handleScroll = () => checkScroll();
    scrollRef.current?.addEventListener('scroll', handleScroll);
    return () => scrollRef.current?.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll functions
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="pos-category-nav relative h-14 bg-white border-b border-gray-200">
      {/* Flecha izquierda */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Contenedor de categorías */}
      <div
        ref={scrollRef}
        className="flex items-center space-x-3 px-4 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Todas las categorías */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`pos-category-chip flex-shrink-0 h-10 px-4 rounded-full border transition-colors ${
            selectedCategory === null
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:text-green-600'
          }`}
        >
          <span className="text-sm font-medium">Todos</span>
        </button>

        {/* Categorías principales */}
        {displayCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`pos-category-chip flex-shrink-0 h-10 px-4 rounded-full border transition-colors flex items-center space-x-2 ${
              selectedCategory === category.id
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:text-green-600'
            }`}
          >
            <span className="text-lg">{category.icon}</span>
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}

        {/* Categoría "Más" si hay más de 7 */}
        {hasMoreCategories && (
          <button
            onClick={() => {
              // Podría abrir un modal con todas las categorías
              console.log('Mostrar más categorías');
            }}
            className="flex-shrink-0 h-10 px-4 rounded-full border bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:text-green-600 transition-colors flex items-center space-x-2"
          >
            <span className="text-lg">⋯</span>
            <span className="text-sm font-medium">Más</span>
          </button>
        )}
      </div>

      {/* Flecha derecha */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  );
}