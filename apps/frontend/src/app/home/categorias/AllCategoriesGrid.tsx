'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, PackageSearch, ArrowRight, Store, Laptop, Shirt,
  ShoppingCart, Pill, Sparkles, Home, Dumbbell, BookOpen,
  Briefcase, Car, Gamepad2, PawPrint, Hammer, UtensilsCrossed, Layers3
} from 'lucide-react';
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

interface AllCategoriesGridProps {
  categories: GlobalCategoryExplorerItem[];
}

export function AllCategoriesGrid({ categories }: AllCategoriesGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((cat, index) => {
        const Icon = resolveIcon(cat.icon);
        const color = cat.color || '#10b981';

        return (
          <Link
            key={cat.id}
            href={`/home/categorias/${cat.slug}`}
            onClick={() => trackCategoryEvent(cat.slug, 'click')}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 24) * 0.03 }}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              style={{ borderLeftColor: color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center gap-3">
                {/* Icon wrapper */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color }} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold tracking-tight text-slate-900 group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400">
                    {cat.name}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Building2 className="h-3 w-3" />
                      {cat.organizationCount} {cat.organizationCount === 1 ? 'empresa' : 'empresas'}
                    </span>
                    <span className="h-2 w-px bg-slate-200 dark:bg-slate-800" />
                    <span className="flex items-center gap-0.5">
                      <PackageSearch className="h-3 w-3" />
                      {cat.productCount} {cat.productCount === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-slate-700 dark:group-hover:text-emerald-400" />
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
