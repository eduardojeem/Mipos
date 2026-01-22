'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw,
  Star,
  Tag,
  Package,
  Sparkles
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import type { Category } from '@/types';

export interface AdvancedFilters {
  categories: string[];
  priceRange: [number, number];
  rating: number | null;
  inStock: boolean;
  onSale: boolean;
  brands: string[];
  tags: string[];
}

interface FilterDrawerProps {
  categories: Category[];
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onClearFilters: () => void;
  maxPrice: number;
  config: any;
  activeFiltersCount: number;
}

export default function FilterDrawer({
  categories,
  filters,
  onFiltersChange,
  onClearFilters,
  maxPrice,
  config,
  activeFiltersCount,
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const handleFilterChange = useCallback(<K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(localFilters);
    setOpen(false);
  }, [localFilters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    const defaultFilters: AdvancedFilters = {
      categories: [],
      priceRange: [0, maxPrice],
      rating: null,
      inStock: true,
      onSale: false,
      brands: [],
      tags: [],
    };
    setLocalFilters(defaultFilters);
    onClearFilters();
  }, [maxPrice, onClearFilters]);

  const ratingOptions = [4, 3, 2, 1];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-full sm:max-w-md p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filtros Avanzados
              </SheetTitle>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar todo
              </Button>
            </div>
            {activeFiltersCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
              </p>
            )}
          </SheetHeader>

          {/* Filters Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <Accordion type="multiple" defaultValue={['categories', 'price', 'availability']} className="space-y-4">
                
                {/* Categories */}
                <AccordionItem value="categories" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Categorías</span>
                      {localFilters.categories.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {localFilters.categories.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-center gap-3">
                          <Checkbox
                            id={`cat-${category.id}`}
                            checked={localFilters.categories.includes(category.id)}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                          />
                          <Label 
                            htmlFor={`cat-${category.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Price Range */}
                <AccordionItem value="price" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Rango de Precio</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4">
                      <Slider
                        value={localFilters.priceRange}
                        min={0}
                        max={maxPrice}
                        step={10}
                        onValueChange={(value) => handleFilterChange('priceRange', value as [number, number])}
                        className="py-4"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <div className="px-3 py-2 bg-muted rounded-lg font-medium">
                          {formatPrice(localFilters.priceRange[0], config)}
                        </div>
                        <span className="text-muted-foreground">hasta</span>
                        <div className="px-3 py-2 bg-muted rounded-lg font-medium">
                          {formatPrice(localFilters.priceRange[1], config)}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Rating */}
                <AccordionItem value="rating" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Calificación</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2">
                      {ratingOptions.map(rating => (
                        <button
                          key={rating}
                          onClick={() => handleFilterChange('rating', localFilters.rating === rating ? null : rating)}
                          className={`w-full flex items-center gap-2 p-3 rounded-lg transition-colors ${
                            localFilters.rating === rating 
                              ? 'bg-primary/10 border border-primary' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm">{rating}+ estrellas</span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Availability */}
                <AccordionItem value="availability" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Disponibilidad</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                        <Label htmlFor="inStock" className="cursor-pointer flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Solo productos en stock
                        </Label>
                        <Checkbox
                          id="inStock"
                          checked={localFilters.inStock}
                          onCheckedChange={(checked) => handleFilterChange('inStock', checked as boolean)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                        <Label htmlFor="onSale" className="cursor-pointer flex items-center gap-2">
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">OFERTA</Badge>
                          Solo ofertas
                        </Label>
                        <Checkbox
                          id="onSale"
                          checked={localFilters.onSale}
                          onCheckedChange={(checked) => handleFilterChange('onSale', checked as boolean)}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 border-t bg-muted/30">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                onClick={handleApplyFilters}
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
