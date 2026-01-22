/**
 * Tipos Unificados de Product para BeautyPOS
 * 
 * Este archivo centraliza TODOS los tipos relacionados con productos
 * para evitar duplicación y mantener consistencia en todo el sistema.
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

/**
 * Entidad Product desde la base de datos
 * Incluye TODOS los campos tal como vienen de Supabase
 */
export interface ProductEntity {
    // Identificadores
    id: string
    sku: string
    barcode?: string | null

    // Información básica
    name: string
    description?: string | null
    brand?: string | null

    // Precios
    cost_price: number
    sale_price: number
    wholesale_price?: number | null

    // Inventario
    stock_quantity: number
    min_stock: number
    max_stock?: number | null
    reorder_point?: number | null

    // Relaciones
    category_id: string
    supplier_id?: string | null

    // Imágenes
    image_url?: string | null
    images?: string[] | null

    // Detalles cosméticos
    ingredients?: string | null
    usage_instructions?: string | null
    warnings?: string | null
    expiration_date?: string | null
    batch_number?: string | null
    manufacturing_date?: string | null

    // Dimensiones y peso
    weight?: number | null
    weight_unit?: 'g' | 'kg' | 'ml' | 'l' | null
    dimensions?: {
        length?: number
        width?: number
        height?: number
        unit?: 'cm' | 'mm' | 'm'
    } | null

    // Estado
    is_active: boolean
    is_featured?: boolean | null
    is_taxable?: boolean | null
    tax_rate?: number | null

    // Metadata
    created_at: string
    updated_at: string
    created_by?: string | null
    updated_by?: string | null

    // Campos adicionales
    notes?: string | null
    tags?: string[] | null
}

/**
 * Product con relaciones cargadas (para display)
 */
export interface ProductWithRelations extends ProductEntity {
    category?: {
        id: string
        name: string
        description?: string | null
    }
    supplier?: {
        id: string
        name: string
        email?: string | null
        phone?: string | null
    }
}

// ============================================================================
// TIPOS PARA OPERACIONES
// ============================================================================

/**
 * Datos para crear un producto (sin campos auto-generados)
 */
export type ProductCreateInput = Omit<
    ProductEntity,
    'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'
>

/**
 * Datos para actualizar un producto (todos opcionales excepto id)
 */
export type ProductUpdateInput = Partial<
    Omit<ProductEntity, 'id' | 'created_at' | 'created_by'>
> & {
    id: string
}

/**
 * Datos para formularios (sin campos de sistema)
 */
export type ProductFormValues = Omit<
    ProductCreateInput,
    'created_at' | 'updated_at' | 'created_by' | 'updated_by'
>

/**
 * Datos mínimos de producto (para listas y selects)
 */
export interface ProductSummary {
    id: string
    sku: string
    name: string
    sale_price: number
    stock_quantity: number
    image_url?: string | null
    is_active: boolean
}

// ============================================================================
// TIPOS PARA FILTROS Y BÚSQUEDA
// ============================================================================

/**
 * Filtros para búsqueda de productos
 */
export interface ProductFilters {
    // Búsqueda de texto
    search?: string

    // Filtros de categoría y proveedor
    category_id?: string
    supplier_id?: string
    supplierName?: string

    // Filtros de precio
    min_price?: number
    max_price?: number
    minPrice?: number
    maxPrice?: number

    // Filtros de stock
    min_stock?: number
    max_stock?: number
    minStock?: number
    maxStock?: number
    low_stock?: boolean // Stock <= min_stock
    lowStock?: boolean
    outOfStock?: boolean
    inStock?: boolean
    critical?: boolean
    lowStockThreshold?: number
    criticalThreshold?: number

    // Filtros de estado
    is_active?: boolean
    isActive?: boolean
    is_featured?: boolean

    // Filtros de fecha
    created_after?: string
    created_before?: string
    createdAfter?: string
    createdBefore?: string
    updated_after?: string
    updated_before?: string

    // Opciones de inclusión de relaciones
    includeCategory?: boolean
    includeSupplier?: boolean

    // Paginación
    page?: number
    limit?: number

    // Ordenamiento
    sort_by?: 'name' | 'sku' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at'
    sort_direction?: 'asc' | 'desc'
}

/**
 * Opciones de ordenamiento de productos
 */
export interface ProductSort {
    field: 'name' | 'sku' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at'
    direction: 'asc' | 'desc'
}

/**
 * Resultado de búsqueda de productos
 */
export interface ProductSearchResult {
    products: ProductWithRelations[]
    total: number
    page: number
    limit: number
    total_pages: number
}

// ============================================================================
// TIPOS PARA API RESPONSES
// ============================================================================

/**
 * Respuesta exitosa de la API
 */
export interface ProductApiResponse<T = ProductEntity> {
    success: true
    data: T
    metadata?: {
        timestamp: string
        requestId: string
        duration?: number
        syncResolution?: 'created_new' | 'updated_existing' | 'kept_server_version'
        localId?: string
    }
}

/**
 * Respuesta de error de la API
 */
export interface ProductApiError {
    success: false
    error: {
        code: string
        message: string
        details?: any
    }
}

/**
 * Respuesta de lista de productos
 */
export interface ProductListResponse {
    success: true
    data: {
        products: ProductWithRelations[]
        total: number
        page: number
        limit: number
    }
    metadata?: {
        timestamp: string
        requestId: string
        duration?: number
    }
}

// ============================================================================
// TIPOS PARA IMPORTACIÓN/EXPORTACIÓN
// ============================================================================

/**
 * Datos para importación masiva
 */
export interface ProductImportData {
    sku: string
    name: string
    description?: string
    cost_price: number
    sale_price: number
    stock_quantity: number
    min_stock: number
    category_id: string
    supplier_id?: string
    barcode?: string
    image_url?: string
    is_active?: boolean
}

/**
 * Resultado de importación
 */
export interface ProductImportResult {
    success: number
    failed: number
    errors: Array<{
        row: number
        sku: string
        error: string
    }>
}

/**
 * Datos para exportación
 */
export interface ProductExportData extends ProductEntity {
    category_name?: string
    supplier_name?: string
}

// ============================================================================
// TIPOS PARA VALIDACIÓN
// ============================================================================

/**
 * Errores de validación
 */
export interface ProductValidationError {
    field: keyof ProductEntity
    message: string
    code: string
}

/**
 * Resultado de validación
 */
export interface ProductValidationResult {
    valid: boolean
    errors: ProductValidationError[]
}

// ============================================================================
// TIPOS PARA STOCK
// ============================================================================

/**
 * Movimiento de stock
 */
export interface StockMovement {
    id: string
    product_id: string
    type: 'IN' | 'OUT' | 'ADJUSTMENT'
    quantity: number
    previous_quantity: number
    new_quantity: number
    reason?: string
    reference?: string // ID de venta, compra, etc.
    created_at: string
    created_by?: string
}

/**
 * Alerta de stock bajo
 */
export interface LowStockAlert {
    product_id: string
    sku: string
    name: string
    current_stock: number
    min_stock: number
    difference: number
    severity: 'low' | 'critical' | 'out_of_stock'
}

// ============================================================================
// TIPOS PARA PRECIOS
// ============================================================================

/**
 * Historial de precios
 */
export interface PriceHistory {
    id: string
    product_id: string
    price_type: 'cost' | 'sale' | 'wholesale'
    old_price: number
    new_price: number
    changed_at: string
    changed_by?: string
    reason?: string
}

/**
 * Cálculo de precio con impuestos
 */
export interface PriceCalculation {
    base_price: number
    tax_rate: number
    tax_amount: number
    final_price: number
}

// ============================================================================
// CONSTANTES Y ENUMS
// ============================================================================

/**
 * Unidades de peso
 */
export const WEIGHT_UNITS = ['g', 'kg', 'ml', 'l'] as const
export type WeightUnit = typeof WEIGHT_UNITS[number]

/**
 * Unidades de dimensión
 */
export const DIMENSION_UNITS = ['cm', 'mm', 'm'] as const
export type DimensionUnit = typeof DIMENSION_UNITS[number]

/**
 * Tipos de movimiento de stock
 */
export const STOCK_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'] as const
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number]

/**
 * Niveles de severidad de alerta de stock
 */
export const STOCK_ALERT_SEVERITY = ['low', 'critical', 'out_of_stock'] as const
export type StockAlertSeverity = typeof STOCK_ALERT_SEVERITY[number]

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Verifica si un objeto es un ProductEntity válido
 */
export function isProductEntity(obj: any): obj is ProductEntity {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.sku === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.cost_price === 'number' &&
        typeof obj.sale_price === 'number' &&
        typeof obj.stock_quantity === 'number' &&
        typeof obj.min_stock === 'number' &&
        typeof obj.category_id === 'string' &&
        typeof obj.is_active === 'boolean'
    )
}

/**
 * Verifica si un objeto es un ProductWithRelations válido
 */
export function isProductWithRelations(obj: any): obj is ProductWithRelations {
    return (
        isProductEntity(obj) &&
        ('category' in obj ? (obj.category === undefined || (typeof obj.category === 'object' && obj.category !== null)) : true)
    )
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convierte ProductEntity a ProductSummary
 */
export function toProductSummary(product: ProductEntity): ProductSummary {
    return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        sale_price: product.sale_price,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url,
        is_active: product.is_active
    }
}

/**
 * Calcula el margen de ganancia
 */
export function calculateMargin(product: ProductEntity): number {
    if (product.cost_price === 0) return 0
    return ((product.sale_price - product.cost_price) / product.cost_price) * 100
}

/**
 * Verifica si el producto tiene stock bajo
 */
export function hasLowStock(product: ProductEntity): boolean {
    return product.stock_quantity <= product.min_stock
}

/**
 * Verifica si el producto está agotado
 */
export function isOutOfStock(product: ProductEntity): boolean {
    return product.stock_quantity === 0
}

/**
 * Calcula el nivel de severidad de stock
 */
export function getStockSeverity(product: ProductEntity): StockAlertSeverity {
    if (product.stock_quantity === 0) return 'out_of_stock'
    if (product.stock_quantity <= product.min_stock / 2) return 'critical'
    if (product.stock_quantity <= product.min_stock) return 'low'
    return 'low' // Fallback
}

// ============================================================================
// TIPOS PARA ERRORES
// ============================================================================

/**
 * Interface para errores de productos
 */
export interface IProductError {
    code: string
    message: string
    details?: any
    timestamp?: string
    userId?: string
    context?: string
    field?: string
}

/**
 * Error específico de productos (clase)
 */
export class ProductError extends Error implements IProductError {
    constructor(
        message: string,
        public code: string,
        public details?: any,
        public timestamp?: string,
        public userId?: string,
        public context?: string,
        public field?: string
    ) {
        super(message)
        this.name = 'ProductError'
    }
}

// ============================================================================
// TIPOS PARA MÉTRICAS Y PERFORMANCE
// ============================================================================

/**
 * Métricas de consulta
 */
export interface QueryMetrics {
    id?: string
    query: string
    duration: number
    timestamp: string
    cached: boolean
    cacheHit?: boolean
    recordCount?: number
    success?: boolean
    error?: string
    retryCount?: number
}

/**
 * Métricas de caché
 */
export interface CacheMetrics {
    hits: number
    misses: number
    size: number
    hitRate: number
    lastCleared?: string
}

