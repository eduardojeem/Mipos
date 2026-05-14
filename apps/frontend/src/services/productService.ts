'use client';

import { createClient } from '@/lib/supabase';
import api from '@/lib/api';
import { Product, Category } from '@/types';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  sortBy?: 'name' | 'price' | 'stock' | 'created_at' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductsServiceOptions {
  page?: number;
  limit?: number;
  filters?: ProductFilters;
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBooleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toIsoString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || value instanceof Date) {
    return new Date(value).toISOString();
  }

  return undefined;
}

function normalizeImages(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    const single = toStringOrUndefined(value);
    return single ? [single] : undefined;
  }

  const normalized = value
    .map((image) => {
      if (typeof image === 'string') {
        return image;
      }

      if (image && typeof image === 'object' && 'url' in image) {
        return toStringOrUndefined((image as { url?: unknown }).url);
      }

      return undefined;
    })
    .filter((image): image is string => typeof image === 'string' && image.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

class ProductService {
  private supabase = createClient();
  // Cache removido - ahora lo maneja useCache de forma centralizada

  // Batch loading para múltiples productos por ID
  private batchLoadQueue: string[] = [];
  private batchLoadTimer: NodeJS.Timeout | null = null;
  private batchLoadPromises = new Map<string, Promise<Product | null>>();

  private normalizeProduct(raw: Record<string, unknown>): Product {
    const categoryRecord = raw.category && typeof raw.category === 'object'
      ? raw.category as Record<string, unknown>
      : null;
    const supplierRecord = raw.supplier && typeof raw.supplier === 'object'
      ? raw.supplier as Record<string, unknown>
      : null;

    return {
      id: String(raw.id),
      name: String(raw.name || ''),
      sku: String(raw.sku || raw.code || ''),
      description: toStringOrUndefined(raw.description),
      cost_price: Number(raw.cost_price ?? raw.costPrice ?? 0),
      sale_price: Number(raw.sale_price ?? raw.salePrice ?? raw.price ?? 0),
      wholesale_price: toNumberOrUndefined(raw.wholesale_price ?? raw.wholesalePrice),
      min_wholesale_quantity: toNumberOrUndefined(raw.min_wholesale_quantity),
      stock_quantity: Number(raw.stock_quantity ?? raw.stockQuantity ?? raw.stock ?? 0),
      min_stock: Number(raw.min_stock ?? raw.minStock ?? 0),
      max_stock: toNumberOrUndefined(raw.max_stock),
      category_id: String(raw.category_id ?? raw.categoryId ?? ''),
      supplier_id: toStringOrUndefined(raw.supplier_id),
      barcode: toStringOrUndefined(raw.barcode),
      image_url: toStringOrUndefined(raw.image_url ?? raw.image),
      is_active: Boolean(raw.is_active ?? raw.isActive ?? true),
      regular_price: toNumberOrUndefined(raw.regular_price),
      discount_percentage: toNumberOrUndefined(raw.discount_percentage),
      rating: toNumberOrUndefined(raw.rating),
      images: normalizeImages(raw.images),
      iva_rate: toNumberOrUndefined(raw.iva_rate),
      iva_included: toBooleanOrUndefined(raw.iva_included),
      brand: toStringOrUndefined(raw.brand),
      shade: toStringOrUndefined(raw.shade),
      skin_type: toStringOrUndefined(raw.skin_type),
      ingredients: toStringOrUndefined(raw.ingredients),
      volume: toStringOrUndefined(raw.volume),
      spf: toNumberOrUndefined(raw.spf),
      finish: toStringOrUndefined(raw.finish),
      coverage: toStringOrUndefined(raw.coverage),
      waterproof: toBooleanOrUndefined(raw.waterproof),
      vegan: toBooleanOrUndefined(raw.vegan),
      cruelty_free: toBooleanOrUndefined(raw.cruelty_free),
      expiration_date: toStringOrUndefined(raw.expiration_date),
      created_at: toIsoString(raw.created_at) ?? toIsoString(raw.createdAt) ?? new Date().toISOString(),
      updated_at: toIsoString(raw.updated_at) ?? toIsoString(raw.updatedAt) ?? new Date().toISOString(),
      category: categoryRecord
        ? {
            id: String(categoryRecord.id),
            name: String(categoryRecord.name || ''),
          } as Category
        : undefined,
      supplier: supplierRecord
        ? {
            id: String(supplierRecord.id),
            name: String(supplierRecord.name || ''),
          } as Product['supplier']
        : undefined,
    };
  }

  /**
   * Optimized getProducts - Supabase first with intelligent fallback
   */
  async getProducts(options: ProductsServiceOptions = {}): Promise<PaginatedProductsResponse> {
    try {
      return await this.getProductsFromSupabase(options);
    } catch (error) {
      console.warn('Supabase fetch failed, falling back to API:', error);
      return await this.getProductsFromAPI(options);
    }
  }

  // Helper para obtener el ID de la organización seleccionada
  private getOrganizationId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('selected_organization');
      if (!raw) return null;
      
      // Intentar parsear si es JSON
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        return parsed?.id || parsed?.organization_id || null;
      }
      return raw; // Es un string directo (ID)
    } catch (e) {
      console.warn('Error reading selected_organization:', e);
      return null;
    }
  }

  /**
   * Optimized Supabase query with minimal data selection
   */
  async getProductsFromSupabase(options: ProductsServiceOptions = {}): Promise<PaginatedProductsResponse> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const orgId = this.getOrganizationId();
    if (!orgId) {
      console.warn('No organization selected, returning empty list');
      return {
        products: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }

    // Optimized select - solo campos necesarios para reducir payload
    let query = this.supabase
      .from('products')
      .select(`
        id, name, sku, description, cost_price, sale_price, 
        stock_quantity, min_stock, category_id, supplier_id,
        barcode, image_url, is_active, created_at, updated_at,
        category:categories!products_category_id_fkey(id, name),
        supplier:suppliers!products_supplier_id_fkey(id, name)
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    // Apply filters
    if (options.filters) {
      const { filters } = options;

      if (filters.search) {
        const searchTerm = filters.search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`);
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.lowStock) {
        // Low stock: stock_quantity <= min_stock
        query = query.lte('stock_quantity', 10);
      }

      if (filters.minPrice !== undefined) {
        query = query.gte('sale_price', filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        query = query.lte('sale_price', filters.maxPrice);
      }

      if (filters.minStock !== undefined) {
        query = query.gte('stock_quantity', filters.minStock);
      }

      if (filters.maxStock !== undefined) {
        query = query.lte('stock_quantity', filters.maxStock);
      }

      // Sorting
      if (filters.sortBy) {
        const ascending = filters.sortOrder === 'asc';
        query = query.order(filters.sortBy, { ascending });
      } else {
        query = query.order('updated_at', { ascending: false });
      }
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      products: (data || []).map((p: Record<string, unknown>) => this.normalizeProduct(p)),
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: count ? Math.ceil(count / limit) : 0
      }
    };
  }

  /**
   * Fallback API method (kept for compatibility)
   */
  private async getProductsFromAPI(options: ProductsServiceOptions = {}): Promise<PaginatedProductsResponse> {
    const params = new URLSearchParams();
    params.append('page', (options.page || 1).toString());
    params.append('limit', (options.limit || 20).toString());

    if (options.filters) {
      const { filters } = options;
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.lowStock) params.append('lowStock', 'true');
    }

    const response = await api.get(`/products?${params.toString()}`);

    if (!response.data) {
      throw new Error('Invalid response format');
    }

    return {
      products: (response.data.products || []).map((p: Record<string, unknown>) => this.normalizeProduct(p)),
      pagination: response.data.pagination || {
        page: options.page || 1,
        limit: options.limit || 20,
        total: 0,
        pages: 0
      }
    };
  }

  async getProductById(id: string): Promise<Product> {
    try {
      // Intentar primero con Supabase
      const orgId = this.getOrganizationId();
      if (orgId) {
        const { data, error } = await this.supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .eq('organization_id', orgId)
          .single();
        
        if (data && !error) return this.normalizeProduct(data);
      }

      const response = await api.get(`/products/${id}`);
      const raw = response.data.product || response.data;
      return this.normalizeProduct(raw);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      const response = await api.post('/products', productData);
      // Cache invalidation is now handled by useCache hook in components
      return this.normalizeProduct(response.data.product || response.data);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    try {
      const response = await api.put(`/products/${id}`, productData);
      // Cache invalidation is now handled by useCache hook in components
      return this.normalizeProduct(response.data.product || response.data);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await api.delete(`/products/${id}`);
      // Cache invalidation is now handled by useCache hook in components
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const orgId = this.getOrganizationId();
      if (orgId) {
        const { data, error } = await this.supabase
          .from('categories')
          .select('*')
          .eq('organization_id', orgId);
        
        if (data && !error) return data as Category[];
      }

      const response = await api.get('/categories/public');
      return response.data.categories || response.data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const orgId = this.getOrganizationId();
      if (orgId) {
        const { data, error } = await this.supabase
          .from('products')
          .select('*')
          .eq('organization_id', orgId)
          .lte('stock_quantity', threshold);
        
        if (data && !error) return data.map((p: Record<string, unknown>) => this.normalizeProduct(p));
      }

      const response = await api.get(`/products/low-stock?threshold=${threshold}`);
      return response.data.products || response.data || [];
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    try {
      const orgId = this.getOrganizationId();
      if (orgId) {
        const { data, error } = await this.supabase
          .from('products')
          .select('*')
          .eq('organization_id', orgId)
          .ilike('name', `%${query}%`)
          .limit(limit);
        
        if (data && !error) return data.map((p: Record<string, unknown>) => this.normalizeProduct(p));
      }

      const response = await api.get(`/products?search=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data.products || [];
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }


  // Método para prefetch de datos (optimización de carga)
  async prefetchNextPage(currentOptions: ProductsServiceOptions): Promise<void> {
    const nextPageOptions = {
      ...currentOptions,
      page: (currentOptions.page || 1) + 1
    };

    try {
      await this.getProducts(nextPageOptions);
    } catch (error) {
      // Silenciar errores de prefetch
      console.debug('Prefetch failed:', error);
    }

  }
}

// Singleton instance
export const productService = new ProductService();
export default productService;
