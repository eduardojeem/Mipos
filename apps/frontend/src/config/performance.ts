// Configuración de optimización de rendimiento
// Generado automáticamente por apply-database-optimizations.js

export const PERFORMANCE_CONFIG = {
  // Límites de paginación optimizados
  PAGINATION: {
    RECENT_SALES_LIMIT: 10,
    TOP_PRODUCTS_LIMIT: 5,
    LOW_STOCK_LIMIT: 20,
    SEARCH_RESULTS_LIMIT: 50,
    MAX_CONCURRENT_QUERIES: 4,
    CUSTOMERS_PER_PAGE: 20, // Optimizado para el dashboard de clientes
    CUSTOMERS_SEARCH_LIMIT: 100
  },
  
  // Configuración de caché
  CACHE: {
    STATS_TTL: 5 * 60 * 1000, // 5 minutos
    PRODUCTS_TTL: 10 * 60 * 1000, // 10 minutos
    SALES_TTL: 2 * 60 * 1000, // 2 minutos
    CUSTOMERS_TTL: 15 * 60 * 1000, // 15 minutos para clientes
    CUSTOMER_STATS_TTL: 10 * 60 * 1000 // 10 minutos para estadísticas
  },
  
  // Configuración de lazy loading
  LAZY_LOADING: {
    THRESHOLD: 100, // px antes del final para cargar más
    DEBOUNCE_MS: 300, // ms para debounce en búsquedas
    RETRY_ATTEMPTS: 3, // intentos de reintento en errores
    INTERSECTION_THRESHOLD: 0.1 // umbral para intersection observer
  },
  
  // Métricas de rendimiento esperadas
  PERFORMANCE_TARGETS: {
    INITIAL_LOAD_MS: 1200,
    SEARCH_RESPONSE_MS: 300,
    PAGINATION_MS: 200,
    LAZY_LOAD_MS: 150,
    CUSTOMER_LOAD_MS: 400 // tiempo objetivo para carga de clientes
  }
};

// Configuración de consultas optimizadas
export const QUERY_OPTIMIZATIONS = {
  // Campos específicos para cada consulta
  SALES_FIELDS: 'id, total, payment_method, created_at, customer_name',
  PRODUCTS_FIELDS: 'id, name, sku, sale_price, stock_quantity, category_id',
  LOW_STOCK_FIELDS: 'id, name, stock_quantity, min_stock',
  CUSTOMERS_FIELDS: 'id, name, email, phone, customer_code, customer_type, is_active, total_spent, total_orders, created_at',
  CUSTOMER_STATS_FIELDS: 'COUNT(*) as total, COUNT(CASE WHEN is_active = true THEN 1 END) as active, SUM(total_spent) as total_sales, COUNT(CASE WHEN customer_type = \'VIP\' THEN 1 END) as vip',
  
  // Configuración de ordenamiento
  DEFAULT_SORT: {
    sales: { field: 'created_at', ascending: false },
    products: { field: 'name', ascending: true },
    categories: { field: 'name', ascending: true },
    customers: { field: 'created_at', ascending: false }
  }
};

// Configuración de memoización para React
export const MEMO_CONFIG = {
  // Componentes que deben ser memoizados
  MEMO_COMPONENTS: [
    'CustomerCard',
    'CustomerTable',
    'CustomerStats',
    'CustomerFilters',
    'PaginationControls'
  ],
  
  // Dependencias para useCallback
  CALLBACK_DEPS: {
    search: ['searchTerm', 'filters'],
    pagination: ['currentPage', 'itemsPerPage'],
    sort: ['sortField', 'sortDirection']
  }
};
