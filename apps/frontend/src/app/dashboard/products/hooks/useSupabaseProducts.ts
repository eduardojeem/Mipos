"use client";

/**
 * useSupabaseProducts — refactorizado para usar /api/products/list como
 * única fuente de verdad.
 *
 * Antes hacía queries directas a Supabase desde el cliente. Ahora delega al
 * endpoint /api/products/list que:
 *   - aplica filtros server-side con min_stock real por producto
 *   - es multi-tenant por design (organization_id en server)
 *   - tiene fallback de join automático
 *   - es la misma ruta que useOptimizedProducts y productService
 *
 * La interfaz de retorno es idéntica a la versión anterior para que
 * useHybridProducts y ProductsContext no necesiten cambios.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useSupabase } from "@/hooks/use-supabase";
import type { Product, Category } from "@/types";
import type { ProductFilters as UnifiedProductFilters } from "@/hooks/use-products";
import type { CreateProductData, UpdateProductData } from "@/types/supabase";
import { createLogger } from "@/lib/logger";
import { toast } from "@/lib/toast";

type StockStatus = "out_of_stock" | "low_stock" | "in_stock" | "critical";

interface CompatibleFilters extends Partial<UnifiedProductFilters> {
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  stockStatus?: StockStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "name" | "sku" | "sale_price" | "stock_quantity" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
  createdAfter?: string;
  createdBefore?: string;
  sort_direction?: "asc" | "desc";
}

export interface UseSupabaseProductsOptions {
  filters?: Partial<UnifiedProductFilters>;
  enableRealtime?: boolean;
  pageSize?: number;
  page?: number;
}

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentlyAdded: number;
  topCategory: string;
}

const logger = createLogger("SupabaseProducts");

// ─────────────────────────────────────────────────────────────────────────────
// Shared realtime channel registry (por organización).
// N instancias del hook → 1 sola conexión Supabase Realtime.
// ─────────────────────────────────────────────────────────────────────────────
type ProductChangeCallback = (payload: RealtimePostgresChangesPayload<Product>) => void;

interface ChannelEntry {
  channel: ReturnType<ReturnType<typeof useSupabase>["supabase"]["channel"]>;
  listeners: Set<ProductChangeCallback>;
}

const channelRegistry = new Map<string, ChannelEntry>();

function subscribeToProductChanges(
  supabase: ReturnType<typeof useSupabase>["supabase"],
  orgId: string | null,
  callback: ProductChangeCallback,
): () => void {
  const key = orgId ? `products:${orgId}` : "products:global";
  let entry = channelRegistry.get(key);

  if (!entry) {
    const filter = orgId
      ? { event: "*" as const, schema: "public", table: "products", filter: `organization_id=eq.${orgId}` }
      : { event: "*" as const, schema: "public", table: "products" };

    const listeners = new Set<ProductChangeCallback>();
    const channel = supabase
      .channel(orgId ? `products-rt-${orgId}` : "products-rt")
      .on("postgres_changes", filter, (payload: RealtimePostgresChangesPayload<Product>) => {
        listeners.forEach((cb) => { try { cb(payload); } catch (e) { logger.error("listener error:", e); } });
      })
      .subscribe();

    entry = { channel, listeners };
    channelRegistry.set(key, entry);
  }

  entry.listeners.add(callback);

  return () => {
    const current = channelRegistry.get(key);
    if (!current) return;
    current.listeners.delete(callback);
    if (current.listeners.size === 0) {
      try { supabase.removeChannel(current.channel); } catch { /* best effort */ }
      channelRegistry.delete(key);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper para leer/generar el token CSRF del cliente
// El axios interceptor hace esto automáticamente, pero fetch() nativo no.
// ─────────────────────────────────────────────────────────────────────────────
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf-token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  // Generar y persistir uno nuevo si no existe
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  document.cookie = `csrf-token=${token}; path=/; SameSite=Lax`;
  return token;
}

function getOrgId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("selected_organization");
    if (!raw) return null;
    try { const p = JSON.parse(raw); return p?.id || p?.organization_id || null; }
    catch { return raw; }
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para construir URLSearchParams a partir de los filtros
// ─────────────────────────────────────────────────────────────────────────────
function buildParams(
  cf: CompatibleFilters,
  page: number,
  pageSize: number,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });

  const search = cf.search;
  if (search) params.append("search", search);

  const categoryId = cf.categoryId ?? cf.category_id;
  if (categoryId) params.append("categoryId", categoryId);

  const supplierId = cf.supplierId ?? cf.supplier_id;
  if (supplierId) params.append("supplierId", supplierId);

  const isActive = cf.isActive ?? cf.is_active;
  if (isActive !== undefined) params.append("isActive", String(isActive));

  const minPrice = cf.minPrice ?? cf.min_price;
  if (minPrice !== undefined) params.append("minPrice", String(minPrice));

  const maxPrice = cf.maxPrice ?? cf.max_price;
  if (maxPrice !== undefined) params.append("maxPrice", String(maxPrice));

  const minStock = cf.minStock ?? cf.min_stock;
  if (minStock !== undefined) params.append("minStock", String(minStock));

  const maxStock = cf.maxStock ?? cf.max_stock;
  if (maxStock !== undefined) params.append("maxStock", String(maxStock));

  if (cf.stockStatus) params.append("stockStatus", cf.stockStatus);

  const sortBy = cf.sortBy ?? cf.sort_by;
  if (sortBy) params.append("sortBy", sortBy);

  const sortOrder = cf.sortOrder ?? cf.sort_direction ?? cf.sortOrder;
  if (sortOrder) params.append("sortOrder", sortOrder);

  const dateFrom = cf.dateFrom ?? cf.created_after ?? cf.createdAfter;
  if (dateFrom) params.append("dateFrom", dateFrom);

  const dateTo = cf.dateTo ?? cf.created_before ?? cf.createdBefore;
  if (dateTo) params.append("dateTo", dateTo);

  return params;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useSupabaseProducts(options: UseSupabaseProductsOptions = {}) {
  const { filters = {}, enableRealtime = false, pageSize = 25, page = 1 } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    recentlyAdded: 0,
    topCategory: "",
  });

  const { supabase, createProduct: supabaseCreate, updateProduct: supabaseUpdate, deleteProduct: supabaseDelete } = useSupabase();

  const filtersRef = useRef(filters);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);

  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);

  // Estadísticas globales desde el endpoint summary
  const fetchGlobalStats = useCallback(async () => {
    try {
      const orgId = getOrgId();
      const response = await fetch("/api/products/summary", {
        headers: orgId ? { "x-organization-id": orgId } : undefined,
      });
      if (!response.ok) return;
      const stats = await response.json();
      setDashboardStats(stats);
    } catch (e) {
      logger.error("Error fetching stats:", e);
    }
  }, []);

  // Categorías (cached 5 min en localStorage)
  const loadCategories = useCallback(async () => {
    try {
      const cached = localStorage.getItem("supabase-categories-cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < 300_000) {
          setCategories(parsed.data);
          return;
        }
      }
      const response = await fetch("/api/products/categories");
      if (!response.ok) return;
      const payload = await response.json();
      const data = Array.isArray(payload?.categories) ? payload.categories : (Array.isArray(payload) ? payload : []);
      setCategories(data);
      localStorage.setItem("supabase-categories-cache", JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      logger.error("Error loading categories:", e);
    }
  }, []);

  // Carga principal — delega a /api/products/list
  const loadProducts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const orgId = getOrgId();
      const params = buildParams(filtersRef.current as CompatibleFilters, pageRef.current, pageSizeRef.current);

      const response = await fetch(`/api/products/list?${params.toString()}`, {
        headers: orgId ? { "x-organization-id": orgId } : undefined,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rows: Product[] = data?.products || [];
      const pg = data?.pagination || {};

      setProducts(rows);
      setTotal(pg.total ?? rows.length);
      setHasMore(pg.hasMore ?? false);

      await loadCategories();
      fetchGlobalStats();
    } catch (err: any) {
      logger.error("Error loading products:", err);
      setError(String(err?.message || err || "Error loading products"));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [loadCategories, fetchGlobalStats]);

  // Refetch con opciones opcionales de página
  const refetch = useCallback(async (opts?: { page?: number; pageSize?: number }) => {
    if (opts?.page) pageRef.current = opts.page;
    if (opts?.pageSize) pageSizeRef.current = opts.pageSize;
    await loadProducts();
  }, [loadProducts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    pageRef.current += 1;
    await loadProducts(false);
  }, [hasMore, isLoading, loadProducts]);

  // CRUD — escribe via API routes (no Supabase directo)
  const createProduct = useCallback(async (productData: CreateProductData) => {
    try {
      const orgId = getOrgId();
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success("Producto creado exitosamente");
      await refetch();
      return true;
    } catch (err) {
      logger.error("Error creating product:", err);
      toast.error("Error al crear producto");
      return false;
    }
  }, [refetch]);

  const updateProduct = useCallback(async (id: string, productData: UpdateProductData) => {
    try {
      const orgId = getOrgId();
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success("Producto actualizado exitosamente");
      await refetch();
      return true;
    } catch (err) {
      logger.error("Error updating product:", err);
      toast.error("Error al actualizar producto");
      return false;
    }
  }, [refetch]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const orgId = getOrgId();
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "x-csrf-token": getCsrfToken(),
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success("Producto eliminado exitosamente");
      await refetch();
      return true;
    } catch (err) {
      logger.error("Error deleting product:", err);
      toast.error("Error al eliminar producto");
      return false;
    }
  }, [refetch]);

  const clearCache = useCallback(() => {
    localStorage.removeItem("supabase-categories-cache");
  }, []);

  // Realtime — sigue usando Supabase para notificaciones de cambios
  // pero los datos se recargan desde /api/products/list
  useEffect(() => {
    if (!enableRealtime) return;
    const orgId = getOrgId();
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const handler = (_payload: RealtimePostgresChangesPayload<Product>) => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => { debounce = null; void loadProducts(false); }, 400);
    };

    const unsubscribe = subscribeToProductChanges(supabase, orgId, handler);
    return () => {
      if (debounce) clearTimeout(debounce);
      unsubscribe();
    };
  }, [enableRealtime, supabase, loadProducts]);

  // Carga inicial
  useEffect(() => { void loadProducts(); }, [loadProducts]);

  return {
    products,
    categories,
    isLoading,
    error,
    total,
    hasMore,
    dashboardStats,
    pagination: { page: pageRef.current, pageSize: pageSizeRef.current, total },
    refetch,
    loadMore,
    createProduct,
    updateProduct,
    deleteProduct,
    clearCache,
  };
}
