/**
 * Esquema de validación para ProductForm
 * Utiliza Zod para validación de datos del formulario
 */

import * as z from 'zod';

/**
 * Esquema de validación completo para productos
 * Incluye validaciones para campos básicos y cosméticos
 */
export const productSchema = z.object({
    // Información básica
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    code: z.string().min(3, 'El código debe tener al menos 3 caracteres'),
    description: z.string().optional(),
    categoryId: z.string().min(1, 'Debe seleccionar una categoría'),

    // Precios
    price: z.number().min(0.01, 'El precio debe ser mayor a 0'),
    costPrice: z.number().min(0, 'El precio de costo no puede ser negativo'),
    wholesalePrice: z.number().min(0.01, 'El precio mayorista debe ser mayor a 0'),
    offerPrice: z.number().min(0, 'El precio de oferta no puede ser negativo').optional(),
    offerActive: z.boolean().optional(),

    // Stock
    stock: z.number().int().min(0, 'El stock no puede ser negativo'),
    minStock: z.number().int().min(0, 'El stock mínimo no puede ser negativo'),

    // Imágenes
    images: z.array(z.string()).optional(),

    // IVA
    ivaIncluded: z.boolean().optional(),
    ivaRate: z.number()
        .min(0, 'La tasa de IVA no puede ser negativa')
        .max(100, 'La tasa de IVA no puede exceder 100')
        .optional(),

    // Campos específicos de cosméticos
    brand: z.string().optional(),
    shade: z.string().optional(),
    skin_type: z.string().optional(),
    ingredients: z.string().optional(),
    volume: z.string().optional(),
    spf: z.number().optional(),
    finish: z.string().optional(),
    coverage: z.string().optional(),
    waterproof: z.boolean().optional(),
    vegan: z.boolean().optional(),
    cruelty_free: z.boolean().optional(),
    expiration_date: z.string().optional(),
}).superRefine((data, ctx) => {
    // Validación cruzada: Si la oferta está activa, debe tener precio válido
    if (data.offerActive) {
        const offer = data.offerPrice ?? 0;

        if (offer <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El precio de oferta debe ser mayor a 0',
                path: ['offerPrice']
            });
        }

        if (offer >= data.price) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El precio de oferta debe ser menor al precio de venta',
                path: ['offerPrice']
            });
        }
    }
});

/**
 * Tipo inferido del esquema
 */
export type ProductFormData = z.infer<typeof productSchema>;

/**
 * Validaciones adicionales para el formulario
 */
export const additionalValidations = {
    /**
     * Valida que el precio de venta sea mayor al costo
     */
    validatePriceVsCost: (price: number, costPrice: number): boolean => {
        return price > costPrice;
    },

    /**
     * Valida que el stock actual sea razonable vs el mínimo
     */
    validateStockLevels: (stock: number, minStock: number): boolean => {
        return stock >= 0 && minStock >= 0;
    },

    /**
     * Valida que el código tenga formato válido
     */
    validateCodeFormat: (code: string): boolean => {
        return /^[A-Z0-9-_]+$/i.test(code);
    },

    /**
     * Valida que la tasa de IVA esté en rango válido
     */
    validateIvaRate: (rate?: number): boolean => {
        if (rate === undefined) return true;
        return rate >= 0 && rate <= 100;
    }
};
