'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GlobalProductCard } from '@/lib/public-site/data';
import {
  formatMarketplaceCurrency,
  normalizeMarketplaceHref,
  buildProductDetailHref,
} from './marketplace-utils';

interface GlobalCatalogHeroCarouselProps {
  products: GlobalProductCard[];
  totalProducts: number;
  matchingOrganizations: number;
  searchQuery?: string;
}

type SlideTone = 'sale' | 'rated' | 'new' | 'stock' | 'default';

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

const TONE_CONFIG: Record<
  SlideTone,
  { eyebrow: string; pillClass: string; accentBar: string; priceBadge: string }
> = {
  sale:    { eyebrow: 'Oferta destacada', pillClass: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30', accentBar: 'bg-emerald-400', priceBadge: 'bg-emerald-400 text-slate-950' },
  rated:   { eyebrow: 'Mejor valorado',   pillClass: 'bg-amber-400/20 text-amber-300 border-amber-400/30',   accentBar: 'bg-amber-400',   priceBadge: 'bg-amber-400 text-slate-950'   },
  new:     { eyebrow: 'Nuevo en catálogo', pillClass: 'bg-sky-400/20 text-sky-300 border-sky-400/30',         accentBar: 'bg-sky-400',     priceBadge: 'bg-sky-400 text-slate-950'     },
  stock:   { eyebrow: 'Disponible hoy',   pillClass: 'bg-violet-400/20 text-violet-300 border-violet-400/30', accentBar: 'bg-violet-400',  priceBadge: 'bg-violet-300 text-slate-950'  },
  default: { eyebrow: 'Destacado',        pillClass: 'bg-white/10 text-white/70 border-white/10',             accentBar: 'bg-white/30',    priceBadge: 'bg-white text-slate-950'       },
};

function resolveAccentLabel(product: GlobalProductCard, tone: SlideTone): string | null {
  if (tone === 'sale') {
    return product.discountPercentage
      ? `−${Math.round(Number(product.discountPercentage))}%`
      : '−';
  }
  if (tone === 'rated') return `${Number(product.rating || 0).toFixed(1)} ★`;
  return null;
}

const AUTOPLAY_INTERVAL = 7000;

const contentVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir * 16 }),
  center: { opacity: 1, y: 0 },
  exit: (dir: number) => ({ opacity: 0, y: dir * -16 }),
};

export function GlobalCatalogHeroCarousel({
  products,
  totalProducts,
  matchingOrganizations,
  searchQuery = '',
}: GlobalCatalogHeroCarouselProps) {
  const slides = useMemo(() => products.slice(0, 4), [products]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const touchStartX = useRef(0);

  useEffect(() => {
    if (activeIndex >= slides.length && slides.length > 0) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  const goNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goTo = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setTimeout(goNext, AUTOPLAY_INTERVAL);
    return () => clearTimeout(timer);
  }, [activeIndex, isPaused, slides.length, goNext]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
  }, [goNext, goPrev]);

  if (slides.length === 0) return null;

  const active = slides[activeIndex] || slides[0];
  const tone = resolveTone(active);
  const tc = TONE_CONFIG[tone];
  const accentLabel = resolveAccentLabel(active, tone);
  const detailHref = buildProductDetailHref(active);
  const organizationHref = normalizeMarketplaceHref(active.organizationHref);
  const currentPrice = hasOffer(active) ? active.offerPrice || active.basePrice : active.basePrice;
  const imageSrc = imageError.has(active.id) ? '/api/placeholder/480/360' : active.image;

  return (
    <section
      className="relative overflow-hidden rounded-2xl shadow-2xl"
      style={{ minHeight: 520 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Productos destacados"
    >
      {/* ── Full-bleed background image ── */}
      <AnimatePresence initial={false}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Image
            src={imageSrc}
            alt={active.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
            onError={() => setImageError((prev) => new Set(prev).add(active.id))}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Gradient overlays ── */}
      {/* Mobile: dark from bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20 lg:hidden" />
      {/* Desktop: dark from left + bottom edge */}
      <div className="absolute inset-0 hidden bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/5 lg:block" />
      <div className="absolute inset-0 hidden bg-gradient-to-t from-slate-950/60 via-transparent to-transparent lg:block" />

      {/* ── Tone accent line (left edge) ── */}
      <div className={`absolute left-0 top-0 h-full w-1 ${tc.accentBar} opacity-80`} />

      {/* ── Main content ── */}
      <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-6 sm:p-8 lg:max-w-[58%] lg:p-12">

        {/* Top row: tone pill + counter */}
        <div className="flex items-center justify-between gap-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tc.pillClass}`}>
            <Tag className="h-3 w-3" />
            {tc.eyebrow}
            {searchQuery ? (
              <span className="ml-1 opacity-70">&ldquo;{searchQuery}&rdquo;</span>
            ) : null}
          </span>
          {slides.length > 1 && (
            <span className="font-mono text-xs tabular-nums text-white/30">
              {String(activeIndex + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(slides.length).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Center: animated product info */}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={active.id}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="my-8"
            role="group"
            aria-roledescription="slide"
            aria-label={`${activeIndex + 1} de ${slides.length}: ${active.name}`}
          >
            <Link href={detailHref} className="group block">
              <h2 className="max-w-lg text-3xl font-black leading-[1.05] tracking-tight text-white transition-colors group-hover:text-emerald-200 sm:text-5xl lg:text-6xl">
                {active.name}
              </h2>
            </Link>
            {active.description ? (
              <p className="mt-4 line-clamp-2 max-w-md text-sm leading-relaxed text-white/50">
                {active.description}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                {active.organizationName}
              </span>
              <span>·</span>
              <span>{active.categoryName}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom: price + CTAs + nav */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Price */}
          <div>
            {hasOffer(active) ? (
              <p className="mb-0.5 text-xs text-white/30 line-through">
                {formatMarketplaceCurrency(active.basePrice)}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white sm:text-4xl">
                {formatMarketplaceCurrency(currentPrice)}
              </span>
              {accentLabel ? (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${tc.priceBadge}`}>
                  {accentLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* CTAs + nav */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link href={detailHref}>
              <Button className="h-11 rounded-xl bg-white px-6 font-semibold text-slate-950 shadow-lg hover:bg-slate-100">
                Ver producto
              </Button>
            </Link>
            <Link href={organizationHref}>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-white/20 bg-white/5 px-5 font-semibold text-white backdrop-blur-sm hover:bg-white/10"
              >
                Ver tienda
              </Button>
            </Link>

            {slides.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Thumbnail strip (desktop) ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 top-6 hidden w-[72px] flex-col gap-2 lg:flex">
          {slides.map((slide, index) => {
            const src = imageError.has(slide.id) ? '/api/placeholder/480/360' : slide.image;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ver ${slide.name}`}
                className={`relative flex-1 overflow-hidden rounded-xl transition-all duration-300 ${
                  index === activeIndex
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent opacity-100'
                    : 'opacity-35 hover:opacity-65'
                }`}
              >
                <Image
                  src={src || '/api/placeholder/480/360'}
                  alt={slide.name}
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Dots (mobile only) ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-6 flex items-center gap-1.5 lg:hidden">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Slide ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/25 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Stats overlay (top right, desktop) ── */}
      <div className="absolute right-24 top-5 hidden items-center gap-2 lg:flex">
        <div className="rounded-lg bg-black/30 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-md">
          {totalProducts} productos
        </div>
        <div className="rounded-lg bg-black/30 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-md">
          {matchingOrganizations} empresas
        </div>
      </div>

      {/* ── Progress bar ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <motion.div
            key={`progress-${activeIndex}`}
            className={`h-full origin-left ${tc.accentBar} opacity-60`}
            initial={{ scaleX: 0 }}
            animate={isPaused ? { scaleX: undefined } : { scaleX: 1 }}
            transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </section>
  );
}

export default GlobalCatalogHeroCarousel;
