'use client';

import Link from 'next/link';
import { ArrowLeft, Store, Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, UtensilsCrossed, Layers3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActiveMarketplaceCategory } from '@/lib/public-site/global-catalog-data';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Laptop, Shirt, ShoppingCart, Pill, Sparkles,
  Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, Store, Layers3,
};

function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : Store;
}

interface CatalogCategoryBannerProps {
  category: ActiveMarketplaceCategory;
  productCount: number;
  organizationCount: number;
}

export function CatalogCategoryBanner({ category, productCount, organizationCount }: CatalogCategoryBannerProps) {
  const Icon = resolveIcon(category.icon);

  return (
    <div
      className="mb-8 overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/60"
      style={{ background: `linear-gradient(135deg, ${category.color}15 0%, transparent 70%)` }}
    >
      <div className="px-5 py-4 sm:px-6">
        <Link
          href="/home/categorias"
          className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors dark:text-slate-400"
        >
          <ArrowLeft className="h-3 w-3" />
          Todos los rubros
        </Link>

        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md"
            style={{ backgroundColor: category.color }}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {category.name}
            </h2>
            {category.description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                {category.description}
              </p>
            )}
          </div>

          <div className="hidden sm:flex shrink-0 items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <span className="font-bold text-slate-900 dark:text-white">{productCount}</span> productos
            </span>
            <span>
              <span className="font-bold text-slate-900 dark:text-white">{organizationCount}</span> empresas
            </span>
            <Link
              href={`/home/categorias/${category.slug}`}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400"
            >
              Ver rubro →
            </Link>
          </div>
        </div>
      </div>

      <div className="h-1 w-full" style={{ backgroundColor: category.color }} />
    </div>
  );
}
