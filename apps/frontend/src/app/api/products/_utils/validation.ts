import { z } from 'zod'

/**
 * ✅ VALIDACIÓN MEJORADA CON SANITIZACIÓN Y VALIDACIONES CRUZADAS
 * Actualizado: 2025-11-24
 * 
 * Mejoras implementadas:
 * - Sanitización automática (trim, uppercase para SKU)
 * - Validaciones cruzadas (cost_price <= sale_price, max_stock >= min_stock)
 * - Transformaciones automáticas
 * - Validación de UUIDs
 * - Regex para SKU
 * - Mejor manejo de campos opcionales
 */

// Base schema sin validaciones cruzadas (para poder usar .partial())
const productBaseSchema = z.object({
  // Información básica
  name: z.string()
    .min(1, 'Nombre es requerido')
    .max(255, 'Nombre muy largo')
    .transform(val => val.trim()),

  sku: z.string()
    .min(1, 'SKU es requerido')
    .max(255, 'SKU muy largo')
    .regex(/^[A-Z0-9-_]+$/i, 'SKU solo puede contener letras, números, guiones y guiones bajos')
    .transform(val => val.toUpperCase().trim()),

  description: z.string()
    .max(2000, 'Descripción muy larga')
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),

  // Categoría y proveedor
  category_id: z.string()
    .uuid('ID de categoría inválido'),

  supplier_id: z.string()
    .uuid('ID de proveedor inválido')
    .optional()
    .nullable(),

  // Precios
  sale_price: z.number()
    .positive('Precio de venta debe ser positivo')
    .max(999999.99, 'Precio de venta muy alto')
    .refine(val => Number.isFinite(val), 'Precio de venta inválido'),

  cost_price: z.number()
    .positive('Precio de costo debe ser positivo')
    .max(999999.99, 'Precio de costo muy alto')
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || Number.isFinite(val), 'Precio de costo inválido'),

  wholesale_price: z.number()
    .positive('Precio mayorista debe ser positivo')
    .max(999999.99, 'Precio mayorista muy alto')
    .optional()
    .nullable(),

  // Inventario
  stock_quantity: z.number()
    .int('Cantidad debe ser un número entero')
    .min(0, 'Cantidad no puede ser negativa')
    .max(999999, 'Cantidad muy alta')
    .default(0),

  min_stock: z.number()
    .int('Stock mínimo debe ser un número entero')
    .min(0, 'Stock mínimo no puede ser negativo')
    .max(999999, 'Stock mínimo muy alto')
    .default(0),

  max_stock: z.number()
    .int('Stock máximo debe ser un número entero')
    .min(0, 'Stock máximo no puede ser negativo')
    .max(999999, 'Stock máximo muy alto')
    .optional()
    .nullable(),

  // Códigos
  barcode: z.string()
    .max(255, 'Código de barras muy largo')
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),

  // Descuentos
  discount_percentage: z.number()
    .min(0, 'Descuento no puede ser negativo')
    .max(100, 'Descuento no puede ser mayor a 100%')
    .optional()
    .nullable()
    .default(0),

  // IVA
  iva_rate: z.number()
    .min(0, 'IVA no puede ser negativo')
    .max(100, 'IVA no puede ser mayor a 100%')
    .optional()
    .nullable()
    .default(10),

  iva_included: z.boolean()
    .optional()
    .default(false),

  // Marca y detalles
  brand: z.string()
    .max(255, 'Marca muy larga')
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),

  shade: z.string()
    .max(200, 'Tono muy largo')
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),

  volume: z.string()
    .max(100, 'Volumen muy largo')
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),

  // Imagen
  image_url: z.string()
    .url('URL de imagen inválida')
    .max(2048, 'URL de imagen muy larga')
    .optional()
    .nullable(),

  // Estado
  is_active: z.boolean()
    .default(true),

  // Campos específicos de cosméticos (opcionales)
  cosmetic_type: z.enum([
    'FACIAL',
    'CORPORAL',
    'CAPILAR',
    'MAQUILLAJE',
    'FRAGANCIA',
    'ACCESORIOS',
    'OTRO'
  ]).optional().nullable(),

  skin_type: z.enum([
    'TODO',
    'SECA',
    'GRASA',
    'MIXTA',
    'SENSIBLE',
    'NORMAL'
  ]).optional().nullable(),

  ingredients: z.string()
    .max(5000, 'Lista de ingredientes muy larga')
    .optional()
    .nullable(),

  usage_instructions: z.string()
    .max(2000, 'Instrucciones muy largas')
    .optional()
    .nullable(),

  expiration_date: z.string()
    .datetime()
    .optional()
    .nullable(),

  batch_number: z.string()
    .max(255, 'Número de lote muy largo')
    .optional()
    .nullable(),
})

// Schema de creación con validaciones cruzadas
export const productCreateSchema = productBaseSchema
  // ✅ Validación cruzada: cost_price no puede ser mayor que sale_price
  .refine(
    data => !data.cost_price || !data.sale_price || data.cost_price <= data.sale_price,
    {
      message: 'El precio de costo no puede ser mayor que el precio de venta',
      path: ['cost_price'],
    }
  )
  // ✅ Validación: max_stock debe ser mayor que min_stock
  .refine(
    data => !data.max_stock || !data.min_stock || data.max_stock >= data.min_stock,
    {
      message: 'El stock máximo debe ser mayor o igual que el stock mínimo',
      path: ['max_stock'],
    }
  )

// Schema de actualización (sin validaciones cruzadas para permitir actualizaciones parciales)
export const productUpdateSchema = productBaseSchema.partial().extend({
  id: z.string().uuid('ID de producto inválido').optional()
})

export const productBulkUpdateSchema = z.object({
  updates: productUpdateSchema,
  filters: z.object({
    id: z.string().uuid('ID inválido').optional(),
    category: z.string().uuid('ID de categoría inválido').optional(),
    search: z.string().max(255, 'Búsqueda muy larga').optional(),
    lowStock: z.boolean().optional()
  }).optional()
})

export const productDeleteSchema = z.object({
  ids: z.array(z.string().uuid('ID de producto inválido')).min(1, 'Debe especificar al menos un ID')
})

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255, 'Búsqueda muy larga').optional(),
  category: z.string().uuid('ID de categoría inválido').optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  lowStock: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'sku', 'sale_price', 'cost_price', 'stock_quantity', 'created_at', 'updated_at', 'category_id', 'supplier_id']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc')
})

// ✅ Helpers de validación mejorados
export function validateCreate(body: any) {
  const result = productCreateSchema.safeParse(body)
  return result
}

export function validateUpdate(body: any) {
  const result = productUpdateSchema.safeParse(body)
  return result
}

export function validateBulkUpdate(body: any) {
  const result = productBulkUpdateSchema.safeParse(body)
  return result
}

export function validateDelete(body: any) {
  const result = productDeleteSchema.safeParse(body)
  return result
}

export function validateQuery(params: URLSearchParams) {
  const obj = Object.fromEntries(params.entries())
  const result = productQuerySchema.safeParse(obj)
  return result
}

// ✅ Tipos TypeScript derivados
export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type ProductQueryInput = z.infer<typeof productQuerySchema>
