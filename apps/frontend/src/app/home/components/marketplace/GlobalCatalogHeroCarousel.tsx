'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock3,
  Star,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GlobalProductCard } from '@/lib/public-site/data';

interface GlobalCatalogHeroCarouselProps {
  products: GlobalProductCard[];
  totalProducts: number;
  matchingOrganizations: number;
  searchQuery?: string;
  hasActiveFilters?: boolean;
}

type SlideTone = 'sale' | 'rated' | 'new' | 'stock' | 'default';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function hasOffer(product: GlobalProductCard) {
  return Boolean(product.offerPrice && product.offerPrice < product.basePrice);
}

function isRecent(product: GlobalProductCard) {
  const timestamp = Math.max(
    new Date(String(product.createdAt || 0)).getTime(),
    new Date(String(product.updatedAt || 0)).getTime()
  );
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  return Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 30;
}

function resolveTone(product: GlobalProductCard): SlideTone {
  if (hasOffer(product)) return 'sale';
  if (Number(product.rating || 0) >= 4.5) return 'rated';
  if (isRecent(product)) return 'new';
  if (Number(product.stockQuantity || 0) > 0) return 'stock';
  return 'default';
}

const TONE_CONFIG: Record<SlideTone, { eyebrow: string; accentClass: string }> = {
  sale: { eyebrow: 'Oferta destacada', accentClass: 'bg-emerald-400 text-slate-950' },
  rated: { eyebrow: 'Mejor valorado', accentClass: 'bg-amber-300 text-slate-950' },
  new: { eyebrow: 'Nuevo en catalogo', accentClass: 'bg-sky-300 text-slate-950' },
  stock: { eyebrow: 'Disponible hoy', accentClass: 'bg-violet-300 text-slate-950' },
  default: { eyebrow: 'Destacado', accentClass: 'bg-white text-slate-950' },
};

function resolveAccentBadge(product: GlobalProductCard, tone: SlideTone): string {
  switch (tone) {
    case 'sale':
      return product.discountPercentage
        ? `${Math.round(Number(product.discountPercentage))}% OFF`
        : 'En oferta';
    case 'rated':
      return `${Number(product.rating || 0).toFixed(1)} ★`;
    case 'new':
      return 'Recien publicado';
    case 'stock':
      return `${Number(product.stockQuantity || 0)} en stock`;
    default:
      return 'Destacado';
  }
}

function normalizeMarketplaceHref(href: string): string {
  return String(href || '')
    .replace(/^https?:\/\/localhost(?=\/)/i, '')
    .replace(/^https?:\/\/127\.0\.0\.1(?=\/)/i, '');
}

function buildProductDetailHref(product: GlobalProductCard): string {
  const baseUrl = normalizeMarketplaceHref(String(product.organizationHref || '')).replace(/\/home\/?$/, '');
  return `${baseUrl}/catalog/${encodeURIComponent(product.id)}`;
}

const AUTOPLAY_INTERVAL = 7000;
const PLACEHOLDER_IMAGE = '/api/placeholder/480/360';

export function GlobalCatalogHeroCarousel({
  products,
  totalProducts,
  matchingOrganizations,
  searchQuery = '',
  hasActiveFilters = false,
}: GlobalCatalogHeroCarouselProps) {
  const slides = useMemo(() => products.slice(0, 4), [products]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  // Clamp index when slides change
  useEffect(() => {
    if (activeIndex >= slides.length && slides.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  const goTo = useCallback((index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex(index);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  }, []);

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % slides.length);
  }, [activeIndex, slides.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((activeIndex - 1 + slides.length) % slides.length);
  }, [activeIndex, slides.length, goTo]);

  // Autoplay with pause on hover
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(goNext, AUTOPLAY_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slides.length, isPaused, activeIndex, goNext]);

  // Touch/swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
  }, [goNext, goPrev]);

  if (slides.length === 0) return null;

  const activeProduct = slides[activeIndex] || slides[0];
  const tone = resolveTone(activeProduct);
  const toneConfig = TONE_CONFIG[tone];
  const accentBadge = resolveAccentBadge(activeProduct, tone);
  const detailHref = buildProductDetailHref(activeProduct);
  const organizationHref = normalizeMarketplaceHref(activeProduct.organizationHref);
  const currentPrice = hasOffer(activeProduct)
    ? activeProduct.offerPrice || activeProduct.basePrice
    : activeProduct.basePrice;
  const hasImageError = imageError.has(activeProduct.id);
  const imageSrc = hasImageError ? PLACEHOLDER_IMAGE : activeProduct.image;

  return (
    <section
      ref={containerRef}
      className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-lg dark:border-slate-800"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        {/* Content */}
        <div className={`order-2 flex flex-col justify-between p-6 sm:p-8 lg:order-1 lg:p-10 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {/* Top badges — compact */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`rounded-full ${toneConfig.accentClass}`}>
              <Tag className="mr-1.5 h-3 w-3" />
              {toneConfig.eyebrow}
            </Badge>
            {searchQuery && (
              <Badge className="rounded-full bg-white/10 text-white/80 hover:bg-white/10">
                &ldquo;{searchQuery}&rdquo;
              </Badge>
            )}
          </div>

          {/* Product info */}
          <div className="mt-8">
            <Link href={detailHref} className="group block">
              <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-emerald-200 sm:text-4xl lg:text-5xl">
                {activeProduct.name}
              </h2>
            </Link>
            <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-6 text-slate-400">
              {activeProduct.description}
            </p>

            {/* Meta badges */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-white/10 text-white/80 hover:bg-white/10">
                <Building2 className="mr-1.5 h-3 w-3" />
                {activeProduct.organizationName}
              </Badge>
              <Badge className="rounded-full bg-white/10 text-white/70 hover:bg-white/10">
                {activeProduct.categoryName}
              </Badge>
              {isRecent(activeProduct) && (
                <Badge className="rounded-full bg-white/10 text-white/70 hover:bg-white/10">
                  <Clock3 className="mr-1.5 h-3 w-3" />
                  Nuevo
                </Badge>
              )}
              {Number(activeProduct.rating || 0) > 0 && (
                <Badge className="rounded-full bg-white/10 text-white/70 hover:bg-white/10">
                  <Star className="mr-1.5 h-3 w-3" />
                  {Number(activeProduct.rating || 0).toFixed(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Price + actions */}
          <div className="mt-8">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Precio
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-3xl font-black text-white sm:text-4xl">
                    {formatCurrency(currentPrice)}
                  </span>
                  {hasOffer(activeProduct) && (
                    <span className="pb-0.5 text-sm font-medium text-white/40 line-through">
                      {formatCurrency(activeProduct.basePrice)}
                    </span>
                  )}
                </div>
              </div>
              <Badge className={`rounded-full ${toneConfig.accentClass}`}>
                {accentBadge}
              </Badge>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={detailHref}>
                <Button className="h-11 rounded-lg bg-white px-6 font-semibold text-slate-950 hover:bg-slate-100">
                  Ver producto
                </Button>
              </Link>
              <Link href={organizationHref}>
                <Button
                  variant="outline"
                  className="h-11 rounded-lg border-white/20 bg-transparent px-6 font-semibold text-white hover:bg-white/10"
                >
                  Ver tienda
                </Button>
              </Link>

              {/* Navigation arrows */}
              {slides.length > 1 && (
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={goPrev}
                    aria-label="Anterior"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3ch] text-center text-xs tabular-nums text-white/50">
                    {activeIndex + 1}/{slides.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={goNext}
                    aria-label="Siguiente"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Dots */}
            {slides.length > 1 && (
              <div className="mt-5 flex items-center gap-1.5">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? 'w-8 bg-white'
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Slide ${index + 1}: ${slide.name}`}
                  />
                ))}
                {isPaused && (
                  <span className="ml-2 text-[10px] text-white/30">Pausado</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image */}
        <div className={`order-1 relative min-h-[240px] lg:order-2 lg:min-h-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <Image
            src={imageSrc}
            alt={activeProduct.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 42vw"
            onError={() => {
              setImageError((prev) => new Set(prev).add(activeProduct.id));
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:bg-gradient-to-l lg:from-slate-950/60 lg:via-transparent" />

          {/* Stats overlay — bottom right */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <div className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              {totalProducts} productos
            </div>
            <div className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              {matchingOrganizations} empresas
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GlobalCatalogHeroCarousel;
