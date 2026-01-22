'use client';

import React from 'react';
import VirtualizedTable from '@/components/virtualized/VirtualizedTable';
import { useVirtualizedQuery } from '@/hooks/useVirtualizedQuery';
import { useRemoteSortingAndFilters } from '@/hooks/useRemoteSortingAndFilters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type UserRow = { id: string; name: string; email: string; role: string; createdAt: string };

export default function UsersVirtualizedPage() {
  const { filters, setFilters, sort, setSort } = useRemoteSortingAndFilters();

  const { rows, hasNextPage, fetchNextPage, isLoading, isFetchingNextPage } =
    useVirtualizedQuery<UserRow>({
      queryKeyBase: 'users-table',
      pageSize: 100,
      filters,
      sort,
      fetchFn: async ({ page, pageSize, filters, sort }) => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        Object.entries(filters).forEach(([k, v]) => (v != null ? params.set(k, String(v)) : undefined));
        if (sort.field && sort.order) {
          params.set('sortField', sort.field);
          params.set('sortOrder', sort.order);
        }
        const res = await fetch(`/api/users?${params.toString()}`);
        const json = await res.json();
        return { data: (json.items ?? []) as UserRow[], nextPage: json.nextPage ?? null };
      },
    });

  const columns = [
    { key: 'name', header: 'Nombre', width: 220 },
    { key: 'email', header: 'Email', width: 260 },
    { key: 'role', header: 'Rol', width: 120 },
    { key: 'createdAt', header: 'Creado', width: 180 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios (Tabla Virtualizada)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 rounded text-sm"
              placeholder="Filtrar por rol (e.g., admin)"
              onChange={(e) => setFilters((prev: any) => ({ ...prev, role: e.target.value }))}
            />
            <select
              className="border px-2 py-1 rounded text-sm"
              onChange={(e) => setSort({ field: 'createdAt', order: e.target.value as 'asc' | 'desc' })}
            >
              <option value="">Orden creado</option>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>

          <VirtualizedTable<UserRow>
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            rowHeight={44}
            skeletonRenderer={(count) => (
              <div className="space-y-2 p-3">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))}
              </div>
            )}
            emptyRenderer={<div className="p-4 text-sm text-muted-foreground">Sin resultados</div>}
          />
        </div>
      </CardContent>
    </Card>
  );
}