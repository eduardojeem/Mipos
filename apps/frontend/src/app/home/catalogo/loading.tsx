import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/80 ${className}`} />;
}

export default function LoadingCatalogPage() {
  return (
    <MarketplaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SkeletonBlock className="h-5 w-28" />
        <SkeletonBlock className="mt-6 h-12 w-full max-w-4xl" />
        <SkeletonBlock className="mt-4 h-6 w-full max-w-3xl" />
        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-950/80">
          <div className="grid min-h-[440px] lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="order-2 flex flex-col justify-between p-6 sm:p-8 lg:order-1 lg:p-12">
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-7 w-36 bg-white/10" />
                <SkeletonBlock className="h-7 w-32 bg-white/10" />
                <SkeletonBlock className="h-7 w-32 bg-white/10" />
              </div>
              <div className="mt-8 space-y-4">
                <SkeletonBlock className="h-4 w-32 bg-white/10" />
                <SkeletonBlock className="h-12 w-full max-w-2xl bg-white/10" />
                <SkeletonBlock className="h-8 w-full max-w-xl bg-white/10" />
                <SkeletonBlock className="h-20 w-full max-w-2xl bg-white/10" />
              </div>
              <div className="mt-8 flex gap-3">
                <SkeletonBlock className="h-12 w-32 bg-white/10" />
                <SkeletonBlock className="h-12 w-32 bg-white/10" />
              </div>
            </div>
            <SkeletonBlock className="order-1 min-h-[280px] w-full rounded-none bg-slate-700/70 lg:order-2 lg:min-h-full" />
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row">
            <SkeletonBlock className="h-11 flex-1" />
            <SkeletonBlock className="h-11 w-full xl:w-44" />
            <SkeletonBlock className="h-11 w-full xl:w-36" />
            <SkeletonBlock className="h-11 w-full xl:w-28" />
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden xl:block">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="mt-6 h-20 w-full" />
              <SkeletonBlock className="mt-4 h-32 w-full" />
              <SkeletonBlock className="mt-4 h-40 w-full" />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
                <SkeletonBlock className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-4 p-6">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-6 w-full" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-4/5" />
                  <SkeletonBlock className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
