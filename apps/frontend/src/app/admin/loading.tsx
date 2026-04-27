export default function LoadingAdmin() {
  return (
    <div className="space-y-8 p-6">
      <div className="h-10 w-80 rounded-xl bg-muted animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="h-96 rounded-3xl bg-muted animate-pulse" />
        <div className="h-96 rounded-3xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

