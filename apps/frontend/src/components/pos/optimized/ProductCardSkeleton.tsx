'use client';

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

export function ProductCardSkeleton() {
    return (
        <Card className="p-3 h-full flex flex-col animate-pulse">
            {/* Image placeholder with shimmer */}
            <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl mb-3 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
            </div>

            {/* Category & SKU with shimmer */}
            <div className="flex items-center justify-between mb-2">
                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
                </div>
                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
                </div>
            </div>

            {/* Name with shimmer */}
            <div className="space-y-2 mb-3">
                <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded w-full overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
                </div>
                <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
                </div>
            </div>

            {/* Price with shimmer */}
            <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-auto overflow-hidden">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
            </div>
        </Card>
    );
}

export function ProductsGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}
