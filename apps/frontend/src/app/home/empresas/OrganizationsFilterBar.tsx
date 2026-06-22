'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, ChevronDown, LayoutList, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GlobalOrganizationsSortMode } from '@/lib/public-site/global-organizations-data';

const SORT_OPTIONS: Array<{ value: GlobalOrganizationsSortMode; label: string }> = [
  { value: 'featured', label: 'Destacadas' },
  { value: 'products', label: 'Más productos' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'name', label: 'A–Z' },
];

interface DepartmentOption {
  value: string;
  label: string;
  count: number;
}

interface CityOption {
  value: string;
  label: string;
  count: number;
}

interface OrganizationsFilterBarProps {
  search: string;
  sortBy: GlobalOrganizationsSortMode;
  department: string;
  city: string;
  departments: DepartmentOption[];
  cities: CityOption[];
  /** Total de empresas que coinciden con los filtros actuales */
  resultCount?: number;
}

export function OrganizationsFilterBar({
  search,
  sortBy,
  department,
  city,
  departments,
  cities,
  resultCount,
}: OrganizationsFilterBarProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const hasActiveFilters =
    Boolean(search) ||
    sortBy !== 'featured' ||
    Boolean(department) ||
    Boolean(city);

  function buildHref(overrides: {
    search?: string;
    sortBy?: GlobalOrganizationsSortMode;
    department?: string;
    city?: string;
  }) {
    const sp = new URLSearchParams();
    const s = overrides.search !== undefined ? overrides.search : search;
    const sort = overrides.sortBy ?? sortBy;
    const dept = overrides.department !== undefined ? overrides.department : department;
    const ct = overrides.city !== undefined ? overrides.city : city;
    if (s) sp.set('search', s);
    if (sort !== 'featured') sp.set('sort', sort);
    if (dept) sp.set('department', dept);
    if (ct) sp.set('city', ct);
    const qs = sp.toString();
    return qs ? `/home/empresas?${qs}` : '/home/empresas';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildHref({ search: inputValue.trim() }));
  }

  function handleClearSearch() {
    setInputValue('');
    router.push(buildHref({ search: '' }));
  }

  const resultLabel =
    resultCount !== undefined
      ? resultCount === 1
        ? '1 empresa'
        : `${resultCount} empresas`
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
      {/* Header del filtro */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <SlidersHorizontal className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Filtrar directorio
        </span>
        {hasActiveFilters && (
          <Link
            href="/home/empresas"
            className="ml-auto flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Limpiar todos los filtros"
          >
            <X className="h-3 w-3" />
            Limpiar
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Buscador */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Buscá por nombre, rubro o ciudad..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/8 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-950"
          />
          {inputValue ? (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Segunda fila: ubicación + ordenamiento + buscar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Departamento */}
          <div className="relative flex-1">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={department}
              onChange={(e) => router.push(buildHref({ department: e.target.value, city: '' }))}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="Filtrar por departamento"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Ciudad */}
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={city}
              onChange={(e) => router.push(buildHref({ city: e.target.value }))}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="Filtrar por ciudad"
            >
              <option value="">Todas las ciudades</option>
              {cities.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Botón buscar */}
          <Button
            type="submit"
            className="h-11 shrink-0 rounded-xl bg-slate-950 px-6 text-white hover:bg-sky-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            Buscar
          </Button>
        </div>

        {/* Pills de ordenamiento */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <LayoutList className="h-3.5 w-3.5" />
            Ordenar:
          </span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => router.push(buildHref({ sortBy: opt.value }))}
              aria-pressed={sortBy === opt.value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                sortBy === opt.value
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </form>

      {/* Footer: resultado + link catálogo */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        {resultLabel ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasActiveFilters ? (
              <>
                <span className="font-bold text-slate-900 dark:text-white">{resultLabel}</span>
                {' '}encontrada{resultCount === 1 ? '' : 's'}
              </>
            ) : (
              <>
                <span className="font-bold text-slate-900 dark:text-white">{resultLabel}</span>
                {' '}en el directorio
              </>
            )}
          </p>
        ) : (
          <span />
        )}

        <Link
          href="/home/catalogo"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"
        >
          Ver catálogo global
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
