'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hexToRgba } from '@/lib/color-utils';
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
import { getTenantHeroImage, getTenantPublicContent } from '@/lib/public-site/tenant-public-config';
import type { BusinessConfig } from '@/types/business-config';
import type { HomeOfferPreview, HomeProductPreview, HomeStats } from '@/app/home/home-types';

type HeroAction = {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
};

interface HomeSalesShowcaseProps {
  config: BusinessConfig;
  stats: HomeStats;
  heroActions: HeroAction[];
  whatsappHref: string | null;
  tenantHref: (path: string) => string;
  primary: string;
  secondary: string;
  products: HomeProductPreview[];
  offers: HomeOfferPreview[];
  canUseCart: boolean;
  onAddProductToCart: (product: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
    offerPrice?: number;
    stock?: number;
  }) => void;
}

/**
 * Hero section — diseño e-commerce profesional.
 *
 * Carousel full-width como fondo con overlay gradiente.
 * Contenido centrado: badge + título + descripción + CTAs.
 * Stats como pills compactas debajo.
 */
export default function HomeSalesShowcase({
  config,
  stats,
  heroActions,
  whatsappHref,
  tenantHref,
  primary,
  secondary,
  products,
  offers,
  canUseCart,
  onAddProductToCart,
}: HomeSalesShowcaseProps) {
  const content = getTenantPublicContent(config);
  const heroImage = getTenantHeroImage(config);

  // Slides del carousel (imágenes de banner configuradas o fallback)
  const slides = useMemo(() => {
    const imgs =
      config.carousel?.enabled !== false &&
      Array.isArray(config.carousel?.images) &&
      config.carousel.images.length > 0
        ? config.carousel.images.slice(0, 6)
        : [{ id: 'hero-fallback', url: heroImage, alt: config.businessName || '' }];
    return imgs.filter((s) => s.url?.trim());
  }, [config.carousel, config.businessName, heroImage]);

  const intervalMs = Math.max(4000, Number(config.carousel?.transitionSeconds || 5) * 1000);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setTimeout(() => {
      setActiveSlide((p) => (p + 1) % slides.length);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [activeSlide, intervalMs, isPaused, slides.length]);

  const goPrev = useCallback(() => {
    setActiveSlide((p) => (p - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    setActiveSlide((p) => (p + 1) % slides.length);
  }, [slides.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? goNext() : goPrev();
      }
    },
    [goNext, goPrev],
  );

  const primaryAction = heroActions.find((a) => a.variant !== 'secondary') ?? heroActions[0];
  const secondaryAction = heroActions.find((a) => a.variant === 'secondary');

  return (
    <section
      className="relative w-full overflow-hidden rounded-3xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Carousel background ── */}
      <div className="absolute inset-0">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === activeSlide ? 1 : 0 }}
          >
            <Image
              src={slide.url}
              alt={slide.alt || `Banner ${i + 1}`}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              unoptimized={shouldBypassNextImageOptimizer(slide.url)}
            />
          </div>
        ))}
        {/* Overlay gradiente para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex min-h-[480px] flex-col justify-center px-6 py-12 sm:min-h-[540px] sm:px-10 lg:min-h-[580px] lg:px-16">
        <div className="max-w-2xl space-y-6">
          {/* Badge */}
          <Badge
            className="rounded-full border-0 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-md"
            style={{ backgroundColor: hexToRgba(primary, 0.25), color: '#fff' }}
          >
            {content.heroBadge || 'Tienda oficial'}
          </Badge>

          {/* Título */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {config.heroTitle || 'Bienvenidos a'}{' '}
            <span style={{ color: primary }}>
              {config.heroHighlight || config.businessName}
            </span>
          </h1>

          {/* Descripción */}
          <p className="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            {content.heroSecondaryText ||
              config.heroDescription ||
              'Explora nuestro catálogo, aprovecha las promociones vigentes y compra con confianza.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {primaryAction ? (
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 text-base font-semibold text-white shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: primary }}
              >
                <Link href={tenantHref(primaryAction.href)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {primaryAction.label}
                </Link>
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-white/30 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md transition-transform hover:scale-105 hover:bg-white/20"
              >
                <Link href={tenantHref(secondaryAction.href)}>
                  {secondaryAction.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {/* ── Stats pills (compactas) ── */}
        {config.publicSite?.sections?.showHeroStats !== false ? (
          <div className="mt-10 flex flex-wrap gap-3">
            {[
              { label: 'Productos', value: stats.products },
              { label: 'Categorías', value: stats.categories },
              { label: 'Ofertas', value: stats.offers },
            ]
              .filter((s) => s.value > 0)
              .map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md"
                >
                  <span className="text-lg font-bold text-white">{stat.value}</span>
                  <span className="text-xs font-medium text-white/70">{stat.label}</span>
                </div>
              ))}
          </div>
        ) : null}
      </div>

      {/* ── Carousel navigation ── */}
      {slides.length > 1 ? (
        <>
          <button
            onClick={goPrev}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 sm:left-6 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goNext}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 sm:right-6 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                aria-label={`Ir al slide ${i + 1}`}
                className={`rounded-full transition-all ${
                  i === activeSlide
                    ? 'h-2 w-8 bg-white'
                    : 'h-2 w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
