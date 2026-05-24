'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CATALOG_DEFAULT_PAGE,
  normalizeCatalogQuery,
  buildCatalogSearchParams,
  type CatalogQueryState,
} from '@/app/catalog/catalog-query';

const STORAGE_KEY = 'global-catalog-filters';

export function CatalogFilterPersistence({
  initialQueryState,
  maxPrice,
}: {
  initialQueryState: CatalogQueryState;
  maxPrice: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);
  const hasActiveFiltersInitial = useRef(false);

  // Guardamos los filtros en localStorage cuando cambian
  useEffect(() => {
    if (!searchParams) return;
    
    const state = normalizeCatalogQuery(searchParams);
    const hasActiveFilters = Boolean(
      state.search ||
      state.categories.length > 0 ||
      state.sortBy !== 'popular' ||
      state.minPrice > 0 ||
      state.maxPrice !== null ||
      state.onSale ||
      state.inStock === false ||
      state.rating ||
      state.country ||
      state.department ||
      state.city
    );

    try {
      if (hasActiveFilters) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {}
  }, [searchParams]);

  // Cargamos los filtros de localStorage solo en la primera carga y cuando no hay filtros activos en la URL
  useEffect(() => {
    if (isInitialized.current || !searchParams) return;
    isInitialized.current = true;

    const currentState = normalizeCatalogQuery(searchParams);
    const hasActiveFiltersInUrl = Boolean(
      currentState.search ||
      currentState.categories.length > 0 ||
      currentState.sortBy !== 'popular' ||
      currentState.minPrice > 0 ||
      currentState.maxPrice !== null ||
      currentState.onSale ||
      currentState.inStock === false ||
      currentState.rating ||
      currentState.country ||
      currentState.department ||
      currentState.city
    );

    if (hasActiveFiltersInUrl) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedState = JSON.parse(saved) as Partial<CatalogQueryState>;
        const mergedState = {
          ...initialQueryState,
          ...savedState,
          page: CATALOG_DEFAULT_PAGE,
        };
        const params = buildCatalogSearchParams(mergedState, {
          defaultItemsPerPage: 36,
          maxPriceCeiling: maxPrice,
        });
        const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(href, { scroll: false });
      }
    } catch {}
  }, [initialQueryState, maxPrice, pathname, router, searchParams]);

  return null;
}
