import { useState, useMemo, useCallback } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface PaginationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setLimit: (limit: number) => void;
}

export interface UsePaginationReturn {
  pagination: PaginationState;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  goToPage: (page: number) => void;
  resetPagination: () => void;
  controls: PaginationControls;
  setTotal: (total: number) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  initialTotal?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

/**
 * Hook de paginación con soporte de API y datos locales
 */
export const usePagination = (
  arg1: number | UsePaginationOptions,
  arg2?: number,
  arg3?: number
): UsePaginationReturn => {
  const opts = useMemo<UsePaginationOptions>(() => {
    const isNumberSignature = typeof arg1 === 'number';
    return isNumberSignature
      ? { initialPage: arg2 ?? 1, initialLimit: arg3 ?? 12, initialTotal: arg1 as number }
      : (arg1 as UsePaginationOptions);
  }, [arg1, arg2, arg3]);

  const [page, setPageState] = useState(opts.initialPage ?? 1);
  const [limit, setLimitState] = useState(opts.initialLimit ?? 12);
  const [total, setTotalState] = useState(opts.initialTotal ?? 0);
  const [loading, setLoadingState] = useState(false);

  const pagination = useMemo((): PaginationState => {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages || 1);
    const startIndex = (currentPage - 1) * limit;
    const endIndex = Math.min(startIndex + limit - 1, Math.max(0, total - 1));

    return {
      page: currentPage,
      limit,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex,
      endIndex
    };
  }, [total, page, limit]);

  const setPage = useCallback((newPage: number) => {
    const maxPage = pagination.totalPages || 1;
    setPageState(Math.min(Math.max(1, newPage), maxPage));
    if (opts.onPageChange) opts.onPageChange(Math.min(Math.max(1, newPage), maxPage));
  }, [pagination.totalPages, opts]);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(Math.max(1, newLimit));
    setPageState(1);
    if (opts.onLimitChange) opts.onLimitChange(Math.max(1, newLimit));
  }, [opts]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setPage(pagination.page + 1);
    }
  }, [pagination.hasNextPage, pagination.page, setPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      setPage(pagination.page - 1);
    }
  }, [pagination.hasPreviousPage, pagination.page, setPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const lastPage = useCallback(() => {
    setPage(pagination.totalPages);
  }, [pagination.totalPages, setPage]);

  const goToPage = useCallback((targetPage: number) => {
    setPage(targetPage);
  }, [setPage]);

  const resetPagination = useCallback(() => {
    setPageState(opts.initialPage ?? 1);
    setLimitState(opts.initialLimit ?? 12);
  }, [opts]);

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(Math.max(0, newTotal));
  }, []);

  const setLoading = useCallback((v: boolean) => {
    setLoadingState(!!v);
  }, []);

  return {
    pagination,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    goToPage,
    resetPagination,
    controls: {
      goToPage,
      nextPage,
      previousPage: prevPage,
      firstPage,
      lastPage,
      setLimit
    },
    setTotal,
    isLoading: loading,
    setLoading
  };
};

/**
 * Hook para paginar una lista de elementos
 */
export const usePaginatedData = <T>(
  data: T[],
  initialPage: number = 1,
  initialLimit: number = 12
) => {
  const { pagination, ...paginationControls } = usePagination(data.length, initialPage, initialLimit);

  const paginatedData = useMemo(() => {
    const start = pagination.startIndex;
    const end = start + pagination.limit;
    return data.slice(start, end);
  }, [data, pagination.startIndex, pagination.limit]);

  return {
    data: paginatedData,
    pagination,
    ...paginationControls
  };
};

export const usePaginationNumbers = (currentPage: number, totalPages: number): Array<number | '...'> => {
  const pages: Array<number | '...'> = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('...');
  pages.push(totalPages);
  return pages;
};
