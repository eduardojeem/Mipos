"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, PackageCheck, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GlobalProductCard } from '@/lib/public-site/data';
import { cn } from '@/lib/utils';

interface ProductGridProps {
  products: GlobalProductCard[];
  className?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <div className={cn('mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3', className)}>
      {products.map((product, index) => {
        const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.basePrice);
        const discountLabel =
          hasOffer && Number(product.discountPercentage || 0) > 0
            ? `Ahorra ${Math.round(Number(product.discountPercentage || 0))}%`
            : 'Precio en oferta';

        return (
        <motion.article
          key={product.id}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className="group overflow-hidden rounded-lg border border-slate-200/80 bg-white/95 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:shadow-slate-950/40"
        >
          <Link href={product.organizationHref} className="block">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {hasOffer ? (
                  <Badge className="bg-emerald-400/90 text-slate-950 hover:bg-emerald-400">
                    <Tag className="mr-1.5 h-3 w-3" />
                    Oferta
                  </Badge>
                ) : null}
                <Badge className="bg-slate-950/80 text-white hover:bg-slate-950 dark:bg-slate-950/90">
                  {Number(product.stockQuantity || 0) > 0 ? 'Disponible' : 'Sin stock'}
                </Badge>
              </div>
            </div>
          </Link>

          <div className="relative p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {product.categoryName}
              </Badge>
              {product.brand && (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  {product.brand}
                </Badge>
              )}
            </div>

            <Link href={product.organizationHref} className="block">
              <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300">
                {product.name}
              </h3>
            </Link>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {product.description}
            </p>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Precio publico
                </span>
                {hasOffer ? (
                  <>
                    <div className="flex items-end gap-3">
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(product.offerPrice || product.basePrice)}
                      </span>
                      <div className="flex flex-col pb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Antes
                        </span>
                        <span className="text-sm font-medium text-slate-400 line-through dark:text-slate-500">
                          {formatCurrency(product.basePrice)}
                        </span>
                      </div>
                    </div>
                    <span className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {discountLabel}
                    </span>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-950 dark:text-slate-100">
                      {formatCurrency(product.basePrice)}
                    </span>
                  </div>
                )}
              </div>
              <Link href={product.organizationHref}>
                <Button
                  variant="outline"
                  className="h-11 rounded-lg border-slate-200 px-5 font-bold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Ver tienda
                </Button>
              </Link>
            </div>

            <div className="mt-6 grid gap-3 rounded-lg border border-slate-100/60 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:shadow-none">
                  <Building2 className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-400" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Empresa
                  </span>
                  <span className="line-clamp-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                    {product.organizationName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:shadow-none">
                  <PackageCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Stock
                  </span>
                  <span className="line-clamp-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                    {Number(product.stockQuantity || 0) > 0
                      ? `${Number(product.stockQuantity || 0)} unidades`
                      : 'Consultar disponibilidad'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.article>
        );
      })}
    </div>
  );
}
