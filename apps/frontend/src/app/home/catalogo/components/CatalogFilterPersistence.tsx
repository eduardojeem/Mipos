'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  normalizeCatalogQuery,
  type CatalogQueryState,
} from '@/app/catalog/catalog-query';

const STORAGE_KEY = 'global-catalog-filters';

/**
 * Persiste filtros activos en localStorage para que el botón "atrás" del
 * browser mantenga el estado. NO restaura filtros automáticamente al
 * navegar a /home/catalogo sin params — eso confunde al usuario que
 * espera ver el catálogo completo.
 */
export function CatalogFilterPersistence({
  initialQueryState,
  maxPrice,
}: {
  initialQueryState: CatalogQueryState;
  maxPrice: number;
}) {
  const searchParams = useSearchParams();

  // Guardar filtros activos para que el historial del browser los recuerde
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
      } else {
        // Si el usuario limpió los filtros, también limpiar el storage
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [searchParams]);

  return null;
}
