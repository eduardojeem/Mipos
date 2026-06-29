"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, UtensilsCrossed, Layers3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GlobalCategoryCard } from '@/lib/public-site/data';
import { trackCategoryEvent } from '@/hooks/use-track-category';

// Mapa de iconos disponibles de lucide-react para marketplace_categories
const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Laptop,
  Shirt,
  ShoppingCart,
  Pill,
  Sparkles,
  Home,
  Dumbbell,
  BookOpen,
  Briefcase,
  Car,
  Gamepad2,
  PawPrint,
  Hammer,
  Store,
  Layers3,
};

type CategoryGridItem = GlobalCategoryCard & {
  key?: string;
  href?: string;
  slug?: string;
  icon?: string | null;
  color?: string;
  is_featured?: boolean;
  shareOfProducts?: number;
};

interface CategoryGridProps {
  categories: CategoryGridItem[];
}

function toCategoryKey(value: string): string {
  return String(value || 'sin-categoria')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-categoria';
}

function resolveHref(category: CategoryGridItem) {
  if (category.href) return category.href;
  const key = category.slug || category.key || toCategoryKey(category.name);
  return `/home/catalogo?category=${encodeURIComponent(key)}`;
}

function resolveIcon(iconName?: string | null): LucideIcon {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  return Layers3;
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="mt-8 flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {categories.map((category, index) => {
        const Icon = resolveIcon(category.icon);
        const color = category.color || '#10b981';

        return (
          <Link
            key={category.id}
            href={resolveHref(category)}
            className="block shrink-0"
            onClick={() => {
              const slug = category.slug || category.key;
              if (slug) trackCategoryEvent(slug, 'click');
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index, 15) * 0.03 }}
              className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {category.name}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {category.productCount}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

