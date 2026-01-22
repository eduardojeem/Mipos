'use client';

import React from 'react';
import { useProducts } from '../contexts/ProductsContext';
import { AdvancedBIDashboard } from '../components/AdvancedBIDashboard';

export default function ProductsBIDashboardTab() {
  const { products, categories, loading } = useProducts();

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdvancedBIDashboard 
        products={products} 
        categories={categories}
        className="w-full"
      />
    </div>
  );
}