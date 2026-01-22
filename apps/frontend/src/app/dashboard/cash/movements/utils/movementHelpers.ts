import type { CashMovement } from '@/types/cash';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MOVEMENT_TYPE_LABELS } from './movementTypes';

/**
 * Format a date as relative time in Spanish
 * @param date - Date to format
 * @returns Relative time string (e.g., "hace 5 minutos")
 */
export function formatRelativeTime(date: string | Date): string {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
    } catch {
        return 'Fecha inválida';
    }
}

/**
 * Calculate statistics from a list of movements
 */
export function calculateMovementStats(movements: CashMovement[]) {
    const stats = {
        total: movements.length,
        in: 0,
        out: 0,
        sale: 0,
        return: 0,
        adjustment: 0,
        totalAmount: 0,
        inAmount: 0,
        outAmount: 0,
        saleAmount: 0,
        returnAmount: 0,
    };

    movements.forEach((m) => {
        stats.totalAmount += m.amount;

        switch (m.type) {
            case 'IN':
                stats.in++;
                stats.inAmount += m.amount;
                break;
            case 'OUT':
                stats.out++;
                stats.outAmount += m.amount;
                break;
            case 'SALE':
                stats.sale++;
                stats.saleAmount += m.amount;
                break;
            case 'RETURN':
                stats.return++;
                stats.returnAmount += m.amount;
                break;
            case 'ADJUSTMENT':
                stats.adjustment++;
                break;
        }
    });

    return stats;
}

/**
 * Build URL search params from filter object
 */
export function buildMovementParams(filters: {
    sessionId?: string;
    type?: string;
    from?: string;
    to?: string;
    search?: string;
    amountMin?: string;
    amountMax?: string;
    referenceType?: string;
    userId?: string;
    page?: number;
    limit?: number;
    include?: string;
    orderBy?: 'date' | 'amount' | 'type';
    orderDir?: 'asc' | 'desc';
}): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.sessionId) params.sessionId = filters.sessionId;
    if (filters.type && filters.type !== 'all') params.type = filters.type;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.search) params.search = filters.search;
    if (filters.amountMin) params.amountMin = filters.amountMin;
    if (filters.amountMax) params.amountMax = filters.amountMax;
    if (filters.referenceType && filters.referenceType !== 'all') {
        params.referenceType = filters.referenceType;
    }
    if (filters.userId && filters.userId !== 'all') {
        params.userId = filters.userId;
    }
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.include) params.include = filters.include;
    if (filters.orderBy) params.orderBy = filters.orderBy;
    if (filters.orderDir) params.orderDir = filters.orderDir;

    return params;
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: {
    type?: string;
    from?: string;
    to?: string;
    search?: string;
    amountMin?: string;
    amountMax?: string;
    referenceType?: string;
    userId?: string;
}): number {
    let count = 0;

    if (filters.type && filters.type !== 'all') count++;
    if (filters.from) count++;
    if (filters.to) count++;
    if (filters.search) count++;
    if (filters.amountMin) count++;
    if (filters.amountMax) count++;
    if (filters.referenceType && filters.referenceType !== 'all') count++;
    if (filters.userId && filters.userId !== 'all') count++;

    return count;
}

/**
 * Export movements to CSV with Excel compatibility
 */
export function exportMovementsToCSV(
    movements: CashMovement[],
    options: {
        filename?: string;
        includeFilters?: boolean;
        filters?: Record<string, string>;
    } = {}
): void {
    const { filename, includeFilters = false, filters = {} } = options;

    const header = ['Fecha', 'Tipo', 'Monto', 'Motivo', 'Usuario', 'Referencia'];
    const rows = movements.map((m) => [
        new Date(m.createdAt).toLocaleString('es-AR'),
        MOVEMENT_TYPE_LABELS[m.type as keyof typeof MOVEMENT_TYPE_LABELS] || m.type,
        String(m.amount),
        m.reason || '-',
        m.createdByUser?.fullName || m.createdByUser?.email || '-',
        m.referenceType ? `${m.referenceType}: ${m.referenceId}` : '-',
    ]);

    const csv = [header, ...rows]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // Add BOM for Excel compatibility
    const csvWithBOM = '\ufeff' + csv;
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Generate filename with date and optional filter info
    const date = new Date().toISOString().split('T')[0];
    const filterSuffix = includeFilters && Object.keys(filters).length > 0
        ? `_${Object.entries(filters).filter(([_, v]) => v && v !== 'all').map(([k]) => k).join('_')}`
        : '';

    link.download = filename || `movimientos_caja_${date}${filterSuffix}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
