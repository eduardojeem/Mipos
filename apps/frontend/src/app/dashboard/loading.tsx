'use client';

import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="p-6 space-y-8 animate-pulse text-slate-200">
      {/* Search/Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Hero/Main Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 border rounded-2xl bg-white/50 dark:bg-slate-900/50 p-4 space-y-3">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-full" />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[400px] border rounded-3xl bg-white/50 dark:bg-slate-900/50 p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-[250px] border rounded-3xl bg-white/50 dark:bg-slate-900/50 p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="h-[130px] border rounded-3xl bg-white/50 dark:bg-slate-900/50 p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}