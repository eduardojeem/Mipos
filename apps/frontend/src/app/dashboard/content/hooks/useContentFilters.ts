'use client';

import { useState, useMemo } from 'react';

export interface ContentFilters {
  searchTerm: string;
  status: 'all' | 'published' | 'draft' | 'active' | 'inactive';
  category: string;
  position: string;
  fileType: 'all' | 'images' | 'documents' | 'videos';
  folder: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  sortBy: 'title' | 'date' | 'views' | 'size';
  sortOrder: 'asc' | 'desc';
}

export function useContentFilters() {
  const [filters, setFilters] = useState<ContentFilters>({
    searchTerm: '',
    status: 'all',
    category: 'all',
    position: 'all',
    fileType: 'all',
    folder: 'all',
    dateRange: {},
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const updateFilter = (key: keyof ContentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'all',
      category: 'all',
      position: 'all',
      fileType: 'all',
      folder: 'all',
      dateRange: {},
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.status !== 'all' ||
      filters.category !== 'all' ||
      filters.position !== 'all' ||
      filters.fileType !== 'all' ||
      filters.folder !== 'all' ||
      !!filters.dateRange.from ||
      !!filters.dateRange.to
    );
  }, [filters]);

  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.status !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.position !== 'all') count++;
    if (filters.fileType !== 'all') count++;
    if (filters.folder !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    filterCount,
    
    // Convenience methods
    setSearchTerm: (term: string) => updateFilter('searchTerm', term),
    setStatus: (status: ContentFilters['status']) => updateFilter('status', status),
    setCategory: (category: string) => updateFilter('category', category),
    setPosition: (position: string) => updateFilter('position', position),
    setFileType: (type: ContentFilters['fileType']) => updateFilter('fileType', type),
    setFolder: (folder: string) => updateFilter('folder', folder),
    setDateRange: (range: ContentFilters['dateRange']) => updateFilter('dateRange', range),
    setSortBy: (sortBy: ContentFilters['sortBy']) => updateFilter('sortBy', sortBy),
    setSortOrder: (order: ContentFilters['sortOrder']) => updateFilter('sortOrder', order),
  };
}