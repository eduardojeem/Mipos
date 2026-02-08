/**
 * Schemas de validación Zod centralizados para el módulo de reportes
 * Incluye validación robusta de fechas, rangos y parámetros
 */

import { z } from 'zod';
import { REPORT_TYPES, MAX_DATE_RANGE_DAYS } from '../config/reports.config';

/**
 * Validador de fecha en formato ISO (YYYY-MM-DD)
 */
const isoDateString = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
    .refine((dateStr) => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    }, 'Fecha inválida')
    .transform((dateStr) => new Date(dateStr));

/**
 * Validador de UUID
 */
const uuidString = z.string().uuid('ID inválido. Debe ser un UUID válido');

/**
 * Schema base para filtros de reportes
 */
export const reportFilterSchema = z.object({
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
    since: isoDateString.optional(),
    productId: uuidString.optional(),
    categoryId: uuidString.optional(),
    customerId: uuidString.optional(),
    supplierId: uuidString.optional(),
    userId: uuidString.optional(),
    status: z.string().max(50).optional(),
}).refine(
    (data) => {
        // Si ambas fechas están presentes, validar que startDate <= endDate
        if (data.startDate && data.endDate) {
            return data.startDate <= data.endDate;
        }
        return true;
    },
    {
        message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
        path: ['startDate'],
    }
).refine(
    (data) => {
        // Validar que el rango no exceda el máximo permitido
        if (data.startDate && data.endDate) {
            const diffMs = data.endDate.getTime() - data.startDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            return diffDays <= MAX_DATE_RANGE_DAYS;
        }
        return true;
    },
    {
        message: `El rango de fechas no puede exceder ${MAX_DATE_RANGE_DAYS} días`,
        path: ['endDate'],
    }
);

/**
 * Schema para query params de reportes (GET requests)
 */
export const queryReportFilterSchema = z.object({
    type: z.enum(REPORT_TYPES as unknown as [string, ...string[]]),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    since: z.string().optional(),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
    userId: z.string().optional(),
    status: z.string().max(50).optional(),
});

/**
 * Schema para formatos de exportación
 */
export const exportFormatSchema = z.enum(['pdf', 'excel', 'csv', 'json']);

/**
 * Schema para enqueue de exportación
 */
export const exportEnqueueSchema = z.object({
    type: z.enum(REPORT_TYPES as unknown as [string, ...string[]]),
    format: exportFormatSchema,
    filters: reportFilterSchema,
});

/**
 * Schema para reportes comparativos
 */
export const compareQuerySchema = z.object({
    start_date_a: isoDateString,
    end_date_a: isoDateString,
    start_date_b: isoDateString,
    end_date_b: isoDateString,
    dimension: z.enum(['overall', 'product', 'category']).default('overall'),
    groupBy: z.enum(['day', 'month']).default('day'),
    details: z.coerce.boolean().default(true),
    productId: uuidString.optional(),
    categoryId: uuidString.optional(),
    customerId: uuidString.optional(),
    supplierId: uuidString.optional(),
    userId: uuidString.optional(),
}).refine(
    (data) => data.start_date_a <= data.end_date_a,
    {
        message: 'Período A: fecha de inicio debe ser anterior o igual a fecha de fin',
        path: ['start_date_a'],
    }
).refine(
    (data) => data.start_date_b <= data.end_date_b,
    {
        message: 'Período B: fecha de inicio debe ser anterior o igual a fecha de fin',
        path: ['start_date_b'],
    }
);

/**
 * Tipo inferido para filtros de reportes
 */
export type ReportFilter = z.infer<typeof reportFilterSchema>;

/**
 * Tipo inferido para query params
 */
export type QueryReportFilter = z.infer<typeof queryReportFilterSchema>;

/**
 * Tipo inferido para formato de exportación
 */
export type ExportFormat = z.infer<typeof exportFormatSchema>;

/**
 * Tipo inferido para comparación
 */
export type CompareQuery = z.infer<typeof compareQuerySchema>;
