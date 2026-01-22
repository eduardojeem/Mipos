'use client';

import { useState, useCallback } from 'react';

export function useAlertFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severity, setSeverity] = useState('all');
  const [category, setCategory] = useState('all');
  const [supplier, setSupplier] = useState('all');

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSeverity('all');
    setCategory('all');
    setSupplier('all');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    severity,
    setSeverity,
    category,
    setCategory,
    supplier,
    setSupplier,
    resetFilters,
    // Computed values for API calls
    filters: {
      search: searchTerm,
      severity: severity === 'all' ? undefined : severity,
      category: category === 'all' ? undefined : category,
      supplier: supplier === 'all' ? undefined : supplier,
    }
  };
}