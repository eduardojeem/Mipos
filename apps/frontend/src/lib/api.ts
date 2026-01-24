 import axios, { AxiosError, AxiosResponse } from 'axios';
 import { createClient } from './supabase/client';
// NOTE: Do not import the UI store at module scope. It is client-only and
// importing it on the server can crash SSR/API routes due to localStorage usage.

function isMissingOrPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  const placeholderPatterns = [
    'your-supabase-url',
    'your-supabase-key',
    'replace-with-your',
    'placeholder',
    'example.com',
  ];
  if (placeholderPatterns.some((p) => lower.includes(p))) return true;
  const looksLikeKey = /^(?:[A-Za-z0-9_\-]+)\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(v);
  if (!looksLikeKey && !/^https?:\/\//.test(v)) return true;
  return false;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Helper function to calculate exponential backoff delay
const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const delay = Math.min(config.baseDelay * Math.pow(config.backoffMultiplier, attempt), config.maxDelay);
  return delay;
};

// Helper function to add jitter to delay
const addJitter = (delay: number): number => {
  const jitter = Math.random() * (delay * 0.3); // 0-30% jitter
  return delay + jitter;
};

// Helper function to check if error should be retried
const shouldRetry = (error: AxiosError, attempt: number, maxRetries: number): boolean => {
  if (attempt >= maxRetries) return false;

  // Retry on rate limiting (429)
  if (error.response?.status === 429) return true;

  // Retry on server errors (5xx)
  if (error.response?.status && error.response.status >= 500) return true;

  // Retry on network errors
  if (!error.response && (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch'))) return true;

  return false;
};

// Resolve base URL dynamically to avoid localhost port mismatches in development
function resolveBaseURL() {
  const envURL = process.env.NEXT_PUBLIC_API_URL;
  const backendURL = process.env.BACKEND_URL;

  // En el navegador, usar siempre el mismo origen con la ruta /api
  // Esto evita errores de red cuando el backend no está disponible
  // y asegura que las rutas Next.js (proxy/in-memory) funcionen.
  if (typeof window !== 'undefined') {
    try {
      const origin = window.location.origin;
      return `${origin}/api`;
    } catch {
      // Fallback relativo si falla el parsing
      return '/api';
    }
  }

  // En servidor, priorizar variables explícitas; ignorar placeholders
  if (!isMissingOrPlaceholder(envURL)) return envURL as string;
  if (!isMissingOrPlaceholder(backendURL)) return backendURL as string;

  // Fallback común para desarrollo: backend suele correr en 3000
  // Evita recursión cuando el frontend Next.js está en 3000
  return 'http://localhost:3000/api';
}

 // Create axios instance
const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token and toggle global loading
api.interceptors.request.use(
  async (config) => {
    const safeConfig: any = { ...config, headers: { ...(config.headers || {}) } };
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        safeConfig.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error: unknown) {
      console.error('Error getting session:', error);
    }
    try {
      const method = String((safeConfig.method || 'get')).toUpperCase();
      const isMutable = method !== 'GET';
      if (typeof window !== 'undefined' && isMutable) {
        const getCookie = (name: string) => {
          const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()\[\]\\\/\+^]/g, '\\$&') + '=([^;]*)'));
          return m ? decodeURIComponent(m[1]) : '';
        };
        let csrf = getCookie('csrf-token');
        if (!csrf && (window as any).crypto && typeof (window as any).crypto.randomUUID === 'function') {
          csrf = (window as any).crypto.randomUUID();
          document.cookie = `csrf-token=${csrf}; path=/; SameSite=Lax`;
        }
        if (csrf) {
          (safeConfig.headers as any)['x-csrf-token'] = csrf;
        }
      }
    } catch { }

    // Start global loading (only on client)
    try {
      if (typeof window !== 'undefined') {
        const mod = await import('@/store');
        const { useUIStore } = mod as any;
        const { startLoading } = useUIStore.getState();
        startLoading('Cargando datos...');
      }
    } catch (e) {
      // no-op if store not initialized or in server context
    }

    return safeConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and toggle global loading
api.interceptors.response.use(
  async (response: AxiosResponse) => {
    // Stop global loading
    try {
      if (typeof window !== 'undefined') {
        const mod = await import('@/store');
        const { useUIStore } = mod as any;
        const { stopLoading } = useUIStore.getState();
        stopLoading();
      }
    } catch (e) { }
    return response;
  },
  async (error: AxiosError) => {
    // Stop global loading on error as well (but keep specific loaders in components if needed)
    try {
      if (typeof window !== 'undefined') {
        const mod = await import('@/store');
        const { useUIStore } = mod as any;
        const { stopLoading } = useUIStore.getState();
        stopLoading();
      }
    } catch (e) { }

    const baseConfig: any = error.config || {};
    const originalRequest: any = { ...baseConfig, headers: { ...(baseConfig.headers || {}) } };

    // Initialize retry count and resolve limits/flags
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    const noRetry = Boolean(originalRequest._noRetry) || Boolean((originalRequest.headers || {})['X-No-Retry']);
    const maxRetries = typeof originalRequest._maxRetries === 'number'
      ? originalRequest._maxRetries
      : DEFAULT_RETRY_CONFIG.maxRetries;

    // Handle retryable errors (429, 5xx, network errors)
    if (!noRetry && shouldRetry(error, originalRequest._retryCount, maxRetries)) {
      originalRequest._retryCount++;

      const delay = addJitter(calculateDelay(originalRequest._retryCount - 1, DEFAULT_RETRY_CONFIG));
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };

// ============================================================================
// PRODUCTS API FUNCTIONS
// ============================================================================

export const productsAPI = {
  get: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    lowStock?: boolean;
    isActive?: boolean;
    sortBy?: 'name' | 'sku' | 'sale_price' | 'cost_price' | 'stock_quantity' | 'created_at' | 'updated_at' | 'category_id' | 'supplier_id';
    sortDirection?: 'asc' | 'desc';
    useFullTextSearch?: boolean; // Use GIN index for faster search
  }) => {
    try {
      const response = await api.get('/products', { params });
      const raw: any = response.data || {};
      const products = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.products) ? raw.products : Array.isArray(raw) ? raw : [];
      const pagination = raw?.pagination || {
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
        total: raw?.total || products.length,
        totalPages: Math.max(1, Math.ceil((raw?.total || products.length) / (params?.pageSize || 20))),
        hasMore: false
      };
      return { products, pagination };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  create: async (payload: any) => {
    try {
      const response = await api.post('/products', payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  update: async (id: string, updates: any) => {
    try {
      const response = await api.put('/products', { updates, filters: { id } });
      const raw = response.data || {};
      const updated = Array.isArray(raw?.data) ? raw.data[0] : raw?.product || raw;
      return updated;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  delete: async (ids: string[]) => {
    try {
      const response = await api.delete('/products', { data: { ids } });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// ============================================================================
// INVENTORY API FUNCTIONS
// ============================================================================

export const inventoryAPI = {
  // Get inventory movements with pagination and filters
  getMovements: async (params?: {
    page?: number;
    limit?: number;
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await api.get('/inventory/movements', { params });
      const raw: any = response.data;
      const movements = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.movements)
          ? raw.movements
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
      const pagination = raw?.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 50,
        total: movements.length,
        pages: 1
      };
      return { movements, pagination };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Get inventory summary
  getStats: async () => {
    try {
      const response = await api.get('/inventory/summary');
      const raw: any = response.data;
      return raw?.data ?? raw;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Get movements for a specific product
  getProductMovements: async (productId: string, params?: { page?: number; limit?: number }) => {
    try {
      const response = await api.get(`/inventory/movements/${productId}`, { params });
      const raw: any = response.data;
      const movements = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.movements)
          ? raw.movements
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
      const pagination = raw?.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 50,
        total: movements.length,
        pages: 1
      };
      return { movements, pagination };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Adjust stock for a product
  adjustStock: async (productId: string, quantity: number, reason: string) => {
    try {
      const response = await api.post('/inventory/adjust', {
        productId,
        quantity,
        reason
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Bulk adjust stock for multiple products
  bulkAdjustStock: async (adjustments: Array<{ productId: string; quantity: number; reason: string }>) => {
    try {
      const response = await api.post('/inventory/bulk-adjust', { adjustments });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// Helper function to handle API errors
export function getErrorMessage(error: AxiosError | Error | any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    const firstError = Object.values(errors)[0] as string[];
    return firstError?.[0] || 'Error desconocido';
  }

  if (error.message) {
    return error.message;
  }

  return 'Error desconocido';
}

// Helper function to check if error is network error
export function isNetworkError(error: AxiosError | Error | any): boolean {
  return !error.response && error.code === 'NETWORK_ERROR';
}

// Helper function to check if error is timeout
export function isTimeoutError(error: AxiosError | Error | any): boolean {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout');
}

// Helper function to check if error is server error
export function isServerError(error: AxiosError | Error | any): boolean {
  return error.response?.status >= 500;
}

// Helper function to check if error is client error
export function isClientError(error: AxiosError | Error | any): boolean {
  return error.response?.status >= 400 && error.response?.status < 500;
}

// ============================================================================
// SALES API FUNCTIONS
// ============================================================================

export interface CreateSaleItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleData {
  customerId?: string;
  items: CreateSaleItemData[];
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER' | 'MIXED';
  discount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  tax?: number;
  notes?: string;
  cashReceived?: number; // Para cálculo de vuelto
  change?: number; // Vuelto a devolver
  cardDetails?: {
    lastFourDigits?: string;
    cardType?: string;
    authorizationCode?: string;
  };
  mixedPayments?: Array<{
    type: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
    amount: number;
    details?: {
      lastFourDigits?: string;
      cardType?: string;
      authorizationCode?: string;
      reference?: string;
    };
  }>;
}

export interface SaleResponse {
  id: string;
  saleNumber: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  customerId?: string;
  userId: string;
  notes?: string;
  createdAt: string;
  transferReference?: string;
  cashReceived?: number;
  change?: number;
  mixedPayments?: Array<{
    type: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
    amount: number;
    details?: {
      lastFourDigits?: string;
      cardType?: string;
      authorizationCode?: string;
      reference?: string;
    };
  }>;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discountAmount: number;
  }>;
}

export interface ReceiptResponse {
  saleId: string;
  receiptNumber: string;
  downloadUrl: string;
  printUrl: string;
  qrCode?: string;
}

export interface CashCalculationResponse {
  total: number;
  cashReceived: number;
  change: number;
  requiresChange: boolean;
}

export const salesAPI = {
  // Crear una nueva venta
  createSale: async (saleData: CreateSaleData): Promise<SaleResponse> => {
    try {
      const response = await api.post('/sales', saleData);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Obtener detalles de una venta
  getSale: async (saleId: string): Promise<SaleResponse> => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Obtener recibo de venta
  getReceipt: async (saleId: string): Promise<ReceiptResponse> => {
    try {
      const response = await api.get(`/sales/${saleId}/receipt`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Calcular vuelto para pagos en efectivo
  calculateChange: async (total: number, cashReceived: number): Promise<CashCalculationResponse> => {
    try {
      const response = await api.post('/sales/calculate-change', { total, cashReceived });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Anular venta
  cancelSale: async (saleId: string, reason?: string): Promise<void> => {
    try {
      await api.patch(`/sales/${saleId}/cancel`, { reason });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Obtener ventas recientes
  getRecentSales: async (limit: number = 5): Promise<SaleResponse[]> => {
    try {
      const response = await api.get(`/sales/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // Validar stock antes de venta
  validateStock: async (items: Array<{ productId: string; quantity: number }>): Promise<{
    valid: boolean;
    invalidItems: Array<{ productId: string; availableStock: number; requestedQuantity: number }>;
  }> => {
    try {
      const response = await api.post('/sales/validate-stock', { items });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};
