import { useState, useMemo, useEffect } from 'react';

interface UseFiltersOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  filterFn?: (item: T, filterStatus: string) => boolean;
}

export function useFilters<T>({ data, searchFields, filterFn }: UseFiltersOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Debouncing para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrado memoizado
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Búsqueda por texto
      const matchesSearch =
        !debouncedSearch ||
        searchFields.some((field) => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(debouncedSearch.toLowerCase());
          }
          return false;
        });

      // Filtro por estado
      const matchesFilter = !filterFn || filterFn(item, filterStatus);

      return matchesSearch && matchesFilter;
    });
  }, [data, debouncedSearch, filterStatus, searchFields, filterFn]);

  return {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filteredData,
  };
}
