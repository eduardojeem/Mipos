/**
 * Custom hook for fetching special offers from promotions API
 * Manages loading, error states, and provides retry functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { transformApiOfferToSpecialOffer, type SpecialOffer } from '../utils/dataTransformers';

interface UseSpecialOffersReturn {
  offers: SpecialOffer[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Hook to fetch and manage special offers
 * Fetches from /api/promotions/offers-products
 * 
 * @returns Special offers data, loading state, error, and retry function
 */
export function useSpecialOffers(): UseSpecialOffersReturn {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const formatCurrency = useCurrencyFormatter();

  const fetchOffers = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/promotions/offers-products', { signal });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];

      // Transform API data to SpecialOffer format
      const transformedOffers = data.map((item: any) =>
        transformApiOfferToSpecialOffer(item, formatCurrency)
      );

      setOffers(transformedOffers);
    } catch (err: any) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const error = err instanceof Error ? err : new Error('Failed to fetch special offers');
      setError(error);
      console.error('Error fetching special offers:', error);
      
      // Set empty array as fallback
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [formatCurrency]);

  useEffect(() => {
    const abortController = new AbortController();

    fetchOffers(abortController.signal);

    // Cleanup: abort request if component unmounts
    return () => {
      abortController.abort();
    };
  }, [fetchOffers, retryCount]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return {
    offers,
    loading,
    error,
    retry,
  };
}
