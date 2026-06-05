'use client';

import api from '@/lib/api';
import { Product, Category } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  /** Filtrar por stock bajo (usa min_stock real de cada producto) */
  lowStock?: boolean;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock' | 'critical';
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  sortBy?: 'name' | 'sku' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    /** Alias de total para compatibilidad */
    pages: number;
    totalPages: number;
    hasMore: boolean;
    hasPrev: boolean;
  };
}

export interface ProductsServiceOptions {
  page?: number;
  limit?: number;
  filters?: ProductFilters;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de normalización (usados en getProductById y CRUD responses)
// ─────────────────────────────────────────────────────────────────────────────

function toStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toNum(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toIso(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || value instanceof Date) {
    return new Date(value).toISOString();
  }
  return undefined;
}

function normalizeImages(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    const s = toStr(value);
    return s ? [s] : undefined;
  }
  const result = value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'url' in item) {
        return toStr((item as { url?: unknown }).url);
      }
      return undefined;
    })
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  return result.length > 0 ? result : undefined;
}

function normalizeProduct(raw: Record<string, unknown>): Product {
  const cat = raw.category && typeof raw.category === 'object'
    ? (raw.category as Record<string, unknown>)
    : null;
  const sup = raw.supplier && typeof raw.supplier === 'object'
    ? (raw.supplier as Record<string, unknown>)
    : null;

  return {
    id: String(raw.id),
    name: String(raw.name || ''),
    sku: String(raw.sku || raw.code || ''),
    description: toStr(raw.description),
    cost_price: Number(raw.cost_price ?? raw.costPrice ?? 0),
    sale_price: Number(raw.sale_price ?? raw.salePrice ?? raw.price ?? 0),
    wholesale_price: toNum(raw.wholesale_price ?? raw.wholesalePrice),
    min_wholesale_quantity: toNum(raw.min_wholesale_quantity),
    stock_quantity: Number(raw.stock_quantity ?? raw.stockQuantity ?? raw.stock ?? 0),
    min_stock: Number(raw.min_stock ?? raw.minStock ?? 0),
    max_stock: toNum(raw.max_stock),
    category_id: String(raw.category_id ?? raw.categoryId ?? ''),
    supplier_id: toStr(raw.supplier_id),
    barcode: toStr(raw.barcode),
    image_url: toStr(raw.image_url ?? raw.image),
    is_active: Boolean(raw.is_active ?? raw.isActive ?? true),
    regular_price: toNum(raw.regular_price),
    discount_percentage: toNum(raw.discount_percentage),
    rating: toNum(raw.rating),
    images: normalizeImages(raw.images),
    iva_rate: toNum(raw.iva_rate),
    iva_included: toBool(raw.iva_included),
    brand: toStr(raw.brand),
    shade: toStr(raw.shade),
    skin_type: toStr(raw.skin_type),
    ingredients: toStr(raw.ingredients),
    volume: toStr(raw.volume),
    spf: toNum(raw.spf),
    finish: toStr(raw.finish),
    coverage: toStr(raw.coverage),
    waterproof: toBool(raw.waterproof),
    vegan: toBool(raw.vegan),
    cruelty_free: toBool(raw.cruelty_free),
    expiration_date: toStr(raw.expiration_date),
    created_at: toIso(raw.created_at) ?? toIso(raw.createdAt) ?? new Date().toISOString(),
    updated_at: toIso(raw.updated_at) ?? toIso(raw.updatedAt) ?? new Date().toISOString(),
    category: cat
      ? ({ id: String(cat.id), name: String(cat.name || '') } as Category)
      : undefined,
    supplier: sup
      ? ({
          id: String(sup.id),
          name: String(sup.name || ''),
        } as Product['supplier'])
      : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

class ProductService {
  /**
   * Lista paginada de productos.
   * Usa /api/products/list como única fuente de verdad.
   * Este endpoint aplica filtros server-side incluyendo min_stock real por producto.
   */
  async getProducts(options: ProductsServiceOptions = {}): Promise<PaginatedProductsResponse> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const f = options.filters || {};
    if (f.search?.trim()) params.append('search', f.search.trim());
    if (f.categoryId) params.append('categoryId', f.categoryId);
    if (f.supplierId) params.append('supplierId', f.supplierId);
    if (f.isActive !== undefined) params.append('isActive', String(f.isActive));
    if (f.minPrice !== undefined) params.append('minPrice', String(f.minPrice));
    if (f.maxPrice !== undefined) params.append('maxPrice', String(f.maxPrice));
    if (f.minStock !== undefined) params.append('minStock', String(f.minStock));
    if (f.maxStock !== undefined) params.append('maxStock', String(f.maxStock));
    if (f.sortBy) params.append('sortBy', f.sortBy);
    if (f.sortOrder) params.append('sortOrder', f.sortOrder);

    // lowStock se mapea a stockStatus=low_stock para el endpoint unificado
    if (f.lowStock) params.append('stockStatus', 'low_stock');
    else if (f.stockStatus) params.append('stockStatus', f.stockStatus);

    const response = await api.get<{
      products: Record<string, unknown>[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
        hasPrev: boolean;
      };
    }>(`/products/list?${params.toString()}`);

    const data = response.data;
    const products = (data?.products || []).map(normalizeProduct);
    const pg = data?.pagination ?? { page, limit, total: 0, totalPages: 0, hasMore: false, hasPrev: false };

    return {
      products,
      pagination: {
        page: pg.page,
        limit: pg.limit,
        total: pg.total,
        pages: pg.totalPages,        // alias legacy
        totalPages: pg.totalPages,
        hasMore: pg.hasMore,
        hasPrev: pg.hasPrev,
      },
    };
  }

  /**
   * @deprecated Usar getProducts() que ahora usa /api/products/list directamente.
   * Mantenido para compatibilidad con callers que aún llamen a este método.
   */
  async getProductsFromSupabase(options: ProductsServiceOptions = {}): Promise<PaginatedProductsResponse> {
    return this.getProducts(options);
  }

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await api.get(`/products/${id}`);
      const raw = response.data?.product || response.data;
      return normalizeProduct(raw);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      const response = await api.post('/products', productData);
      return normalizeProduct(response.data?.product || response.data);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    try {
      const response = await api.put(`/products/${id}`, productData);
      return normalizeProduct(response.data?.product || response.data);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await api.delete(`/products/${id}`);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get('/products/categories');
      const payload = response.data;
      return (
        (Array.isArray(payload?.categories) ? payload.categories : []) ||
        (Array.isArray(payload) ? payload : [])
      );
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Productos con stock bajo. Usa /api/products/list con stockStatus=low_stock
   * para que el filtro use min_stock real de cada producto (no threshold hardcodeado).
   */
  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    try {
      const result = await this.getProducts({
        filters: { stockStatus: 'low_stock' },
        limit: 200,
      });
      return result.products;
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  async searchProducts(query: string, limit = 10): Promise<Product[]> {
    try {
      const result = await this.getProducts({
        filters: { search: query },
        limit,
      });
      return result.products;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /** Prefetch silencioso de la siguiente página. */
  async prefetchNextPage(currentOptions: ProductsServiceOptions): Promise<void> {
    try {
      await this.getProducts({
        ...currentOptions,
        page: (currentOptions.page || 1) + 1,
      });
    } catch {
      // silencioso — el prefetch no debe interrumpir la UI
    }
  }
}

// Singleton
export const productService = new ProductService();
export default productService;
