'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, PackageSearch, ArrowRight, Store, Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, UtensilsCrossed, Layers3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GlobalCategoryExplorerItem } from '@/lib/public-site/global-categories-data';
import { trackCategoryEvent } from '@/hooks/use-track-category';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Laptop, Shirt, ShoppingCart, Pill, Sparkles,
  Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, Store, Layers3,
};

function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : Store;
}

interface FeaturedCategoriesRowProps {
  categories: GlobalCategoryExplorerItem[];
}

export function FeaturedCategoriesRow({ categories }: FeaturedCategoriesRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat, index) => {
        const Icon = resolveIcon(cat.icon);
        const color = cat.color || '#10b981';

        return (
          <Link key={cat.id} href={`/home/categorias/${cat.slug}`} onClick={() => trackCategoryEvent(cat.slug, 'click')}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-950"
              style={{ borderTopColor: color, borderTopWidth: 3 }}
            >
              {/* Background glow */}
              <div
                className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: color }}
              />

              <div className="relative flex items-start justify-between gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {cat.organizationCount} {cat.organizationCount === 1 ? 'empresa' : 'empresas'}
                  </p>
                </div>
              </div>

              <h3 className="relative mt-4 text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300">
                {cat.name}
              </h3>

              <div className="relative mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <PackageSearch className="h-3 w-3" />
                    {cat.productCount} productos
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {cat.organizationCount}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-emerald-600 dark:text-slate-600 dark:group-hover:text-emerald-400" />
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
