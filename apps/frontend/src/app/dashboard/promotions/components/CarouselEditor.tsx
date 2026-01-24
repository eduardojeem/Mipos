/**
 * CarouselEditor Component - Enhanced Version
 * 
 * Manages the carousel of featured promotions with:
 * - Drag & drop reordering
 * - Visual preview
 * - Keyboard shortcuts
 * - Better UX/UI
 * - Example data support
 */

"use client";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowUp,
  Save,
  Search,
  Trash2,
  AlertCircle,
  RefreshCw,
  Undo2,
  GripVertical,
  Eye,
  Sparkles,
  Info,
  Keyboard,
  Image as ImageIcon
} from "lucide-react";
import { useCarousel, MAX_CAROUSEL_ITEMS } from "@/hooks/useCarousel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CarouselErrorAlert } from "./CarouselErrorAlert";

type Promotion = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  discountType?: string;
  discountValue?: number;
};

// Example promotions for empty state
const EXAMPLE_PROMOTIONS: Promotion[] = [
  {
    id: "example-1",
    name: "🎉 Black Friday - 50% OFF",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    discountType: "PERCENTAGE",
    discountValue: 50,
  },
  {
    id: "example-2",
    name: "💝 San Valentín - 30% Descuento",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    discountType: "PERCENTAGE",
    discountValue: 30,
  },
  {
    id: "example-3",
    name: "🌟 Cyber Monday - Hasta 70% OFF",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    discountType: "PERCENTAGE",
    discountValue: 70,
  },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return iso;
  }
}

function getDiscountBadge(promotion: Promotion) {
  if (!promotion.discountValue) return null;

  if (promotion.discountType === 'PERCENTAGE') {
    return `-${promotion.discountValue}%`;
  } else if (promotion.discountType === 'FIXED_AMOUNT') {
    return `-$${promotion.discountValue}`;
  }
  return null;
}

export default function CarouselEditor({
  promotions: propPromotions,
  initialIds = [],
  isLoading = false,
}: {
  promotions: Promotion[];
  initialIds?: string[];
  isLoading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Use example data if no promotions provided, BUT only if not loading
  const promotions = (propPromotions.length > 0 || isLoading) ? propPromotions : EXAMPLE_PROMOTIONS;
  const isUsingExamples = propPromotions.length === 0 && !isLoading;

  // Use the custom hook for state management
  const {
    carouselIds,
    loading,
    saving,
    error,
    hasChanges,
    canAddMore,
    isValid,
    validationErrors,
    togglePromotion,
    movePromotion,
    removePromotion,
    saveCarousel,
    revertChanges,
  } = useCarousel(initialIds);

  // Get selected promotions in order
  const selectedPromotions = useMemo(() => {
    return carouselIds
      .map(id => promotions.find(p => p.id === id))
      .filter(Boolean) as Promotion[];
  }, [carouselIds, promotions]);

  // Filter promotions based on search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }, [promotions, search]);

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Visual feedback
    e.currentTarget.classList.add('border-primary');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-primary');
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary');

    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const id = carouselIds[draggedIndex];
    const direction = draggedIndex < targetIndex ? 'down' : 'up';
    const steps = Math.abs(targetIndex - draggedIndex);

    // Move multiple steps
    for (let i = 0; i < steps; i++) {
      movePromotion(id, direction);
    }

    setDraggedIndex(null);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && isValid && !saving) {
          saveCarousel();
        }
      }

      // Ctrl/Cmd + Z to revert
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (hasChanges && !saving) {
          e.preventDefault();
          revertChanges();
        }
      }

      // Arrow keys for focused item
      if (focusedIndex >= 0 && focusedIndex < carouselIds.length) {
        const id = carouselIds[focusedIndex];

        // Ctrl/Cmd + Up to move up
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
          e.preventDefault();
          if (focusedIndex > 0) {
            movePromotion(id, 'up');
            setFocusedIndex(focusedIndex - 1);
          }
        }

        // Ctrl/Cmd + Down to move down
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
          e.preventDefault();
          if (focusedIndex < carouselIds.length - 1) {
            movePromotion(id, 'down');
            setFocusedIndex(focusedIndex + 1);
          }
        }

        // Delete to remove
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          removePromotion(id);
          setFocusedIndex(Math.min(focusedIndex, carouselIds.length - 2));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    hasChanges,
    isValid,
    saving,
    focusedIndex,
    carouselIds,
    saveCarousel,
    revertChanges,
    movePromotion,
    removePromotion,
  ]);

  return (
    <TooltipProvider>
      <Card role="region" aria-label="Carrusel de ofertas" className="border-2 border-violet-200 dark:border-violet-800">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/50 dark:to-fuchsia-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Carrusel de Ofertas Destacadas</CardTitle>
                <CardDescription>
                  Selecciona hasta {MAX_CAROUSEL_ITEMS} promociones para mostrar en la página principal
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base px-3 py-1">
                {carouselIds.length}/{MAX_CAROUSEL_ITEMS}
              </Badge>
              {hasChanges && (
                <Badge variant="secondary" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Sin guardar
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Example Data Notice */}
          {isUsingExamples && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Datos de Ejemplo</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Estás viendo promociones de ejemplo. Crea promociones reales para configurar el carrusel.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <CarouselErrorAlert
              error={error}
              onRetry={() => saveCarousel()}
              onDismiss={() => { }}
            />
          )}

          {/* Validation Errors */}
          {!isValid && validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores de validación</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Ocultar' : 'Vista Previa'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver cómo se verá el carrusel en la página pública</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Keyboard className="h-4 w-4 mr-2" />
                    Atajos
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p><kbd className="px-1 bg-muted rounded">Ctrl+S</kbd> Guardar</p>
                    <p><kbd className="px-1 bg-muted rounded">Ctrl+Z</kbd> Revertir</p>
                    <p><kbd className="px-1 bg-muted rounded">Ctrl+↑/↓</kbd> Reordenar</p>
                    <p><kbd className="px-1 bg-muted rounded">Del</kbd> Eliminar</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={revertChanges}
                  disabled={saving}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Revertir
                </Button>
              )}
              <Button
                onClick={saveCarousel}
                disabled={!hasChanges || !isValid || saving || isUsingExamples}
                size="sm"
                className="bg-violet-600 hover:bg-violet-700"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Carrusel
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Preview Mode */}
          {showPreview && selectedPromotions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-600" />
                <Label className="text-base font-semibold">Vista Previa del Carrusel</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedPromotions.slice(0, 6).map((promo, idx) => (
                  <div
                    key={promo.id}
                    className="relative border-2 border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30"
                  >
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-violet-600 text-white">#{idx + 1}</Badge>
                    </div>
                    {getDiscountBadge(promo) && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive">{getDiscountBadge(promo)}</Badge>
                      </div>
                    )}
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Imagen del producto</span>
                      </div>
                      <h4 className="font-semibold text-sm line-clamp-2">{promo.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedPromotions.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{selectedPromotions.length - 6} promociones más en el carrusel
                </p>
              )}
              <Separator />
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selection Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="carousel-search" className="text-base font-semibold">
                  Promociones Disponibles
                </Label>
                {!canAddMore && (
                  <Badge variant="secondary" className="text-xs">
                    Límite alcanzado
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="carousel-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar promociones..."
                  className="pl-9"
                  aria-label="Buscar promociones"
                />
              </div>
              <div className="border-2 border-dashed rounded-lg p-3 max-h-96 overflow-y-auto bg-muted/30">
                {loading || isLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Cargando promociones...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    {search ? 'No se encontraron promociones' : 'No hay promociones disponibles'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((p) => {
                      const isSelected = carouselIds.includes(p.id);
                      const isDisabled = !isSelected && !canAddMore;
                      const discount = getDiscountBadge(p);

                      return (
                        <label
                          key={`sel-${p.id}`}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isSelected
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                            : 'border-transparent hover:border-violet-200 dark:hover:border-violet-800'
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePromotion(p.id)}
                              disabled={isDisabled}
                              aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} ${p.name}`}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm flex items-center gap-2">
                                {p.name}
                                {discount && (
                                  <Badge variant="outline" className="text-xs">
                                    {discount}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(p.startDate)} - {formatDate(p.endDate)}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Order Panel */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Orden del Carrusel
                {selectedPromotions.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Arrastra para reordenar)
                  </span>
                )}
              </Label>
              <div className="border-2 border-dashed rounded-lg p-3 min-h-96 max-h-96 overflow-y-auto bg-gradient-to-br from-violet-50/50 to-fuchsia-50/50 dark:from-violet-950/20 dark:to-fuchsia-950/20">
                {selectedPromotions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Selecciona promociones para el carrusel
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aparecerán aquí en el orden que elijas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPromotions.map((p, idx) => {
                      const discount = getDiscountBadge(p);

                      return (
                        <div
                          key={`ord-${p.id}`}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, idx)}
                          onFocus={() => setFocusedIndex(idx)}
                          onBlur={() => setFocusedIndex(-1)}
                          tabIndex={0}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 bg-white dark:bg-slate-900 transition-all cursor-move ${focusedIndex === idx
                            ? 'border-violet-500 ring-2 ring-violet-200 dark:ring-violet-800'
                            : 'border-violet-200 dark:border-violet-800 hover:border-violet-400'
                            }`}
                          aria-label={`Promoción ${idx + 1}: ${p.name}`}
                        >
                          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <Badge variant="outline" className="flex-shrink-0">
                            #{idx + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              {p.name}
                              {discount && (
                                <Badge variant="destructive" className="text-xs">
                                  {discount}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formatDate(p.startDate)} - {formatDate(p.endDate)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => movePromotion(p.id, 'up')}
                                  disabled={idx === 0}
                                  aria-label="Mover arriba"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mover arriba</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => movePromotion(p.id, 'down')}
                                  disabled={idx === selectedPromotions.length - 1}
                                  aria-label="Mover abajo"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mover abajo</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => removePromotion(p.id)}
                                  aria-label="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar del carrusel</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Tip:</strong> Las promociones aparecerán en la página principal en el orden que configures aquí.</p>
              <p>Puedes arrastrar las promociones para reordenarlas o usar los botones de flecha.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
