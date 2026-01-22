"use client";

import { memo } from 'react';

interface SectionSkeletonProps {
  title?: string;
}

function SectionSkeletonComponent({ title }: SectionSkeletonProps) {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && <div className="h-8 w-64 bg-gray-200 rounded mb-6 animate-pulse" />}
        <div className="grid md:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <div className="h-40 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const SectionSkeleton = memo(SectionSkeletonComponent);
export default SectionSkeleton;