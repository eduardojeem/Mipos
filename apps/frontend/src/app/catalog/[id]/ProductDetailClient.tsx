'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Heart, ShoppingCart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { formatPrice } from '@/utils/formatters';
import { NavBar } from '@/app/home/components/NavBar';
import { Footer } from '@/app/home/components/Footer';
import PageHero from '@/components/public-tenant/PageHero';
import { getTenantPublicContent, getTenantPublicSections } from '@/lib/public-site/tenant-public-config';
import { getProductPricing } from '@/lib/public-site/product-pricing';
import type { Product } from '@/types';

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { toast } = useToast();
  const { config } = useBusinessConfig();
  const { addToCart } = useCatalogCart();
  const { tenantHref } = useTenantPublicRouting();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const canUseCart = sections.showCart;
  const pricing = getProductPricing(product);

  const addToCartWithQuantity = () => {
    const qty = Math.max(1, Math.min(quantity, Number(product.stock_quantity || 1)));
    addToCart({
      id: String(product.id || ''),
      name: String(product.name || 'Producto'),
      sale_price: Number(product.sale_price || 0),
      offer_price: Number((product as any).offer_price ?? NaN) > 0 ? Number((product as any).offer_price) : undefined,
      image_url: String(product.image_url || ''),
      stock_quantity: Number(product.stock_quantity ?? 999),
      is_active: (product as any).is_active ?? true,
    } as any, qty);
    toast({ title: 'Producto agregado', description: `${product.name} x${qty} se agrego al carrito.` });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavBar config={config} activeSection="catalogo" onNavigate={(section) => window.location.assign(tenantHref(`/home#${section}`))} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          config={config}
          badge={content.catalogTitle || 'Detalle'}
          title={product.name}
          description={product.description || 'Producto publicado dentro del catalogo publico del tenant actual.'}
          actions={[
            { href: '/catalog', label: 'Volver al catalogo', variant: 'secondary' },
            ...(sections.showOffers ? [{ href: '/offers', label: 'Ver ofertas', variant: 'primary' as const }] : []),
          ]}
          metrics={[
            { label: 'Precio', value: formatPrice(pricing.displayPrice, config), helpText: 'Monto visible para clientes finales.' },
            { label: 'Stock', value: product.stock_quantity > 0 ? product.stock_quantity : 'Sin stock', helpText: 'Disponibilidad actual.' },
          ]}
        />

        <div className="mt-8">
          <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/92 shadow-sm">
            <div className="grid gap-8 md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-[340px] bg-slate-100">
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="50vw" />
                ) : null}
              </div>

              <CardContent className="space-y-6 p-6 lg:p-8">
                <div>
                  <div className="flex items-center gap-2">
                    {product.category_id ? <Badge variant="outline">Catalogo publico</Badge> : null}
                    {product.stock_quantity <= 5 && product.stock_quantity > 0 ? <Badge className="border-0 bg-amber-500 text-white">Ultimas unidades</Badge> : null}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-950">{product.name}</h2>
                  {product.rating ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {product.rating.toFixed(1)}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-end gap-3">
                  <p className="text-4xl font-semibold text-slate-950">{formatPrice(pricing.displayPrice, config)}</p>
                  {pricing.compareAtPrice ? (
                    <p className="text-lg text-slate-500 line-through">{formatPrice(pricing.compareAtPrice, config)}</p>
                  ) : null}
                  {pricing.hasDiscount ? (
                    <Badge className="border-0 bg-rose-600 text-white">-{pricing.discountPercent}%</Badge>
                  ) : null}
                </div>

                <div className="rounded-[28px] bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-950">Disponibilidad</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {product.stock_quantity > 0 ? `${product.stock_quantity} unidades disponibles.` : 'Producto agotado por el momento.'}
                  </p>
                </div>

                {canUseCart ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-950">Cantidad</span>
                      <Input
                        type="number"
                        min="1"
                        max={product.stock_quantity}
                        value={quantity}
                        onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value || 1), Number(product.stock_quantity || 1))))}
                        className="w-24"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" disabled={product.stock_quantity <= 0} onClick={addToCartWithQuantity}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Agregar al carrito
                      </Button>
                      <Button variant="outline" className="rounded-full" onClick={() => setIsFavorite((value) => !value)}>
                        <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        {isFavorite ? 'Guardado' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href={tenantHref('/catalog')}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al catalogo
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </main>

      <Footer config={config} onNavigate={(sectionId) => window.location.assign(tenantHref(`/home#${sectionId}`))} />
    </div>
  );
}
