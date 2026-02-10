import { RETURNS_CONFIG } from '../../config/returns-config';

/**
 * Normalize return record from database to frontend format
 * Handles field mapping and status conversions
 */
export function normalizeReturn(r: any) {
    return {
        id: r.id,
        returnNumber: `RET-${r.id.slice(0, 8).toUpperCase()}`,
        saleId: r.originalSaleId,
        originalSaleId: r.originalSaleId,
        customerId: r.customerId,
        customerName: r.customer?.name || 'Sin cliente',
        items: r.returnItems?.map(normalizeReturnItem) || [],
        totalAmount: r.totalAmount,
        reason: r.reason,
        status: r.status.toLowerCase(),
        refundMethod: r.refundMethod,
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
        productId: item.productId,
        productName: item.product?.name || 'Producto desconocido',
        product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku
        } : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reason: item.reason,
        originalSaleItemId: item.originalSaleItemId,
        originalSaleItem: item.originalSaleItem ? {
            id: item.originalSaleItem.id,
            quantity: item.originalSaleItem.quantity,
            unitPrice: item.originalSaleItem.unitPrice
        } : undefined
    };
}

/**
 * Build where clause for return queries based on filters
 */
export function buildReturnWhere(filters: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    status?: string;
    originalSaleId?: string;
    search?: string;
}) {
    const where: any = {};

    // Date range filter
    const toDate = (v: string) => new Date(v);
    if (filters.startDate && filters.endDate) {
        where.createdAt = {
            gte: toDate(filters.startDate),
            lte: toDate(filters.endDate)
        };
    } else if (filters.startDate) {
        where.createdAt = { gte: toDate(filters.startDate) };
    } else if (filters.endDate) {
        where.createdAt = { lte: toDate(filters.endDate) };
    }

    // Direct filters
    if (filters.customerId) {
        where.customerId = filters.customerId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.originalSaleId) {
        where.originalSaleId = filters.originalSaleId;
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
    const [stats, totalReturns] = await Promise.all([
        prisma.return.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
            _sum: { totalAmount: true }
        }),
        prisma.return.count({ where })
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
        const totalSales = await prisma.sale.count();
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
        avgProcessingTime: 0 // TODO: Calculate from processed returns
    };
}

/**
 * Validate status transition is allowed
 */
export function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const allowedTransitions = RETURNS_CONFIG.business.statusTransitions[currentStatus as keyof typeof RETURNS_CONFIG.business.statusTransitions];
    return allowedTransitions?.includes(newStatus) || false;
}
