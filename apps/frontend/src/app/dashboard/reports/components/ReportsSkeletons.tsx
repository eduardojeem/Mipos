import { Skeleton } from '@/components/ui/skeleton';

export function SalesReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-80" />
                ))}
            </div>
            <Skeleton className="h-96" />
        </div>
    );
}

export function InventoryReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
            <Skeleton className="h-80" />
            <Skeleton className="h-96" />
        </div>
    );
}

export function CustomersReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
            <Skeleton className="h-80" />
            <Skeleton className="h-96" />
        </div>
    );
}

export function FinancialReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-80" />
                ))}
            </div>
            <Skeleton className="h-96" />
        </div>
    );
}
