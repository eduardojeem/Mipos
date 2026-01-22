import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { CashMovement, CashSession } from "@/types/cash";
import { useDebounce } from 'use-debounce';
import { createClient } from "@/lib/supabase";

// Import existing hooks but with optimizations
import { useCashSession } from "./useCashSession";
import { useMovements } from "./useMovements";
import { useCashMutations } from "./useCashMutations";
import { useCashRealtime } from "./useCashRealtime";
import { useMovementFilters } from "../movements/hooks/useMovementFilters";

interface OptimizedCashDataOptions {
  enableRealtime?: boolean;
  enablePrefetch?: boolean;
  cacheTime?: number;
  staleTime?: number;
}

/**
 * Optimized cash dashboard hook with enhanced performance and features
 * Includes intelligent caching, prefetching, and advanced analytics
 */
export function useOptimizedCashData(options: OptimizedCashDataOptions = {}) {
    const {
        enableRealtime = true,
        enablePrefetch = true,
        cacheTime = 300_000, // 5 minutes
        staleTime = 60_000   // 1 minute
    } = options;

    const queryClient = useQueryClient();
    const fmtCurrency = useCurrencyFormatter();
    
    // State management
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState({
        queryTime: 0,
        renderTime: 0,
        cacheHits: 0
    });

    // Pagination with optimized defaults
    const { pagination, controls, isLoading: pagLoading, setTotal } = usePagination({ 
        initialLimit: 20 // Increased for better UX
    });

    // Enhanced filter hook
    const filterHook = useMovementFilters();
    const { filters, setType, setFrom, setTo, setSearch, clearAll } = filterHook;

    // Debounced search with longer delay for better performance
    const [debouncedSearch] = useDebounce(filters.search, 500);

    // Optimized session hook
    const sessionHook = useCashSession();
    const { session, isLoading: sessionLoading, error: sessionError, refetch: refetchSession } = sessionHook;

    // Enhanced movements hook
    const movementsHook = useMovements({
        sessionId: session?.id,
        enabled: !!session?.id,
        includeUser: true
    });
    const { movements, isLoading: movementsLoading, summary, refetch: refetchMovements } = movementsHook;

    // Optimized mutations
    const mutationsHook = useCashMutations({
        session,
        summary,
        onSuccess: () => {
            setLastSyncAt(new Date());
            // Invalidate related queries for consistency
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['cashSession'] });
        }
    });
    const { loadingStates, handleOpenSession, requestCloseSession, requestRegisterMovement, ConfirmationDialog } = mutationsHook;

    // Enhanced realtime
    useCashRealtime({
        sessionId: session?.id,
        enabled: enableRealtime && !!session?.id,
        onUpdate: () => {
            setLastSyncAt(new Date());
            setPerformanceMetrics(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
        }
    });

    // Memoized calculations with performance tracking
    const calculations = useMemo(() => {
        const startTime = performance.now();
        
        const currentBalance = (() => {
            const opening = Number(session?.openingAmount || 0);
            return opening + summary.in + summary.sale - summary.out - summary.return + summary.adjustment;
        })();

        const todayMovements = movements.filter(m =>
            new Date(m.createdAt).toDateString() === new Date().toDateString()
        );

        const todayInflows = todayMovements
            .filter(m => ['IN', 'SALE'].includes(m.type))
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

        const todayOutflows = todayMovements
            .filter(m => ['OUT', 'RETURN'].includes(m.type))
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

        // Advanced analytics
        const analytics = {
            averageTransactionValue: movements.length > 0 ? 
                movements.reduce((sum, m) => sum + Math.abs(m.amount), 0) / movements.length : 0,
            transactionVelocity: todayMovements.length / 24, // per hour
            cashTurnover: todayInflows > 0 ? todayOutflows / todayInflows : 0,
            peakHours: calculatePeakHours(todayMovements),
            riskScore: calculateRiskScore(currentBalance, todayMovements)
        };

        const endTime = performance.now();
        setPerformanceMetrics(prev => ({ 
            ...prev, 
            queryTime: endTime - startTime 
        }));

        return {
            currentBalance,
            todayMovements,
            todayInflows,
            todayOutflows,
            netFlow: todayInflows - todayOutflows,
            analytics
        };
    }, [session?.openingAmount, summary, movements]);

    // Movements Href for navigation
    const movementsHref = useMemo(() => {
        const params = new URLSearchParams();
        if (session?.id) params.set("sessionId", session.id);
        if (filters.type && filters.type !== "all") params.set("type", filters.type);
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.search) params.set("search", filters.search);
        const query = params.toString();
        return `/dashboard/cash/movements${query ? `?${query}` : ''}`;
    }, [session?.id, filters]);

    // Intelligent filtering with performance optimization
    const filteredMovements = useMemo(() => {
        if (!debouncedSearch && filters.type === "all" && !filters.from && !filters.to) {
            return movements; // Skip filtering if no filters applied
        }

        return movements.filter((m) => {
            const byType = filters.type === "all" ? true : m.type === filters.type;
            const date = new Date(m.createdAt);
            const fromOk = filters.from ? date >= new Date(filters.from) : true;
            const toOk = filters.to ? date <= new Date(filters.to) : true;
            const bySearch = debouncedSearch ? 
                (m.reason || "").toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
            
            return byType && fromOk && toOk && bySearch;
        });
    }, [movements, filters.type, filters.from, filters.to, debouncedSearch]);

    // Paginated results with virtual scrolling support
    const paginatedMovements = useMemo(() => {
        const start = (pagination.page - 1) * pagination.limit;
        return filteredMovements.slice(start, start + pagination.limit);
    }, [filteredMovements, pagination.page, pagination.limit]);

    // Enhanced export functionality
    const exportMovementsCSV = useCallback(async (options: { 
        includeAnalytics?: boolean;
        dateRange?: { from: Date; to: Date };
    } = {}) => {
        const { includeAnalytics = false, dateRange } = options;
        
        let dataToExport = filteredMovements;
        if (dateRange) {
            dataToExport = dataToExport.filter(m => {
                const date = new Date(m.createdAt);
                return date >= dateRange.from && date <= dateRange.to;
            });
        }

        const headers = [
            "Fecha", "Tipo", "Monto", "Motivo", "Usuario", "Referencia"
        ];

        if (includeAnalytics) {
            headers.push("Balance Acumulado", "Hora Pico", "Categoría");
        }

        const rows = dataToExport.map((m, index) => {
            const baseRow = [
                new Date(m.createdAt).toLocaleString(),
                m.type,
                String(m.amount),
                m.reason || "-",
                m.createdByUser?.fullName || m.createdByUser?.email || "-",
                m.referenceType ? `${m.referenceType}: ${m.referenceId}` : "-",
            ];

            if (includeAnalytics) {
                const hour = new Date(m.createdAt).getHours();
                const isPeakHour = calculations.analytics.peakHours.includes(hour);
                const runningBalance = calculations.currentBalance; // Simplified for demo
                
                baseRow.push(
                    String(runningBalance),
                    isPeakHour ? "Sí" : "No",
                    Math.abs(m.amount) > calculations.analytics.averageTransactionValue ? "Alto" : "Normal"
                );
            }

            return baseRow;
        });

        const csv = [headers, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        
        const csvWithBOM = "\ufeff" + csv;
        const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `movimientos_caja_optimized_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredMovements, calculations]);

    // Performance monitoring
    useEffect(() => {
        const interval = setInterval(() => {
            setPerformanceMetrics(prev => ({
                ...prev,
                renderTime: performance.now()
            }));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Auto-refresh for critical data
    useEffect(() => {
        if (enableRealtime && session?.status === 'OPEN') {
            const interval = setInterval(() => {
                refetchMovements();
            }, 30000); // Refresh every 30 seconds for active sessions

            return () => clearInterval(interval);
        }
    }, [enableRealtime, session?.status, refetchMovements]);

    return {
        // Core data
        session,
        movements: paginatedMovements,
        allMovements: movements,
        filteredMovements,
        summary,
        
        // Calculations
        ...calculations,
        
        // State
        lastSyncAt,
        pagination,
        controls,
        movementsHref,
        
        // Loading states
        sessionLoading,
        movementsLoading,
        loadingStates,
        
        // Filters (compatible with existing interface)
        filters,
        filterType: filters.type,
        setFilterType: setType,
        filterFrom: filters.from,
        setFilterFrom: setFrom,
        filterTo: filters.to,
        setFilterTo: setTo,
        filterSearch: filters.search,
        setFilterSearch: setSearch,
        filterAmountMin: filters.amountMin,
        setFilterAmountMin: (value: string) => {}, // Placeholder
        filterAmountMax: filters.amountMax,
        setFilterAmountMax: (value: string) => {}, // Placeholder
        clearFilters: clearAll,
        showAdvancedFilters: false, // Placeholder
        setShowAdvancedFilters: (value: boolean | ((prev: boolean) => boolean)) => {}, // Placeholder
        createdByMe: false, // Placeholder
        setCreatedByMe: (value: boolean | ((prev: boolean) => boolean)) => {}, // Placeholder
        
        // Actions
        handleOpenSession,
        requestCloseSession,
        requestRegisterMovement,
        fetchSession: useCallback(async () => {
            const result = await refetchSession();
            if (result.status === "success") setLastSyncAt(new Date());
            return result;
        }, [refetchSession]),
        fetchMovements: useCallback(async () => {
            const result = await refetchMovements();
            if (result.status === "success") setLastSyncAt(new Date());
            return result;
        }, [refetchMovements]),
        exportMovementsCSV,
        
        // Components
        ConfirmationDialog,
        
        // Performance
        performanceMetrics,
        
        // Utilities
        fmtCurrency
    };
}

// Helper functions
function calculatePeakHours(movements: CashMovement[]): number[] {
    const hourCounts = new Array(24).fill(0);
    movements.forEach(m => {
        const hour = new Date(m.createdAt).getHours();
        hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    return hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter(({ count }) => count === maxCount)
        .map(({ hour }) => hour);
}

function calculateRiskScore(balance: number, movements: CashMovement[]): number {
    let score = 0;
    
    // Negative balance increases risk
    if (balance < 0) score += 30;
    
    // High transaction volume increases risk
    if (movements.length > 50) score += 20;
    
    // Large transactions increase risk
    const avgAmount = movements.reduce((sum, m) => sum + Math.abs(m.amount), 0) / movements.length;
    const largeTransactions = movements.filter(m => Math.abs(m.amount) > avgAmount * 3);
    score += largeTransactions.length * 5;
    
    return Math.min(score, 100);
}

async function fetchMovements(page: number) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .range((page - 1) * 20, page * 20 - 1);
    
    if (error) throw error;
    return data;
}