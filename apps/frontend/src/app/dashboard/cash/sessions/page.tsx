"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date-utils";
import { Activity, AlertCircle, Clock, RefreshCw, CheckCircle, XCircle, Download, List } from "lucide-react";
import { UnifiedPermissionGuard, WithPermission } from "@/components/auth/UnifiedPermissionGuard";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { TableSkeleton } from "@/components/ui/loading-states";
import { useToast } from "@/components/ui/use-toast";
import type { CashSession } from "@/types/cash";
import CashFilters from "@/components/cash/CashFilters";
import { useSessionsData } from "./hooks/useSessionsData";
import { useExportSessions } from "./hooks/useExportSessions";
import { CashCountModal } from "./components/CashCountModal";
import api from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { VirtualizedTable } from "@/components/ui/virtualized-table";
import { useSessionsRealtime } from "./hooks/useSessionsRealtime";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDebounce } from "use-debounce";
import { useCurrentOrganizationId } from "@/hooks/use-current-organization";



type CashCount = {
  denomination: number;
  quantity: number;
  total: number;
};

type SessionCount = {
  denomination: number | string;
  quantity?: number | string | null;
  total?: number | string | null;
};

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { exportToCSV } = useExportSessions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useCurrentOrganizationId();

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [usersOptions, setUsersOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "all", label: "Todos" },
  ]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'openedAt' | 'closedAt' | 'status'>('openedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [localSearch, setLocalSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    status: true,
    openingAmount: true,
    totalSold: true,
    actualCash: true,
    systemExpected: true,
    discrepancyAmount: true,
    users: true,
    dates: true,
    actions: true,
  });

  const colLabels: Record<string, string> = {
    status: "Estado",
    openingAmount: "Monto apertura",
    totalSold: "Ventas",
    actualCash: "Efectivo real",
    systemExpected: "Esperado",
    discrepancyAmount: "Diferencia",
    users: "Usuario",
    dates: "Fecha",
    actions: "Acciones",
  };
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSession, setDetailsSession] = useState<CashSession | null>(null);
  const [debouncedSearch] = useDebounce(localSearch, 350);

  // Paginación
  const { pagination, controls, setTotal } = usePagination({ initialLimit: 15 });

  // Fetch sessions con paginación de servidor
  const { sessions, isLoading: sessionsLoading, isFetching: sessionsFetching, refetch: refetchSessions, pagination: serverPagination, source } = useSessionsData({
    filters: {
      status: filterStatus !== "all" ? filterStatus : undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      userId: filterUser !== "all" ? filterUser : undefined,
      search: debouncedSearch || undefined,
      showHistory,
    },
    page: pagination.page,
    limit: pagination.limit,
    orderBy: sortBy,
    orderDir: sortDir,
  });

  useSessionsRealtime(Boolean(organizationId));

  const { data: usersRes } = useQuery({
    queryKey: ["usersOptionsSessions", organizationId ?? "no-org"],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const res = await api.get('/users');
      return { source: 'api', users: (res?.data?.data || res?.data?.users || []) } as any;
    },
    staleTime: 300_000,
  });

  React.useEffect(() => {
    const list: any[] = usersRes?.users || usersRes?.data || [];
    const opts = [{ value: "all", label: "Todos" }, ...list.map((u: any) => ({ value: u.id, label: u.full_name || u.fullName || u.name || u.email || u.id }))];
    setUsersOptions(opts);
  }, [usersRes]);

  React.useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const id = (data?.user?.id as string) || null;
        setCurrentUserId(id);
      } catch { }
    })();
  }, []);

  const updateUrl = React.useCallback((next: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams(searchParams?.toString() || "");
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") qs.delete(k); else qs.set(k, String(v));
    });
    router.replace(`/dashboard/cash/sessions?${qs.toString()}`);
  }, [router, searchParams]);

  React.useEffect(() => {
    const sp = searchParams;
    if (!sp) return;
    const s = sp.get('status') || undefined;
    const f = sp.get('from') || undefined;
    const t = sp.get('to') || undefined;
    const u = sp.get('user') || undefined;
    const q = sp.get('search') || '';
    const p = parseInt(sp.get('page') || '1', 10);
    const l = parseInt(sp.get('limit') || String(pagination.limit), 10);
    const ob = (sp.get('orderBy') as any) || undefined;
    const od = (sp.get('orderDir') as any) || undefined;
    if (s) setFilterStatus(s);
    if (f) setFilterFrom(f);
    if (t) setFilterTo(t);
    if (u) setFilterUser(u);
    setLocalSearch(q);
    if (!Number.isNaN(p) && p > 0) controls.goToPage(p);
    if (!Number.isNaN(l) && l > 0) controls.setLimit(l);
    if (ob === 'openedAt' || ob === 'closedAt' || ob === 'status') setSortBy(ob);
    if (od === 'asc' || od === 'desc') setSortDir(od);
  }, [searchParams]);

  React.useEffect(() => {
    updateUrl({ status: filterStatus !== 'all' ? filterStatus : undefined, from: filterFrom || undefined, to: filterTo || undefined, user: filterUser !== 'all' ? filterUser : undefined, search: debouncedSearch || undefined, page: pagination.page, limit: pagination.limit, orderBy: sortBy, orderDir: sortDir });
  }, [filterStatus, filterFrom, filterTo, filterUser, debouncedSearch, pagination.page, pagination.limit, sortBy, sortDir, updateUrl]);

  React.useEffect(() => {
    controls.goToPage(1);
  }, [debouncedSearch, controls.goToPage]);

  const handleSort = React.useCallback((key: 'openedAt' | 'closedAt' | 'status') => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
    controls.goToPage(1);
  }, [sortBy, controls]);



  // Modal state
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [counts, setCounts] = useState<CashCount[]>([
    { denomination: 100000, quantity: 0, total: 0 },
    { denomination: 50000, quantity: 0, total: 0 },
    { denomination: 20000, quantity: 0, total: 0 },
    { denomination: 10000, quantity: 0, total: 0 },
    { denomination: 5000, quantity: 0, total: 0 },
    { denomination: 2000, quantity: 0, total: 0 },
    { denomination: 1000, quantity: 0, total: 0 },
    { denomination: 500, quantity: 0, total: 0 },
    { denomination: 100, quantity: 0, total: 0 },
    { denomination: 50, quantity: 0, total: 0 },
  ]);

  const loadingSessions = sessionsLoading || sessionsFetching;

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterFrom("");
    setFilterTo("");
    setFilterUser("all");
    setLocalSearch("");
    controls.goToPage(1);
  };

  React.useEffect(() => {
    if (serverPagination && typeof serverPagination.total === 'number') {
      setTotal(serverPagination.total);
    }
  }, [serverPagination, setTotal]);

  // Estadísticas de sesiones
  const sessionStats = useMemo(() => {
    const stats = {
      total: sessions.length,
      open: 0,
      closed: 0,
      cancelled: 0,
      totalDiscrepancy: 0,
    };

    sessions.forEach((s) => {
      const discrepancy = s.summary?.differenceAmount ?? s.discrepancyAmount;
      if (discrepancy) stats.totalDiscrepancy += Math.abs(discrepancy);
      const status = (s.status || '').toUpperCase();
      if (status === "OPEN") stats.open++;
      else if (status === "CLOSED") stats.closed++;
      else if (status === "CANCELLED") stats.cancelled++;
    });

    return stats;
  }, [sessions]);

  const sessionsColumns = useMemo(() => ([
    {
      key: 'status',
      header: 'Estado',
      render: (s: CashSession) => getSessionStatusBadge(s.status),
      minWidth: 120,
    },
    {
      key: 'openingAmount',
      header: 'Apertura',
      render: (s: CashSession) => <span className="font-medium">{formatCurrency(s.openingAmount)}</span>,
      minWidth: 140,
    },
    {
      key: 'totalSold',
      header: 'Ventas',
      render: (s: CashSession) => <span className="font-medium">{formatCurrency(s.summary?.totalSold || 0)}</span>,
      minWidth: 140,
    },
    {
      key: 'systemExpected',
      header: 'Esperado',
      render: (s: CashSession) => s.systemExpected != null ? formatCurrency(s.systemExpected) : '-',
      minWidth: 140,
    },
    {
      key: 'actualCash',
      header: 'Real',
      render: (s: CashSession) => {
        const actualCash = s.summary?.actualCash ?? s.closingAmount;
        return actualCash != null ? formatCurrency(actualCash) : '-';
      },
      minWidth: 140,
    },
    {
      key: 'discrepancyAmount',
      header: 'Diferencia',
      render: (s: CashSession) => (
        <div className="space-y-1">
          {getDiscrepancyBadge(s.summary?.differenceAmount ?? s.discrepancyAmount)}
          {(s.summary?.differenceAmount ?? s.discrepancyAmount) ? (
            <div className="text-xs text-muted-foreground">{formatCurrency((s.summary?.differenceAmount ?? s.discrepancyAmount) || 0)}</div>
          ) : null}
        </div>
      ),
      minWidth: 160,
    },
    {
      key: 'users',
      header: 'Usuario',
      render: (s: CashSession) => (
        <div className="text-sm">
          <div>Abr: {s.openedByUser?.fullName || s.openedByUser?.email || '-'}</div>
          {s.closedByUser && (
            <div>Cer: {s.closedByUser.fullName || s.closedByUser.email}</div>
          )}
        </div>
      ),
      minWidth: 180,
    },
    {
      key: 'dates',
      header: 'Fecha',
      render: (s: CashSession) => (
        <div className="text-sm">
          <div>{formatDateTime(s.openedAt)}</div>
          {s.closedAt && (
            <div className="text-muted-foreground">{formatDateTime(s.closedAt)}</div>
          )}
        </div>
      ),
      minWidth: 180,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (s: CashSession) => (
        <div className="flex gap-2">
          <WithPermission resource="cash" action="close">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCountModal(s)}
              disabled={(s.status || '').toUpperCase() !== 'OPEN'}
            >
              Arqueo
            </Button>
          </WithPermission>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/cash/movements?sessionId=${encodeURIComponent(s.id)}`)}
          >
            <List className="h-4 w-4 mr-1" /> Movimientos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDetailsSession(s); setDetailsOpen(true); }}
          >
            Detalle
          </Button>
        </div>
      ),
      minWidth: 220,
    },
  ]).filter((col) => visibleCols[String(col.key)]), [router, visibleCols]);

  const getSessionStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      OPEN: "default",
      CLOSED: "secondary",
      CANCELLED: "destructive",
    };
    const icons = {
      OPEN: <Clock className="h-3 w-3 mr-1" />,
      CLOSED: <CheckCircle className="h-3 w-3 mr-1" />,
      CANCELLED: <XCircle className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center">
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    );
  };

  const getDiscrepancyBadge = (discrepancy: number | null | undefined) => {
    if (discrepancy == null) return null;
    const abs = Math.abs(discrepancy);
    if (abs === 0) return <Badge variant="outline" className="text-green-600">Cuadrado</Badge>;
    if (abs < 1000) return <Badge variant="outline" className="text-yellow-600">Menor</Badge>;
    return <Badge variant="destructive">Discrepancia</Badge>;
  };

  const calculateCountTotal = () => {
    return counts.reduce((sum, count) => sum + count.total, 0);
  };

  const updateCount = (index: number, quantity: number) => {
    const newCounts = [...counts];
    newCounts[index].quantity = quantity;
    newCounts[index].total = newCounts[index].denomination * quantity;
    setCounts(newCounts);
  };

  const openCountModal = (session: CashSession) => {
    setSelectedSession(session);
    const sessionCounts = Array.isArray(session.counts) ? (session.counts as SessionCount[]) : [];
    if (sessionCounts.length > 0) {
      const existingCounts = counts.map(c => {
        const match = sessionCounts.find((ec) => Number(ec.denomination) === c.denomination);
        return match ? { ...c, quantity: Number(match.quantity) || 0, total: Number(match.total) || (c.denomination * (Number(match.quantity) || 0)) } : c;
      });
      setCounts(existingCounts);
    } else {
      setCounts(counts.map(c => ({ ...c, quantity: 0, total: 0 })));
    }
    setShowCountModal(true);
  };

  // Save counts mutation
  const saveCountsMutation = useMutation({
    mutationFn: async (counts: CashCount[]) => {
      const res = await api.post(`/cash/sessions/${selectedSession!.id}/counts`, {
        counts: counts.filter(c => c.quantity > 0)
      });
      return res.data;
    },
    onSuccess: () => {
      toast({ description: "Conteo guardado exitosamente" });
      setShowCountModal(false);
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      refetchSessions();
    },
    onError: (error: any) => {
      toast({
        description: error?.response?.data?.error || error?.message || "Error guardando conteo",
        variant: "destructive"
      });
    },
  });

  const handleSaveCounts = () => {
    saveCountsMutation.mutate(counts);
  };

  return (
    <UnifiedPermissionGuard resource="cash" action="read">
      <div className="space-y-6" style={{ contentVisibility: 'auto', containIntrinsicSize: '1200px' }}>
        {/* Cabecera principal */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Clock className="h-6 w-6" />
              Sesiones de Caja
            </h1>
            <p className="text-sm text-muted-foreground">
              Historial completo de aperturas y cierres de caja
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showHistory ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? "Ver Recientes" : "Ver Historial"}
            </Button>
            <WithPermission resource="cash" action="read">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(sessions)}
                disabled={sessions.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </WithPermission>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSessions()}
              disabled={loadingSessions}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loadingSessions && "animate-spin")} />
              {loadingSessions ? "Actualizando..." : "Actualizar"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Columnas</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Visibilidad de columnas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(visibleCols).map(k => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={visibleCols[k]}
                    onCheckedChange={(v) => setVisibleCols(prev => ({ ...prev, [k]: Boolean(v) }))}
                  >
                    {colLabels[k] || k}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="flex items-center gap-2">
          <Input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Buscar por estado, notas o ID de sesión..."
            className="max-w-md"
          />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200/70 bg-gradient-to-br from-slate-50 to-background dark:border-slate-800 dark:from-slate-900/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 ring-2 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
                <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{sessionStats.total}</div>
                <p className="text-xs text-muted-foreground">Total Sesiones</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-background dark:border-emerald-900/30 dark:from-emerald-900/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 ring-2 ring-emerald-200/50 dark:bg-emerald-900/50 dark:ring-emerald-800/50">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sessionStats.open}</div>
                <p className="text-xs text-muted-foreground">Abiertas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-background dark:border-blue-900/30 dark:from-blue-900/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 ring-2 ring-blue-200/50 dark:bg-blue-900/50 dark:ring-blue-800/50">
                <XCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sessionStats.closed}</div>
                <p className="text-xs text-muted-foreground">Cerradas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-rose-200/50 bg-gradient-to-br from-rose-50/50 to-background dark:border-rose-900/30 dark:from-rose-900/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 ring-2 ring-rose-200/50 dark:bg-rose-900/50 dark:ring-rose-800/50">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(sessionStats.totalDiscrepancy)}</div>
                <p className="text-xs text-muted-foreground">Total Discrepancias</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <CashFilters
          title="Filtros"
          filters={useMemo(() => [
            {
              key: "status", label: "Estado", type: "select" as const, value: filterStatus, onChange: setFilterStatus, options: [
                { value: "all", label: "Todos" },
                { value: "OPEN", label: "Abierta" },
                { value: "CLOSED", label: "Cerrada" },
                { value: "CANCELLED", label: "Cancelada" },
              ]
            },
            { key: "from", label: "Desde", type: "date" as const, value: filterFrom, onChange: setFilterFrom },
            { key: "to", label: "Hasta", type: "date" as const, value: filterTo, onChange: setFilterTo },
            {
              key: "user", label: "Usuario", type: "select" as const, value: filterUser, onChange: setFilterUser, options: usersOptions
            },
          ], [filterStatus, filterFrom, filterTo, filterUser, usersOptions])}
          onClear={clearFilters}
          columns={4}
          collapsibleKey="sessions"
          defaultExpanded={false}
        />

        {/* Filtros rápidos de fecha — siempre visibles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Fecha rápida:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => { const d = new Date(); setFilterFrom(d.toISOString().split('T')[0]); setFilterTo(d.toISOString().split('T')[0]); controls.goToPage(1); }}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => { const d = new Date(); const from = new Date(); from.setDate(d.getDate() - 7); setFilterFrom(from.toISOString().split('T')[0]); setFilterTo(d.toISOString().split('T')[0]); controls.goToPage(1); }}
          >
            Últimos 7 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => { const d = new Date(); const from = new Date(); from.setDate(d.getDate() - 30); setFilterFrom(from.toISOString().split('T')[0]); setFilterTo(d.toISOString().split('T')[0]); controls.goToPage(1); }}
          >
            Últimos 30 días
          </Button>
          {(filterFrom || filterTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-3 text-xs text-muted-foreground"
              onClick={() => { setFilterFrom(''); setFilterTo(''); controls.goToPage(1); }}
            >
              Limpiar fecha
            </Button>
          )}
        </div>

        {/* Tabla de sesiones */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <TableSkeleton rows={10} columns={8} />
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-4 ring-muted/50">
                  <Clock className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No se encontraron sesiones</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Prueba ajustando los filtros o cambiando el rango de fechas
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <VirtualizedTable<CashSession>
                  data={sessions}
                  columns={sessionsColumns as any}
                  height={560}
                  itemHeight={68}
                  isLoading={false}
                  className="rounded-md"
                />
                <Pagination
                  currentPage={Number(pagination.page || 1)}
                  totalPages={Number(pagination.totalPages || Math.ceil(pagination.total / pagination.limit) || 1)}
                  onPageChange={(page: number) => controls.goToPage(page)}
                  className="mt-4"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>Fuente: {source === 'api' ? 'API' : 'Supabase'} • {sessions.length} sesiones</div>
          <div>Página {pagination.page} de {Math.ceil(pagination.total / pagination.limit)}</div>
        </div>

        <CashCountModal
          open={showCountModal}
          onOpenChange={setShowCountModal}
          session={selectedSession}
          counts={counts}
          onCountChange={updateCount}
          onSave={handleSaveCounts}
          isSaving={saveCountsMutation.isPending}
        />
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle de Sesión</DialogTitle>
            </DialogHeader>
            {detailsSession ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Estado</div>
                    <div>{detailsSession.status}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Apertura</div>
                    <div>{formatCurrency(detailsSession.openingAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cierre</div>
                    <div>{detailsSession.summary?.actualCash != null ? formatCurrency(detailsSession.summary.actualCash) : detailsSession.closingAmount != null ? formatCurrency(detailsSession.closingAmount) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Esperado</div>
                    <div>{detailsSession.summary?.expectedCash != null ? formatCurrency(detailsSession.summary.expectedCash) : detailsSession.systemExpected != null ? formatCurrency(detailsSession.systemExpected) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Diferencia</div>
                    <div>{detailsSession.summary?.differenceAmount != null ? formatCurrency(detailsSession.summary.differenceAmount) : detailsSession.discrepancyAmount != null ? formatCurrency(detailsSession.discrepancyAmount) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Ventas del turno</div>
                    <div>{formatCurrency(detailsSession.summary?.totalSold || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Ingresos manuales</div>
                    <div>{formatCurrency(detailsSession.summary?.manualIn || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Egresos manuales</div>
                    <div>{formatCurrency(detailsSession.summary?.manualOut || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Devoluciones</div>
                    <div>{formatCurrency(detailsSession.summary?.refunds || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sucursal</div>
                    <div>{detailsSession.branchId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Caja / POS</div>
                    <div>{detailsSession.posId || '-'}</div>
                  </div>
                </div>
                {detailsSession.notes ? (
                  <div>
                    <div className="text-sm font-medium mb-2">Notas</div>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {detailsSession.notes}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-sm font-medium mb-2">Metodos de pago</div>
                  {Array.isArray(detailsSession.summary?.paymentMethods) && detailsSession.summary.paymentMethods.length > 0 ? (
                    <div className="space-y-2">
                      {detailsSession.summary.paymentMethods.map((method) => (
                        <div key={method.method} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                          <div>
                            <div className="font-medium">{method.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {method.count} operaciones{method.affectsCash ? ' • impacta efectivo' : ''}
                            </div>
                          </div>
                          <div className="font-medium">{formatCurrency(method.amount)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin ventas registradas</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Conteos</div>
                  {Array.isArray(detailsSession.counts) && detailsSession.counts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {detailsSession.counts.map((c, i) => (
                        <div key={i} className="p-2 border rounded-md flex items-center justify-between text-sm">
                          <span>{formatCurrency(c.denomination)}</span>
                          <span className="text-muted-foreground">x{c.quantity}</span>
                          <span className="font-medium">{formatCurrency(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin conteos</div>
                  )}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </UnifiedPermissionGuard>
  );
}
