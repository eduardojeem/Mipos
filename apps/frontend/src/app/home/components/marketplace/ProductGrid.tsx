"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GlobalProductCard } from '@/lib/public-site/data';

interface ProductGridProps {
  products: GlobalProductCard[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => (
        <motion.article
          key={product.id}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className="group overflow-hidden rounded-[2.5rem] border border-white/70 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200 dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-[0_28px_80px_-55px_rgba(15,23,42,0.95)] dark:hover:shadow-blue-950/40"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute right-4 top-4 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <Badge className="bg-white/90 text-slate-950 backdrop-blur-sm hover:bg-white dark:bg-slate-950/85 dark:text-slate-100 dark:hover:bg-slate-900">
                Ver detalles
              </Badge>
            </div>
          </div>
          <div className="relative p-8">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {product.categoryName}
              </Badge>
              {product.brand && (
                <Badge
                  variant="outline"
                  className="rounded-full border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/60 dark:text-blue-200"
                >
                  {product.brand}
                </Badge>
              )}
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
              {product.name}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {product.description}
            </p>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Precio publico
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-950 dark:text-slate-100">
                    {formatCurrency(product.offerPrice || product.basePrice)}
                  </span>
                  {product.offerPrice && (
                    <span className="text-sm font-medium text-slate-400 line-through dark:text-slate-500">
                      {formatCurrency(product.basePrice)}
                    </span>
                  )}
                </div>
              </div>
              <a href={product.organizationHref}>
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl border-slate-200 px-6 font-bold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Ver tienda
                </Button>
              </a>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-100/50 bg-slate-50/50 p-4 transition-colors group-hover:border-blue-100/50 group-hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900/80 dark:group-hover:border-blue-900/60 dark:group-hover:bg-blue-950/25">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:shadow-none">
                <Building2 className="h-4 w-4 text-slate-400 group-hover:text-blue-500 dark:text-slate-500 dark:group-hover:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                  Empresa
                </span>
                <span className="line-clamp-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                  {product.organizationName}
                </span>
              </div>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
