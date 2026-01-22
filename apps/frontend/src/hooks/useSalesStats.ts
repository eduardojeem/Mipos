import { useMemo } from 'react';
import type { Sale } from '@/types';

export interface SalesStats {
    // Totals
    totalSales: number;
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;

    // Today's metrics
    todayTotal: number;
    todayCount: number;
    dailyGrowth: number;

    // Weekly metrics
    thisWeekTotal: number;
    thisWeekCount: number;

    // Status breakdown
    completedSales: number;
    pendingSales: number;
    cancelledSales: number;

    // Customer metrics
    uniqueCustomers: number;
    averageTicket: number;

    // Payment methods breakdown
    paymentMethods: {
        cash: number;
        card: number;
        transfer: number;
        other: number;
    };

    // Sale types breakdown
    saleTypes: {
        retail: number;
        wholesale: number;
    };
}

interface UseSalesStatsOptions {
    sales: Sale[];
    allSales?: Sale[]; // For comparison metrics
}

export function useSalesStats({ sales, allSales }: UseSalesStatsOptions): SalesStats {
    return useMemo(() => {
        const validSales = Array.isArray(sales) ? sales : [];
        const validAllSales = Array.isArray(allSales) ? allSales : validSales;

        // Calculate totals
        const totalRevenue = validSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const totalTax = validSales.reduce((sum, sale) => sum + Number(sale.tax_amount || 0), 0);
        const totalDiscount = validSales.reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0);

        // Today's metrics
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todaySales = validSales.filter(sale => new Date(sale.created_at) >= todayStart);
        const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const todayCount = todaySales.length;

        // Yesterday's metrics for growth calculation
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayStart);

        const yesterdaySales = validAllSales.filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate >= yesterdayStart && saleDate < yesterdayEnd;
        });
        const yesterdayTotal = yesterdaySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

        const dailyGrowth = yesterdayTotal > 0
            ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
            : todayTotal > 0 ? 100 : 0;

        // Weekly metrics
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);

        const thisWeekSales = validSales.filter(sale => new Date(sale.created_at) >= thisWeekStart);
        const thisWeekTotal = thisWeekSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const thisWeekCount = thisWeekSales.length;

        // Status breakdown
        const completedSales = validSales.filter(sale => sale.status === 'COMPLETED').length;
        const pendingSales = validSales.filter(sale => sale.status === 'PENDING').length;
        const cancelledSales = validSales.filter(sale => sale.status === 'CANCELLED').length;

        // Customer metrics
        const uniqueCustomers = new Set(
            validSales
                .map(sale => sale.customer_id)
                .filter(id => id != null)
        ).size;

        const averageTicket = validSales.length > 0 ? totalRevenue / validSales.length : 0;

        // Payment methods breakdown
        const paymentMethods = {
            cash: validSales.filter(sale => sale.payment_method === 'CASH').reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
            card: validSales.filter(sale => sale.payment_method === 'CARD').reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
            transfer: validSales.filter(sale => sale.payment_method === 'TRANSFER').reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
            other: validSales.filter(sale => sale.payment_method === 'OTHER').reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
        };

        // Sale types breakdown
        const saleTypes = {
            retail: validSales.filter(sale => sale.sale_type === 'RETAIL').reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
            wholesale: validSales.filter(sale => sale.sale_type === 'WHOLESALE').reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
        };

        return {
            totalSales: validSales.length,
            totalRevenue,
            totalTax,
            totalDiscount,
            todayTotal,
            todayCount,
            dailyGrowth,
            thisWeekTotal,
            thisWeekCount,
            completedSales,
            pendingSales,
            cancelledSales,
            uniqueCustomers,
            averageTicket,
            paymentMethods,
            saleTypes,
        };
    }, [sales, allSales]);
}
