"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Clock3,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessConfig, useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { useBrandingColors } from '@/hooks/useBrandingColors';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useAuth } from '@/hooks/use-auth';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import {
  buildWhatsAppHref,
  getTenantPublicContent,
  getTenantPublicSections,
} from '@/lib/public-site/tenant-public-config';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import HomeSalesShowcase from './components/HomeSalesShowcase';
import {
  HomeCategoryShowcase,
  HomeOfferRail,
  HomeProductRail,
  HomeTrustStrip,
} from './components/HomeCommerceSections';
import { LoginAccessSection } from '@/components/auth/LoginAccessSection';
import type { TenantHomeSnapshot } from './home-types';
import type { Product } from '@/types';
import type { BusinessVertical } from '@/config/verticals';

interface HomeClientProps {
  initialData: TenantHomeSnapshot;
  organizationId?: string;
  vertical?: BusinessVertical;
}

// ── Countdown helper ──
function useCountdown(endDate: string | undefined) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endDate) return;
    const end = new Date(endDate).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setTimeLeft('Finalizada'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [endDate]);

  return timeLeft;
}

function OfferCountdown({ endDate }: { endDate?: string }) {
  const timeLeft = useCountdown(endDate);
  if (!timeLeft || !endDate) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <Clock3 className="h-3 w-3" />
      {timeLeft}
    </span>
  );
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const { config, persisted } = useBusinessConfig();
  const { addToCart } = useCatalogCart();
  const { user, loading: authLoading } = useAuth();
  const { tenantHref } = useTenantPublicRouting();
  const formatCurrency = useCurrencyFormatter();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const whatsappHref = buildWhatsAppHref(
    config,
    `Hola, quiero consultar por ${config.businessName || 'su tienda'}.`
  );
  const { primary, secondary, textColor } = useBrandingColors();
  const [activeSection, setActiveSection] = useState('inicio');

  const { stats, categories, offers, products } = initialData;

  // Scroll desde hash en URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const timer = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(hash);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  // Intersection observer para activeSection
  useEffect(() => {
    const ids = ['inicio', 'categorias', 'ofertas', 'productos', 'contacto'];
    const elements = ids
      .map((id) => ({ id, element: document.getElementById(id) }))
      .filter((e): e is { id: string; element: HTMLElement } => Boolean(e.element));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          const match = elements.find((e) => e.element === visible.target);
          if (match) setActiveSection(match.id);
        }
      },
      { rootMargin: '0px 0px -55% 0px', threshold: 0.25 },
    );
    elements.forEach((e) => observer.observe(e.element));
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const heroActions = useMemo(() => {
    const actions: Array<{ href: string; label: string; variant: 'primary' | 'secondary' }> = [];
    if (sections.showCatalog) {
      actions.push({ href: '/catalog', label: content.heroPrimaryCtaLabel || 'Ver catálogo', variant: 'primary' });
    }
    if (sections.showOffers) {
      actions.push({ href: '/offers', label: content.heroSecondaryCtaLabel || 'Ver ofertas', variant: 'secondary' });
    } else if (sections.showOrderTracking) {
      actions.push({ href: '/orders/track', label: 'Seguir pedido', variant: 'secondary' });
    }
    return actions;
  }, [content, sections]);

  const addPreviewToCart = (product: {
    id: string; name: string; image: string; basePrice: number; offerPrice?: number; stock?: number;
  }) => {
    const now = new Date().toISOString();
    const cartProduct: Product = {
      id: product.id, name: product.name, sku: '', description: '',
      cost_price: 0, sale_price: product.basePrice, offer_price: product.offerPrice,
      stock_quantity: product.stock ?? 999, min_stock: 0, category_id: '',
      image_url: product.image, is_active: true, created_at: now, updated_at: now,
    };
    addToCart(cartProduct, 1);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 dark:bg-slate-950 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" style={{ color: textColor }}>
      <NavBar config={config} activeSection={activeSection} onNavigate={scrollToSection} />

      {!persisted ? (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            Configuración local aún no sincronizada con la base de datos.
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-6 sm:px-6 lg:px-8">

        {/* ═══════════════════════════════════════════════════════════════════
            1. HERO — Carousel full-width con overlay
           ═══════════════════════════════════════════════════════════════════ */}
        <div id="inicio" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)]">
          <HomeSalesShowcase
            config={config}
            stats={stats}
            heroActions={heroActions}
            whatsappHref={whatsappHref}
            tenantHref={tenantHref}
            primary={primary}
            secondary={secondary}
            products={products}
            offers={offers}
            canUseCart={sections.showCart}
            onAddProductToCart={addPreviewToCart}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Trust badges — barra inline
           ═══════════════════════════════════════════════════════════════════ */}
        <HomeTrustStrip primary={primary} />

        {sections.showOffers && offers.length > 0 ? (
          <HomeOfferRail
            offers={offers}
            title={content.offersTitle || 'Ofertas activas'}
            description={content.offersDescription || 'Aprovecha antes de que terminen'}
            tenantHref={tenantHref}
            primary={primary}
            formatCurrency={formatCurrency}
            canUseCart={sections.showCart}
            onAddProductToCart={addPreviewToCart}
            renderCountdown={(endDate) => <OfferCountdown endDate={endDate} />}
          />
        ) : null}

        {sections.showCategories && categories.length > 0 ? (
          <HomeCategoryShowcase
            categories={categories}
            title={content.featuredCategoriesTitle || 'Categorías'}
            tenantHref={tenantHref}
            primary={primary}
            secondary={secondary}
          />
        ) : null}

        {sections.showFeaturedProducts && products.length > 0 ? (
          <HomeProductRail
            products={products}
            title={content.featuredProductsTitle || 'Productos destacados'}
            description={content.featuredProductsDescription || 'Los más vendidos de nuestro catálogo'}
            tenantHref={tenantHref}
            primary={primary}
            formatCurrency={formatCurrency}
            canUseCart={sections.showCart}
            whatsappHref={whatsappHref}
            showCatalogLink={sections.showCatalog}
            onAddProductToCart={addPreviewToCart}
          />
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            5. CONTACTO — Compacto
           ═══════════════════════════════════════════════════════════════════ */}
        {(sections.showContactInfo || sections.showLocation || sections.showBusinessHours) ? (
          <section id="contacto" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)]">
            <Card className="overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:shadow-md dark:bg-slate-900/60">
              <div className="h-1 w-full" style={{ backgroundColor: primary }} />
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  {/* Info de contacto */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {content.contactTitle || 'Contacto'}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                      {sections.showContactInfo && config.contact?.phone ? (
                        <a href={`tel:${config.contact.phone}`} className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200">
                          <Phone className="h-4 w-4" style={{ color: primary }} />
                          {config.contact.phone}
                        </a>
                      ) : null}
                      {sections.showContactInfo && config.contact?.whatsapp && whatsappHref ? (
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200">
                          <MessageCircle className="h-4 w-4" style={{ color: primary }} />
                          WhatsApp
                        </a>
                      ) : null}
                      {sections.showLocation && config.address?.city ? (
                        config.address?.mapUrl ? (
                          <a href={config.address.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200">
                            <MapPin className="h-4 w-4" style={{ color: primary }} />
                            {[config.address.street, config.address.city].filter(Boolean).join(', ')}
                          </a>
                        ) : (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" style={{ color: primary }} />
                            {[config.address.street, config.address.city].filter(Boolean).join(', ')}
                          </span>
                        )
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {whatsappHref ? (
                        <Button asChild size="sm" className="rounded-full text-white" style={{ backgroundColor: primary }}>
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Escribir
                          </a>
                        </Button>
                      ) : null}
                      {sections.showOrderTracking ? (
                        <Button asChild variant="outline" size="sm" className="rounded-full dark:border-slate-700">
                          <Link href={tenantHref('/orders/track')}>
                            <PackageSearch className="mr-1.5 h-3.5 w-3.5" /> Seguir pedido
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Horarios */}
                  {sections.showBusinessHours && Array.isArray(config.businessHours) && config.businessHours.length > 0 ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Clock3 className="h-4 w-4" style={{ color: primary }} />
                        Horarios
                      </p>
                      {config.businessHours.map((hour) => (
                        <p key={hour} className="text-sm text-slate-500 dark:text-slate-400">{hour}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
                {sections.showLocation && config.address?.mapEmbedEnabled && config.address?.mapEmbedUrl ? (
                  <div className="mt-6 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <iframe
                      src={config.address.mapEmbedUrl}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            Login CTA
           ═══════════════════════════════════════════════════════════════════ */}
        {!authLoading && !user?.id ? (
          <LoginAccessSection
            title="Acceso para clientes"
            description="Compra como invitado, inicia sesión para recomprar, o sigue tu pedido con el número de orden."
            types={['customer', 'guest-order']}
            returnUrl={tenantHref('/account')}
            compact
            className="rounded-none bg-transparent"
          />
        ) : null}
      </main>

      <Footer config={config} onNavigate={scrollToSection} />
    </div>
  );
}
