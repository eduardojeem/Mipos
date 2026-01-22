'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, type QueryFunctionContext } from '@tanstack/react-query';

export type RemoteFilters = Record<string, string | number | boolean | null>;
export type RemoteSort = { field: string; order: 'asc' | 'desc' | null };

export type UseVirtualizedQueryParams<T> = {
  queryKeyBase: string;
  pageSize?: number;
  fetchFn: (ctx: {
    page: number;
    pageSize: number;
    filters: RemoteFilters;
    sort: RemoteSort;
  }) => Promise<{ data: T[]; nextPage?: number | null }>;
  filters?: RemoteFilters;
  sort?: RemoteSort;
  enabled?: boolean;
  staleTime?: number;
};

export function useVirtualizedQuery<T>({
  queryKeyBase,
  pageSize = 50,
  fetchFn,
  filters = {},
  sort = { field: '', order: null },
  enabled = true,
  staleTime = 30_000,
}: UseVirtualizedQueryParams<T>) {
  const queryKey = useMemo(
    () => [queryKeyBase, { filters, sort, pageSize }],
    [queryKeyBase, filters, sort, pageSize]
  );

  const query = useInfiniteQuery({
    queryKey,
    enabled,
    staleTime,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? null,
    queryFn: async ({ pageParam }: QueryFunctionContext) => {
      const page = (pageParam as number) ?? 1;
      return fetchFn({ page, pageSize, filters, sort });
    },
  });

  const rows = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.data), [query.data]);

  return {
    query,
    rows,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}