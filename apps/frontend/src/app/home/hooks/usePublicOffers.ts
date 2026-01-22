/**
 * Custom hook for fetching public offers from Supabase with API fallback
 * Manages loading, error states, and provides retry functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { transformSupabaseRowToPublicOffer, type PublicOffer } from '../utils/dataTransformers';

interface UsePublicOffersReturn {
  offers: PublicOffer[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Hook to fetch and manage public offers
 * Primary: Fetches from Supabase promotions_products table
 * Fallback: Fetches from /api/offers endpoint
 * 
 * @param limit - Maximum number of offers to fetch (default: 8)
 * @returns Public offers data, loading state, error, and retry function
 */
export function usePublicOffers(limit: number = 8): UsePublicOffersReturn {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const supabase = createClient();

  const fetchOffers = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      // Try Supabase first
      try {
        const { data, error: supabaseError } = await supabase
          .from('promotions_products')
          .select(`
            product:products(id,name,sale_price,image_url,images,category_id),
            promotions(id,name,discount_type,discount_value,start_date,end_date,is_active)
          `)
          .limit(limit);

        if (supabaseError) throw supabaseError;

        // Filter for active promotions and transform
        const rows = Array.isArray(data) ? data : [];
        const transformedOffers = rows
          .filter((row: any) => row?.promotions?.is_active)
          .map((row: any) => transformSupabaseRowToPublicOffer(row));

        setOffers(transformedOffers);
        return; // Success, exit early
      } catch (supabaseErr) {
        console.warn('Supabase fetch failed, trying API fallback:', supabaseErr);
      }

      // Fallback to API
      const params = new URLSearchParams({
        status: 'active',
        sort: 'best_savings',
        page: '1',
        limit: String(limit),
      });

      const response = await fetch(`/api/offers?${params.toString()}`, { signal });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const json = await response.json();
      const fallbackData = Array.isArray(json?.data) ? json.data : [];
      
      setOffers(fallbackData);
    } catch (err: any) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') {
        return;
      }

      const error = err instanceof Error ? err : new Error('Failed to fetch public offers');
      setError(error);
      console.error('Error fetching public offers:', error);
      
      // Set empty array as fallback
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, limit]);

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
