import { usePersistentCache } from './use-persistent-cache';
import api from '@/lib/api';

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    products: number;
  };
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await api.get('/categories/public', {
      timeout: 10000, // 10 segundos en lugar de 30
    });
    return response.data.categories || response.data.data || [];
  } catch (error: any) {
    console.error('[useCategories] Error fetching categories:', error.message);
    // Si falla, retornar array vacío en lugar de lanzar error
    // Esto evita que la app se rompa si el backend no responde
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('[useCategories] Request timeout - returning empty array');
      return [];
    }
    throw error;
  }
}

export function useCategories() {
  return usePersistentCache<Category[]>(
    'categories',
    fetchCategories,
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours - categories rarely change
      enabled: true
    }
  );
}

export function useCategoriesWithProducts() {
  return usePersistentCache<Category[]>(
    'categories-with-products',
    async () => {
      try {
        const response = await api.get('/categories/public?include_products=true', {
          timeout: 10000, // 10 segundos
        });
        return response.data.categories || response.data.data || [];
      } catch (error: any) {
        console.error('[useCategoriesWithProducts] Error fetching categories:', error.message);
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          console.warn('[useCategoriesWithProducts] Request timeout - returning empty array');
          return [];
        }
        throw error;
      }
    },
    {
      ttl: 4 * 60 * 60 * 1000, // 4 hours - includes product counts which change more frequently
      enabled: true
    }
  );
}