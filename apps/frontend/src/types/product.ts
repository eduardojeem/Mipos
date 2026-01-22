// Base Product interface matching the database schema
export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  supplier_id?: string | null;
  cost_price: number;
  sale_price: number;
  wholesale_price?: number | null;
  stock_quantity: number;
  min_stock: number;
  max_stock?: number | null;
  unit?: string | null;
  barcode?: string | null;
  qr_code?: string | null;
  weight?: number | null;
  dimensions?: {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  images?: string[] | null;
  tags?: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  is_digital: boolean;
  track_inventory: boolean;
  allow_backorder: boolean;
  is_taxable?: boolean; // Si el producto está sujeto a impuestos
  tax_rate?: number | null; // Tasa de IVA personalizada por producto
  iva_rate?: number; // Alias para tax_rate (compatibilidad)
  iva_included?: boolean; // Si el precio ya incluye IVA
  notes?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
}

// Product Category interface
export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  color?: string | null;
  icon?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// Product Brand interface
export interface ProductBrand {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  is_active: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// Product Supplier interface
export interface ProductSupplier {
  id: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  is_active: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// Product Inventory interface
export interface ProductInventory {
  id: string;
  product_id: string;
  branch_id?: string | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock: number;
  max_stock?: number | null;
  reorder_point?: number | null;
  last_counted_at?: string | null;
  last_adjusted_at?: string | null;
  adjustment_reason?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// Product Price History interface
export interface ProductPriceHistory {
  id: string;
  product_id: string;
  price_type: 'cost' | 'sale' | 'wholesale';
  old_price: number;
  new_price: number;
  reason?: string | null;
  effective_date?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  created_by?: string | null;
}

// Product Filters interface
export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  lowStock?: boolean;
  outOfStock?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  branchId?: string;
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  includeCategory?: boolean;
}

// Product Sort interface
export interface ProductSort {
  field: 'name' | 'sku' | 'sale_price' | 'cost_price' | 'stock_quantity' | 'created_at' | 'updated_at' | 'category_id';
  direction: 'asc' | 'desc';
}

// Product Pagination interface
export interface ProductPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Product Summary interface
export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  categoriesCount: number;
  brandsCount: number;
  averagePrice: number;
}

// Product Analytics interface
export interface ProductAnalytics {
  topSellingProducts: Array<{
    product: Product;
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;
  lowPerformingProducts: Array<{
    product: Product;
    lastSaleDate?: string;
    daysSinceLastSale: number;
    stockTurnover: number;
  }>;
  categoryPerformance: Array<{
    category: ProductCategory;
    productCount: number;
    totalRevenue: number;
    averagePrice: number;
  }>;
  priceRangeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  stockLevelDistribution: Array<{
    level: 'low' | 'normal' | 'high' | 'out_of_stock';
    count: number;
    percentage: number;
  }>;
}

// Product Import/Export interface
export interface ProductImportData {
  name: string;
  sku: string;
  description?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  cost_price: number;
  sale_price: number;
  wholesale_price?: number;
  stock_quantity: number;
  min_stock: number;
  max_stock?: number;
  unit?: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  is_digital?: boolean;
  track_inventory?: boolean;
  allow_backorder?: boolean;
  tax_rate?: number;
  notes?: string;
}

// Product Validation interface
export interface ProductValidation {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
    code: string;
  }[];
  warnings: {
    field: string;
    message: string;
    code: string;
  }[];
}

// Query Metrics interface for performance monitoring
export interface QueryMetrics {
  id: string;
  query: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
  retryCount: number;
  cacheHit: boolean;
  rowCount?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

// API Response interfaces
export interface ProductAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    duration: number;
    cacheHit?: boolean;
  };
}

export interface ProductListResponse extends ProductAPIResponse<{
  products: Product[];
  pagination: ProductPagination;
  summary?: ProductSummary;
}> { }

export interface ProductCreateResponse extends ProductAPIResponse<Product> { }

export interface ProductUpdateResponse extends ProductAPIResponse<Product> { }

export interface ProductDeleteResponse extends ProductAPIResponse<boolean> { }

// Real-time Event interfaces
export interface ProductRealTimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  product: Product;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Cache interfaces
export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictionCount: number;
  averageLoadTime: number;
}

// Error interfaces
export interface ProductError {
  code: string;
  message: string;
  field?: string;
  details?: any;
  timestamp: string;
  userId?: string;
  context?: string;
}

// Configuration interfaces
export interface ProductConfig {
  cache: {
    enabled: boolean;
    timeout: number;
    maxSize: number;
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  validation: {
    minPrice: number;
    maxPrice: number;
    minStock: number;
    maxStock: number;
  };
  realtime: {
    enabled: boolean;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
}