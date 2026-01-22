'use client';

export function ProductsLoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        </div>
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div 
            key={index} 
            className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
          />
        ))}
      </div>
      
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
  );
}
