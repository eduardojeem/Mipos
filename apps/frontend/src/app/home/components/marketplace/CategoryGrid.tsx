"use client";

import { motion } from 'framer-motion';
import { Layers3, ArrowRight } from 'lucide-react';
import type { GlobalCategoryCard } from '@/lib/public-site/data';

interface CategoryGridProps {
  categories: GlobalCategoryCard[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {categories.map((category, index) => (
        <motion.article
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 p-8 shadow-sm transition-all backdrop-blur-sm hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5 dark:border-slate-800/80 dark:bg-slate-950/65 dark:hover:bg-slate-950 dark:hover:shadow-emerald-950/25"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition-transform group-hover:scale-110 group-hover:bg-emerald-600 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-950/30 dark:group-hover:bg-emerald-400">
            <Layers3 className="h-5 w-5" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-950 dark:text-slate-100">{category.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {category.productCount} productos visibles en {category.organizationCount} empresas activas.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600 opacity-0 transition-all group-hover:opacity-100 dark:text-emerald-300">
            Explorar ahora
            <ArrowRight className="h-3 w-3" />
          </div>
        </motion.article>
      ))}
    </div>
  );
}
