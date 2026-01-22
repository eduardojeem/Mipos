import { useState, useMemo, useCallback } from 'react';
import type { Sale } from '@/types';

export type SortField = 'date' | 'total' | 'customer' | 'status' | 'payment';
export type SortOrder = 'asc' | 'desc';

interface UseSalesSortOptions {
    sales: Sale[];
    initialSortBy?: SortField;
    initialSortOrder?: SortOrder;
}

export function useSalesSort({
    sales,
    initialSortBy = 'date',
    initialSortOrder = 'desc',
}: UseSalesSortOptions) {
    const [sortBy, setSortBy] = useState<SortField>(initialSortBy);
    const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

    // Sort sales
    const sortedSales = useMemo(() => {
        if (!sales || !Array.isArray(sales)) {
            return [];
        }

        return [...sales].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortBy) {
                case 'date':
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;

                case 'total':
                    aValue = Number(a.total_amount || 0);
                    bValue = Number(b.total_amount || 0);
                    break;

                case 'customer':
                    aValue = (a.customer?.name || '').toLowerCase();
                    bValue = (b.customer?.name || '').toLowerCase();
                    break;

                case 'status':
                    // Order: COMPLETED > PENDING > CANCELLED > REFUNDED
                    const statusOrder = { COMPLETED: 0, PENDING: 1, CANCELLED: 2, REFUNDED: 3 };
                    aValue = statusOrder[a.status] ?? 999;
                    bValue = statusOrder[b.status] ?? 999;
                    break;

                case 'payment':
                    // Order: CASH > CARD > TRANSFER > OTHER
                    const paymentOrder = { CASH: 0, CARD: 1, TRANSFER: 2, OTHER: 3 };
                    aValue = paymentOrder[a.payment_method as keyof typeof paymentOrder] ?? 999;
                    bValue = paymentOrder[b.payment_method as keyof typeof paymentOrder] ?? 999;
                    break;

                default:
                    return 0;
            }

            // Compare values
            if (sortOrder === 'asc') {
                if (typeof aValue === 'string') {
                    return aValue.localeCompare(bValue);
                }
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                if (typeof aValue === 'string') {
                    return bValue.localeCompare(aValue);
                }
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });
    }, [sales, sortBy, sortOrder]);

    // Toggle sort or change field
    const handleSort = useCallback((field: SortField) => {
        if (sortBy === field) {
            // Toggle order if same field
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // Change field and reset to desc
            setSortBy(field);
            setSortOrder('desc');
        }
    }, [sortBy]);

    // Set specific sort
    const setSort = useCallback((field: SortField, order: SortOrder) => {
        setSortBy(field);
        setSortOrder(order);
    }, []);

    return {
        sortedSales,
        sortBy,
        sortOrder,
        handleSort,
        setSort,
    };
}
