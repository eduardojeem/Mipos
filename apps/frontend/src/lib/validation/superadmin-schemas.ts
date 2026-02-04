/**
 * Schemas de validación para endpoints de SuperAdmin
 * Usa Zod para validación type-safe
 */

import { z } from 'zod';

// ============================================================================
// ORGANIZACIONES
// ============================================================================

export const OrganizationCreateSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  slug: z.string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(50, 'El slug no puede exceder 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .trim(),
  subscription_plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE'], {
    errorMap: () => ({ message: 'Plan de suscripción inválido' }),
  }),
  subscription_status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL'], {
    errorMap: () => ({ message: 'Estado de suscripción inválido' }),
  }).default('TRIAL'),
  settings: z.record(z.unknown()).optional(),
});

export const OrganizationUpdateSchema = z.object({
  id: z.string().uuid('ID de organización inválido'),
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  slug: z.string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(50, 'El slug no puede exceder 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .trim()
    .optional(),
  subscription_plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
  subscription_status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const OrganizationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL', 'ALL']).optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'ALL']).optional(),
  sortBy: z.enum(['created_at', 'name', 'updated_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// USUARIOS
// ============================================================================

export const UserUpdateSchema = z.object({
  id: z.string().uuid('ID de usuario inválido'),
  full_name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .toLowerCase()
    .trim()
    .optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CASHIER']).optional(),
  is_active: z.boolean().optional(),
  organization_id: z.string().uuid('ID de organización inválido').nullable().optional(),
});

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'ALL']).optional(),
  organization_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional(),
});

export const BulkUserOperationSchema = z.object({
  operation: z.enum(['update', 'delete'], {
    errorMap: () => ({ message: 'Operación inválida' }),
  }),
  ids: z.array(z.string().uuid('ID de usuario inválido'))
    .min(1, 'Debe seleccionar al menos un usuario')
    .max(100, 'No se pueden procesar más de 100 usuarios a la vez'),
  updates: z.record(z.unknown()).optional(),
});

// ============================================================================
// PLANES
// ============================================================================

export const PlanCreateSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  slug: z.string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(50, 'El slug no puede exceder 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .trim(),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  price_monthly: z.number()
    .nonnegative('El precio mensual debe ser mayor o igual a 0')
    .max(999999, 'El precio mensual es demasiado alto'),
  price_yearly: z.number()
    .nonnegative('El precio anual debe ser mayor o igual a 0')
    .max(9999999, 'El precio anual es demasiado alto'),
  features: z.record(z.unknown()).optional(),
  limits: z.object({
    max_users: z.number().int().positive().optional(),
    max_products: z.number().int().positive().optional(),
    max_sales_per_month: z.number().int().positive().optional(),
    max_storage_mb: z.number().int().positive().optional(),
  }).optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const PlanUpdateSchema = PlanCreateSchema.partial().extend({
  id: z.string().uuid('ID de plan inválido'),
});

// ============================================================================
// SUSCRIPCIONES
// ============================================================================

export const SubscriptionAssignSchema = z.object({
  organization_id: z.string().uuid('ID de organización inválido'),
  plan_id: z.string().uuid('ID de plan inválido'),
  billing_cycle: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Ciclo de facturación inválido' }),
  }),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  auto_renew: z.boolean().default(true),
});

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const EmailTemplateCreateSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  slug: z.string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(50, 'El slug no puede exceder 50 caracteres')
    .regex(/^[a-z0-9-_]+$/, 'El slug solo puede contener letras minúsculas, números, guiones y guiones bajos')
    .trim(),
  subject: z.string()
    .min(1, 'El asunto es requerido')
    .max(200, 'El asunto no puede exceder 200 caracteres')
    .trim(),
  body_html: z.string()
    .min(1, 'El cuerpo HTML es requerido')
    .max(50000, 'El cuerpo HTML es demasiado largo'),
  body_text: z.string()
    .max(50000, 'El cuerpo de texto es demasiado largo')
    .optional(),
  variables: z.array(z.string()).optional(),
  category: z.enum(['transactional', 'marketing', 'notification', 'system']).default('transactional'),
  is_active: z.boolean().default(true),
});

export const EmailTemplateUpdateSchema = EmailTemplateCreateSchema.partial().extend({
  id: z.string().uuid('ID de plantilla inválido'),
});

// ============================================================================
// CONFIGURACIONES DEL SISTEMA
// ============================================================================

export const SystemSettingsUpdateSchema = z.object({
  maintenance_mode: z.boolean().optional(),
  allow_registrations: z.boolean().optional(),
  require_email_verification: z.boolean().optional(),
  max_organizations: z.number().int().positive().optional(),
  default_plan: z.string().uuid().optional(),
  smtp_settings: z.object({
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    from_email: z.string().email().optional(),
    from_name: z.string().optional(),
  }).optional(),
  features: z.record(z.boolean()).optional(),
});

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================

/**
 * Valida datos contra un schema de Zod
 * Retorna los datos validados o lanza un error con detalles
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Formatea errores de Zod para respuestas de API
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });
  
  return formatted;
}

/**
 * Middleware para validar request body
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details: Record<string, string[]> }> {
  try {
    const body = await request.json();
    const result = validateData(schema, body);
    
    if (!result.success) {
      return {
        success: false,
        error: 'Datos de entrada inválidos',
        details: formatZodErrors(result.errors),
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: 'Error al procesar la petición',
      details: { body: ['El cuerpo de la petición no es JSON válido'] },
    };
  }
}

/**
 * Middleware para validar query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string; details: Record<string, string[]> } {
  const params = Object.fromEntries(searchParams.entries());
  const result = validateData(schema, params);
  
  if (!result.success) {
    return {
      success: false,
      error: 'Parámetros de consulta inválidos',
      details: formatZodErrors(result.errors),
    };
  }
  
  return { success: true, data: result.data };
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type OrganizationCreate = z.infer<typeof OrganizationCreateSchema>;
export type OrganizationUpdate = z.infer<typeof OrganizationUpdateSchema>;
export type OrganizationQuery = z.infer<typeof OrganizationQuerySchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type BulkUserOperation = z.infer<typeof BulkUserOperationSchema>;
export type PlanCreate = z.infer<typeof PlanCreateSchema>;
export type PlanUpdate = z.infer<typeof PlanUpdateSchema>;
export type SubscriptionAssign = z.infer<typeof SubscriptionAssignSchema>;
export type EmailTemplateCreate = z.infer<typeof EmailTemplateCreateSchema>;
export type EmailTemplateUpdate = z.infer<typeof EmailTemplateUpdateSchema>;
export type SystemSettingsUpdate = z.infer<typeof SystemSettingsUpdateSchema>;
