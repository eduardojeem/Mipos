"use client";

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { NavBar } from './components/NavBar';
import { HeroSection } from './components/HeroSection';
import { Carousel } from './components/Carousel';
import SectionSkeleton from './components/SectionSkeleton';
import { type SpecialOffer, type FeaturedProduct } from './data/homeData';

// Lazy load Footer (not critical for initial render)
const Footer = dynamic(
  () => import('./components/Footer').then(m => ({ default: m.Footer })),
  { ssr: false }
);

// Lazy load modal (only when needed)
const ExistingOffersModal = dynamic(
  () => import('@/components/promotions/ExistingOffersModal'),
  { ssr: false }
);
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { calculateOfferPrice } from '@/lib/offers/calculations';
import { useCatalogCart } from '@/hooks/useCatalogCart';



const FeaturedProductsSection = dynamic(
  () => import('./components/FeaturedProductsSection').then(m => m.FeaturedProductsSection),
  { loading: () => <SectionSkeleton title="Productos" /> }
);

const ContactSection = dynamic(() => import('./components/ContactSection').then(m => m.ContactSection), {
  loading: () => <SectionSkeleton title="Contacto" />,
});

const LocationSection = dynamic(
  () => import('./components/LocationSection').then(m => m.LocationSection),
  { loading: () => <SectionSkeleton title="Ubicación" /> }
);

import { useBrandingColors } from '@/hooks/useBrandingColors';

export default function HomeClient() {
  const [activeSection, setActiveSection] = useState('inicio');
  const { config, persisted } = useBusinessConfig();
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [topProducts, setTopProducts] = useState<FeaturedProduct[]>([]);
  const [stats, setStats] = useState<{ products: number; customers: number; sales: number; imageUrl?: string }>({ products: 0, customers: 0, sales: 0 });

  // Hook centralizado de colores
  const {
    primary, secondary, accent, gradientStart, gradientEnd,
    backgroundColor, textColor, focusRingHsl, bgHsl, textHsl,
    gradStart05, gradEnd05
  } = useBrandingColors();

  // Evitar mismatch de hidratación: render estable entre SSR y cliente
  // Inicialmente no mostramos avisos dependientes de localStorage hasta que el cliente monte.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync variables with global theme changes (light/dark)
  useEffect(() => {
    // When theme toggles globally (via next-themes), our variables remain valid
    // because we set explicit colors. If needed, adjust contrast here.
    // For now, rely on global shadcn tokens and our text/background choices.
  }, [config?.branding]);

  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const { addToCart } = useCatalogCart();
  const [publicOffers, setPublicOffers] = useState<any[]>([]);
  const supabase = createClient();
  useEffect(() => {
    let cancelled = false;
    const loadOffers = async () => {
      try {
        const res = await api.get('/promotions/offers-products');
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped: SpecialOffer[] = arr.map((p: any) => {
          const title = String(p?.name || 'Producto en oferta');
          const sale = Number(p?.salePrice || 0);
          const offer = p?.offerPrice != null ? Number(p.offerPrice) : null;
          const promoName = String(p?.promotion?.name || '').trim();
          const descBase = offer != null
            ? `Antes ${formatCurrency(sale)}, ahora ${formatCurrency(offer)}`
            : `Precio ${formatCurrency(sale)}`;
          const description = promoName ? `${descBase} — ${promoName}` : descBase;
          const validUntil = String(p?.promotion?.endDate || '').split('T')[0] || '';
          const image = typeof p?.image === 'string' && p.image.trim().length > 0
            ? p.image
            : '/api/placeholder/400/200';
          return { title, description, validUntil, image };
        });
        if (!cancelled) setSpecialOffers(mapped);
      } catch (e) {
        // Mantener silencioso en Home; se mostrarán cards vacías si falla
      }
    };
    const loadPublicOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('promotions_products')
          .select(`
            product:products(id,name,sale_price,image_url,images,category_id),
            promotions(id,name,discount_type,discount_value,start_date,end_date,is_active)
          `)
          .limit(8);
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        const mapped = rows
          .filter((r: any) => r?.promotions?.is_active)
          .map((r: any) => {
            const base = Number(r?.product?.sale_price || 0);
            const promo = r?.promotions ? {
              id: String(r.promotions.id),
              name: String(r.promotions.name || ''),
              discountType: String(r.promotions.discount_type || 'PERCENTAGE'),
              discountValue: r.promotions.discount_value != null ? Number(r.promotions.discount_value) : undefined,
              startDate: r.promotions.start_date || undefined,
              endDate: r.promotions.end_date || undefined,
              isActive: !!r.promotions.is_active
            } : null;
            const calc = calculateOfferPrice(base, promo as any);
            return {
              product: {
                id: r?.product?.id,
                name: r?.product?.name,
                images: Array.isArray(r?.product?.images) ? r.product.images : undefined,
                image: r?.product?.image_url || undefined,
              },
              basePrice: calc.basePrice,
              offerPrice: calc.offerPrice,
              discountPercent: calc.discountPercent,
              promotion: promo
            };
          });
        if (!cancelled) setPublicOffers(mapped);
      } catch { }
    };
    const loadTopProducts = async () => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data: items, error } = await supabase
          .from('sale_items')
          .select('product_id, quantity, created_at')
          .gte('created_at', since.toISOString())
          .limit(500);
        if (error) throw error;
        const totals: Record<string, number> = {};
        (Array.isArray(items) ? items : []).forEach((it: any) => {
          const pid = String(it?.product_id || '');
          const qty = Number(it?.quantity || 0);
          if (pid) totals[pid] = (totals[pid] || 0) + qty;
        });
        const topIds = Object.entries(totals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([pid]) => pid);
        if (topIds.length === 0) {
          if (!cancelled) setTopProducts([]);
          return;
        }
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, sale_price, offer_price, image_url, images, category_id')
          .in('id', topIds);
        const mapped: FeaturedProduct[] = (Array.isArray(prods) ? prods : []).map((p: any) => {
          const base = Number(p?.sale_price || 0);
          const offer = p?.offer_price != null ? Number(p.offer_price) : undefined;
          const image = (Array.isArray(p?.images) && p.images[0]?.url) ? p.images[0].url : (p?.image_url || '/api/placeholder/300/300');
          const discountPct = offer != null && base > 0 ? Math.max(0, Math.round(((base - offer) / base) * 100)) : 0;
          return {
            id: Number.isNaN(Number(p.id)) ? 0 : Number(p.id),
            name: String(p?.name || 'Producto'),
            price: offer ?? base,
            originalPrice: base,
            image,
            rating: 4.5,
            reviews: 0,
            discount: discountPct,
            category: 'Más vendidos',
          };
        });
        if (!cancelled) setTopProducts(mapped);
      } catch {
        if (!cancelled) setTopProducts([]);
      }
    };
    loadOffers();
    loadPublicOffers();
    loadTopProducts();
    return () => { cancelled = true; };
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const [{ count: prodCount }, { count: custCount }, { count: saleCount }] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('sales').select('id', { count: 'exact', head: true }),
        ]);
        const heroImage = Array.isArray(config?.carousel?.images) && config.carousel.images[0]?.url ? config.carousel.images[0].url : (config?.branding?.logo || undefined);
        if (!cancelled) setStats({ products: prodCount || 0, customers: custCount || 0, sales: saleCount || 0, imageUrl: heroImage });
      } catch {
        if (!cancelled) setStats({ products: 0, customers: 0, sales: 0, imageUrl: (config?.branding?.logo || undefined) });
      }
    };
    loadStats();
    return () => { cancelled = true; };
  }, [config]);
  useEffect(() => {
    try {
      const el = document.getElementById('ofertas');
      if (!el) return;
      const clone = el.cloneNode(true) as HTMLElement;
      el.replaceWith(clone);
      clone.remove();
    } catch { }
  }, []);

  useEffect(() => {
    const ids = ['inicio', 'ofertas', 'productos', 'contacto', 'ubicacion'];
    const elements = ids
      .map((id) => ({ id, el: document.getElementById(id) }))
      .filter((x) => !!x.el) as { id: string; el: Element }[];
    if (elements.length === 0) return;
    let current = activeSection;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const found = elements.find((e) => e.el === entry.target);
          if (found && found.id !== current) {
            current = found.id;
            setActiveSection(found.id);
          }
        }
      });
    }, { rootMargin: '0px 0px -60% 0px', threshold: 0.2 });
    elements.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const getTimeRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Finalizada';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} días restantes`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} horas restantes`;
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen home-theme bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-950 dark:via-purple-950/40 dark:to-slate-900 relative overflow-hidden"
      style={{
        // Global tokens used by shadcn classes
        ['--background' as any]: bgHsl,
        ['--foreground' as any]: textHsl,
        ['--ring' as any]: focusRingHsl,
        // Home-specific variables
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
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/4 -right-4 w-[600px] h-[600px] bg-gradient-to-bl from-blue-400/15 via-cyan-400/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-to-tr from-pink-400/10 via-purple-400/10 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        <NavBar config={config} activeSection={activeSection} onNavigate={scrollToSection} />

        {/* Aviso discreto cuando la configuración no está persistida en base de datos */}
        {mounted && !persisted && (
          <div className="mx-4 md:mx-8 mt-2 rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs md:text-sm">
            Usando configuración local en este navegador. No está guardada en base de datos.
          </div>
        )}

        {/* Carrusel de imágenes configurable */}
        {config?.carousel?.enabled && Array.isArray(config?.carousel?.images) && config.carousel.images.length > 0 && (
          <Carousel
            images={config.carousel.images}
            enabled={config.carousel.enabled}
            intervalSec={config.carousel.transitionSeconds}
            ratio={config.carousel.ratio}
            autoplay={config.carousel.autoplay}
            transitionMs={config.carousel.transitionMs}
            branding={config.branding}
          />
        )}

        <HeroSection config={config} onViewOffers={() => scrollToSection('ofertas')} stats={stats} />

        {/* Acceso rápido a ofertas existentes */}
        <div className="mx-4 md:mx-8 mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setIsOffersModalOpen(true)} aria-label="Ver ofertas existentes">
            Ver ofertas existentes
          </Button>
        </div>


        {/* Productos en oferta (público) - PREMIUM DESIGN */}
        {publicOffers.length > 0 && (
          <section className="mx-4 md:mx-8 my-12 animate-slide-up" aria-labelledby="home-public-offers-title">
            {/* Premium Section Header */}
            <div className="text-center mb-12">
              <Badge className="badge-hot mb-4 text-sm px-4 py-2 shadow-xl">
                🔥 Ofertas Limitadas
              </Badge>
              <h2 id="home-public-offers-title" className="text-4xl lg:text-5xl font-black mb-4 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 dark:from-pink-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                Productos en Oferta
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
                Aprovecha estos <strong>descuentos exclusivos</strong> antes de que terminen
              </p>

              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="px-4 py-2" aria-live="polite" role="status">
                  {publicOffers.length} {publicOffers.length === 1 ? 'producto' : 'productos'} disponibles
                </Badge>
                <Link href="/offers?status=active">
                  <Button className="btn-premium-outline">
                    Ver Todas las Ofertas →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Premium Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {publicOffers.map((item, idx) => {
                const img = item?.product?.images?.[0]?.url || item?.product?.image || '/api/placeholder/300/300';
                const name = item?.product?.name || 'Producto';
                const offerPrice = item?.offerPrice ?? item?.product?.sale_price ?? 0;
                const basePrice = item?.basePrice ?? item?.product?.sale_price ?? 0;
                const discountPercent = Math.max(0, Math.round(((basePrice - offerPrice) / (basePrice || 1)) * 100));
                const timeLeft = getTimeRemaining(item?.promotion?.endDate);

                return (
                  <Card key={item?.product?.id ?? idx} className="card-product group border-0 shadow-lg hover:shadow-2xl animate-slide-up">
                    <div className="image-overlay relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width:768px) 50vw, 25vw"
                        loading="lazy"
                      />

                      {/* Premium gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Discount Badge - Premium HOT style */}
                      {discountPercent > 0 && (
                        <div className="absolute top-3 left-3 z-10">
                          <Badge className="badge-hot text-xs font-bold px-3 py-1 shadow-xl">
                            🔥 -{discountPercent}%
                          </Badge>
                        </div>
                      )}

                      {/* Time Remaining Badge - Glassmorphism */}
                      {timeLeft && timeLeft !== 'Finalizada' && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="glass-card text-[10px] font-semibold px-2 py-1 border-0 shadow-lg">
                            <Clock className="w-3 h-3 mr-1" />
                            {timeLeft}
                          </Badge>
                        </div>
                      )}

                      {/* Quick action button on hover */}
                      <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <Button
                          size="sm"
                          className="w-full btn-premium shadow-xl backdrop-blur-sm"
                          onClick={() => {
                            try {
                              const base = Number(basePrice || 0);
                              const offer = Number(offerPrice ?? NaN);
                              const effectiveOffer = offer > 0 && offer < base ? offer : undefined;
                              const productLike: any = {
                                id: String(item?.product?.id || ''),
                                name: String(name),
                                sale_price: base,
                                offer_price: effectiveOffer,
                                image_url: String(img || ''),
                                stock_quantity: Number(item?.product?.stock_quantity ?? 999),
                                is_active: true,
                              };
                              addToCart(productLike as any, 1);
                            } catch { }
                          }}
                          aria-label={`Agregar ${name} al carrito`}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Agregar al Carrito
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4 bg-white dark:bg-slate-800">
                      <h3 className="font-bold text-sm line-clamp-2 mb-2 text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {name}
                      </h3>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-lg font-black bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {formatCurrency(offerPrice)}
                        </span>
                        {basePrice > offerPrice && (
                          <span className="text-xs text-muted-foreground dark:text-slate-400 line-through opacity-75">
                            {formatCurrency(basePrice)}
                          </span>
                        )}
                      </div>

                      {item?.promotion?.name && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-[10px] font-medium border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-400">
                            ✨ {item.promotion.name}
                          </Badge>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-300 hover:scale-105 font-semibold shadow-md hover:shadow-xl group-hover:shadow-purple-500/50"
                        onClick={() => {
                          try {
                            const base = Number(basePrice || 0);
                            const offer = Number(offerPrice ?? NaN);
                            const effectiveOffer = offer > 0 && offer < base ? offer : undefined;
                            const productLike: any = {
                              id: String(item?.product?.id || ''),
                              name: String(name),
                              sale_price: base,
                              offer_price: effectiveOffer,
                              image_url: String(img || ''),
                              stock_quantity: Number(item?.product?.stock_quantity ?? 999),
                              is_active: true,
                            };
                            addToCart(productLike as any, 1);
                          } catch { }
                        }}
                        aria-label={`Agregar ${name} al carrito`}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Comprar Ahora
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {topProducts.length > 0 && <FeaturedProductsSection products={topProducts} config={config} />}

        <ContactSection config={config} />

        <LocationSection config={config} />

        <Footer config={config} onNavigate={scrollToSection} />

        {/* Modal ofertas existentes */}
        <ExistingOffersModal open={isOffersModalOpen} onOpenChange={setIsOffersModalOpen} />
      </div>
      {/* End z-10 wrapper */}
    </div>
  );
}
