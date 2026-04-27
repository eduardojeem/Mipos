'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ReturnFilters } from './useReturns';

function toDateBoundaryISOString(date: Date | undefined, boundary: 'start' | 'end') {
  if (!date) {
    return undefined;
  }

  const next = new Date(date);
  if (boundary === 'start') {
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(23, 59, 59, 999);
  }

  return next.toISOString();
}

export function useReturnFilters() {
  const [searchTerm, setSearchTermRaw] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [customerId, setCustomerId] = useState('');
  const [refundMethod, setRefundMethod] = useState('all');

  // Debounce search 300ms
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSearchTerm = useCallback((value: string) => {
    setSearchTermRaw(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTermRaw('');
    setDebouncedSearch('');
    setStatus('all');
    setDateRange({});
    setCustomerId('');
    setRefundMethod('all');
  }, []);

  const hasActiveFilters = Boolean(
    searchTerm ||
      status !== 'all' ||
      dateRange.from ||
      customerId ||
      refundMethod !== 'all'
  );

  const filters: ReturnFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      startDate: toDateBoundaryISOString(dateRange.from, 'start'),
      endDate: toDateBoundaryISOString(dateRange.to, 'end'),
      customerId: customerId || undefined,
      refundMethod: refundMethod === 'all' ? undefined : refundMethod,
    }),
    [debouncedSearch, status, dateRange, customerId, refundMethod]
  );

  return {
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    dateRange,
    setDateRange,
    customerId,
    setCustomerId,
    refundMethod,
    setRefundMethod,
    resetFilters,
    hasActiveFilters,
    filters,
  };
}
