'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Search,
  SlidersHorizontal,
  Tag,
  X,
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
import { Checkbox } from '@/components/ui/checkbox';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { GlobalCatalogCategoryOption, GlobalCatalogLocationOption } from '@/lib/public-site/global-catalog-data';

const SORT_LABELS: Record<CatalogQueryState['sortBy'], string> = {
  popular: 'Mas recientes',
  newest: 'Nuevos',
  'price-low': 'Menor precio',
  'price-high': 'Mayor precio',
  rating: 'Mejor valorados',
  name: 'Nombre',
};

const PER_PAGE_OPTIONS = [24, 36, 60];

type FilterDraft = {
  categories: string[];
  inStock: boolean;
  onSale: boolean;
  minPrice: number;
  maxPrice: number;
  rating: number | null;
};

interface SharedProps {
  state: CatalogQueryState;
  categories: GlobalCatalogCategoryOption[];
  maxPrice: number;
}

interface ToolbarProps extends SharedProps {
  totalProducts: number;
  totalOrganizations: number;
  matchingOrganizations: number;
  departments: GlobalCatalogLocationOption[];
  cities: GlobalCatalogLocationOption[];
}

interface PaginationProps {
  state: CatalogQueryState;
  totalProducts: number;
  maxPrice: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function resolveMaxPriceValue(rawMaxPrice: number) {
  return Math.max(rawMaxPrice, CATALOG_DEFAULT_MAX_PRICE);
}

function resolveSliderStep(maxPrice: number) {
  if (maxPrice >= 100000) return 5000;
  if (maxPrice >= 10000) return 1000;
  if (maxPrice >= 1000) return 100;
  return 10;
}

function buildDefaultDraft(state: CatalogQueryState, maxPrice: number): FilterDraft {
  return {
    categories: [...state.categories],
    inStock: state.inStock,
    onSale: state.onSale,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice ?? maxPrice,
    rating: state.rating,
  };
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
    state.department ? 1 : 0,
    state.city ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

function useCatalogNavigation(maxPrice: number) {
  const pathname = usePathname();
  const router = useRouter();

  return (state: CatalogQueryState) => {
    const params = buildCatalogSearchParams(
      {
        ...state,
        maxPrice:
          state.maxPrice !== null && state.maxPrice >= maxPrice
            ? null
            : state.maxPrice,
      },
      {
        defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE,
        maxPriceCeiling: maxPrice,
      }
    );

    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(href);
  };
}

function CatalogFiltersForm({
  state,
  categories,
  maxPrice,
  onApplied,
  className,
}: SharedProps & { onApplied?: () => void; className?: string }) {
  const navigate = useCatalogNavigation(maxPrice);
  const effectiveMaxPrice = resolveMaxPriceValue(maxPrice);
  const defaultDraft = useMemo(
    () => buildDefaultDraft(state, effectiveMaxPrice),
    [effectiveMaxPrice, state]
  );
  const [draft, setDraft] = useState<FilterDraft>(defaultDraft);
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    setDraft(defaultDraft);
  }, [defaultDraft]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const term = categorySearch.toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(term));
  }, [categories, categorySearch]);

  const toggleCategory = (categoryKey: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      categories: checked
        ? [...current.categories, categoryKey]
        : current.categories.filter((value) => value !== categoryKey),
    }));
  };

  const applyFilters = () => {
    navigate({
      ...state,
      categories: draft.categories,
      inStock: draft.inStock,
      onSale: draft.onSale,
      minPrice: Math.max(0, draft.minPrice),
      maxPrice: Math.max(draft.minPrice, draft.maxPrice) >= effectiveMaxPrice
        ? null
        : Math.max(draft.minPrice, draft.maxPrice),
      rating: draft.rating,
      page: CATALOG_DEFAULT_PAGE,
    });
    onApplied?.();
  };

  const resetFilters = () => {
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
      page: CATALOG_DEFAULT_PAGE,
    });
    onApplied?.();
  };

  const selectedCount = draft.categories.length +
    (draft.onSale ? 1 : 0) +
    (draft.rating ? 1 : 0) +
    (draft.minPrice > 0 ? 1 : 0) +
    (draft.maxPrice < effectiveMaxPrice ? 1 : 0) +
    (draft.inStock === false ? 1 : 0);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Disponibilidad */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Disponibilidad</p>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5">
            <Checkbox
              checked={draft.inStock}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, inStock: checked !== false }))
              }
            />
            Solo con stock
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5">
            <Checkbox
              checked={draft.onSale}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, onSale: checked === true }))
              }
            />
            <span className="flex items-center gap-2">
              Solo ofertas
              <Tag className="h-3.5 w-3.5 text-amber-400" />
            </span>
          </label>
        </div>
      </div>

      {/* Precio */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Rango de precio</p>
        <div className="mt-4">
          <Slider
            min={0}
            max={effectiveMaxPrice}
            step={resolveSliderStep(effectiveMaxPrice)}
            value={[draft.minPrice, Math.max(draft.minPrice, draft.maxPrice)]}
            onValueChange={([nextMin, nextMax]) =>
              setDraft((current) => ({
                ...current,
                minPrice: nextMin,
                maxPrice: Math.max(nextMin, nextMax),
              }))
            }
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="catalog-min-price" className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Minimo
            </Label>
            <Input
              id="catalog-min-price"
              type="number"
              min={0}
              max={draft.maxPrice}
              value={draft.minPrice}
              onChange={(event) => {
                const nextValue = Number(event.target.value || 0);
                setDraft((current) => ({
                  ...current,
                  minPrice: Math.max(0, Math.min(nextValue, current.maxPrice)),
                }));
              }}
              className="h-9 border-white/10 bg-slate-950/40 text-sm text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catalog-max-price" className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Maximo
            </Label>
            <Input
              id="catalog-max-price"
              type="number"
              min={draft.minPrice}
              max={effectiveMaxPrice}
              value={draft.maxPrice}
              onChange={(event) => {
                const nextValue = Number(event.target.value || effectiveMaxPrice);
                setDraft((current) => ({
                  ...current,
                  maxPrice: Math.max(current.minPrice, Math.min(nextValue, effectiveMaxPrice)),
                }));
              }}
              className="h-9 border-white/10 bg-slate-950/40 text-sm text-white"
            />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span>{formatCurrency(draft.minPrice)}</span>
          <span>{formatCurrency(draft.maxPrice)}</span>
        </div>
      </div>

      {/* Valoracion */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Valoracion</p>
        <div className="mt-4 flex gap-2">
          {[null, 3, 4, 5].map((value) => {
            const active = draft.rating === value;
            const label = value === null ? 'Todas' : `${value}★`;
            return (
              <Button
                key={label}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 rounded-lg text-xs',
                  active
                    ? 'gradient-primary text-white'
                    : 'border-white/10 bg-transparent text-slate-300 hover:bg-white/5'
                )}
                onClick={() => setDraft((current) => ({ ...current, rating: value }))}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Categorias con buscador */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Categorias
          </p>
          {draft.categories.length > 0 && (
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, categories: [] }))}
              className="text-[10px] font-medium text-amber-400 hover:text-amber-300"
            >
              Limpiar ({draft.categories.length})
            </button>
          )}
        </div>

        {categories.length > 6 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Buscar categoria..."
              className="h-8 border-white/10 bg-slate-950/40 pl-8 text-xs text-white placeholder:text-slate-500"
            />
          </div>
        )}

        <div className="mt-3 max-h-[280px] space-y-1 overflow-auto pr-1">
          {filteredCategories.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">
              {categorySearch ? 'Sin resultados' : 'No hay categorias disponibles'}
            </p>
          ) : (
            filteredCategories.map((category) => (
              <label
                key={category.key}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5"
              >
                <Checkbox
                  checked={draft.categories.includes(category.key)}
                  onCheckedChange={(checked) => toggleCategory(category.key, checked === true)}
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{category.label}</span>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] tabular-nums text-slate-500">
                    {category.productCount}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={applyFilters}
          className="gradient-primary flex-1 rounded-lg text-white"
        >
          Aplicar{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resetFilters}
          className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/5"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}

export function GlobalCatalogToolbar({
  state,
  categories,
  maxPrice,
  totalProducts,
  totalOrganizations,
  matchingOrganizations,
  departments,
  cities,
}: ToolbarProps) {
  const navigate = useCatalogNavigation(maxPrice);
  const [searchInput, setSearchInput] = useState(state.search);
  const activeFilterCount = countActiveFilters(state);
  const categoriesMap = useMemo(
    () => new Map(categories.map((category) => [category.key, category.label])),
    [categories]
  );

  useEffect(() => {
    setSearchInput(state.search);
  }, [state.search]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({
      ...state,
      search: searchInput.trim(),
      page: CATALOG_DEFAULT_PAGE,
    });
  };

  const clearAllFilters = () => {
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
      department: '',
      city: '',
    });
  };

  const activeBadges = [
    state.search ? { key: 'search', label: `Busqueda: ${state.search}` } : null,
    ...state.categories.map((categoryKey) => ({
      key: `category:${categoryKey}`,
      label: categoriesMap.get(categoryKey) || categoryKey,
    })),
    state.department ? { key: 'department', label: `Depto: ${state.department}` } : null,
    state.city ? { key: 'city', label: `Ciudad: ${state.city}` } : null,
    state.onSale ? { key: 'sale', label: 'Solo ofertas' } : null,
    state.rating ? { key: 'rating', label: `${state.rating}+ estrellas` } : null,
    state.minPrice > 0 ? { key: 'min', label: `Desde ${formatCurrency(state.minPrice)}` } : null,
    state.maxPrice !== null ? { key: 'max', label: `Hasta ${formatCurrency(state.maxPrice)}` } : null,
    state.inStock === false ? { key: 'stock', label: 'Incluye sin stock' } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  return (
    <div className="space-y-4">
      {/* Row 1: Search + Stats inline */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar productos, descripcion o marca..."
              className="h-11 rounded-xl border-white/10 bg-slate-950/40 pl-10 text-white placeholder:text-slate-500"
            />
          </div>
          <Button type="submit" className="gradient-primary h-11 rounded-xl px-6 text-white">
            Buscar
          </Button>
        </form>

        {/* Inline stats */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 pt-4 text-xs text-slate-400">
          <span>
            <span className="font-semibold text-white">{totalProducts}</span> productos
          </span>
          <span>
            <span className="font-semibold text-white">{matchingOrganizations}</span> de {totalOrganizations} empresas
          </span>
          <span>
            <span className="font-semibold text-white">{categories.length}</span> categorias
          </span>
        </div>
      </div>

      {/* Row 2: Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <Select
          value={state.sortBy}
          onValueChange={(value) =>
            navigate({
              ...state,
              sortBy: value as CatalogQueryState['sortBy'],
              page: CATALOG_DEFAULT_PAGE,
            })
          }
        >
          <SelectTrigger className="h-10 w-auto min-w-[160px] rounded-xl border-white/10 bg-white/[0.03] text-sm text-white">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Department */}
        {departments.length > 0 && (
          <Select
            value={state.department || '__all__'}
            onValueChange={(value) =>
              navigate({
                ...state,
                department: value === '__all__' ? '' : value,
                city: '',
                page: CATALOG_DEFAULT_PAGE,
              })
            }
          >
            <SelectTrigger className="h-10 w-auto min-w-[160px] rounded-xl border-white/10 bg-white/[0.03] text-sm text-white">
              <MapPin className="mr-2 h-3.5 w-3.5 text-amber-400" />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los deptos.</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.key} value={dept.label}>
                  {dept.label} ({dept.organizationCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* City */}
        {cities.length > 0 && (
          <Select
            value={state.city || '__all__'}
            onValueChange={(value) =>
              navigate({
                ...state,
                city: value === '__all__' ? '' : value,
                page: CATALOG_DEFAULT_PAGE,
              })
            }
          >
            <SelectTrigger className="h-10 w-auto min-w-[160px] rounded-xl border-white/10 bg-white/[0.03] text-sm text-white">
              <MapPin className="mr-2 h-3.5 w-3.5 text-emerald-400" />
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las ciudades</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.key} value={city.label}>
                  {city.label} ({city.productCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Per page */}
        <Select
          value={String(state.itemsPerPage)}
          onValueChange={(value) =>
            navigate({
              ...state,
              itemsPerPage: Number(value),
              page: CATALOG_DEFAULT_PAGE,
            })
          }
        >
          <SelectTrigger className="h-10 w-auto min-w-[120px] rounded-xl border-white/10 bg-white/[0.03] text-sm text-white">
            <SelectValue placeholder="Por pagina" />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / pag
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile filters trigger */}
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
            className="h-10 rounded-xl px-3 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpiar ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Row 3: Active filter badges */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeBadges.map((badge) => (
            <Badge
              key={badge.key}
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200"
            >
              <Tag className="mr-1.5 h-3 w-3 text-amber-300" />
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function GlobalCatalogDesktopFilters(props: SharedProps) {
  return (
    <div className="hidden xl:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-white/10 bg-slate-950/55 p-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Filtros</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Refina el catalogo</h2>
        </div>
        <CatalogFiltersForm {...props} />
      </div>
    </div>
  );
}

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
          className="h-11 rounded-lg border-white/10 bg-transparent text-white hover:bg-white/5 xl:hidden"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filtros
          {activeFilterCount > 0 ? (
            <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md border-white/10 bg-slate-950 text-white">
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle>Filtros del catalogo</SheetTitle>
          <SheetDescription className="text-slate-400">
            Ajusta categoria, precio y disponibilidad sin salir del listado.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <CatalogFiltersForm {...props} onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function GlobalCatalogPagination({ state, totalProducts, maxPrice }: PaginationProps) {
  const navigate = useCatalogNavigation(maxPrice);
  const totalPages = Math.max(1, Math.ceil(totalProducts / state.itemsPerPage));

  if (totalPages <= 1) {
    return null;
  }

  const start = (state.page - 1) * state.itemsPerPage + 1;
  const end = Math.min(totalProducts, state.page * state.itemsPerPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((pageNumber) => {
    return (
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - state.page) <= 1
    );
  });

  return (
    <div className="mt-10 flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-slate-400">
        Mostrando <span className="font-medium text-white">{start}</span> a{' '}
        <span className="font-medium text-white">{end}</span> de{' '}
        <span className="font-medium text-white">{totalProducts}</span> resultados
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={state.page <= 1}
          onClick={() => navigate({ ...state, page: state.page - 1 })}
          className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/5"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          const needsGap = previous && pageNumber - previous > 1;

          return (
            <div key={pageNumber} className="flex items-center gap-2">
              {needsGap ? <span className="px-1 text-slate-500">...</span> : null}
              <Button
                variant={pageNumber === state.page ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate({ ...state, page: pageNumber })}
                className={cn(
                  'rounded-lg min-w-[40px]',
                  pageNumber === state.page
                    ? 'gradient-primary text-white'
                    : 'border-white/10 bg-transparent text-white hover:bg-white/5'
                )}
              >
                {pageNumber}
              </Button>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          disabled={state.page >= totalPages}
          onClick={() => navigate({ ...state, page: state.page + 1 })}
          className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/5"
        >
          Siguiente
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
