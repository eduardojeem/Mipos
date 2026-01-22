"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnifiedPermissionGuard } from "@/components/auth/UnifiedPermissionGuard";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashMovement } from "@/types/cash";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { useDebounce } from "use-debounce";
import { motion } from "framer-motion";

// Modern Components
import { ModernMovementsHeader } from "./components/ModernMovementsHeader";
import { ModernMovementsTable } from "./components/ModernMovementsTable";
import { ModernMovementsFilters } from "./components/ModernMovementsFilters";
import { ModernMovementsPagination } from "./components/ModernMovementsPagination";

// Existing utilities and hooks
import { useMovementFilters } from "./hooks/useMovementFilters";
import { useMovementStats } from "./hooks/useMovementStats";
import { useMovementRealtime } from "./hooks/useMovementRealtime";
import { MovementStats } from "./components/MovementStats";
import { buildMovementParams, countActiveFilters } from "./utils/movementHelpers";

export default function ModernMovementsPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null);
  
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sessionIdParam = searchParams?.get("sessionId") || undefined;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Filter hooks
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
  } = useMovementFilters();

  // Debounced search
  const [debouncedSearch] = useDebounce(filters.search, 500);

  // State
  const [usersOptions, setUsersOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | 'all'>(sessionIdParam || 'all');
  const [sortKey, setSortKey] = useState<"date" | "amount" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const initializedRef = React.useRef(false);

  // Fetch movements with debounced search
  const {
    data: movementsRes,
    isLoading: movementsLoading,
    isFetching: movementsFetching,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: [
      "cashMovementsAll",
      sessionIdParam,
      filters.type,
      filters.from,
      filters.to,
      debouncedSearch, // Use debounced value
      filters.amountMin,
      filters.amountMax,
      filters.referenceType,
      filters.userId,
      currentPage,
      pageSize,
      sortKey,
      sortDir,
    ],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('cash_movements')
        .select(`
          *,
          created_by_user:created_by(id, email, full_name)
        `, { count: 'planned' });

      const sortColumn = sortKey === 'date' ? 'created_at' : sortKey === 'amount' ? 'amount' : 'type';
      query = query.order(sortColumn, { ascending: sortDir === 'asc' });

      if (sessionIdParam) query = query.eq('session_id', sessionIdParam);
      if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
      if (filters.referenceType && filters.referenceType !== 'all') query = query.eq('reference_type', filters.referenceType);
      if (filters.userId && filters.userId !== 'all') query = query.eq('created_by', filters.userId);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', toDate.toISOString());
      }
      if (filters.amountMin) query = query.gte('amount', Number(filters.amountMin));
      if (filters.amountMax) query = query.lte('amount', Number(filters.amountMax));
      if (debouncedSearch) query = query.ilike('reason', `%${debouncedSearch}%`);

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      const mapped = (data || []).map((m: any) => ({
        id: m.id,
        sessionId: m.session_id,
        type: String(m.type || '').toUpperCase(),
        amount: Number(m.amount || 0),
        reason: m.reason || null,
        referenceType: m.reference_type || null,
        referenceId: m.reference_id || null,
        createdAt: m.created_at,
        updatedAt: m.updated_at || m.created_at,
        createdByUser: m.created_by_user ? {
          id: m.created_by_user.id,
          email: m.created_by_user.email,
          fullName: m.created_by_user.full_name || m.created_by_user.raw_user_meta_data?.full_name || null,
        } : null,
      })) as CashMovement[];
      return { movements: mapped, pagination: { total: typeof count === 'number' ? count : mapped.length } } as any;
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Fetch users for filter
  const { data: usersRes } = useQuery({
    queryKey: ["usersOptions"],
    queryFn: async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return { source: 'supabase', users: data || [] } as any;
      } catch {
        const res = await api.get('/users');
        return { source: 'api', users: (res?.data?.data || res?.data?.users || []) } as any;
      }
    },
    staleTime: 300_000,
  });

  const { data: sessionsListRes } = useQuery({
    queryKey: ['cashSessionsList', 50],
    queryFn: async () => {
      const res = await api.get('/cash/sessions', { params: { page: 1, limit: 50 } });
      return res.data;
    },
    staleTime: 60_000,
  });

  // Fetch current session
  const { data: sessionRes } = useQuery({
    queryKey: ["cashSession"],
    queryFn: async () => {
      const res = await api.get('/cash/session/current');
      return res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const currentSession = sessionRes?.session;

  // Use realtime hook
  useMovementRealtime(sessionIdParam);

  // Initialize filters and sorting from URL
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const type = searchParams?.get('type');
    const from = searchParams?.get('from');
    const to = searchParams?.get('to');
    const search = searchParams?.get('search');
    const amountMin = searchParams?.get('amountMin');
    const amountMax = searchParams?.get('amountMax');
    const referenceType = searchParams?.get('referenceType');
    const userId = searchParams?.get('userId');
    const orderBy = searchParams?.get('orderBy') as any;
    const orderDir = searchParams?.get('orderDir') as any;
    const pageParam = searchParams?.get('page');
    const limitParam = searchParams?.get('limit');

    if (type) setType(type);
    if (from) setFrom(from);
    if (to) setTo(to);
    if (search) setSearch(search);
    if (amountMin) setAmountMin(amountMin);
    if (amountMax) setAmountMax(amountMax);
    if (referenceType) setReferenceType(referenceType);
    if (userId) setUserId(userId);
    if (orderBy && (orderBy === 'date' || orderBy === 'amount' || orderBy === 'type')) setSortKey(orderBy);
    if (orderDir && (orderDir === 'asc' || orderDir === 'desc')) setSortDir(orderDir);
    const page = pageParam ? Number(pageParam) : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;
    if (limit && Number.isFinite(limit) && limit > 0) setPageSize(limit);
    if (page && Number.isFinite(page) && page > 0) setCurrentPage(page);
    setSelectedSessionId(sessionIdParam || 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters and sorting in URL
  useEffect(() => {
    const params = buildMovementParams({
      sessionId: selectedSessionId !== 'all' ? selectedSessionId : undefined,
      type: filters.type,
      from: filters.from,
      to: filters.to,
      search: debouncedSearch,
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      referenceType: filters.referenceType,
      userId: filters.userId,
      page: currentPage,
      limit: pageSize,
      orderBy: sortKey,
      orderDir: sortDir,
    });
    const query = new URLSearchParams(params).toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`);
  }, [filters.type, filters.from, filters.to, debouncedSearch, filters.amountMin, filters.amountMax, filters.referenceType, filters.userId, currentPage, pageSize, sortKey, sortDir, pathname, router, selectedSessionId]);

  useEffect(() => {
    const list: any[] = usersRes?.users || usersRes?.data || [];
    const opts = [{ value: "all", label: "Todos" }, ...list.map((u: any) => ({ value: u.id, label: u.full_name || u.fullName || u.email || u.id }))];
    setUsersOptions(opts);
  }, [usersRes]);

  const sessionOptions = React.useMemo(() => {
    const list: any[] = sessionsListRes?.sessions || [];
    const opts = [{ value: 'all', label: 'Todas' }, ...list.map((s: any) => ({ value: s.id, label: `${String(s.status || '').toUpperCase()} • ${new Date(s.openedAt).toLocaleString('es-AR')}` }))];
    return opts;
  }, [sessionsListRes]);

  const loadingMovements = movementsLoading || movementsFetching;

  useEffect(() => {
    if (movementsRes?.movements) {
      const mvts: CashMovement[] = movementsRes.movements || [];
      setMovements(mvts);
      const total = movementsRes.pagination?.total ?? mvts.length;
      setTotalItems(total);
      setLastUpdate(new Date());
    }
  }, [movementsRes]);

  // Use memoized stats hook
  const movementStats = useMovementStats(movements);

  // Count active filters
  const activeFilterCount = countActiveFilters(filters);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = buildMovementParams({
        sessionId: sessionIdParam,
        type: filters.type,
        from: filters.from,
        to: filters.to,
        search: debouncedSearch,
        amountMin: filters.amountMin,
        amountMax: filters.amountMax,
        referenceType: filters.referenceType,
        userId: filters.userId,
        orderBy: sortKey,
        orderDir: sortDir,
        include: "user",
      });
      const res = await api.get('/cash/movements/export', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Exportación exitosa",
        description: "Los movimientos se exportaron correctamente",
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudieron exportar los movimientos",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Quick filter handlers
  const handleQuickFilter = (type: string) => {
    switch (type) {
      case "SALE":
        setType("SALE");
        setReferenceType("SALE");
        break;
      case "IN":
        setType("IN");
        break;
      case "OUT":
        setType("OUT");
        break;
      case "today":
        const today = new Date().toISOString().split('T')[0];
        setFrom(today);
        setTo(today);
        break;
      case "current-session":
        if (currentSession?.id) {
          const params = new URLSearchParams();
          params.set('sessionId', currentSession.id);
          router.push(`${pathname}?${params.toString()}`);
        }
        break;
      case "all-sessions":
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.delete('sessionId');
        router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
        break;
    }
  };

  const handleSort = (key: "date" | "amount" | "type") => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <UnifiedPermissionGuard permissions={["cash:view"]}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-8 pb-10"
      >
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          {/* Modern Header */}
          <ModernMovementsHeader
            title="Movimientos de Caja"
            subtitle={sessionIdParam ? "Movimientos de la sesión" : "Historial completo"}
            searchValue={filters.search}
            onSearchChange={setSearch}
            onRefresh={() => refetchMovements()}
            onExport={handleExportCSV}
            isLoading={loadingMovements}
            isExporting={isExporting}
            autoRefresh={autoRefresh}
            onAutoRefreshToggle={() => setAutoRefresh(v => !v)}
            totalMovements={totalItems}
            activeFilters={activeFilterCount}
            onQuickFilter={handleQuickFilter}
            lastUpdate={lastUpdate}
          />

          {/* Stats */}
          <MovementStats stats={movementStats} isLoading={loadingMovements} />

          {/* Modern Filters */}
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
            typeOptions={[
              { value: "all", label: "Todos" },
              { value: "IN", label: "Ingreso" },
              { value: "OUT", label: "Egreso" },
              { value: "SALE", label: "Venta" },
              { value: "RETURN", label: "Devolución" },
              { value: "ADJUSTMENT", label: "Ajuste" },
            ]}
            referenceTypeOptions={[
              { value: "all", label: "Todas" },
              { value: "SALE", label: "Venta" },
              { value: "RETURN", label: "Devolución" },
            ]}
            userOptions={usersOptions}
            sessionOptions={sessionOptions}
            onTypeChange={setType}
            onSearchChange={setSearch}
            onDateFromChange={setFrom}
            onDateToChange={setTo}
            onAmountMinChange={setAmountMin}
            onAmountMaxChange={setAmountMax}
            onReferenceTypeChange={setReferenceType}
            onUserIdChange={setUserId}
            onSessionIdChange={(v: string) => {
              setSelectedSessionId(v as any);
              const params = new URLSearchParams(searchParams?.toString() || '');
              if (!v || v === 'all') params.delete('sessionId'); 
              else params.set('sessionId', v);
              router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
            }}
            onClearAll={clearAll}
            activeFiltersCount={activeFilterCount}
            isLoading={loadingMovements}
          />

          {/* Modern Table */}
          <ModernMovementsTable
            movements={movements}
            isLoading={loadingMovements}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onViewDetails={setSelectedMovement}
          />

          {/* Modern Pagination */}
          <ModernMovementsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={loadingMovements}
          />

          {/* Footer Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <span>Fuente: Supabase</span>
              <span>•</span>
              <span>{movements.length} de {totalItems.toLocaleString()} movimientos</span>
            </div>
            <div>
              Última actualización: {lastUpdate ? lastUpdate.toLocaleString('es-ES') : "-"}
            </div>
          </div>
        </Suspense>
      </motion.div>
    </UnifiedPermissionGuard>
  );
}
