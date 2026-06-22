"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  ShieldCheck,
  Tag,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinessConfig, useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { hexToRgba } from '@/lib/color-utils';
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
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
        <div className="flex flex-wrap items-center justify-center gap-6 py-2 text-sm text-slate-500 dark:text-slate-400">
          {[
            { icon: Truck, label: 'Envíos coordinados' },
            { icon: ShieldCheck, label: 'Compra segura' },
            { icon: MessageCircle, label: 'Atención directa' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: primary }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. OFERTAS — Cards con countdown (urgencia)
           ═══════════════════════════════════════════════════════════════════ */}
        {sections.showOffers && offers.length > 0 ? (
          <section id="ofertas" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {content.offersTitle || 'Ofertas activas'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {content.offersDescription || 'Aprovecha antes de que terminen'}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="rounded-full" style={{ color: primary }}>
                <Link href={tenantHref('/offers')}>
                  Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
              {offers.map((offer) => (
                <Card key={offer.id} className="group min-w-[280px] shrink-0 overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/60 sm:min-w-0">
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={offer.image || '/api/placeholder/480/300'}
                      alt={offer.name}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                      sizes="(max-width: 640px) 280px, 33vw"
                      unoptimized={shouldBypassNextImageOptimizer(offer.image)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                    <Badge className="absolute left-3 top-3 border-0 bg-rose-600 text-white">
                      -{Math.round(offer.discountPercent)}%
                    </Badge>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="line-clamp-1 text-sm font-semibold text-white">{offer.name}</p>
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-xs text-slate-400 line-through">{formatCurrency(offer.basePrice)}</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(offer.offerPrice)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <OfferCountdown endDate={offer.endDate} />
                      {sections.showCart ? (
                        <Button
                          size="sm"
                          className="rounded-full text-white"
                          style={{ backgroundColor: primary }}
                          onClick={() => addPreviewToCart({
                            id: offer.id, name: offer.name, image: offer.image,
                            basePrice: offer.basePrice, offerPrice: offer.offerPrice,
                          })}
                        >
                          Agregar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            3. CATEGORÍAS — Chips scrollables
           ═══════════════════════════════════════════════════════════════════ */}
        {sections.showCategories && categories.length > 0 ? (
          <section id="categorias" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {content.featuredCategoriesTitle || 'Categorías'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, i) => {
                const colors = [primary, secondary, '#059669', '#d97706', '#7c3aed', '#dc2626'];
                const color = colors[i % colors.length];
                return (
                  <Link
                    key={cat.id}
                    href={tenantHref(`/catalog?category=${cat.id}`)}
                    className="group flex items-center gap-2 rounded-full border border-border/50 bg-white/60 px-4 py-2.5 text-sm font-medium text-slate-700 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/80"
                    style={{ borderColor: hexToRgba(color, 0.3) }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125"
                      style={{ backgroundColor: color }}
                    />
                    {cat.name}
                    {cat.productCount > 0 ? (
                      <span className="text-xs text-slate-400">({cat.productCount})</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            4. PRODUCTOS DESTACADOS — Grid compacto con hover
           ═══════════════════════════════════════════════════════════════════ */}
        {sections.showFeaturedProducts && products.length > 0 ? (
          <section id="productos" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {content.featuredProductsTitle || 'Productos destacados'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {content.featuredProductsDescription || 'Los más vendidos de nuestro catálogo'}
                </p>
              </div>
              {sections.showCatalog ? (
                <Button asChild variant="ghost" size="sm" className="rounded-full" style={{ color: primary }}>
                  <Link href={tenantHref('/catalog')}>
                    Ver todo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {products.map((product) => {
                const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.price);
                const displayPrice = product.offerPrice ?? product.price;

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/60"
                  >
                    <Link href={tenantHref(`/catalog/${product.id}`)} className="block">
                      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <Image
                          src={product.image || '/api/placeholder/400/400'}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, 25vw"
                          unoptimized={shouldBypassNextImageOptimizer(product.image)}
                        />
                        {hasOffer ? (
                          <Badge className="absolute left-2 top-2 border-0 bg-rose-600 text-[10px] text-white">
                            Oferta
                          </Badge>
                        ) : null}
                      </div>
                    </Link>
                    <CardContent className="space-y-2 p-3 sm:p-4">
                      <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-base font-bold ${hasOffer ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'}`}>
                          {formatCurrency(displayPrice)}
                        </span>
                        {hasOffer ? (
                          <span className="text-xs text-slate-400 line-through">{formatCurrency(product.price)}</span>
                        ) : null}
                      </div>
                      {sections.showCart ? (
                        <Button
                          size="sm"
                          className="w-full rounded-full text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ backgroundColor: primary }}
                          disabled={product.stock <= 0}
                          onClick={(e) => {
                            e.preventDefault();
                            addPreviewToCart({
                              id: product.id, name: product.name, image: product.image,
                              basePrice: product.price, offerPrice: product.offerPrice, stock: product.stock,
                            });
                          }}
                        >
                          {product.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
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
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" style={{ color: primary }} />
                          {[config.address.street, config.address.city].filter(Boolean).join(', ')}
                        </span>
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
