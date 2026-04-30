import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/80 ${className}`} />;
}

export default function LoadingCategoriesPage() {
  return (
    <MarketplaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="mt-6 h-12 w-full max-w-4xl" />
        <SkeletonBlock className="mt-4 h-6 w-full max-w-3xl" />

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,360px)]">
          <div />
          <div className="rounded-lg border border-slate-200/80 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-950/70">
            <SkeletonBlock className="h-4 w-28" />
            <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <SkeletonBlock className="h-24 w-full" />
              <SkeletonBlock className="h-24 w-full" />
              <SkeletonBlock className="h-24 w-full" />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="h-11 w-28" />
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/85 p-6 dark:border-slate-800/80 dark:bg-slate-950/80"
            >
              <div className="flex items-start justify-between gap-4">
                <SkeletonBlock className="h-12 w-12" />
                <SkeletonBlock className="h-6 w-32" />
              </div>
              <SkeletonBlock className="mt-6 h-6 w-3/4" />
              <SkeletonBlock className="mt-3 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-5/6" />
              <SkeletonBlock className="mt-6 h-24 w-full" />
              <SkeletonBlock className="mt-6 h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    </MarketplaceLayout>
  );
}
