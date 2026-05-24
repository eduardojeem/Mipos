"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, MapPin, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductImagePlaceholder } from '@/components/products/ProductImagePlaceholder';
import type { GlobalProductCard } from '@/lib/public-site/data';
import { cn } from '@/lib/utils';
import {
  formatMarketplaceCurrency,
  normalizeMarketplaceHref,
  buildProductDetailHref,
} from './marketplace-utils';

interface ProductGridProps {
  products: GlobalProductCard[];
  className?: string;
}

function hasProductImage(image?: string | null) {
  const src = String(image || '').trim();
  return Boolean(src) && !src.startsWith('/api/placeholder/');
}

function shouldBypassImageOptimizer(image?: string | null) {
  const src = String(image || '');
  return src.includes('images.unsplash.com');
}

function GlobalProductImage({ product }: { product: GlobalProductCard }) {
  const [imageError, setImageError] = useState(false);
  const showImage = hasProductImage(product.image) && !imageError;

  if (!showImage) {
    return <ProductImagePlaceholder productName={product.name} className="absolute inset-0 rounded-none border-0" />;
  }

  return (
    <Image
      src={product.image}
      alt={product.name}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      loading="lazy"
      unoptimized={shouldBypassImageOptimizer(product.image)}
      onError={() => setImageError(true)}
    />
  );
}

export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <div className={cn('mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3', className)}>
      {products.map((product, index) => {
        const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.basePrice);
        const discountLabel =
          hasOffer && Number(product.discountPercentage || 0) > 0
            ? `Ahorra ${Math.round(Number(product.discountPercentage || 0))}%`
            : 'En oferta';
        const detailHref = buildProductDetailHref(product);
        const organizationHref = normalizeMarketplaceHref(product.organizationHref);

        return (
          <motion.article
            key={product.id}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(index, 9) * 0.04 }}
            className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:shadow-slate-950/40"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
              <GlobalProductImage product={product} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                {hasOffer ? (
                  <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-500">
                    <Tag className="mr-1 h-3 w-3" />
                    Oferta
                  </Badge>
                ) : null}
                <Badge className="bg-slate-950/75 text-white hover:bg-slate-950 dark:bg-slate-950/90">
                  {Number(product.stockQuantity || 0) > 0 ? 'Disponible' : 'Sin stock'}
                </Badge>
              </div>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {product.categoryName}
                </Badge>
                {product.brand ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-200"
                  >
                    {product.brand}
                  </Badge>
                ) : null}
              </div>

              <Link href={detailHref} className="block">
                <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300">
                  {product.name}
                </h3>
              </Link>
              {product.description ? (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {product.description}
                </p>
              ) : null}

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  {hasOffer ? (
                    <>
                      <p className="text-xs text-slate-400 line-through dark:text-slate-500">
                        {formatMarketplaceCurrency(product.basePrice)}
                      </p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        {formatMarketplaceCurrency(product.offerPrice || product.basePrice)}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {discountLabel}
                      </p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {formatMarketplaceCurrency(product.basePrice)}
                    </p>
                  )}
                </div>
                <Link href={detailHref}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-slate-200 font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    Ver
                  </Button>
                </Link>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Link
                  href={organizationHref}
                  className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-medium">{product.organizationName}</span>
                  {product.city ? (
                    <>
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{product.city}</span>
                    </>
                  ) : null}
                </Link>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
