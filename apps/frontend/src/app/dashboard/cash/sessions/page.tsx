"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date-utils";
import { Clock, RefreshCw, CheckCircle, XCircle, Download, List, ChevronUp, ChevronDown } from "lucide-react";
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



type CashCount = {
  denomination: number;
  quantity: number;
  total: number;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { exportToCSV } = useExportSessions();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Paginación
  const { pagination, controls, setTotal } = usePagination({ initialLimit: 15 });

  // Fetch sessions con paginación de servidor
  const { sessions, isLoading: sessionsLoading, isFetching: sessionsFetching, refetch: refetchSessions, pagination: serverPagination, source } = useSessionsData({
    filters: {
      status: filterStatus !== "all" ? filterStatus : undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      userId: filterUser !== "all" ? filterUser : undefined,
      showHistory,
    },
    page: pagination.page,
    limit: pagination.limit,
    orderBy: sortBy,
    orderDir: sortDir,
  });

  useSessionsRealtime(true);

  const [localSearch, setLocalSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({ status: true, openingAmount: true, closingAmount: true, systemExpected: true, discrepancyAmount: true, counts: true, users: true, dates: true, actions: true });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSession, setDetailsSession] = useState<CashSession | null>(null);

  const { data: usersRes } = useQuery({
    queryKey: ["usersOptionsSessions"],
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
    const p = parseInt(sp.get('page') || '1', 10);
    const l = parseInt(sp.get('limit') || String(pagination.limit), 10);
    const ob = (sp.get('orderBy') as any) || undefined;
    const od = (sp.get('orderDir') as any) || undefined;
    if (s) setFilterStatus(s);
    if (f) setFilterFrom(f);
    if (t) setFilterTo(t);
    if (u) setFilterUser(u);
    if (!Number.isNaN(p) && p > 0) controls.goToPage(p);
    if (!Number.isNaN(l) && l > 0) controls.setLimit(l);
    if (ob === 'openedAt' || ob === 'closedAt' || ob === 'status') setSortBy(ob);
    if (od === 'asc' || od === 'desc') setSortDir(od);
  }, [searchParams]);

  React.useEffect(() => {
    updateUrl({ status: filterStatus !== 'all' ? filterStatus : undefined, from: filterFrom || undefined, to: filterTo || undefined, user: filterUser !== 'all' ? filterUser : undefined, page: pagination.page, limit: pagination.limit, orderBy: sortBy, orderDir: sortDir });
  }, [filterStatus, filterFrom, filterTo, filterUser, pagination.page, pagination.limit, sortBy, sortDir, updateUrl]);

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
      if (s.discrepancyAmount) stats.totalDiscrepancy += Math.abs(s.discrepancyAmount);
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
      key: 'closingAmount',
      header: 'Cierre',
      render: (s: CashSession) => s.closingAmount ? formatCurrency(s.closingAmount) : '-',
      minWidth: 140,
    },
    {
      key: 'systemExpected',
      header: 'Esperado',
      render: (s: CashSession) => s.systemExpected ? formatCurrency(s.systemExpected) : '-',
      minWidth: 140,
    },
    {
      key: 'discrepancyAmount',
      header: 'Discrepancia',
      render: (s: CashSession) => (
        <div className="space-y-1">
          {getDiscrepancyBadge(s.discrepancyAmount)}
          {s.discrepancyAmount ? (
            <div className="text-xs text-muted-foreground">{formatCurrency(s.discrepancyAmount)}</div>
          ) : null}
        </div>
      ),
      minWidth: 160,
    },
    {
      key: 'counts',
      header: 'Conteo',
      render: (s: CashSession) => {
        const counts = (s as any).counts || [];
        if (Array.isArray(counts) && counts.length > 0) {
          const total = counts.reduce((sum: number, c: any) => sum + Number(c.total || 0), 0);
          return formatCurrency(total);
        }
        return (
          <Button variant="outline" size="sm" onClick={() => openCountModal(s)}>
            Sin conteo
          </Button>
        );
      },
      minWidth: 140,
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
          <WithPermission resource="cash" action="update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCountModal(s)}
              disabled={false}
            >
              Conteo
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

  const visibleSessions = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(s => {
      const opened = (s.openedByUser?.fullName || s.openedByUser?.email || '').toLowerCase();
      const closed = (s.closedByUser?.fullName || s.closedByUser?.email || '').toLowerCase();
      const notes = (s.notes || '').toLowerCase();
      return opened.includes(q) || closed.includes(q) || notes.includes(q) || s.status.toLowerCase().includes(q);
    });
  }, [sessions, localSearch]);

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

  const loadCountsForSession = async (sessionId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('cash_counts')
        .select('denomination, quantity, total')
        .eq('session_id', sessionId);
      const existingCounts = counts.map(c => {
        const match = Array.isArray(data) ? data.find((ec: any) => Number(ec.denomination) === c.denomination) : null;
        return match ? { ...c, quantity: Number(match.quantity) || 0, total: Number(match.total) || (c.denomination * (Number(match.quantity) || 0)) } : c;
      });
      setCounts(existingCounts);
    } catch {
      setCounts(counts.map(c => ({ ...c, quantity: 0, total: 0 })));
    }
  };

  const openCountModal = async (session: CashSession) => {
    setSelectedSession(session);
    if (Array.isArray(session.counts) && session.counts.length > 0) {
      const existingCounts = counts.map(c => {
        const match = session.counts!.find(ec => Number(ec.denomination) === c.denomination);
        return match ? { ...c, quantity: Number(match.quantity) || 0, total: Number(match.total) || (c.denomination * (Number(match.quantity) || 0)) } : c;
      });
      setCounts(existingCounts);
    } else {
      await loadCountsForSession(session.id);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Sesiones de Caja
            </h1>
            <p className="text-sm text-muted-foreground">
              Historial completo de aperturas y cierres de caja
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <div className="hidden sm:flex items-center gap-2">
              <Input value={localSearch} onChange={e => setLocalSearch(e.target.value)} placeholder="Buscar usuario, estado, notas" className="w-64" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Columnas</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Visibilidad</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.keys(visibleCols).map(k => (
                    <DropdownMenuCheckboxItem key={k} checked={visibleCols[k]} onCheckedChange={(v) => setVisibleCols(prev => ({ ...prev, [k]: Boolean(v) }))}>{k}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              variant={filterStatus === "OPEN" ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilterStatus("OPEN"); controls.goToPage(1); }}
              disabled={loadingSessions}
            >
              Abiertas
            </Button>
            <Button
              variant={filterStatus === "CLOSED" ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilterStatus("CLOSED"); controls.goToPage(1); }}
              disabled={loadingSessions}
            >
              Cerradas
            </Button>
            <Button
              variant={filterStatus === "CANCELLED" ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilterStatus("CANCELLED"); controls.goToPage(1); }}
              disabled={loadingSessions}
            >
              Canceladas
            </Button>
            <Button
              variant={filterUser !== "all" ? "default" : "outline"}
              size="sm"
              onClick={() => { if (currentUserId) { setFilterUser(currentUserId); controls.goToPage(1); } }}
              disabled={loadingSessions || !currentUserId}
            >
              Mis sesiones
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateUrl({ status: filterStatus !== 'all' ? filterStatus : undefined, from: filterFrom || undefined, to: filterTo || undefined, user: filterUser !== 'all' ? filterUser : undefined, page: pagination.page, limit: pagination.limit, orderBy: sortBy, orderDir: sortDir })}
            >
              Guardar estado
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{sessionStats.total}</div>
              <p className="text-xs text-muted-foreground">Total Sesiones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{sessionStats.open}</div>
              <p className="text-xs text-muted-foreground">Abiertas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{sessionStats.closed}</div>
              <p className="text-xs text-muted-foreground">Cerradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(sessionStats.totalDiscrepancy)}</div>
              <p className="text-xs text-muted-foreground">Total Discrepancias</p>
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

        {/* Tabla de sesiones */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <TableSkeleton rows={10} columns={8} />
            ) : sessions.length === 0 ? (
              <div className="text-sm text-gray-600 text-center py-8">No se encontraron sesiones</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Button variant={sortBy === 'status' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('status')}>Estado {sortBy === 'status' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />) : null}</Button>
                  <Button variant={sortBy === 'closedAt' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('closedAt')}>Cierre {sortBy === 'closedAt' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />) : null}</Button>
                  <Button variant={sortBy === 'openedAt' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('openedAt')}>Fecha {sortBy === 'openedAt' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />) : null}</Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => { const d = new Date(); const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const to = d; setFilterFrom(from.toISOString().split('T')[0]); setFilterTo(to.toISOString().split('T')[0]); controls.goToPage(1); }}>Hoy</Button>
                  <Button variant="outline" size="sm" onClick={() => { const d = new Date(); const from = new Date(); from.setDate(d.getDate() - 7); setFilterFrom(from.toISOString().split('T')[0]); setFilterTo(d.toISOString().split('T')[0]); controls.goToPage(1); }}>Últimos 7 días</Button>
                  <Button variant="outline" size="sm" onClick={() => { const d = new Date(); const from = new Date(); from.setDate(d.getDate() - 30); setFilterFrom(from.toISOString().split('T')[0]); setFilterTo(d.toISOString().split('T')[0]); controls.goToPage(1); }}>Últimos 30 días</Button>
                </div>
                <VirtualizedTable<CashSession>
                  data={visibleSessions}
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
          <DialogContent>
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
                    <div>{detailsSession.closingAmount != null ? formatCurrency(detailsSession.closingAmount) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Esperado</div>
                    <div>{detailsSession.systemExpected != null ? formatCurrency(detailsSession.systemExpected) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Diferencia</div>
                    <div>{detailsSession.discrepancyAmount != null ? formatCurrency(detailsSession.discrepancyAmount) : '-'}</div>
                  </div>
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
