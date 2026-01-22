'use client';

import React from 'react';
import { useProducts } from '../contexts/ProductsContext';
import { RecommendationsPanel } from '../components/RecommendationsPanel';

export default function ProductsRecommendationsTab() {
  const { products, categories, loading } = useProducts();

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RecommendationsPanel 
        products={products} 
        categories={categories}
        className="w-full"
      />
    </div>
  );
}