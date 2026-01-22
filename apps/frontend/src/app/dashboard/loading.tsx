'use client';

import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-xl bg-card">
            <Skeleton className="h-12 w-12 rounded-xl mb-3" />
            <Skeleton className="h-6 w-24 rounded-full mb-2" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-xl bg-card">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
        <div className="p-4 border rounded-xl bg-card">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>

      <div className="p-4 border rounded-xl bg-card">
        <Skeleton className="h-6 w-48 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}