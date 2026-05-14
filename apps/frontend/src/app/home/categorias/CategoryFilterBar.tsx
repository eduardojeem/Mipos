'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GlobalCategoriesSortMode } from '@/lib/public-site/global-categories-data';

const SORT_OPTIONS: Array<{ value: GlobalCategoriesSortMode; label: string }> = [
  { value: 'products', label: 'Más productos' },
  { value: 'companies', label: 'Más empresas' },
  { value: 'name', label: 'A–Z' },
];

interface CategoryFilterBarProps {
  search: string;
  sortBy: GlobalCategoriesSortMode;
  visibleCategories: number;
  categorizedProducts: number;
  uncategorizedProducts: number;
}

export function CategoryFilterBar({
  search,
  sortBy,
  visibleCategories,
  categorizedProducts,
  uncategorizedProducts,
}: CategoryFilterBarProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const hasActiveFilters = Boolean(search) || sortBy !== 'products';

  function buildHref(overrides: { search?: string; sortBy?: GlobalCategoriesSortMode }) {
    const sp = new URLSearchParams();
    const s = overrides.search !== undefined ? overrides.search : search;
    const sort = overrides.sortBy ?? sortBy;
    if (s) sp.set('search', s);
    if (sort !== 'products') sp.set('sort', sort);
    const qs = sp.toString();
    return qs ? `/home/categorias?${qs}` : '/home/categorias';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildHref({ search: inputValue.trim() }));
  }

  function handleClearSearch() {
    setInputValue('');
    router.push(buildHref({ search: '' }));
  }

  function handleSort(value: GlobalCategoriesSortMode) {
    router.push(buildHref({ sortBy: value }));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Buscar categoría..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {inputValue ? (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Sort pills */}
          <div
            role="group"
            aria-label="Ordenar por"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSort(opt.value)}
                aria-pressed={sortBy === opt.value}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  sortBy === opt.value
                    ? 'bg-slate-950 text-white shadow-sm dark:bg-emerald-500 dark:text-slate-950'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search button + clear all */}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="h-11 rounded-lg bg-slate-950 px-5 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              Buscar
            </Button>
            {hasActiveFilters ? (
              <Link href="/home/categorias" aria-label="Limpiar todos los filtros">
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {/* Summary row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{visibleCategories}</span>{' '}
          categorías activas
        </span>
        <span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{categorizedProducts}</span>{' '}
          productos clasificados
        </span>
        {uncategorizedProducts > 0 ? (
          <span className="text-amber-600 dark:text-amber-400">
            {uncategorizedProducts} sin categoría
          </span>
        ) : null}
        <Link
          href="/home/catalogo"
          className="ml-auto flex items-center gap-1.5 font-medium text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"
        >
          Ver catálogo completo
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
