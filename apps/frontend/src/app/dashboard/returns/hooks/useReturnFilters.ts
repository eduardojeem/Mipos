'use client';

import { useState, useCallback } from 'react';

export function useReturnFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [customerId, setCustomerId] = useState('');

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStatus('all');
    setDateRange({});
    setCustomerId('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    dateRange,
    setDateRange,
    customerId,
    setCustomerId,
    resetFilters,
    // Computed values for API calls
    filters: {
      search: searchTerm,
      status: status === 'all' ? undefined : status,
      startDate: dateRange.from?.toISOString(),
      endDate: dateRange.to?.toISOString(),
      customerId: customerId || undefined,
    }
  };
}