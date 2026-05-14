'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, MapPin, Search, X } from 'lucide-react';
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
}

export function OrganizationsFilterBar({
  search,
  sortBy,
  department,
  city,
  departments,
  cities,
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: search + sort pills */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Buscar empresa..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
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
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => router.push(buildHref({ sortBy: opt.value }))}
                aria-pressed={sortBy === opt.value}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  sortBy === opt.value
                    ? 'bg-slate-950 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: department + city + buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Department */}
          <div className="relative flex-1">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={department}
              onChange={(e) => router.push(buildHref({ department: e.target.value, city: '' }))}
              className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="Filtrar por departamento"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={city}
              onChange={(e) => router.push(buildHref({ city: e.target.value }))}
              className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="Filtrar por ciudad"
            >
              <option value="">Todas las ciudades</option>
              {cities.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          {/* Buscar + limpiar */}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="h-11 rounded-lg bg-slate-950 px-5 text-white hover:bg-sky-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              Buscar
            </Button>
            {hasActiveFilters ? (
              <Link href="/home/empresas" aria-label="Limpiar todos los filtros">
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      <div className="mt-4 flex justify-end">
        <Link
          href="/home/catalogo"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"
        >
          Ver catálogo global
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
