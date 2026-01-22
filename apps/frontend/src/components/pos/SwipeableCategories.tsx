'use client';

import { useSwipeable } from 'react-swipeable';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeableCategoriesProps {
  categories: Array<{ id: string; name: string }>;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

/**
 * SwipeableCategories - Navegación de categorías con gestos swipe
 * 
 * Características:
 * - Swipe left/right para cambiar categoría
 * - Indicador visual de categoría actual
 * - Botones de navegación como fallback
 * - Animación suave de transición
 */
export function SwipeableCategories({
  categories,
  selectedCategory,
  onCategoryChange,
}: SwipeableCategoriesProps) {
  const currentIndex = categories.findIndex(c => c.id === selectedCategory);

  const goToNext = () => {
    if (currentIndex < categories.length - 1) {
      onCategoryChange(categories[currentIndex + 1].id);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onCategoryChange(categories[currentIndex - 1].id);
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrevious,
    preventScrollOnSwipe: true,
    trackMouse: true, // También funciona con mouse
    delta: 50, // Mínimo 50px para activar swipe
  });

  return (
    <div className="relative">
      {/* Contenedor con swipe */}
      <div
        {...handlers}
        className={cn(
          'flex items-center justify-between',
          'px-4 py-3 bg-muted/50 rounded-lg',
          'touch-pan-y', // Permite scroll vertical
          'select-none' // Previene selección de texto
        )}
      >
        {/* Botón anterior */}
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Categoría anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Categoría actual */}
        <div className="flex-1 text-center">
          <p className="text-sm font-medium">
            {categories[currentIndex]?.name || 'Todas'}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentIndex + 1} / {categories.length}
          </p>
        </div>

        {/* Botón siguiente */}
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex === categories.length - 1}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Categoría siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Indicadores de página */}
      <div className="flex justify-center gap-1 mt-2">
        {categories.map((category, index) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              index === currentIndex
                ? 'w-6 bg-primary'
                : 'w-1.5 bg-muted-foreground/30'
            )}
            aria-label={`Ir a ${category.name}`}
          />
        ))}
      </div>

      {/* Hint visual para swipe (solo en móvil) */}
      <p className="text-xs text-center text-muted-foreground mt-2 md:hidden">
        ← Desliza para cambiar categoría →
      </p>
    </div>
  );
}
