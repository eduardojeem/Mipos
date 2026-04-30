import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/80 ${className}`} />;
}

export default function LoadingOrganizationsPage() {
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

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
            <SkeletonBlock className="min-h-[300px] w-full rounded-none" />
            <div className="p-6 sm:p-8">
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="mt-5 h-8 w-3/4" />
              <SkeletonBlock className="mt-4 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-5/6" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
              </div>
              <SkeletonBlock className="mt-8 h-11 w-40" />
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

        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/80"
            >
              <div className="border-b border-slate-100/80 p-6 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-16 w-16" />
                    <div className="space-y-2">
                      <SkeletonBlock className="h-5 w-36" />
                      <SkeletonBlock className="h-4 w-28" />
                    </div>
                  </div>
                  <SkeletonBlock className="h-6 w-24" />
                </div>
              </div>
              <div className="space-y-4 p-6">
                <SkeletonBlock className="h-6 w-3/4" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-28 w-full" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MarketplaceLayout>
  );
}
