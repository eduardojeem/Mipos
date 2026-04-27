import { useEffect, useMemo, useState, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import { usePagination } from "@/hooks/usePagination";
import { exportMovementsToCSV } from "../movements/utils/movementHelpers";
import { useCashMutations } from "./useCashMutations";
import { useCashRealtime } from "./useCashRealtime";
import { useCashSession } from "./useCashSession";
import { useMovements } from "./useMovements";
import { useMovementFilters } from "../movements/hooks/useMovementFilters";

interface OptimizedCashDataOptions {
  enableRealtime?: boolean;
  enablePrefetch?: boolean;
  cacheTime?: number;
  staleTime?: number;
}

export function useOptimizedCashData(options: OptimizedCashDataOptions = {}) {
  const enableRealtime = options.enableRealtime ?? true;
  const fmtCurrency = useCurrencyFormatter();

  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [createdByMe, setCreatedByMe] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    queryTime: 0,
    renderTime: 0,
    cacheHits: 0,
  });

  const { pagination, controls, isLoading: pagLoading, setTotal } = usePagination({
    initialLimit: 20,
  });

  const { filters, setType, setFrom, setTo, setSearch, setAmountMin, setAmountMax, clearAll } =
    useMovementFilters();
  const [debouncedSearch] = useDebounce(filters.search, 400);

  const {
    session,
    isLoading: sessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useCashSession();

  const {
    movements,
    isLoading: movementsLoading,
    isFetching: movementsFetching,
    summary,
    refetch: refetchMovements,
  } = useMovements({
    sessionId: session?.id,
    enabled: Boolean(session?.id),
    includeUser: true,
    createdByMe,
  });

  const {
    loadingStates,
    handleOpenSession,
    requestCloseSession,
    requestRegisterMovement,
    ConfirmationDialog,
  } = useCashMutations({
    session,
    summary,
    onSuccess: () => {
      setLastSyncAt(new Date());
    },
  });

  useCashRealtime({
    sessionId: session?.id,
    enabled: enableRealtime && Boolean(session?.id),
    onUpdate: () => {
      setLastSyncAt(new Date());
      setPerformanceMetrics((previous) => ({
        ...previous,
        cacheHits: previous.cacheHits + 1,
      }));
    },
  });

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
    return `/dashboard/cash/movements${query ? `?${query}` : ""}`;
  }, [createdByMe, filters, session?.id]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const byType = filters.type === "all" ? true : movement.type === filters.type;
      const createdAt = new Date(movement.createdAt);
      const fromOk = filters.from ? createdAt >= new Date(filters.from) : true;
      const toOk = filters.to ? createdAt <= new Date(filters.to) : true;
      const bySearch = debouncedSearch
        ? (movement.reason || "").toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const amountMinOk = filters.amountMin
        ? Math.abs(movement.amount) >= Number(filters.amountMin)
        : true;
      const amountMaxOk = filters.amountMax
        ? Math.abs(movement.amount) <= Number(filters.amountMax)
        : true;

      return byType && fromOk && toOk && bySearch && amountMinOk && amountMaxOk;
    });
  }, [
    movements,
    filters.type,
    filters.from,
    filters.to,
    debouncedSearch,
    filters.amountMin,
    filters.amountMax,
  ]);

  useEffect(() => {
    setTotal(filteredMovements.length);
  }, [filteredMovements.length, setTotal]);

  useEffect(() => {
    controls.goToPage(1);
  }, [
    controls.goToPage,
    filters.type,
    filters.from,
    filters.to,
    debouncedSearch,
    filters.amountMin,
    filters.amountMax,
    createdByMe,
  ]);

  const paginatedMovements = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredMovements.slice(start, start + pagination.limit);
  }, [filteredMovements, pagination.page, pagination.limit]);

  const calculations = useMemo(() => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const openingAmount = Number(session?.openingAmount || 0);
    const currentBalance =
      openingAmount + summary.in + summary.sale - summary.out - summary.return + summary.adjustment;
    const today = new Date().toDateString();
    const todayMovements = movements.filter(
      (movement) => new Date(movement.createdAt).toDateString() === today,
    );
    const todayInflows = todayMovements
      .filter((movement) => movement.type === "IN" || movement.type === "SALE")
      .reduce((sum, movement) => sum + Math.abs(Number(movement.amount || 0)), 0);
    const todayOutflows = todayMovements
      .filter((movement) => movement.type === "OUT" || movement.type === "RETURN")
      .reduce((sum, movement) => sum + Math.abs(Number(movement.amount || 0)), 0);
    const analytics = {
      averageTransactionValue:
        movements.length > 0
          ? movements.reduce((sum, movement) => sum + Math.abs(Number(movement.amount || 0)), 0) /
            movements.length
          : 0,
      transactionVelocity: todayMovements.length / 24,
      cashTurnover: todayInflows > 0 ? todayOutflows / todayInflows : 0,
      peakHours: calculatePeakHours(todayMovements),
      riskScore: calculateRiskScore(currentBalance, todayMovements),
    };
    const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      currentBalance,
      todayMovements,
      todayInflows,
      todayOutflows,
      netFlow: todayInflows - todayOutflows,
      analytics,
      computationMs: finishedAt - startedAt,
    };
  }, [movements, session?.openingAmount, summary]);

  useEffect(() => {
    setPerformanceMetrics((previous) => ({
      ...previous,
      queryTime: calculations.computationMs,
      renderTime: Date.now(),
    }));
  }, [calculations.computationMs]);

  const fetchSession = useCallback(async () => {
    const result = await refetchSession();
    if (result.status === "success") {
      setLastSyncAt(new Date());
    }
    return result;
  }, [refetchSession]);

  const fetchMovements = useCallback(async () => {
    const result = await refetchMovements();
    if (result.status === "success") {
      setLastSyncAt(new Date());
    }
    return result;
  }, [refetchMovements]);

  const exportFilteredMovements = useCallback(() => {
    exportMovementsToCSV(filteredMovements, {
      includeFilters: true,
      filters: {
        type: filters.type,
        from: filters.from,
        to: filters.to,
        amountMin: filters.amountMin,
        amountMax: filters.amountMax,
        createdByMe: createdByMe ? "1" : "",
      },
      filename: `movimientos_caja_${new Date().toISOString().split("T")[0]}.csv`,
    });
  }, [createdByMe, filteredMovements, filters]);

  return {
    session,
    movements: paginatedMovements,
    allMovements: movements,
    filteredMovements,
    summary,
    ...calculations,
    lastSyncAt,
    pagination,
    controls,
    pagLoading,
    movementsHref,
    sessionLoading,
    movementsLoading,
    movementsFetching,
    loadingStates,
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
    setFilterAmountMin: setAmountMin,
    filterAmountMax: filters.amountMax,
    setFilterAmountMax: setAmountMax,
    clearFilters: clearAll,
    showAdvancedFilters,
    setShowAdvancedFilters,
    createdByMe,
    setCreatedByMe,
    handleOpenSession,
    requestCloseSession,
    requestRegisterMovement,
    fetchSession,
    fetchMovements,
    exportMovementsCSV: exportFilteredMovements,
    ConfirmationDialog,
    performanceMetrics,
    sessionError,
    fmtCurrency,
  };
}

function calculatePeakHours(movements: Array<{ createdAt: string }>): number[] {
  if (movements.length === 0) {
    return [];
  }

  const hourCounts = new Array(24).fill(0);
  movements.forEach((movement) => {
    const hour = new Date(movement.createdAt).getHours();
    hourCounts[hour] += 1;
  });

  const maxCount = Math.max(...hourCounts);
  return hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count === maxCount && count > 0)
    .map(({ hour }) => hour);
}

function calculateRiskScore(
  balance: number,
  movements: Array<{ amount: number }>,
): number {
  let score = 0;

  if (balance < 0) {
    score += 30;
  }

  if (movements.length > 50) {
    score += 20;
  }

  if (movements.length > 0) {
    const averageAmount =
      movements.reduce((sum, movement) => sum + Math.abs(Number(movement.amount || 0)), 0) /
      movements.length;
    const largeTransactions = movements.filter(
      (movement) => Math.abs(Number(movement.amount || 0)) > averageAmount * 3,
    );
    score += largeTransactions.length * 5;
  }

  return Math.min(score, 100);
}
