/**
 * PublicOffersCarousel Component
 * 
 * Displays featured offers from the admin-configured carousel
 * Public-facing component for /offers page
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import { useToast } from "@/components/ui/use-toast";
import { useCatalogCart } from "@/hooks/useCatalogCart";

interface CarouselPromotion {
  id: string;
  name: string;
  description?: string;
  discountType: string;
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

interface CarouselProduct {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  image?: string;
  images?: { url: string }[];
  stock_quantity?: number;
  category_id?: string;
}

interface CarouselItem {
  promotion: CarouselPromotion;
  product: CarouselProduct;
  basePrice: number;
  offerPrice: number;
  discountPercent: number;
}

interface PublicOffersCarouselProps {
  onAddToCart?: (product: CarouselProduct) => void;
  onViewDetails?: (item: CarouselItem) => void;
}

export default function PublicOffersCarousel({
  onAddToCart,
  onViewDetails,
}: PublicOffersCarouselProps) {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const { addToCart: addToCartHook } = useCatalogCart();
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch carousel data
  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        console.log('[PublicCarousel] Fetching carousel data...');
        const response = await fetch("/api/promotions/carousel/public");
        
        console.log('[PublicCarousel] Response status:', response.status);
        
        if (!response.ok) {
          console.error('[PublicCarousel] Response not OK:', response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[PublicCarousel] Result:', result);

        if (result.success && result.data) {
          console.log('[PublicCarousel] Setting items:', result.data.length);
          setItems(result.data);
        } else {
          console.warn('[PublicCarousel] No data or unsuccessful response:', result);
        }
      } catch (error) {
        console.error("[PublicCarousel] Error loading carousel:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el carrusel de ofertas",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCarousel();
  }, [toast]);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000); // Change every 4 seconds (mejorado de 5s)

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, items.length]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const handleAddToCart = (product: CarouselProduct) => {
    const currentItem = items[currentIndex];
    const rawBase = Number(currentItem.basePrice ?? NaN);
    const rawOffer = Number(currentItem.offerPrice ?? NaN);
    const base = Number.isFinite(rawBase) && rawBase > 0 ? rawBase : (Number.isFinite(rawOffer) && rawOffer > 0 ? rawOffer : 0);
    const effectiveOffer = Number.isFinite(rawOffer) && rawOffer > 0 && rawOffer < base ? rawOffer : undefined;
    const productForCart = {
      id: String(product.id || ''),
      name: String(product.name || 'Producto'),
      image_url: product.images?.[0]?.url || product.image || '/api/placeholder/300/300',
      stock_quantity: Number(product.stock_quantity ?? 999),
      sale_price: base,
      offer_price: effectiveOffer,
      is_active: true,
    } as any;
    try {
      if (onAddToCart) onAddToCart(productForCart);
      else addToCartHook(productForCart, 1);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo agregar al carrito', variant: 'destructive' });
    }
  };

  const getTimeRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Finalizada";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} días`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} horas`;
  };

  // Loading state
  if (loading) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-rose-500 animate-pulse" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Ofertas Destacadas
          </h2>
        </div>
        <Card className="overflow-hidden border-2 border-rose-200 dark:border-rose-800">
          <CardContent className="p-0">
            <div className="relative h-[400px] md:h-[500px] bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </CardContent>
        </Card>
      </section>
    );
  }

  // No items state
  if (items.length === 0) {
    return null; // Don't show anything if no carousel items
  }

  const currentItem = items[currentIndex];
  const imageUrl =
    currentItem.product.images?.[0]?.url ||
    currentItem.product.image ||
    "/api/placeholder/800/600";

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-rose-500" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Ofertas Destacadas
          </h2>
          <Badge className="bg-rose-500 text-white border-none animate-pulse">
            <Sparkles className="w-3 h-3 mr-1" />
            Hot
          </Badge>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Carousel */}
      <Card className="overflow-hidden border-2 border-rose-200 dark:border-rose-800 shadow-2xl">
        <CardContent className="p-0">
          <div className="relative h-[400px] md:h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ 
                  duration: 0.3, // Reducido de 0.5s a 0.3s para transiciones más rápidas
                  ease: "easeInOut" // Curva de animación suave
                }}
                className="absolute inset-0"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <Image
                    src={imageUrl}
                    alt={currentItem.product.name}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={currentIndex === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex items-center">
                  <div className="container mx-auto px-6 md:px-12">
                    <div className="max-w-2xl space-y-6">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-3">
                        <Badge className="bg-rose-500 text-white border-none text-lg px-4 py-2">
                          -{currentItem.discountPercent}% OFF
                        </Badge>
                        {currentItem.promotion.endDate && (
                          <Badge
                            variant="secondary"
                            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-base px-4 py-2"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            {getTimeRemaining(currentItem.promotion.endDate)}
                          </Badge>
                        )}
                      </div>

                      {/* Promotion Name */}
                      <h3 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">
                        {currentItem.promotion.name}
                      </h3>

                      {/* Product Name */}
                      <p className="text-xl md:text-2xl text-white/90 font-semibold">
                        {currentItem.product.name}
                      </p>

                      {/* Description */}
                      {currentItem.promotion.description && (
                        <p className="text-base md:text-lg text-white/80 line-clamp-2">
                          {currentItem.promotion.description}
                        </p>
                      )}

                      {/* Pricing */}
                      <div className="flex items-baseline gap-4">
                        <span className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                          {formatCurrency(currentItem.offerPrice)}
                        </span>
                        {currentItem.basePrice > currentItem.offerPrice && (
                          <span className="text-xl md:text-2xl text-white/60 line-through">
                            {formatCurrency(currentItem.basePrice)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-4">
                        <Button
                          size="lg"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
                          onClick={() => handleAddToCart(currentItem.product)}
                        >
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Agregar al Carrito
                        </Button
                        >
                        {onViewDetails && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-white/50 text-white hover:bg-white/20 backdrop-blur-sm px-8 py-6 text-lg rounded-xl"
                            onClick={() => onViewDetails(currentItem)}
                          >
                            Ver Detalles
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            {items.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full h-12 w-12 transition-all duration-200 hover:scale-110"
                  onClick={handlePrevious}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full h-12 w-12 transition-all duration-200 hover:scale-110"
                  onClick={handleNext}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Dots Indicator */}
            {items.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {items.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`h-2 rounded-full transition-all duration-300 ease-in-out ${
                      index === currentIndex
                        ? "w-8 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/75"
                    }`}
                    aria-label={`Ir a oferta ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
