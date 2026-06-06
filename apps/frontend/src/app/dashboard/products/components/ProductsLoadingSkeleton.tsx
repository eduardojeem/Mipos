'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ProductsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* ── Hero header skeleton ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card px-6 py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-36 rounded-lg" />
              <Skeleton className="h-4 w-64 max-w-full rounded-md" />
            </div>
          </div>
          {/* Right */}
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ── Stat cards skeleton ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-3 w-36 max-w-full rounded" />
              </div>
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters skeleton ── */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* ── Table/Grid skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-5 py-3">
          <Skeleton className="h-4 w-44 rounded" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border/40">
              <Skeleton className="aspect-square w-full" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
