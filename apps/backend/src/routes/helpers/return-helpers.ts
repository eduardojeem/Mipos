import { RETURNS_CONFIG } from '../../config/returns-config';

export function normalizeReturnStatusToDb(value: unknown): string | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'PROCESSED') return 'COMPLETED';
    if (['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(normalized)) {
        return normalized;
    }
    return null;
}

function normalizeReturnStatusToUi(value: unknown): string {
    const normalized = normalizeReturnStatusToDb(value);
    if (normalized === 'COMPLETED') return 'processed';
    if (normalized === 'APPROVED') return 'approved';
    if (normalized === 'REJECTED') return 'rejected';
    return 'pending';
}

export function normalizeRefundMethodToDb(value: unknown): string | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'BANK_TRANSFER' || normalized === 'WIRE') return 'TRANSFER';
    if (RETURNS_CONFIG.business.allowedRefundMethods.includes(normalized as any)) {
        return normalized;
    }
    return null;
}

function normalizeRefundMethodToUi(value: unknown): string {
    const normalized = normalizeRefundMethodToDb(value);
    if (normalized === 'TRANSFER') return 'bank_transfer';
    if (normalized === 'CARD') return 'card';
    if (normalized === 'CASH') return 'cash';
    return 'other';
}

/**
 * Normalize return record from database to frontend format
 * Handles field mapping and status conversions
 */
export function normalizeReturn(r: any) {
    const originalSaleId = r.originalSaleId || r.original_sale_id || '';

    return {
        id: r.id,
        returnNumber: r.returnNumber || String(r.id || '').slice(0, 8).toUpperCase(),
        saleId: originalSaleId,
        originalSaleId,
        customerId: r.customerId || r.customer_id || null,
        customerName: r.customer?.name || 'Sin cliente',
        items: r.returnItems?.map(normalizeReturnItem) || [],
        totalAmount: Number(r.totalAmount ?? r.total_amount ?? r.total ?? 0),
        reason: r.reason,
        status: normalizeReturnStatusToUi(r.status),
        refundMethod: normalizeRefundMethodToUi(r.refundMethod || r.refund_method),
        createdAt: r.createdAt || r.created_at,
        updatedAt: r.updatedAt || r.updated_at,
        processedAt: r.processedAt || r.processed_at,
        processedBy: r.processedBy || r.processed_by,
        notes: r.notes,
        // Include nested data if available
        originalSale: r.originalSale ? {
            id: r.originalSale.id,
            date: r.originalSale.date,
            total: r.originalSale.total
        } : undefined,
        user: r.user ? {
            id: r.user.id,
            fullName: r.user.fullName,
            email: r.user.email
        } : undefined,
        customer: r.customer ? {
            id: r.customer.id,
            name: r.customer.name,
            phone: r.customer.phone,
            email: r.customer.email
        } : undefined
    };
}

/**
 * Normalize return item from database to frontend format
 */
export function normalizeReturnItem(item: any) {
    return {
        id: item.id,
        productId: item.productId || item.product_id,
        productName: item.product?.name || 'Producto desconocido',
        product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku
        } : undefined,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
        reason: item.reason,
        originalSaleItemId: item.originalSaleItemId || item.original_sale_item_id,
        originalSaleItem: item.originalSaleItem ? {
            id: item.originalSaleItem.id,
            quantity: item.originalSaleItem.quantity,
            unitPrice: item.originalSaleItem.unitPrice
        } : undefined
    };
}

function normalizeFilterDate(value: string | undefined, boundary: 'start' | 'end'): Date | undefined {
    const trimmed = String(value || '').trim();
    if (!trimmed) return undefined;

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        if (boundary === 'start') {
            parsed.setUTCHours(0, 0, 0, 0);
        } else {
            parsed.setUTCHours(23, 59, 59, 999);
        }
    }

    return parsed;
}

/**
 * Build where clause for return queries based on filters
 */
export function buildReturnWhere(filters: {
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    status?: string;
    originalSaleId?: string;
    search?: string;
    refundMethod?: string;
}) {
    const where: any = {};

    if (filters.organizationId) {
        where.organizationId = filters.organizationId;
    }

    // Date range filter
    const startDate = normalizeFilterDate(filters.startDate, 'start');
    const endDate = normalizeFilterDate(filters.endDate, 'end');

    if (startDate && endDate) {
        where.createdAt = {
            gte: startDate,
            lte: endDate
        };
    } else if (startDate) {
        where.createdAt = { gte: startDate };
    } else if (endDate) {
        where.createdAt = { lte: endDate };
    }

    // Direct filters
    if (filters.customerId) {
        where.customerId = filters.customerId;
    }

    const status = normalizeReturnStatusToDb(filters.status);
    if (status) {
        where.status = status;
    }

    if (filters.originalSaleId) {
        where.originalSaleId = filters.originalSaleId;
    }

    const refundMethod = normalizeRefundMethodToDb(filters.refundMethod);
    if (refundMethod) {
        where.refundMethod = refundMethod;
    }

    // Search filter (return ID, customer name, or reason)
    if (filters.search) {
        where.OR = [
            { id: { contains: filters.search, mode: 'insensitive' } },
            { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
            { reason: { contains: filters.search, mode: 'insensitive' } }
        ];
    }

    return where;
}

/**
 * Calculate aggregate statistics for returns
 */
export async function calculateReturnStats(prisma: any, where: any = {}) {
    const [stats, totalReturns, processedReturns] = await Promise.all([
        prisma.return.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
            _sum: { totalAmount: true }
        }),
        prisma.return.count({ where }),
        prisma.return.findMany({
            where: {
                ...where,
                status: 'COMPLETED',
                processedAt: { not: null }
            },
            select: {
                createdAt: true,
                processedAt: true
            }
        }).catch(() => [])
    ]);

    const getStatByStatus = (status: string) => {
        const stat = stats.find((s: any) => s.status === status);
        return {
            count: stat?._count.id || 0,
            amount: stat?._sum.totalAmount || 0
        };
    };

    const pending = getStatByStatus('PENDING');
    const approved = getStatByStatus('APPROVED');
    const rejected = getStatByStatus('REJECTED');
    const completed = getStatByStatus('COMPLETED');

    const totalAmount = stats.reduce((sum: number, s: any) => sum + (s._sum.totalAmount || 0), 0);

    // Calculate total sales for return rate (if available)
    let returnRate = 0;
    try {
        const saleWhere: any = {};
        if (where.organizationId) {
            saleWhere.organizationId = where.organizationId;
        }
        if (where.createdAt) {
            saleWhere.createdAt = where.createdAt;
        }

        const totalSales = await prisma.sale.count({ where: saleWhere });
        if (totalSales > 0) {
            returnRate = (totalReturns / totalSales) * 100;
        }
    } catch {
        // If sales table not accessible, skip return rate
    }

    return {
        totalReturns,
        totalAmount,
        pendingReturns: pending.count,
        pendingAmount: pending.amount,
        approvedReturns: approved.count,
        approvedAmount: approved.amount,
        rejectedReturns: rejected.count,
        rejectedAmount: rejected.amount,
        completedReturns: completed.count,
        completedAmount: completed.amount,
        returnRate,
        avgProcessingTime: calculateAverageProcessingHours(processedReturns)
    };
}

function calculateAverageProcessingHours(rows: Array<{ createdAt?: Date | string; processedAt?: Date | string | null }>) {
    const durations = rows
        .map((row) => {
            if (!row.createdAt || !row.processedAt) return null;
            const created = new Date(row.createdAt).getTime();
            const processed = new Date(row.processedAt).getTime();
            const hours = (processed - created) / (1000 * 60 * 60);
            return Number.isFinite(hours) && hours >= 0 ? hours : null;
        })
        .filter((value): value is number => value !== null);

    if (!durations.length) return 0;
    const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
    return Math.round(average * 100) / 100;
}

/**
 * Validate status transition is allowed
 */
export function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const allowedTransitions = RETURNS_CONFIG.business.statusTransitions[currentStatus as keyof typeof RETURNS_CONFIG.business.statusTransitions];
    return allowedTransitions?.includes(newStatus) || false;
}
