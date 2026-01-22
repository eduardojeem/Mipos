import { z } from 'zod'

/**
 * Schema de validación para items de venta
 */
export const saleItemSchema = z.object({
    product_id: z.string()
        .uuid('ID de producto inválido'),

    quantity: z.number()
        .int('Cantidad debe ser un número entero')
        .positive('Cantidad debe ser positiva')
        .max(9999, 'Cantidad muy alta'),

    unit_price: z.number()
        .positive('Precio unitario debe ser positivo')
        .max(999999.99, 'Precio unitario muy alto'),

    discount_amount: z.number()
        .min(0, 'Descuento no puede ser negativo')
        .max(999999.99, 'Descuento muy alto')
        .optional()
        .default(0),

    tax_amount: z.number()
        .min(0, 'IVA no puede ser negativo')
        .max(999999.99, 'IVA muy alto')
        .optional()
        .default(0),
})

/**
 * Schema de validación para crear una venta
 */
export const saleCreateSchema = z.object({
    // Items de la venta
    items: z.array(saleItemSchema)
        .min(1, 'La venta debe tener al menos un item')
        .max(100, 'Máximo 100 items por venta'),

    // Cliente
    customer_id: z.string()
        .uuid('ID de cliente inválido')
        .optional()
        .nullable(),

    // Método de pago
    payment_method: z.enum([
        'CASH',
        'CARD',
        'TRANSFER',
        'MIXED',
        'OTHER'
    ]),

    // Pagos mixtos (opcional)
    payment_details: z.object({
        cash_amount: z.number().min(0).optional(),
        card_amount: z.number().min(0).optional(),
        transfer_amount: z.number().min(0).optional(),
        other_amount: z.number().min(0).optional(),
    }).optional().nullable(),

    // Descuento global
    discount_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'])
        .optional()
        .default('PERCENTAGE'),

    discount_value: z.number()
        .min(0, 'Descuento no puede ser negativo')
        .max(100, 'Descuento porcentual no puede ser mayor a 100%')
        .optional()
        .default(0),

    // Totales
    subtotal: z.number()
        .positive('Subtotal debe ser positivo')
        .max(9999999.99, 'Subtotal muy alto'),

    tax_amount: z.number()
        .min(0, 'IVA no puede ser negativo')
        .max(9999999.99, 'IVA muy alto'),

    discount_amount: z.number()
        .min(0, 'Descuento no puede ser negativo')
        .max(9999999.99, 'Descuento muy alto')
        .optional()
        .default(0),

    total_amount: z.number()
        .positive('Total debe ser positivo')
        .max(9999999.99, 'Total muy alto'),

    // Notas
    notes: z.string()
        .max(1000, 'Notas muy largas')
        .optional()
        .nullable(),

    // Estado
    status: z.enum([
        'PENDING',
        'COMPLETED',
        'CANCELLED',
        'REFUNDED'
    ]).optional().default('COMPLETED'),
})
    // Validación: total debe ser subtotal + tax - discount
    .refine(
        data => {
            const calculatedTotal = data.subtotal + data.tax_amount - (data.discount_amount || 0)
            return Math.abs(calculatedTotal - data.total_amount) < 0.01 // Tolerancia de 1 centavo
        },
        {
            message: 'El total no coincide con subtotal + IVA - descuento',
            path: ['total_amount'],
        }
    )
    // Validación: si es pago mixto, debe tener payment_details
    .refine(
        data => {
            if (data.payment_method === 'MIXED') {
                return data.payment_details !== null && data.payment_details !== undefined
            }
            return true
        },
        {
            message: 'Pago mixto requiere detalles de pago',
            path: ['payment_details'],
        }
    )

/**
 * Schema de validación para búsqueda de ventas
 */
export const saleSearchSchema = z.object({
    start_date: z.string()
        .datetime()
        .optional(),

    end_date: z.string()
        .datetime()
        .optional(),

    customer_id: z.string()
        .uuid('ID de cliente inválido')
        .optional(),

    payment_method: z.enum([
        'CASH',
        'CARD',
        'TRANSFER',
        'MIXED',
        'OTHER',
        'ALL'
    ]).optional().default('ALL'),

    status: z.enum([
        'PENDING',
        'COMPLETED',
        'CANCELLED',
        'REFUNDED',
        'ALL'
    ]).optional().default('ALL'),

    min_amount: z.number()
        .positive('Monto mínimo debe ser positivo')
        .optional(),

    max_amount: z.number()
        .positive('Monto máximo debe ser positivo')
        .optional(),

    page: z.number()
        .int('Página debe ser un número entero')
        .positive('Página debe ser positiva')
        .optional()
        .default(1),

    limit: z.number()
        .int('Límite debe ser un número entero')
        .positive('Límite debe ser positivo')
        .max(100, 'Límite máximo es 100')
        .optional()
        .default(50),

    sort_by: z.enum([
        'created_at',
        'total_amount',
        'sale_number'
    ]).optional().default('created_at'),

    sort_order: z.enum(['asc', 'desc'])
        .optional()
        .default('desc'),
})

/**
 * Tipos TypeScript derivados
 */
export type SaleItemInput = z.infer<typeof saleItemSchema>
export type SaleCreateInput = z.infer<typeof saleCreateSchema>
export type SaleSearchInput = z.infer<typeof saleSearchSchema>

/**
 * Helpers de validación
 */
export function validateSaleCreate(data: unknown): SaleCreateInput {
    return saleCreateSchema.parse(data)
}

export function validateSaleSearch(data: unknown): SaleSearchInput {
    return saleSearchSchema.parse(data)
}

export function safeValidateSale(data: unknown) {
    return saleCreateSchema.safeParse(data)
}
