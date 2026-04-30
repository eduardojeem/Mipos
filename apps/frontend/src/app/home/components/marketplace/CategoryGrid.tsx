"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Layers3, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GlobalCategoryCard } from '@/lib/public-site/data';

type CategoryGridItem = GlobalCategoryCard & {
  key?: string;
  href?: string;
  shareOfProducts?: number;
};

interface CategoryGridProps {
  categories: CategoryGridItem[];
}

function toCategoryKey(value: string): string {
  return String(value || 'sin-categoria')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-categoria';
}

function resolveHref(category: CategoryGridItem) {
  if (category.href) {
    return category.href;
  }

  const key = category.key || toCategoryKey(category.name);
  return `/home/catalogo?category=${encodeURIComponent(key)}`;
}

function resolveCoverage(category: CategoryGridItem) {
  if (typeof category.shareOfProducts === 'number' && Number.isFinite(category.shareOfProducts)) {
    return `${Math.max(0, Math.round(category.shareOfProducts * 100))}% del catalogo visible`;
  }

  return `${category.productCount} productos publicados`;
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category, index) => (
        <Link key={category.id} href={resolveHref(category)} className="block">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="group h-full overflow-hidden rounded-lg border border-slate-200/80 bg-white/85 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:border-emerald-900/70 dark:hover:shadow-emerald-950/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg transition-transform group-hover:scale-105 group-hover:bg-emerald-600 dark:bg-emerald-500 dark:text-slate-950 dark:group-hover:bg-emerald-400">
                <Layers3 className="h-5 w-5" />
              </div>

              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {resolveCoverage(category)}
              </Badge>
            </div>

            <h3 className="mt-6 text-xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300">
              {category.name}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Entra al catalogo filtrado y compara publicaciones activas de este rubro sin salir del
              marketplace.
            </p>

            <div className="mt-6 grid gap-3 rounded-lg border border-slate-100/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
                  <PackageSearch className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Productos
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {category.productCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
                  <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Empresas
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {category.organizationCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-700 transition-colors group-hover:text-emerald-600 dark:text-emerald-300 dark:group-hover:text-emerald-200">
              Ver productos del rubro
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </motion.article>
        </Link>
      ))}
    </div>
  );
}
