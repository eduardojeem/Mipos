"use client";

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeaturedProduct } from '../data/homeData';
import { BusinessConfig } from '@/types/business-config';
import { ProductCard } from './ProductCard';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { memo, useMemo } from 'react';

interface FeaturedProductsSectionProps {
  products: FeaturedProduct[];
  config: BusinessConfig;
}

function FeaturedProductsSectionComponent({ products, config }: FeaturedProductsSectionProps) {
  const list = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const primary = config?.branding?.primaryColor || '#ec4899';
  const secondary = config?.branding?.secondaryColor || '#9333ea';
  const { addToCart } = useCatalogCart();
  const formatCurrency = useCurrencyFormatter();

  return (
    <section id="productos" className="py-20 relative">
      {/* Fondo con patrón sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(139_92_246/0.05)_1px,transparent_0)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <Badge
            className="text-white mb-4 shadow-lg shadow-violet-500/20 border-0 animate-pulse"
            style={{ backgroundImage: `linear-gradient(to right, ${primary}, ${secondary})` }}
          >
            ⭐ Productos Destacados
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-black mb-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Los Más Vendidos
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Descubre los productos favoritos de nuestros clientes. Calidad garantizada.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {list.map((product, idx) => {
            const discountPercent = product.discount ||
              (product.originalPrice > product.price
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0);

            return (
              <ProductCard
                key={`${product.id}-${product.name}-${idx}`}
                product={{
                  id: String(product.id),
                  name: product.name,
                  image: product.image,
                  basePrice: product.originalPrice,
                  offerPrice: product.price,
                  discountPercent,
                  stock: product.stock ?? 999,
                  isActive: true,
                }}
                onAddToCart={addToCart}
                formatCurrency={formatCurrency}
              />
            );
          })}
        </div>

        {/* Botón CTA */}
        <div className="text-center mt-12">
          <Link href="/catalog">
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] hover:bg-right text-white shadow-2xl shadow-violet-500/50 transition-all duration-500 hover:shadow-fuchsia-500/50 hover:scale-105 rounded-full"
            >
              Ver Todos los Productos →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export const FeaturedProductsSection = memo(FeaturedProductsSectionComponent);
export default FeaturedProductsSection;
