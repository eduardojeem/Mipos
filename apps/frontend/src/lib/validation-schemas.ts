import { z } from 'zod';

// Esquemas de validación unificados entre frontend y backend
// Estos esquemas deben coincidir exactamente con los del backend

// Validaciones comunes
// Formato paraguayo: +595 XX XXXXXXX (código país +595, 2 dígitos prefijo, 7 dígitos locales)
// También acepta formatos alternativos como 0XX XXXXXXX para números locales
const phoneRegex = /^(\+595\s?[0-9]{2}\s?[0-9]{7}|0[0-9]{2}\s?[0-9]{7}|[0-9]{9})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Esquema para crear cliente
export const createCustomerSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del cliente es requerido')
    .max(200, 'El nombre del cliente es muy largo')
    .trim(),
  phone: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length <= 20, 'El número de teléfono es muy largo')
    .refine((val) => !val || phoneRegex.test(val), 'Formato de teléfono inválido'),
  email: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length <= 255, 'El email es muy largo')
    .refine((val) => !val || emailRegex.test(val), 'Formato de email inválido'),
  address: z.string()
    .max(500, 'La dirección es muy larga')
    .optional()
    .or(z.literal('')),
  tax_id: z.string()
    .max(50, 'El ID fiscal es muy largo')
    .optional()
    .or(z.literal('')),
  customer_code: z.string()
    .min(3, 'El código del cliente debe tener al menos 3 caracteres')
    .max(50, 'El código del cliente es muy largo')
    .optional(),
  customer_type: z.enum(['regular', 'vip', 'wholesale', 'REGULAR', 'VIP', 'WHOLESALE', 'RETAIL'], {
    errorMap: () => ({ message: 'Tipo de cliente inválido' })
  }).default('regular'),
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Estado inválido' })
  }).default('active'),
  is_active: z.boolean().default(true),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(1000, 'Las notas son muy largas')
    .optional()
    .or(z.literal(''))
});

// Esquema para actualizar cliente (todos los campos opcionales)
export const updateCustomerSchema = createCustomerSchema.partial();

// Esquema para validación de duplicados
export const validateEmailSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  excludeId: z.string().uuid().optional()
});

export const validatePhoneSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Formato de teléfono inválido'),
  excludeId: z.string().uuid().optional()
});

// Esquema para filtros de búsqueda
export const customerFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  type: z.enum(['regular', 'vip', 'wholesale', 'all']).default('all'),
  sortBy: z.enum(['name', 'created_at', 'updated_at', 'total_purchases']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Tipos TypeScript derivados de los esquemas
export type CreateCustomerData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;
export type CustomerFilters = z.infer<typeof customerFiltersSchema>;
export type ValidateEmailData = z.infer<typeof validateEmailSchema>;
export type ValidatePhoneData = z.infer<typeof validatePhoneSchema>;

// Funciones de validación para uso directo
export const validateCustomerData = (data: unknown, isUpdate = false) => {
  const schema = isUpdate ? updateCustomerSchema : createCustomerSchema;
  return schema.safeParse(data);
};

export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Opcional
  return phoneRegex.test(phone);
};

// Mensajes de error personalizados
export const validationMessages = {
  required: 'Este campo es requerido',
  email: 'Ingresa un email válido',
  phone: 'Ingresa un teléfono válido (formato: +595 XX XXXXXXX o 0XX XXXXXXX)',
  minLength: (min: number) => `Debe tener al menos ${min} caracteres`,
  maxLength: (max: number) => `No puede tener más de ${max} caracteres`,
  invalidType: 'Tipo de cliente inválido',
  invalidStatus: 'Estado inválido',
  invalidDate: 'Formato de fecha inválido (YYYY-MM-DD)'
};

// =============================
// Proveedores: esquemas Zod
// =============================

// Validador simple de URL que acepta vacío como válido
const isValidUrl = (val: string | undefined) => {
  try {
    // Si está vacío, consideramos válido (campo opcional)
    if (!val) return true;
    const url = new URL(val);
    return !!url.protocol && !!url.host;
  } catch {
    return false;
  }
};

// Esquema para datos del formulario de proveedor (plano, como en el frontend)
export const createSupplierFormSchema = z.object({
  name: z.string()
    .min(2, 'El nombre del proveedor es requerido (mínimo 2 caracteres)')
    .max(200, 'El nombre del proveedor es muy largo')
    .trim(),
  phone: z.string()
    .max(20, 'El número de teléfono es muy largo')
    .regex(phoneRegex, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Formato de email inválido')
    .max(255, 'El email es muy largo')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(500, 'La dirección es muy larga')
    .optional()
    .or(z.literal('')),
  contactPerson: z.string()
    .max(200, 'La persona de contacto es muy larga')
    .optional()
    .or(z.literal('')),
  website: z.string()
    .max(2083, 'La URL es muy larga')
    .optional()
    .or(z.literal(''))
    .refine((val) => isValidUrl(val ?? ''), { message: 'URL inválida' }),
  taxId: z.string()
    .max(50, 'El ID fiscal es muy largo')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(1000, 'Las notas son muy largas')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending'], {
    errorMap: () => ({ message: 'Estado inválido' })
  }).default('active'),
  category: z.string()
    .min(2, 'La categoría debe tener al menos 2 caracteres')
    .max(100, 'La categoría es muy larga')
    .default('regular'),
  paymentTerms: z.string()
    .regex(/^\d{1,3}$/i, 'Términos de pago deben ser número de días (0-365)')
    .default('30'),
  creditLimit: z.number()
    .min(0, 'El límite de crédito no puede ser negativo')
    .default(0),
  discount: z.number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede ser mayor que 100')
    .default(0),
  // Campo auxiliar para entrada de categorías múltiples separadas por coma (opcional)
  categoriesInput: z.string().optional().or(z.literal(''))
});

// Versión parcial para actualización
export const updateSupplierFormSchema = createSupplierFormSchema.partial();

export type CreateSupplierFormData = z.infer<typeof createSupplierFormSchema>;
export type UpdateSupplierFormData = z.infer<typeof updateSupplierFormSchema>;

// Utilidad de validación para el formulario de proveedores
export const validateSupplierFormData = (data: unknown, isUpdate = false) => {
  const schema = isUpdate ? updateSupplierFormSchema : createSupplierFormSchema;
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true as const, errors: {} };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'form';
    // Evitar sobreescribir errores múltiples: mantener el primero por campo
    if (!errors[path]) errors[path] = issue.message;
  }
  return { success: false as const, errors };
};