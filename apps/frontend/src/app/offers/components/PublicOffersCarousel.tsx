/**
 * Displays featured offers from the admin-configured carousel
 * and falls back to active promotions when the manual carousel is empty.
 *
 * REDESIGNED: split desktop layout, animated progress bar, smooth transitions.
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

const AUTO_PLAY_INTERVAL = 5500;

function getTimeRemaining(endDate?: string) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Finalizada';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d restantes`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h restantes`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}min restantes`;
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
  const [progress, setProgress] = useState(0);
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const { addToCart: addToCartHook } = useCatalogCart();
  const { tenantApiPath } = useTenantPublicRouting();
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        const response = await fetch(tenantApiPath('/api/promotions/carousel/public'), { cache: 'no-store' });
        if (!response.ok) {
          if (initialItems.length === 0) setItems([]);
          return;
        }
        const result = (await response.json().catch(() => null)) as CarouselApiPayload | null;
        const nextItems = Array.isArray(result?.data) ? result.data : null;
        if (result?.success && nextItems) {
          setItems(nextItems);
          setCurrentIndex((prev) => (nextItems.length === 0 ? 0 : Math.min(prev, nextItems.length - 1)));
          return;
        }
        if (initialItems.length === 0) setItems([]);
      } catch {
        if (initialItems.length === 0) setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchCarousel();
  }, [initialItems, tenantApiPath]);

  // Progress bar animation
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;
    setProgress(0);
    const step = 100 / (AUTO_PLAY_INTERVAL / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [isAutoPlaying, items.length, currentIndex]);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setProgress(0);
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, AUTO_PLAY_INTERVAL);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying, items.length]);

  const navigate = (direction: 'prev' | 'next') => {
    setIsAutoPlaying(false);
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    setCurrentIndex((prev) =>
      direction === 'prev'
        ? (prev - 1 + items.length) % items.length
        : (prev + 1) % items.length
    );
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setProgress(0);
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
      if (onAddToCart) onAddToCart(productForCart);
      else addToCartHook(productForCart, 1);
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar al carrito', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <section className="mb-12">
        <div className="mb-5 flex items-center gap-2.5">
          <Flame className="h-6 w-6 animate-pulse text-rose-500" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Promociones activas</h2>
        </div>
        <div className="relative h-[400px] rounded-3xl overflow-hidden bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse md:h-[480px]" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mb-12">
        <div className="mb-5 flex items-center gap-2.5">
          <Flame className="h-6 w-6 text-slate-400" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Promociones activas</h2>
        </div>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 p-16 text-center">
          <Sparkles className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Sin promociones destacadas</h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Cuando haya promociones activas configuradas, apareceran aqui.
          </p>
        </div>
      </section>
    );
  }

  const currentItem = items[currentIndex];
  const imageUrl = currentItem.product.images?.[0]?.url || currentItem.product.image || '/api/placeholder/800/600';
  const timeRemaining = getTimeRemaining(currentItem.promotion.endDate);

  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Flame className="h-6 w-6 text-rose-500" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Promociones activas</h2>
          <Badge className="border-none bg-rose-500 text-white text-xs px-2.5 py-1">
            <Sparkles className="mr-1 h-3 w-3" />Destacadas
          </Badge>
        </div>
        <span className="text-sm font-medium text-slate-400 tabular-nums">
          {currentIndex + 1}&nbsp;/&nbsp;{items.length}
        </span>
      </div>

      {/* Progress bar */}
      {items.length > 1 && isAutoPlaying && (
        <div className="mb-3 h-0.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main carousel */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-2xl shadow-rose-500/5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentItem.product.id}-${currentItem.promotion.id}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid md:grid-cols-[1fr_380px] min-h-[400px] md:min-h-[460px]"
          >
            {/* Image panel */}
            <div className="relative overflow-hidden bg-slate-900 min-h-[300px]">
              <Image
                src={imageUrl}
                alt={currentItem.product.name}
                fill
                className="object-cover opacity-90"
                sizes="(max-width: 768px) 100vw, 60vw"
                priority={currentIndex === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent md:bg-gradient-to-b" />

              {/* Mobile overlay content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:hidden">
                <div className="flex gap-2 mb-3">
                  <Badge className="border-none bg-rose-600 px-3 py-1.5 text-base font-black text-white">
                    -{Math.round(currentItem.discountPercent)}% OFF
                  </Badge>
                  {timeRemaining && (
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-slate-800">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />{timeRemaining}
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-1">{currentItem.promotion.name}</p>
                <h3 className="text-2xl font-black text-white">{currentItem.product.name}</h3>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-3xl font-black text-white">{formatCurrency(currentItem.offerPrice)}</span>
                  {currentItem.basePrice > currentItem.offerPrice && (
                    <span className="text-lg text-white/50 line-through pb-0.5">{formatCurrency(currentItem.basePrice)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Info panel - desktop */}
            <div className="hidden md:flex flex-col justify-between bg-white dark:bg-slate-900 p-8">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-none bg-rose-600 px-3 py-1.5 text-base font-black text-white shadow-lg shadow-rose-600/20">
                    -{Math.round(currentItem.discountPercent)}% OFF
                  </Badge>
                  {timeRemaining && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-semibold">
                      <Clock className="mr-1.5 h-4 w-4 text-rose-500" />{timeRemaining}
                    </Badge>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    {currentItem.promotion.name}
                  </p>
                  <h3 className="text-2xl font-black text-foreground leading-tight">{currentItem.product.name}</h3>
                  {currentItem.promotion.description && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {currentItem.promotion.description}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-5">
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-foreground tracking-tight">
                      {formatCurrency(currentItem.offerPrice)}
                    </span>
                    {currentItem.basePrice > currentItem.offerPrice && (
                      <div className="pb-1 space-y-0.5">
                        <p className="text-base text-muted-foreground line-through">
                          {formatCurrency(currentItem.basePrice)}
                        </p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Ahorro: {formatCurrency(currentItem.savings)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                {showCart && (
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-600/25"
                    onClick={() => handleAddToCart(currentItem)}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />Agregar al carrito
                  </Button>
                )}
                {onViewDetails && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-xl font-semibold"
                    onClick={() => onViewDetails(currentItem)}
                  >
                    Ver detalle
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-white/20 dark:bg-black/30 text-white backdrop-blur-md hover:bg-white/30 hover:scale-110 transition-all"
              onClick={() => navigate('prev')}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-white/20 dark:bg-black/30 text-white backdrop-blur-md hover:bg-white/30 hover:scale-110 transition-all md:right-[396px]"
              onClick={() => navigate('next')}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Dot indicators + mobile CTA */}
      {items.length > 1 && (
        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-rose-500' : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                aria-label={`Ir a oferta ${index + 1}`}
              />
            ))}
          </div>
          <div className="md:hidden flex gap-3 w-full sm:w-auto">
            {showCart && (
              <Button
                className="flex-1 sm:flex-none rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700"
                onClick={() => handleAddToCart(currentItem)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />Agregar
              </Button>
            )}
            {onViewDetails && (
              <Button variant="outline" className="flex-1 sm:flex-none rounded-xl" onClick={() => onViewDetails(currentItem)}>
                Ver detalle
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
