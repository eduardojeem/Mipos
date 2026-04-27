"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import { UnifiedPermissionGuard } from "@/components/auth/UnifiedPermissionGuard";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/date-utils";
import type { CashMovement, CashSession } from "@/types/cash";
import { MovementChartsSection } from "./components/MovementChartsSection";
import { ModernMovementsFilters } from "./components/ModernMovementsFilters";
import { ModernMovementsHeader } from "./components/ModernMovementsHeader";
import { ModernMovementsPagination } from "./components/ModernMovementsPagination";
import { ModernMovementsTable } from "./components/ModernMovementsTable";
import { MovementStats } from "./components/MovementStats";
import { useMovementFilters } from "./hooks/useMovementFilters";
import { useMovementStats } from "./hooks/useMovementStats";
import { useCurrentOrganizationId } from "@/hooks/use-current-organization";
import {
  buildMovementParams,
  countActiveFilters,
  exportMovementsToCSV,
} from "./utils/movementHelpers";

type MovementListResponse = {
  movements: CashMovement[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

const MOVEMENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "SALE", label: "Ventas" },
  { value: "IN", label: "Ingresos" },
  { value: "OUT", label: "Egresos" },
  { value: "RETURN", label: "Devoluciones" },
  { value: "ADJUSTMENT", label: "Ajustes" },
];

const REFERENCE_TYPE_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "SALE", label: "Venta" },
  { value: "RETURN", label: "Devolucion" },
  { value: "MANUAL", label: "Manual" },
];

export default function CashMovementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const organizationId = useCurrentOrganizationId();
  const sessionIdParam = searchParams?.get("sessionId") || "all";

  const {
    filters,
    setType,
    setFrom,
    setTo,
    setSearch,
    setAmountMin,
    setAmountMax,
    setReferenceType,
    setUserId,
    clearAll,
  } = useMovementFilters({
    search: searchParams?.get("search") || "",
    type: searchParams?.get("type") || "all",
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessionIdParam);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<"date" | "amount" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [debouncedSearch] = useDebounce(filters.search, 350);

  useEffect(() => {
    setSelectedSessionId(sessionIdParam);
  }, [sessionIdParam]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    filters.type,
    filters.from,
    filters.to,
    filters.amountMin,
    filters.amountMax,
    filters.referenceType,
    filters.userId,
    selectedSessionId,
  ]);

  const normalizedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const movementParams = useMemo(
    () =>
      buildMovementParams({
        ...normalizedFilters,
        sessionId: selectedSessionId !== "all" ? selectedSessionId : undefined,
      }),
    [normalizedFilters, selectedSessionId],
  );

  const {
    data: movementOptionsData,
    isLoading: filtersLoading,
  } = useQuery({
    queryKey: ["cashMovementFilterOptions", organizationId ?? "no-org"],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const [usersResponse, sessionsResponse] = await Promise.allSettled([
        api.get("/users"),
        api.get("/cash/sessions?page=1&limit=100&orderBy=openedAt&orderDir=desc"),
      ]);

      const rawUsers =
        usersResponse.status === "fulfilled"
          ? (usersResponse.value.data?.data ||
              usersResponse.value.data?.users ||
              []) as Array<Record<string, unknown>>
          : [];

      const rawSessions =
        sessionsResponse.status === "fulfilled"
          ? (sessionsResponse.value.data?.sessions || []) as CashSession[]
          : [];

      return {
        userOptions: [
          { value: "all", label: "Todos" },
          ...rawUsers.map((user) => ({
            value: String(user.id || ""),
            label: String(
              user.full_name ||
                user.fullName ||
                user.name ||
                user.email ||
                user.id ||
                "Usuario",
            ),
          })),
        ].filter((option) => option.value),
        sessionOptions: [
          { value: "all", label: "Todas" },
          ...rawSessions.map((session) => ({
            value: session.id,
            label: `${session.status} · ${session.id.slice(-6)} · ${formatDateTime(
              session.openedAt || session.opening_time,
            )}`,
          })),
        ],
      };
    },
    staleTime: 300_000,
  });

  const {
    data: pagedMovementsData,
    isLoading: movementsLoading,
    isFetching: movementsFetching,
    refetch: refetchMovements,
    dataUpdatedAt,
  } = useQuery({
    queryKey: [
      "cashMovementsPage",
      organizationId ?? "no-org",
      movementParams,
      currentPage,
      pageSize,
      sortKey,
      sortDir,
    ],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const params = buildMovementParams({
        ...normalizedFilters,
        sessionId: selectedSessionId !== "all" ? selectedSessionId : undefined,
        page: currentPage,
        limit: pageSize,
        include: "user",
        orderBy: sortKey,
        orderDir: sortDir,
      });

      const response = await api.get<MovementListResponse>("/cash/movements", { params });
      return response.data;
    },
    staleTime: 30_000,
    refetchInterval: autoRefresh ? 30_000 : false,
    refetchOnWindowFocus: false,
  });

  const {
    data: analyticsMovements = [],
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ["cashMovementsAnalytics", organizationId ?? "no-org", movementParams],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<MovementListResponse>("/cash/movements", {
        params: buildMovementParams({
          ...normalizedFilters,
          sessionId: selectedSessionId !== "all" ? selectedSessionId : undefined,
          include: "user",
        }),
      });

      return Array.isArray(response.data?.movements)
        ? response.data.movements
        : [];
    },
    staleTime: 30_000,
    refetchInterval: autoRefresh ? 30_000 : false,
    refetchOnWindowFocus: false,
  });

  const movements = pagedMovementsData?.movements || [];
  const pagination = pagedMovementsData?.pagination || {
    page: currentPage,
    limit: pageSize,
    total: movements.length,
    pages: 1,
  };
  const stats = useMovementStats(analyticsMovements);
  const activeFiltersCount =
    countActiveFilters(normalizedFilters) + (selectedSessionId !== "all" ? 1 : 0);

  const handleSort = (nextKey: "date" | "amount" | "type") => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDir(nextKey === "type" ? "asc" : "desc");
  };

  const handleQuickFilter = (nextFilter: string) => {
    if (nextFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      setFrom(today);
      setTo(today);
      return;
    }

    if (nextFilter === "current-session") {
      if (sessionIdParam && sessionIdParam !== "all") {
        setSelectedSessionId(sessionIdParam);
      }
      return;
    }

    if (nextFilter === "all-sessions") {
      setSelectedSessionId("all");
      return;
    }

    setType(nextFilter);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      if (analyticsMovements.length === 0) {
        toast({
          description: "No hay movimientos para exportar con los filtros actuales.",
        });
        return;
      }

      exportMovementsToCSV(analyticsMovements, {
        includeFilters: true,
        filters: {
          ...normalizedFilters,
          sessionId: selectedSessionId,
        },
        filename: `movimientos_caja_${new Date().toISOString().split("T")[0]}.csv`,
      });

      toast({
        description: "Los movimientos se exportaron correctamente.",
      });
    } catch (error: any) {
      toast({
        description:
          error?.response?.data?.error ||
          error?.message ||
          "No se pudo exportar el archivo.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <UnifiedPermissionGuard resource="cash" action="read" allowAdmin>
      <div className="space-y-6 pb-10">
        <ModernMovementsHeader
          title="Movimientos de Caja"
          subtitle={
            selectedSessionId !== "all"
              ? "Vista filtrada por sesion de caja"
              : "Monitoreo consolidado de movimientos operativos"
          }
          searchValue={filters.search}
          onSearchChange={setSearch}
          onRefresh={() => {
            refetchMovements();
          }}
          onExport={handleExport}
          onBack={() => router.push("/dashboard/cash")}
          isLoading={movementsLoading || movementsFetching}
          isExporting={isExporting}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={() => setAutoRefresh((prev) => !prev)}
          totalMovements={pagination.total}
          activeFilters={activeFiltersCount}
          onQuickFilter={handleQuickFilter}
          lastUpdate={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        />

        <MovementStats stats={stats} isLoading={analyticsLoading} />

        <ModernMovementsFilters
          type={filters.type}
          search={filters.search}
          dateFrom={filters.from}
          dateTo={filters.to}
          amountMin={filters.amountMin}
          amountMax={filters.amountMax}
          referenceType={filters.referenceType}
          userId={filters.userId}
          sessionId={selectedSessionId}
          typeOptions={MOVEMENT_TYPE_OPTIONS}
          referenceTypeOptions={REFERENCE_TYPE_OPTIONS}
          userOptions={movementOptionsData?.userOptions || [{ value: "all", label: "Todos" }]}
          sessionOptions={movementOptionsData?.sessionOptions || [{ value: "all", label: "Todas" }]}
          onTypeChange={setType}
          onSearchChange={setSearch}
          onDateFromChange={setFrom}
          onDateToChange={setTo}
          onAmountMinChange={setAmountMin}
          onAmountMaxChange={setAmountMax}
          onReferenceTypeChange={setReferenceType}
          onUserIdChange={setUserId}
          onSessionIdChange={setSelectedSessionId}
          onClearAll={() => {
            clearAll();
            setSelectedSessionId(sessionIdParam);
          }}
          activeFiltersCount={activeFiltersCount}
          isLoading={filtersLoading}
        />

        <MovementChartsSection
          movements={analyticsMovements}
          isLoading={analyticsLoading}
        />

        <ModernMovementsTable
          movements={movements}
          isLoading={movementsLoading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />

        <ModernMovementsPagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          pageSize={pagination.limit}
          totalItems={pagination.total}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          isLoading={movementsLoading || movementsFetching}
        />
      </div>
    </UnifiedPermissionGuard>
  );
}
