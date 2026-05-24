'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  CATALOG_DEFAULT_PAGE,
  CATALOG_DEFAULT_MAX_PRICE,
  CATALOG_DEFAULT_PAGE_SIZE,
  buildCatalogSearchParams,
  type CatalogQueryState,
} from '@/app/catalog/catalog-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { GlobalCatalogCategoryOption, GlobalCatalogLocationOption } from '@/lib/public-site/global-catalog-data';
import { formatMarketplaceCurrency } from './marketplace-utils';

/* ─── Constants ─────────────────────────────────────────────── */
const SORT_OPTIONS: { value: CatalogQueryState['sortBy']; label: string; icon: React.ReactNode }[] = [
  { value: 'popular',    label: 'Más recientes',   icon: <Zap className="h-3.5 w-3.5" /> },
  { value: 'newest',     label: 'Nuevos',           icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: 'price-low',  label: 'Menor precio',     icon: <TrendingDown className="h-3.5 w-3.5" /> },
  { value: 'price-high', label: 'Mayor precio',     icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: 'rating',     label: 'Mejor valorados',  icon: <Star className="h-3.5 w-3.5" /> },
  { value: 'name',       label: 'Nombre A–Z',       icon: null },
];

const SORT_LABELS: Record<CatalogQueryState['sortBy'], string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label])
) as Record<CatalogQueryState['sortBy'], string>;

const PER_PAGE_OPTIONS = [24, 36, 60];
const SEARCH_DEBOUNCE_MS = 420;
const STORAGE_KEY = 'global-catalog-filters';

/* ─── Types ──────────────────────────────────────────────────── */
type PriceDraft = { min: number; max: number };

interface SharedProps {
  state: CatalogQueryState;
  categories: GlobalCatalogCategoryOption[];
  maxPrice: number;
}

interface ToolbarProps extends SharedProps {
  totalProducts: number;
  totalOrganizations: number;
  matchingOrganizations: number;
  countries: GlobalCatalogLocationOption[];
  departments: GlobalCatalogLocationOption[];
  cities: GlobalCatalogLocationOption[];
}

interface PaginationProps {
  state: CatalogQueryState;
  totalProducts: number;
  maxPrice: number;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function resolveMaxPriceValue(raw: number) {
  return Math.max(raw, CATALOG_DEFAULT_MAX_PRICE);
}

function resolveSliderStep(maxPrice: number) {
  if (maxPrice >= 100000) return 5000;
  if (maxPrice >= 10000)  return 1000;
  if (maxPrice >= 1000)   return 100;
  return 10;
}

function countActiveFilters(state: CatalogQueryState) {
  return [
    state.search ? 1 : 0,
    state.categories.length,
    state.onSale ? 1 : 0,
    state.rating ? 1 : 0,
    state.minPrice > 0 ? 1 : 0,
    state.maxPrice !== null ? 1 : 0,
    state.inStock === false ? 1 : 0,
    state.country ? 1 : 0,
    state.department ? 1 : 0,
    state.city ? 1 : 0,
  ].reduce((t, v) => t + v, 0);
}

function useCatalogNavigation(maxPrice: number, scrollOnNavigate = false) {
  const pathname = usePathname();
  const router = useRouter();

  return useCallback((state: CatalogQueryState) => {
    const params = buildCatalogSearchParams(
      {
        ...state,
        maxPrice:
          state.maxPrice !== null && state.maxPrice >= maxPrice
            ? null
            : state.maxPrice,
      },
      { defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE, maxPriceCeiling: maxPrice }
    );
    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(href);
    if (scrollOnNavigate && typeof window !== 'undefined') {
      setTimeout(() => window.scrollTo({ top: 240, behavior: 'smooth' }), 80);
    }
  }, [pathname, router, maxPrice, scrollOnNavigate]);
}

/* ─── FilterSection (collapsible) ───────────────────────────── */
function FilterSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 dark:border-white/8 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200 dark:text-slate-500',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

/* ─── CatalogFiltersForm ─────────────────────────────────────── */
function CatalogFiltersForm({
  state,
  categories,
  maxPrice,
  onApplied,
  className,
}: SharedProps & { onApplied?: () => void; className?: string }) {
  const navigate = useCatalogNavigation(maxPrice);
  const effectiveMaxPrice = resolveMaxPriceValue(maxPrice);

  // Price draft (local, applied on blur/button)
  const [priceDraft, setPriceDraft] = useState<PriceDraft>({
    min: state.minPrice,
    max: state.maxPrice ?? effectiveMaxPrice,
  });
  const [categorySearch, setCategorySearch] = useState('');

  // Sync price draft when state changes externally
  useEffect(() => {
    setPriceDraft({ min: state.minPrice, max: state.maxPrice ?? effectiveMaxPrice });
  }, [state.minPrice, state.maxPrice, effectiveMaxPrice]);

  /* Instant navigate helpers */
  const applyInstant = useCallback((patch: Partial<CatalogQueryState>) => {
    navigate({ ...state, ...patch, page: CATALOG_DEFAULT_PAGE });
    onApplied?.();
  }, [navigate, state, onApplied]);

  const toggleCategory = useCallback((key: string) => {
    const next = state.categories.includes(key)
      ? state.categories.filter((k) => k !== key)
      : [...state.categories, key];
    applyInstant({ categories: next });
  }, [state.categories, applyInstant]);

  const applyPrice = useCallback(() => {
    const clampedMax = Math.max(priceDraft.min, priceDraft.max) >= effectiveMaxPrice
      ? null
      : Math.max(priceDraft.min, priceDraft.max);
    applyInstant({ minPrice: Math.max(0, priceDraft.min), maxPrice: clampedMax });
  }, [priceDraft, effectiveMaxPrice, applyInstant]);

  const resetAll = useCallback(() => {
    setCategorySearch('');
    navigate({
      ...state,
      categories: [],
      inStock: true,
      onSale: false,
      minPrice: 0,
      maxPrice: null,
      rating: null,
      search: '',
      country: '',
      department: '',
      city: '',
      page: CATALOG_DEFAULT_PAGE,
    });
    onApplied?.();
  }, [navigate, state, onApplied]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const term = categorySearch.toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(term));
  }, [categories, categorySearch]);

  const activeFilterCount = countActiveFilters(state);
  const priceChanged =
    priceDraft.min !== state.minPrice ||
    priceDraft.max !== (state.maxPrice ?? effectiveMaxPrice);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Filtros
          </p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
            Refinar catálogo
          </h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-rose-400"
          >
            <X className="h-3 w-3" />
            Limpiar ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/8">
        {/* ── Disponibilidad ── */}
        <FilterSection title="Disponibilidad" defaultOpen>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="filter-in-stock"
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Solo con stock
              </Label>
              <Switch
                id="filter-in-stock"
                checked={state.inStock}
                onCheckedChange={(v) => applyInstant({ inStock: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="filter-on-sale"
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <Tag className="h-3.5 w-3.5 text-amber-500" />
                Solo ofertas
              </Label>
              <Switch
                id="filter-on-sale"
                checked={state.onSale}
                onCheckedChange={(v) => applyInstant({ onSale: v })}
              />
            </div>
          </div>
        </FilterSection>

        {/* ── Precio ── */}
        <FilterSection title="Precio" count={state.minPrice > 0 || state.maxPrice !== null ? 1 : 0}>
          <div className="space-y-4">
            <Slider
              min={0}
              max={effectiveMaxPrice}
              step={resolveSliderStep(effectiveMaxPrice)}
              value={[priceDraft.min, Math.max(priceDraft.min, priceDraft.max)]}
              onValueChange={([nextMin, nextMax]) =>
                setPriceDraft({ min: nextMin, max: Math.max(nextMin, nextMax) })
              }
              onValueCommit={applyPrice}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Mínimo
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={priceDraft.max}
                  value={priceDraft.min}
                  onChange={(e) =>
                    setPriceDraft((d) => ({
                      ...d,
                      min: Math.max(0, Math.min(Number(e.target.value || 0), d.max)),
                    }))
                  }
                  onBlur={applyPrice}
                  className="h-8 border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Máximo
                </Label>
                <Input
                  type="number"
                  min={priceDraft.min}
                  max={effectiveMaxPrice}
                  value={priceDraft.max}
                  onChange={(e) =>
                    setPriceDraft((d) => ({
                      ...d,
                      max: Math.max(d.min, Math.min(Number(e.target.value || effectiveMaxPrice), effectiveMaxPrice)),
                    }))
                  }
                  onBlur={applyPrice}
                  className="h-8 border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{formatMarketplaceCurrency(priceDraft.min)}</span>
              <span>{formatMarketplaceCurrency(priceDraft.max)}</span>
            </div>
            {priceChanged && (
              <Button
                size="sm"
                onClick={applyPrice}
                className="gradient-primary w-full rounded-lg text-xs text-white"
              >
                Aplicar precio
              </Button>
            )}
          </div>
        </FilterSection>

        {/* ── Valoración ── */}
        <FilterSection title="Valoración" count={state.rating ? 1 : 0}>
          <div className="flex flex-wrap gap-2">
            {([null, 3, 4, 5] as (number | null)[]).map((value) => {
              const active = state.rating === value;
              const label = value === null ? 'Todas' : `${value}★`;
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => applyInstant({ rating: value })}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/12'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* ── Rubros ── */}
        <FilterSection
          title="Rubros"
          count={state.categories.length}
          defaultOpen
        >
          {categories.length > 6 && (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Buscar rubro..."
                className="h-8 border-slate-200 bg-white pl-8 text-xs text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          )}

          {filteredCategories.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              {categorySearch ? 'Sin resultados' : 'No hay rubros disponibles'}
            </p>
          ) : (
            <div className="max-h-[260px] space-y-0.5 overflow-y-auto pr-0.5">
              {filteredCategories.map((cat) => {
                const active = state.categories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => toggleCategory(cat.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all',
                      active
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                    )}
                  >
                    {/* Color dot */}
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                    />
                    <span className="flex-1 truncate text-left font-medium">{cat.label}</span>
                    <span className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                      active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/8 dark:text-slate-500'
                    )}>
                      {cat.productCount}
                    </span>
                    {active && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </FilterSection>
      </div>
    </div>
  );
}

/* ─── GlobalCatalogToolbar ───────────────────────────────────── */
export function GlobalCatalogToolbar({
  state,
  categories,
  maxPrice,
  totalProducts,
  totalOrganizations,
  matchingOrganizations,
  countries,
  departments,
  cities,
}: ToolbarProps) {
  const navigate = useCatalogNavigation(maxPrice);
  const [searchInput, setSearchInput] = useState(state.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFilterCount = countActiveFilters(state);

  const categoriesMap = useMemo(
    () => new Map(categories.map((c) => [c.key, c.label])),
    [categories]
  );

  // Keep search input in sync when URL changes externally
  useEffect(() => {
    setSearchInput(state.search);
  }, [state.search]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ ...state, search: value.trim(), page: CATALOG_DEFAULT_PAGE });
    }, SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Cascade location filters
  const visibleDepartments = useMemo(() => {
    if (!state.country) return departments;
    const key = state.country.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return departments.filter((d) => !d.parentKey || d.parentKey === key);
  }, [departments, state.country]);

  const visibleCities = useMemo(() => {
    if (!state.department) return cities;
    const key = state.department.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return cities.filter((c) => !c.parentKey || c.parentKey === key);
  }, [cities, state.department]);

  const clearAllFilters = () => {
    setSearchInput('');
    navigate({
      search: '',
      categories: [],
      sortBy: 'popular',
      inStock: true,
      onSale: false,
      page: CATALOG_DEFAULT_PAGE,
      itemsPerPage: state.itemsPerPage,
      minPrice: 0,
      maxPrice: null,
      rating: null,
      country: '',
      department: '',
      city: '',
    });
  };

  const activeBadges = [
    state.search ? { key: 'search', label: `"${state.search}"`, onRemove: () => navigate({ ...state, search: '', page: CATALOG_DEFAULT_PAGE }) } : null,
    ...state.categories.map((k) => ({
      key: `cat:${k}`,
      label: categoriesMap.get(k) ?? k,
      onRemove: () => navigate({ ...state, categories: state.categories.filter((c) => c !== k), page: CATALOG_DEFAULT_PAGE }),
    })),
    state.country ? { key: 'country', label: state.country, onRemove: () => navigate({ ...state, country: '', department: '', city: '', page: CATALOG_DEFAULT_PAGE }) } : null,
    state.department ? { key: 'dept', label: state.department, onRemove: () => navigate({ ...state, department: '', city: '', page: CATALOG_DEFAULT_PAGE }) } : null,
    state.city ? { key: 'city', label: state.city, onRemove: () => navigate({ ...state, city: '', page: CATALOG_DEFAULT_PAGE }) } : null,
    state.onSale ? { key: 'sale', label: 'Solo ofertas', onRemove: () => navigate({ ...state, onSale: false, page: CATALOG_DEFAULT_PAGE }) } : null,
    state.rating ? { key: 'rating', label: `${state.rating}+ ★`, onRemove: () => navigate({ ...state, rating: null, page: CATALOG_DEFAULT_PAGE }) } : null,
    state.minPrice > 0 ? { key: 'min', label: `Desde ${formatMarketplaceCurrency(state.minPrice)}`, onRemove: () => navigate({ ...state, minPrice: 0, page: CATALOG_DEFAULT_PAGE }) } : null,
    state.maxPrice !== null ? { key: 'max', label: `Hasta ${formatMarketplaceCurrency(state.maxPrice)}`, onRemove: () => navigate({ ...state, maxPrice: null, page: CATALOG_DEFAULT_PAGE }) } : null,
    state.inStock === false ? { key: 'stock', label: 'Incluye sin stock', onRemove: () => navigate({ ...state, inStock: true, page: CATALOG_DEFAULT_PAGE }) } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  return (
    <div className="space-y-3">
      {/* Row 1: Search bar + stats */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-4">
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar productos, marca, descripción..."
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 dark:border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">{totalProducts}</span>
            productos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">{matchingOrganizations}</span>
            <span>de {totalOrganizations} empresas</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">{categories.length}</span>
            rubros
          </div>
        </div>
      </div>

      {/* Row 2: Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort */}
        <Select
          value={state.sortBy}
          onValueChange={(v) => navigate({ ...state, sortBy: v as CatalogQueryState['sortBy'], page: CATALOG_DEFAULT_PAGE })}
        >
          <SelectTrigger className="h-9 w-auto min-w-[150px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  {opt.icon}
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country */}
        {countries.length > 1 && (
          <Select
            value={state.country || '__all__'}
            onValueChange={(v) => navigate({ ...state, country: v === '__all__' ? '' : v, department: '', city: '', page: CATALOG_DEFAULT_PAGE })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              <MapPin className="mr-1.5 h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los países</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.key} value={c.label}>{c.label} ({c.organizationCount})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Department */}
        {visibleDepartments.length > 0 && (
          <Select
            value={state.department || '__all__'}
            onValueChange={(v) => navigate({ ...state, department: v === '__all__' ? '' : v, city: '', page: CATALOG_DEFAULT_PAGE })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[155px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              <MapPin className="mr-1.5 h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los deptos.</SelectItem>
              {visibleDepartments.map((d) => (
                <SelectItem key={d.key} value={d.label}>{d.label} ({d.organizationCount})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* City */}
        {visibleCities.length > 0 && (
          <Select
            value={state.city || '__all__'}
            onValueChange={(v) => navigate({ ...state, city: v === '__all__' ? '' : v, page: CATALOG_DEFAULT_PAGE })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[145px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              <MapPin className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las ciudades</SelectItem>
              {visibleCities.map((c) => (
                <SelectItem key={c.key} value={c.label}>{c.label} ({c.productCount})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Per page */}
        <Select
          value={String(state.itemsPerPage)}
          onValueChange={(v) => navigate({ ...state, itemsPerPage: Number(v), page: CATALOG_DEFAULT_PAGE })}
        >
          <SelectTrigger className="h-9 w-auto min-w-[110px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>{opt} / pág.</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile filters */}
        <GlobalCatalogMobileFilters
          state={state}
          categories={categories}
          maxPrice={maxPrice}
          activeFilterCount={activeFilterCount}
        />

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 rounded-xl px-3 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpiar ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Row 3: Dismissible active filter chips */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeBadges.map((badge) => (
            <button
              key={badge.key}
              type="button"
              onClick={badge.onRemove}
              className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            >
              <Tag className="h-3 w-3 text-amber-500 group-hover:text-rose-500 transition-colors dark:text-amber-400" />
              {badge.label}
              <X className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── GlobalCatalogDesktopFilters ────────────────────────────── */
export function GlobalCatalogDesktopFilters(props: SharedProps) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:scrollbar-thumb-white/10">
        <CatalogFiltersForm {...props} />
      </div>
    </aside>
  );
}

/* ─── GlobalCatalogMobileFilters ─────────────────────────────── */
export function GlobalCatalogMobileFilters(
  props: SharedProps & { activeFilterCount?: number }
) {
  const { activeFilterCount = 0 } = props;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 rounded-xl border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/8 xl:hidden"
        >
          <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-sm flex-col gap-0 border-slate-200 bg-white p-0 dark:border-white/10 dark:bg-slate-950"
      >
        <SheetHeader className="border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <SheetTitle className="text-slate-900 dark:text-white">Filtros del catálogo</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CatalogFiltersForm {...props} onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── GlobalCatalogPagination ────────────────────────────────── */
export function GlobalCatalogPagination({ state, totalProducts, maxPrice }: PaginationProps) {
  const navigate = useCatalogNavigation(maxPrice, true);
  const totalPages = Math.max(1, Math.ceil(totalProducts / state.itemsPerPage));

  if (totalPages <= 1) return null;

  const start = (state.page - 1) * state.itemsPerPage + 1;
  const end = Math.min(totalProducts, state.page * state.itemsPerPage);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - state.page) <= 1
  );

  return (
    <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Mostrando{' '}
        <span className="font-semibold text-slate-900 dark:text-white">{start}</span>
        {' '}–{' '}
        <span className="font-semibold text-slate-900 dark:text-white">{end}</span>
        {' '}de{' '}
        <span className="font-semibold text-slate-900 dark:text-white">{totalProducts}</span>
        {' '}resultados
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={state.page <= 1}
          onClick={() => navigate({ ...state, page: state.page - 1 })}
          className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Anterior
        </Button>

        {pages.map((p, i) => {
          const prev = pages[i - 1];
          const hasGap = prev && p - prev > 1;
          return (
            <div key={p} className="flex items-center gap-1.5">
              {hasGap && <span className="px-1 text-sm text-slate-400 dark:text-slate-500">…</span>}
              <Button
                variant={p === state.page ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate({ ...state, page: p })}
                className={cn(
                  'h-9 min-w-[36px] rounded-xl px-2',
                  p === state.page
                    ? 'gradient-primary text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5'
                )}
              >
                {p}
              </Button>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          disabled={state.page >= totalPages}
          onClick={() => navigate({ ...state, page: state.page + 1 })}
          className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
        >
          Siguiente
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
