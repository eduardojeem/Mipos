"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Percent, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { SpecialOffer } from '../data/homeData';
import { Carousel } from './Carousel';
import { OfferCard } from './OfferCard';
import { memo, useRef, lazy, Suspense } from 'react';
import { useBusinessConfigData } from '@/contexts/BusinessConfigContext';
import { BusinessConfig } from '@/types/business-config';

// Lazy load carousel for below-fold content
const LazyCarousel = lazy(() => import('./Carousel').then(m => ({ default: m.Carousel })));

interface OffersSectionProps {
  offers: SpecialOffer[];
  branding?: BusinessConfig['branding'];
}

function OffersSectionComponent({ offers, branding }: OffersSectionProps) {
  const list = Array.isArray(offers) ? offers : [];
  const carouselRef = useRef<HTMLDivElement>(null);
  const { config } = useBusinessConfigData();

  const primary = branding?.primaryColor || '#ec4899';
  const secondary = branding?.secondaryColor || '#9333ea';
  const accent = branding?.accentColor || primary;
  const gradientStart = branding?.gradientStart || primary;
  const gradientEnd = branding?.gradientEnd || secondary;
  const backgroundColor = branding?.backgroundColor || undefined;

  const offerImages = list
    .slice(0, 10)
    .map((o, idx) => ({ id: `offer-${idx}`, url: o.image, alt: o.title }))
    .filter((im) => typeof im.url === 'string' && im.url.trim().length > 0);

  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Navegación por teclado para el carrusel de tarjetas
  const onKeyDownCards = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      el.scrollBy({ left: -Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      el.scrollBy({ left: Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
    }
  };

  const hoc = config.homeOffersCarousel;

  return (
    <section
      id="ofertas"
      className="py-20 home-section-bg"
      style={{ backgroundColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner moderno */}
        <div className="relative overflow-hidden rounded-2xl mb-12 border" style={{ borderColor: hexToRgba(accent, 0.3) }}>
          <div className="absolute inset-0 opacity-90" style={{ backgroundImage: `linear-gradient(to bottom right, var(--home-gradient-start), ${accent}, var(--home-gradient-end))` }} />
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_65%)]" />
          <div className="relative px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 text-white">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5" />
                <Badge variant="secondary" className="text-white" style={{ backgroundColor: hexToRgba('#ffffff', 0.2) }}>Ofertas y Promociones</Badge>
              </div>
              <h2 className="home-heading text-3xl lg:text-4xl font-extrabold tracking-tight">Descuentos que sí se sienten</h2>
              <p className="text-sm mt-2 opacity-90">Promociones por tiempo limitado, condiciones claras y ahorro real.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/offers?status=active">
                <Badge variant="outline" className="bg-white/90 text-slate-900">Ahora mismo</Badge>
              </Link>
              <Link href="/offers?status=upcoming">
                <Badge variant="outline" className="bg-white/90 text-slate-900">Próximas</Badge>
              </Link>
              <Link href="/offers?status=ended">
                <Badge variant="outline" className="bg-white/90 text-slate-900">Finalizadas</Badge>
              </Link>
              <Link href="/offers?type=PERCENTAGE">
                <Badge variant="outline" className="bg-white/90 text-slate-900">% Porcentaje</Badge>
              </Link>
              <Link href="/offers?type=FIXED_AMOUNT">
                <Badge variant="outline" className="bg-white/90 text-slate-900">$ Monto fijo</Badge>
              </Link>
              <Link href="/offers?type=BOGO">
                <Badge variant="outline" className="bg-white/90 text-slate-900">2x1</Badge>
              </Link>
              <Link href="/offers?type=FREE_SHIPPING">
                <Badge variant="outline" className="bg-white/90 text-slate-900">Envío gratis</Badge>
              </Link>
              <Link href="/offers?status=active">
                <Button size="sm" variant="secondary" className="text-slate-900 hover:bg-gray-100" style={{ backgroundColor: '#ffffff' }}>
                  <Tag className="w-4 h-4 mr-2" /> Ver todas
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Carrusel de imágenes (mantiene el tamaño de la sección) - Lazy loaded */}
        {hoc?.enabled && offerImages.length > 0 && (
          <div className="mb-12">
            <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
              <LazyCarousel
                images={offerImages}
                enabled
                intervalSec={hoc?.intervalSeconds ?? 5}
                ratio={hoc?.ratio ?? config.carousel?.ratio}
                autoplay={hoc?.autoplay}
                transitionMs={hoc?.transitionMs}
                branding={branding}
              />
            </Suspense>
          </div>
        )}

        {/* Carrusel de Ofertas */}
        {list.length > 0 && (
          <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-sm mb-12 border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" style={{ color: primary }} />
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Destacados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { const el = carouselRef.current; if (el) el.scrollBy({ left: -Math.round(el.clientWidth * 0.8), behavior: 'smooth' }); }}
                    aria-label="Desplazar a la izquierda"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { const el = carouselRef.current; if (el) el.scrollBy({ left: Math.round(el.clientWidth * 0.8), behavior: 'smooth' }); }}
                    aria-label="Desplazar a la derecha"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                ref={carouselRef}
                role="region"
                aria-roledescription="Carrusel de ofertas"
                aria-label="Carrusel de ofertas destacadas"
                tabIndex={0}
                onKeyDown={onKeyDownCards}
                className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 focus:outline-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {list.map((offer, index) => (
                  <div key={`carousel-${index}`} className="snap-start min-w-[280px] md:min-w-[360px]">
                    <OfferCard
                      offer={offer}
                      onClick={() => window.location.href = '/offers?status=active'}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de Ofertas - Using reusable OfferCard */}
        <div className="grid md:grid-cols-3 gap-8">
          {list.map((offer, index) => (
            <OfferCard
              key={index}
              offer={offer}
              onClick={() => window.location.href = '/offers?status=active'}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const OffersSection = memo(OffersSectionComponent);
export default OffersSection;