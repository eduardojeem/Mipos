/**
 * Custom hook for fetching top-selling products from the last 30 days
 * Aggregates sale items and fetches product details
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { transformProductToFeaturedProduct, type FeaturedProduct } from '../utils/dataTransformers';

interface UseTopProductsReturn {
  products: FeaturedProduct[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Hook to fetch and manage top-selling products
 * Calculates top products based on sale_items from last 30 days
 * 
 * @param limit - Maximum number of products to fetch (default: 6)
 * @returns Top products data, loading state, error, and retry function
 */
export function useTopProducts(limit: number = 6): UseTopProductsReturn {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const supabase = createClient();

  const fetchTopProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch sale items from last 30 days
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(500);

      if (saleItemsError) throw saleItemsError;

      // Aggregate quantities by product_id
      const totals: Record<string, number> = {};
      const items = Array.isArray(saleItems) ? saleItems : [];
      
      items.forEach((item: any) => {
        const productId = String(item?.product_id || '');
        const quantity = Number(item?.quantity || 0);
        
        if (productId) {
          totals[productId] = (totals[productId] || 0) + quantity;
        }
      });

      // Sort by total quantity and get top N product IDs
      const topProductIds = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([productId]) => productId);

      // If no products found, return empty array
      if (topProductIds.length === 0) {
        setProducts([]);
        return;
      }

      // Fetch product details for top products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sale_price, offer_price, image_url, images, category_id')
        .in('id', topProductIds);

      if (productsError) throw productsError;

      // Transform products to FeaturedProduct format
      const prods = Array.isArray(productsData) ? productsData : [];
      const transformedProducts = prods.map((product: any) =>
        transformProductToFeaturedProduct(product)
      );

      setProducts(transformedProducts);
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error('Failed to fetch top products');
      setError(error);
      console.error('Error fetching top products:', error);
      
      // Set empty array as fallback
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, limit]);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      await fetchTopProducts();
      
      // Don't update state if component unmounted
      if (cancelled) {
        setProducts([]);
        setLoading(false);
      }
    };

    fetch();

    // Cleanup: mark as cancelled if component unmounts
    return () => {
      cancelled = true;
    };
  }, [fetchTopProducts, retryCount]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return {
    products,
    loading,
    error,
    retry,
  };
}
