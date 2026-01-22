'use client';

import { useMemo, useState } from 'react';

export function useRemoteSortingAndFilters() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' | null }>({ field: '', order: null });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.set(k, String(v));
    });
    if (sort.field && sort.order) {
      params.set('sortField', sort.field);
      params.set('sortOrder', sort.order);
    }
    return params;
  }, [filters, sort]);

  return { filters, setFilters, sort, setSort, queryParams };
}