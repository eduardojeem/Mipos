export default function LoadingPOS() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

