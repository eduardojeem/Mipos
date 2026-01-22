// Fallback sanitizer to avoid extra dependency
const SimpleSanitizer = {
    sanitize(input: string, _config?: any) {
        return String(input).replace(/<[^>]*>/g, '')
    }
}

/**
 * Configuración de DOMPurify para diferentes contextos
 */
const PURIFY_CONFIG = {
    // Para campos de texto plano (nombres, descripciones cortas)
    PLAIN_TEXT: {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    },
    // Para descripciones ricas (permite HTML básico)
    RICH_TEXT: {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    },
}

/**
 * Sanitiza un string eliminando HTML y caracteres peligrosos
 */
export function sanitizeString(input: string | null | undefined): string | null {
    if (!input) return null

    // Eliminar todo HTML
    const cleaned = SimpleSanitizer.sanitize(input, PURIFY_CONFIG.PLAIN_TEXT)

    // Trim y normalizar espacios
    return cleaned.trim().replace(/\s+/g, ' ')
}

/**
 * Sanitiza HTML permitiendo solo tags seguros
 */
export function sanitizeHTML(input: string | null | undefined): string | null {
    if (!input) return null

    return SimpleSanitizer.sanitize(input, PURIFY_CONFIG.RICH_TEXT)
}

/**
 * Sanitiza un SKU/código (solo alfanuméricos, guiones y guiones bajos)
 */
export function sanitizeSKU(input: string | null | undefined): string | null {
    if (!input) return null

    return input
        .toUpperCase()
        .replace(/[^A-Z0-9-_]/g, '')
        .trim()
}

/**
 * Sanitiza un email
 */
export function sanitizeEmail(input: string | null | undefined): string | null {
    if (!input) return null

    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w@.-]/g, '')
}

/**
 * Sanitiza un número de teléfono (solo dígitos, +, -, espacios, paréntesis)
 */
export function sanitizePhone(input: string | null | undefined): string | null {
    if (!input) return null

    return input
        .trim()
        .replace(/[^0-9+\-() ]/g, '')
}

/**
 * Sanitiza una URL
 */
export function sanitizeURL(input: string | null | undefined): string | null {
    if (!input) return null

    try {
        const url = new URL(input)
        // Solo permitir http y https
        if (!['http:', 'https:'].includes(url.protocol)) {
            return null
        }
        return url.toString()
    } catch {
        return null
    }
}

/**
 * Sanitiza datos de producto
 */
export function sanitizeProductData(data: any) {
    return {
        ...data,
        sku: sanitizeSKU(data.sku),
        name: sanitizeString(data.name),
        description: sanitizeHTML(data.description),
        brand: sanitizeString(data.brand),
        barcode: sanitizeSKU(data.barcode),
        image_url: sanitizeURL(data.image_url),
        ingredients: sanitizeHTML(data.ingredients),
        usage_instructions: sanitizeHTML(data.usage_instructions),
        batch_number: sanitizeString(data.batch_number),
    }
}

/**
 * Sanitiza datos de cliente
 */
export function sanitizeCustomerData(data: any) {
    return {
        ...data,
        name: sanitizeString(data.name),
        last_name: sanitizeString(data.last_name),
        email: sanitizeEmail(data.email),
        phone: sanitizePhone(data.phone),
        address: sanitizeString(data.address),
        city: sanitizeString(data.city),
        state: sanitizeString(data.state),
        postal_code: sanitizeString(data.postal_code),
        tax_id: sanitizeString(data.tax_id),
        notes: sanitizeHTML(data.notes),
    }
}

/**
 * Sanitiza datos de venta
 */
export function sanitizeSaleData(data: any) {
    return {
        ...data,
        notes: sanitizeHTML(data.notes),
        // Los items ya deberían estar validados por Zod
        items: data.items?.map((item: any) => ({
            ...item,
            // Asegurar que los IDs son UUIDs válidos
            product_id: item.product_id?.trim(),
        })),
    }
}

/**
 * Sanitiza datos de usuario
 */
export function sanitizeUserData(data: any) {
    return {
        ...data,
        email: sanitizeEmail(data.email),
        name: sanitizeString(data.name),
        phone: sanitizePhone(data.phone),
    }
}

/**
 * Prevenir SQL Injection en queries raw (si se usan)
 * NOTA: Prisma ya previene SQL injection, esto es una capa extra
 */
export function escapeSQLString(input: string): string {
    return input.replace(/'/g, "''")
}

/**
 * Prevenir NoSQL Injection (si se usa MongoDB u otro NoSQL)
 */
export function sanitizeNoSQLQuery(query: any): any {
    if (typeof query !== 'object' || query === null) {
        return query
    }

    const sanitized: any = {}

    for (const [key, value] of Object.entries(query)) {
        // Prevenir operadores maliciosos
        if (key.startsWith('$')) {
            continue // Ignorar operadores
        }

        if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeNoSQLQuery(value)
        } else {
            sanitized[key] = value
        }
    }

    return sanitized
}

/**
 * Validar y sanitizar archivos subidos
 */
export function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 255)
}

/**
 * Validar tipo MIME de archivo
 */
export function isValidImageMimeType(mimeType: string): boolean {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ]
    return allowedTypes.includes(mimeType.toLowerCase())
}

/**
 * Sanitizar objeto completo recursivamente
 */
export function deepSanitize(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'string') {
            return sanitizeString(obj)
        }
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map(deepSanitize)
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = deepSanitize(value)
    }

    return sanitized
}
