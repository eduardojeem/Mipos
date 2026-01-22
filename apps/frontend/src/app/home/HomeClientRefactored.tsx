'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useBusinessConfig, useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { useBrandingColors } from '@/hooks/useBrandingColors';
import { NavBar } from './components/NavBar';
import { HeroSection } from './components/HeroSection';
import { Carousel } from './components/Carousel';
import { Footer } from './components/Footer';
import SectionSkeleton from './components/SectionSkeleton';
import { ProductCard, ErrorDisplay, SectionErrorBoundary } from './components';
import { featuredProducts } from './data/homeData';
import ExistingOffersModal from '@/components/promotions/ExistingOffersModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSpecialOffers, usePublicOffers, useTopProducts, useScrollSpy } from './hooks';
import { useCatalogCart } from '@/hooks/useCatalogCart';

const OffersSection = dynamic(() => import('./components/OffersSection').then((m) => m.OffersSection), { loading: () => <SectionSkeleton title="Ofertas" /> });
const FeaturedProductsSection = dynamic(() => import('./components/FeaturedProductsSection').then((m) => m.FeaturedProductsSection), { loading: () => <SectionSkeleton title="Productos" /> });
const ContactSection = dynamic(() => import('./components/ContactSection').then((m) => m.ContactSection), { loading: () => <SectionSkeleton title="Contacto" /> });
const LocationSection = dynamic(() => import('./components/LocationSection').then((m) => m.LocationSection), { loading: () => <SectionSkeleton title="Ubicación" /> });

export default function HomeClient() {
  const { config, persisted } = useBusinessConfig();
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { offers: specialOffers, error: specialOffersError, retry: retrySpecialOffers } = useSpecialOffers();
  const { offers: publicOffers, error: publicOffersError, retry: retryPublicOffers } = usePublicOffers(8);
  const { products: topProducts } = useTopProducts(6);
  const { activeSection, scrollToSection } = useScrollSpy({ sectionIds: ['inicio', 'ofertas', 'productos', 'contacto', 'ubicacion'] });
  const { addToCart } = useCatalogCart();
  const { backgroundColor, textColor, focusRingHsl, bgHsl, textHsl, gradientStart, gradientEnd, gradStart05, gradEnd05 } = useBrandingColors();
  const formatCurrency = useCurrencyFormatter();
  
  useEffect(() => { setMounted(true); }, []);
  
  // Memoize expensive calculations
  const displayProducts = useMemo(
    () => (topProducts.length > 0 ? topProducts : featuredProducts),
    [topProducts]
  );

  // Memoize event handlers
  const handleOpenOffersModal = useCallback(() => {
    setIsOffersModalOpen(true);
  }, []);

  const handleCloseOffersModal = useCallback((open: boolean) => {
    setIsOffersModalOpen(open);
  }, []);

  const handleViewOffers = useCallback(() => {
    scrollToSection('ofertas');
  }, [scrollToSection]);

  return (
    <div
      className="min-h-screen home-theme bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-slate-950 dark:via-purple-950/50 dark:to-slate-900"
      style={{
        ['--background' as any]: bgHsl,
        ['--foreground' as any]: textHsl,
        ['--ring' as any]: focusRingHsl,
        ['--home-bg' as any]: backgroundColor,
        ['--home-text' as any]: textColor,
        ['--home-heading-color' as any]: textHsl,
        ['--home-gradient-start' as any]: gradientStart,
        ['--home-gradient-end' as any]: gradientEnd,
        ['--home-grad-start-05' as any]: gradStart05,
        ['--home-grad-end-05' as any]: gradEnd05,
        ['--home-focus-ring' as any]: focusRingHsl,
        ['--home-button-text' as any]: '#ffffff',
        ['--home-badge-text' as any]: '#ffffff',
      }}
    >
      <NavBar config={config} activeSection={activeSection} onNavigate={scrollToSection} />

      {mounted && !persisted && (
        <div className="mx-4 md:mx-8 mt-2 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 px-3 py-2 text-xs md:text-sm">
          Usando configuración local en este navegador. No está guardada en base de datos.
        </div>
      )}

      {config?.carousel?.enabled && config.carousel.images?.length > 0 && (
        <Carousel images={config.carousel.images} enabled={config.carousel.enabled} intervalSec={config.carousel.transitionSeconds} ratio={config.carousel.ratio} autoplay={config.carousel.autoplay} transitionMs={config.carousel.transitionMs} branding={config.branding} />
      )}

      <HeroSection config={config} onViewOffers={handleViewOffers} />

      <div className="mx-4 md:mx-8 mt-4 flex justify-end">
        <Button variant="outline" onClick={handleOpenOffersModal} aria-label="Ver ofertas existentes">Ver ofertas existentes</Button>
      </div>

      <SectionErrorBoundary sectionName="Ofertas">
        <ErrorDisplay error={specialOffersError} onRetry={retrySpecialOffers} />
        <OffersSection offers={specialOffers} branding={config.branding} />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Productos en Oferta">
        {publicOffersError && <ErrorDisplay error={publicOffersError} onRetry={retryPublicOffers} />}
        {publicOffers.length > 0 && (
          <section className="mx-4 md:mx-8 my-8" aria-labelledby="home-public-offers-title">
            <div className="flex items-center gap-2 mb-4">
              <h2 id="home-public-offers-title" className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Productos en oferta
              </h2>
              <Badge variant="secondary" aria-live="polite" role="status" className="bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-200">
                {publicOffers.length} {publicOffers.length === 1 ? 'producto' : 'productos'}
              </Badge>
              <div className="ml-auto">
                <Link href="/offers?status=active">
                  <Button variant="outline">Ver todas</Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {publicOffers.map((offer) => (
                <ProductCard
                  key={offer.product.id}
                  product={{
                    id: offer.product.id,
                    name: offer.product.name,
                    image: offer.product.images?.[0]?.url || offer.product.image || '/api/placeholder/300/300',
                    basePrice: offer.basePrice,
                    offerPrice: offer.offerPrice,
                    discountPercent: offer.discountPercent,
                  }}
                  promotion={offer.promotion ? {
                    name: offer.promotion.name,
                    endDate: offer.promotion.endDate,
                  } : undefined}
                  onAddToCart={addToCart}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </section>
        )}
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Productos Destacados">
        <FeaturedProductsSection products={displayProducts} config={config} />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Contacto">
        <ContactSection config={config} />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Ubicación">
        <LocationSection config={config} />
      </SectionErrorBoundary>

      <Footer config={config} onNavigate={scrollToSection} />

      <ExistingOffersModal open={isOffersModalOpen} onOpenChange={handleCloseOffersModal} />
    </div>
  );
}
