import { Prisma } from '@prisma/client';

/**
 * Normaliza un objeto supplier desde la base de datos
 * Maneja diferencias entre snake_case (Supabase) y camelCase (Prisma)
 */
export function normalizeSupplier(s: any) {
    const contactInfo = (s.contactInfo ?? s.contact_info) || {};
    const createdAt = s.createdAt ?? s.created_at;
    const updatedAt = s.updatedAt ?? s.updated_at;

    return {
        id: s.id,
        name: s.name,
        contactInfo,
        createdAt,
        updatedAt,
        taxId: contactInfo.taxId,
        notes: contactInfo.notes,
        status: contactInfo.status ?? 'active',
        category: contactInfo.category ?? 'regular',
        commercialConditions: contactInfo.commercialConditions || undefined
    };
}

/**
 * Construye cláusula WHERE dinámica para filtrado de proveedores
 */
export function buildSupplierWhere(filters: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    category?: string;
}): any {
    const where: any = {};

    // Búsqueda por texto
    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode } },
            // Note: Searching in JSONB requires raw SQL or different approach
        ];
    }

    // Filtro por categoría
    if (filters.category && filters.category !== 'all') {
        // For JSONB field, we need to use approach compatible with the adapter
        // This is simplified - real implementation may need raw SQL for Supabase
        where.contact_info = {
            path: ['category'],
            equals: filters.category
        };
    }

    return where;
}

/**
 * Construye cláusula ORDER BY dinámica
 */
export function buildSupplierOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
): any {
    switch (sortBy) {
        case 'name':
            return { name: sortOrder };
        case 'createdAt':
            return { created_at: sortOrder };
        default:
            return { name: 'asc' };
    }
}

/**
 * Agrega estadísticas de compras a un supplier
 */
export interface SupplierStats {
    totalPurchases: number;
    lastPurchase: Date | null;
    purchasesCount: number;
}

export function addStatsToSupplier(
    supplier: any,
    stats: SupplierStats
) {
    return {
        ...supplier,
        totalPurchases: stats.totalPurchases,
        lastPurchase: stats.lastPurchase,
        _count: {
            purchases: stats.purchasesCount
        }
    };
}

/**
 * Valida que un supplier pertenece a la organización
 */
export function validateSupplierOwnership(
    supplier: any,
    organizationId: string
): boolean {
    return supplier.organization_id === organizationId;
}
