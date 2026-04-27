/**
 * Displays featured offers from the admin-configured carousel
 * and falls back to active promotions when the manual carousel is empty.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { OfferItem } from '../offers-types';

type CarouselCartProduct = Parameters<ReturnType<typeof useCatalogCart>['addToCart']>[0];

type CarouselApiPayload = {
  success: boolean;
  data?: OfferItem[];
};

interface PublicOffersCarouselProps {
  initialItems?: OfferItem[];
  onAddToCart?: (product: CarouselCartProduct) => void;
  onViewDetails?: (item: OfferItem) => void;
  showCart?: boolean;
}

function getTimeRemaining(endDate?: string) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Finalizada';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} dias`;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} horas`;
}

export default function PublicOffersCarousel({
  initialItems = [],
  onAddToCart,
  onViewDetails,
  showCart = true,
}: PublicOffersCarouselProps) {
  const [items, setItems] = useState<OfferItem[]>(initialItems);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const { addToCart: addToCartHook } = useCatalogCart();
  const { tenantApiPath } = useTenantPublicRouting();
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        const response = await fetch(tenantApiPath('/api/promotions/carousel/public'), {
          cache: 'no-store',
        });

        if (!response.ok) {
          console.warn('[PublicCarousel] API returned error:', response.status);
          if (initialItems.length === 0) {
            setItems([]);
          }
          return;
        }

        const result = (await response.json().catch(() => null)) as CarouselApiPayload | null;
        const nextItems = Array.isArray(result?.data) ? result.data : null;
        if (result?.success && nextItems) {
          setItems(nextItems);
          setCurrentIndex((previous) => {
            if (nextItems.length === 0) return 0;
            return Math.min(previous, nextItems.length - 1);
          });
          return;
        }

        if (initialItems.length === 0) {
          setItems([]);
        }
      } catch (error) {
        console.warn('[PublicCarousel] Error loading carousel:', error);
        if (initialItems.length === 0) {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchCarousel();
  }, [initialItems, tenantApiPath]);

  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % items.length);
    }, 5000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, items.length]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((previous) => (previous - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((previous) => (previous + 1) % items.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const handleAddToCart = (item: OfferItem) => {
    const basePrice = Number.isFinite(item.basePrice) && item.basePrice > 0 ? item.basePrice : item.offerPrice;
    const hasOfferPrice = Number.isFinite(item.offerPrice) && item.offerPrice > 0 && item.offerPrice < basePrice;

    const productForCart: CarouselCartProduct = {
      id: String(item.product.id || ''),
      name: String(item.product.name || 'Producto'),
      sku: String(item.product.sku || ''),
      description: item.product.description || item.promotion.description,
      cost_price: basePrice,
      image_url: item.product.images?.[0]?.url || item.product.image || '/api/placeholder/300/300',
      stock_quantity: Number(item.product.stock_quantity ?? 999),
      min_stock: 0,
      sale_price: basePrice,
      offer_price: hasOfferPrice ? item.offerPrice : undefined,
      category_id: String(item.product.category_id || ''),
      is_active: true,
      brand: item.product.brand,
      images: item.product.images,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    };

    try {
      if (onAddToCart) {
        onAddToCart(productForCart);
      } else {
        addToCartHook(productForCart, 1);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar al carrito', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <section className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Flame className="h-6 w-6 animate-pulse text-rose-500" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Promociones activas
          </h2>
        </div>
        <Card className="overflow-hidden border-0 shadow-2xl">
          <CardContent className="p-0">
            <div className="relative h-[400px] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse md:h-[500px]" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Flame className="h-6 w-6 text-slate-400" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Promociones activas
          </h2>
        </div>
        <Card className="overflow-hidden border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <Sparkles className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Sin promociones destacadas
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Cuando haya promociones activas configuradas, apareceran aqui con su mejor oferta visible.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const currentItem = items[currentIndex];
  const imageUrl =
    currentItem.product.images?.[0]?.url ||
    currentItem.product.image ||
    '/api/placeholder/800/600';

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-rose-500" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Promociones activas
          </h2>
          <Badge className="border-none bg-rose-500 text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            Destacadas
          </Badge>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      <Card className="overflow-hidden border border-rose-200 shadow-xl dark:border-rose-900/40">
        <CardContent className="p-0">
          <div className="relative h-[420px] md:h-[520px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentItem.product.id}-${currentItem.promotion.id}`}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0">
                  <Image
                    src={imageUrl}
                    alt={currentItem.product.name}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={currentIndex === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20" />
                </div>

                <div className="relative z-10 flex h-full items-center">
                  <div className="container mx-auto px-6 md:px-12">
                    <div className="max-w-2xl space-y-6">
                      <div className="flex flex-wrap gap-3">
                        <Badge className="border-none bg-rose-500 px-4 py-2 text-lg text-white">
                          -{Math.round(currentItem.discountPercent)}% OFF
                        </Badge>
                        {currentItem.promotion.endDate ? (
                          <Badge
                            variant="secondary"
                            className="bg-white/90 px-4 py-2 text-base text-slate-800 backdrop-blur-sm dark:bg-slate-900/90 dark:text-white"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {getTimeRemaining(currentItem.promotion.endDate)}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                          {currentItem.promotion.name}
                        </p>
                        <h3 className="text-3xl font-black text-white md:text-5xl">
                          {currentItem.product.name}
                        </h3>
                        {currentItem.promotion.description ? (
                          <p className="max-w-xl text-base text-white/80 md:text-lg">
                            {currentItem.promotion.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-end gap-4">
                        <span className="text-4xl font-black text-white md:text-6xl">
                          {formatCurrency(currentItem.offerPrice)}
                        </span>
                        {currentItem.basePrice > currentItem.offerPrice ? (
                          <div className="space-y-1 pb-1">
                            <p className="text-lg text-white/60 line-through md:text-2xl">
                              {formatCurrency(currentItem.basePrice)}
                            </p>
                            <p className="text-sm font-medium text-emerald-300">
                              Ahorras {formatCurrency(currentItem.savings)}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        {showCart ? (
                          <Button
                            size="lg"
                            className="rounded-xl bg-rose-600 px-8 py-6 text-lg font-bold text-white shadow-lg transition hover:scale-[1.02] hover:bg-rose-700"
                            onClick={() => handleAddToCart(currentItem)}
                          >
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            Agregar al carrito
                          </Button>
                        ) : null}
                        {onViewDetails ? (
                          <Button
                            size="lg"
                            variant="outline"
                            className="rounded-xl border-white/50 bg-white/10 px-8 py-6 text-lg text-white backdrop-blur-sm hover:bg-white/20"
                            onClick={() => onViewDetails(currentItem)}
                          >
                            Ver detalle
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {items.length > 1 ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:scale-110 hover:bg-white/30"
                  onClick={handlePrevious}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:scale-110 hover:bg-white/30"
                  onClick={handleNext}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            ) : null}

            {items.length > 1 ? (
              <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {items.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Ir a oferta ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
