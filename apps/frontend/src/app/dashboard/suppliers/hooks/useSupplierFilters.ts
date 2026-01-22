import { useState, useMemo, useCallback } from 'react';
import type { Supplier, SupplierFilters } from '@/types/suppliers';
import { filterSuppliers, sortSuppliers, calculateSupplierStats } from '../utils/filters';

export function useSupplierFilters(suppliers: Supplier[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SupplierFilters['sortBy']>('name');
  const [sortOrder, setSortOrder] = useState<SupplierFilters['sortOrder']>('asc');

  // Filtrar y ordenar proveedores
  const filteredAndSortedSuppliers = useMemo(() => {
    const filters: SupplierFilters = {
      search: searchQuery,
      status: filterStatus,
      category: filterCategory !== 'all' ? filterCategory : undefined,
    };

    const filtered = filterSuppliers(suppliers, filters);
    return sortSuppliers(filtered, sortBy, sortOrder);
  }, [suppliers, searchQuery, filterStatus, filterCategory, sortBy, sortOrder]);

  // Calcular estadísticas
  const stats = useMemo(
    () => calculateSupplierStats(suppliers),
    [suppliers]
  );

  // Handler para ordenamiento
  const handleSort = useCallback((field: string) => {
    setSortBy(field as SupplierFilters['sortBy']);
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterCategory('all');
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  return {
    // State
    searchQuery,
    filterStatus,
    filterCategory,
    sortBy,
    sortOrder,
    
    // Setters
    setSearchQuery,
    setFilterStatus,
    setFilterCategory,
    setSortBy,
    setSortOrder,
    
    // Computed
    filteredSuppliers: filteredAndSortedSuppliers,
    stats,
    
    // Handlers
    handleSort,
    resetFilters,
  };
}
