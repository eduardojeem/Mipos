import { useState, useEffect, useMemo, useCallback } from "react";
import { usePagination } from "@/hooks/usePagination";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { CashMovement } from "@/types/cash";
import { useDebounce } from 'use-debounce';

// Import new focused hooks
import { useCashSession } from "./useCashSession";
import { useMovements } from "./useMovements";
import { useCashMutations } from "./useCashMutations";
import { useCashRealtime } from "./useCashRealtime";
import { useMovementFilters } from "../movements/hooks/useMovementFilters";

/**
 * Main cash dashboard hook - now composed of smaller focused hooks
 * This hook orchestrates all cash-related functionality
 */
export function useCashDashboard() {
    const fmtCurrency = useCurrencyFormatter();
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [enableRealtime, setEnableRealtime] = useState<boolean>(true);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [createdByMe, setCreatedByMe] = useState<boolean>(false);

    // Pagination
    const { pagination, controls, isLoading: pagLoading, setTotal } = usePagination({ initialLimit: 10 });

    // Use shared filter hook
    const filterHook = useMovementFilters();
    const { filters, setType, setFrom, setTo, setSearch, setAmountMin, setAmountMax, clearAll } = filterHook;

    // Debounce search
    const [debouncedSearch] = useDebounce(filters.search, 300);

    // Use new focused hooks
    const sessionHook = useCashSession();
    const { session, isLoading: sessionLoading, error: sessionError, refetch: refetchSession } = sessionHook;

    const movementsHook = useMovements({
        sessionId: session?.id,
        enabled: !!session?.id,
        includeUser: true,
        createdByMe,
    });
    const { movements, isLoading: movementsLoading, isFetching: movementsFetching, summary, refetch: refetchMovements } = movementsHook;

    const mutationsHook = useCashMutations({
        session,
        summary,
        onSuccess: () => {
            setLastSyncAt(new Date());
        },
    });
    const { loadingStates, handleOpenSession, requestCloseSession, requestRegisterMovement, ConfirmationDialog } = mutationsHook;

    // Realtime subscriptions
    useCashRealtime({
        sessionId: session?.id,
        enabled: enableRealtime && !!session?.id,
        onUpdate: () => {
            setLastSyncAt(new Date());
        },
    });

    // Movements Href
    const movementsHref = useMemo(() => {
        const params = new URLSearchParams();
        if (session?.id) params.set("sessionId", session.id);
        if (filters.type && filters.type !== "all") params.set("type", filters.type);
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.search) params.set("search", filters.search);
        if (filters.amountMin) params.set("amountMin", filters.amountMin);
        if (filters.amountMax) params.set("amountMax", filters.amountMax);
        if (createdByMe) params.set("createdByMe", "1");
        const query = params.toString();
        return `/dashboard/cash/movements${query ? `?${query}` : ''}`;
    }, [session?.id, filters, createdByMe]);

    const fetchSession = async () => {
        const r = await refetchSession();
        if (r.status === "success") setLastSyncAt(new Date());
    };

    const fetchMovements = async () => {
        const r = await refetchMovements();
        if (r.status === "success") setLastSyncAt(new Date());
    };

    // Filtered movements
    const filteredMovements = useMemo(() => {
        return movements.filter((m) => {
            const byType = filters.type === "all" ? true : m.type === filters.type;
            const date = new Date(m.createdAt);
            const fromOk = filters.from ? date >= new Date(filters.from) : true;
            const toOk = filters.to ? date <= new Date(filters.to) : true;
            const bySearch = debouncedSearch ? (m.reason || "").toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
            const amountMinOk = filters.amountMin ? m.amount >= parseFloat(filters.amountMin) : true;
            const amountMaxOk = filters.amountMax ? m.amount <= parseFloat(filters.amountMax) : true;
            return byType && fromOk && toOk && bySearch && amountMinOk && amountMaxOk;
        });
    }, [movements, filters.type, filters.from, filters.to, debouncedSearch, filters.amountMin, filters.amountMax]);

    useEffect(() => {
        setTotal(filteredMovements.length);
    }, [filteredMovements.length, setTotal]);

    useEffect(() => {
        controls.goToPage(1);
    }, [filters.type, filters.from, filters.to, debouncedSearch, filters.amountMin, filters.amountMax]);

    const paginatedMovements = useMemo(() => {
        const start = (pagination.page - 1) * pagination.limit;
        return filteredMovements.slice(start, start + pagination.limit);
    }, [filteredMovements, pagination.page, pagination.limit]);

    const currentBalance = useMemo(() => {
        const opening = Number(session?.openingAmount || 0);
        return opening + summary.in + summary.sale - summary.out - summary.return + summary.adjustment;
    }, [session?.openingAmount, summary]);

    const todayMovements = useMemo(() => {
        return movements.filter(m =>
            new Date(m.createdAt).toDateString() === new Date().toDateString()
        );
    }, [movements]);

    const todayInflows = useMemo(() => {
        return todayMovements
            .filter(m => ['IN', 'SALE'].includes(m.type))
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);
    }, [todayMovements]);

    const exportMovementsCSV = () => {
        const header = ["Fecha", "Tipo", "Monto", "Motivo", "Usuario", "Referencia"];
        const rows = filteredMovements.map((m) => [
            new Date(m.createdAt).toLocaleString(),
            m.type,
            String(m.amount),
            m.reason || "-",
            m.createdByUser?.fullName || m.createdByUser?.email || "-",
            m.referenceType ? `${m.referenceType}: ${m.referenceId}` : "-",
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const csvWithBOM = "\ufeff" + csv;
        const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `movimientos_caja_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return {
        session,
        error: sessionError,
        loadingStates,
        movements,
        summary,
        lastSyncAt,
        pagination,
        controls,
        pagLoading,
        // Use filter hook values
        filterType: filters.type,
        setFilterType: setType,
        filterFrom: filters.from,
        setFilterFrom: setFrom,
        filterTo: filters.to,
        setFilterTo: setTo,
        filterSearch: filters.search,
        setFilterSearch: setSearch,
        filterAmountMin: filters.amountMin,
        setFilterAmountMin: setAmountMin,
        filterAmountMax: filters.amountMax,
        setFilterAmountMax: setAmountMax,
        showAdvancedFilters,
        setShowAdvancedFilters,
        clearFilters: clearAll,
        movementsHref,
        createdByMe,
        setCreatedByMe,
        sessionLoading,
        sessionError,
        fetchSession,
        movementsLoading,
        movementsFetching,
        fetchMovements,
        handleOpenSession,
        requestCloseSession,
        requestRegisterMovement,
        filteredMovements,
        paginatedMovements,
        exportMovementsCSV,
        currentBalance,
        todayMovements,
        todayInflows,
        enableRealtime,
        setEnableRealtime,
        ConfirmationDialog,
        fmtCurrency
    };
}
