import { z } from 'zod';

/**
 * Schema de validación para productos
 * Usado en formularios de creación y edición
 */

// Mensajes de error personalizados en español
const errorMessages = {
  required: 'Este campo es requerido',
  invalidType: 'Tipo de dato inválido',
  tooShort: (min: number) => `Debe tener al menos ${min} caracteres`,
  tooLong: (max: number) => `No puede exceder ${max} caracteres`,
  positive: 'Debe ser un número positivo',
  nonNegative: 'No puede ser negativo',
  integer: 'Debe ser un número entero',
  invalidFormat: 'Formato inválido',
  invalidSKU: 'SKU debe contener solo letras, números y guiones',
  invalidPrice: 'Precio inválido',
  stockBelowMin: 'Stock no puede ser menor que el stock mínimo',
  offerPriceHigher: 'Precio de oferta debe ser menor que el precio regular'
};

// Schema para SKU
const skuSchema = z
  .string({ required_error: errorMessages.required })
  .min(3, errorMessages.tooShort(3))
  .max(50, errorMessages.tooLong(50))
  .regex(/^[A-Z0-9-]+$/i, errorMessages.invalidSKU)
  .transform(val => val.toUpperCase());

// Schema para precios (en pesos colombianos, múltiplos de 1000)
const priceSchema = z
  .number({ required_error: errorMessages.required })
  .positive(errorMessages.positive)
  .multipleOf(1000, 'El precio debe ser múltiplo de 1000')
  .max(1000000000, 'Precio demasiado alto');

// Schema para stock
const stockSchema = z
  .number({ required_error: errorMessages.required })
  .int(errorMessages.integer)
  .nonnegative(errorMessages.nonNegative)
  .max(1000000, 'Cantidad demasiado alta');

// Schema base sin refinements para poder usar .partial()
const baseProductSchema = z.object({
  name: z
    .string({ required_error: errorMessages.required })
    .min(3, errorMessages.tooShort(3))
    .max(200, errorMessages.tooLong(200))
    .trim(),
  
  code: skuSchema,
  
  description: z
    .string()
    .max(1000, errorMessages.tooLong(1000))
    .optional()
    .nullable(),
  
  categoryId: z
    .string({ required_error: 'Debe seleccionar una categoría' })
    .uuid('ID de categoría inválido'),
  
  costPrice: priceSchema.optional().nullable(),
  price: priceSchema,
  wholesalePrice: priceSchema.optional().nullable(),
  offerActive: z.boolean().default(false),
  offerPrice: priceSchema.optional().nullable(),
  stock: stockSchema,
  minStock: stockSchema.default(5),
  supplierId: z
    .string()
    .uuid('ID de proveedor inválido')
    .optional()
    .nullable(),
  
  images: z
    .array(z.string().url('URL de imagen inválida'))
    .max(5, 'Máximo 5 imágenes')
    .optional()
    .default([]),
  
  brand: z.string().max(100).optional().nullable(),
  shade: z.string().max(50).optional().nullable(),
  volume: z.string().max(50).optional().nullable(),
  spf: z.number().int().min(0).max(100).optional().nullable(),
  finish: z.enum(['matte', 'glossy', 'satin', 'natural']).optional().nullable(),
  coverage: z.enum(['light', 'medium', 'full']).optional().nullable(),
  waterproof: z.boolean().default(false),
  vegan: z.boolean().default(false),
  cruelty_free: z.boolean().default(false),
  expiration_date: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  
  ivaRate: z
    .number()
    .min(0)
    .max(100)
    .default(19),
  
  ivaIncluded: z.boolean().default(true)
});

// Schema principal para crear producto (con validaciones cruzadas)
export const createProductSchema = baseProductSchema.refine(
  (data) => {
    // Validar que stock no sea menor que minStock
    if (data.stock < data.minStock) {
      return false;
    }
    return true;
  },
  {
    message: errorMessages.stockBelowMin,
    path: ['stock']
  }
).refine(
  (data) => {
    // Validar que offerPrice sea menor que price si está activa
    if (data.offerActive && data.offerPrice && data.offerPrice >= data.price) {
      return false;
    }
    return true;
  },
  {
    message: errorMessages.offerPriceHigher,
    path: ['offerPrice']
  }
).refine(
  (data) => {
    // Validar que costPrice sea menor que price si existe
    if (data.costPrice && data.costPrice >= data.price) {
      return false;
    }
    return true;
  },
  {
    message: 'Precio de costo debe ser menor que precio de venta',
    path: ['costPrice']
  }
);

// Schema para actualizar producto (todos los campos opcionales excepto ID)
export const updateProductSchema = baseProductSchema.partial().extend({
  id: z.string().uuid('ID de producto inválido')
});

// Schema para filtros de búsqueda
export const productFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  minPrice: priceSchema.optional(),
  maxPrice: priceSchema.optional(),
  minStock: stockSchema.optional(),
  maxStock: stockSchema.optional(),
  isActive: z.boolean().optional(),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'critical']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

// Schema para bulk operations
export const bulkProductSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un producto'),
  action: z.enum(['delete', 'activate', 'deactivate', 'update_category', 'update_price']),
  data: z.record(z.any()).optional()
});

// Tipos TypeScript inferidos de los schemas
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type BulkProductOperation = z.infer<typeof bulkProductSchema>;

// Helper para validar y obtener errores formateados
export function validateProduct(data: unknown, isUpdate = false) {
  const schema = isUpdate ? updateProductSchema : createProductSchema;
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.flatten();
    return {
      success: false,
      errors: errors.fieldErrors,
      message: 'Datos de producto inválidos'
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}

// Helper para validar filtros
export function validateFilters(data: unknown) {
  const result = productFiltersSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
      message: 'Filtros inválidos'
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}
