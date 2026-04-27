"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { UnifiedPermissionGuard } from "@/components/auth/UnifiedPermissionGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/loading-states";
import { useToast } from "@/components/ui/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { useCurrentOrganizationId } from "@/hooks/use-current-organization";
import api from "@/lib/api";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import type { CashReport, CashSession } from "@/types/cash";
import { ReportChartsSection } from "./components/ReportChartsSection";

type ReportPeriod = "daily" | "weekly" | "monthly";
type QuickPeriod = "today" | "week" | "month" | "custom";

type ReportMetrics = {
  totalSessions: number;
  openSessions: number;
  closedSessions: number;
  totalOpening: number;
  totalClosing: number;
  totalExpected: number;
  totalDiscrepancy: number;
  totalMovements: number;
  movementsByType: {
    IN: number;
    OUT: number;
    SALE: number;
    RETURN: number;
    ADJUSTMENT: number;
  };
  averageDiscrepancy: number;
  sessionsWithDiscrepancy: number;
};

function createEmptyMetrics(): ReportMetrics {
  return {
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    totalOpening: 0,
    totalClosing: 0,
    totalExpected: 0,
    totalDiscrepancy: 0,
    totalMovements: 0,
    movementsByType: {
      IN: 0,
      OUT: 0,
      SALE: 0,
      RETURN: 0,
      ADJUSTMENT: 0,
    },
    averageDiscrepancy: 0,
    sessionsWithDiscrepancy: 0,
  };
}

function getSessionOpenedAt(session: CashSession): string | null {
  return session.openedAt || session.opening_time || null;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function endOfWeek(date: Date): Date {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function buildBucketKey(date: Date, reportType: ReportPeriod): string {
  if (reportType === "daily") {
    return date.toISOString().split("T")[0];
  }

  if (reportType === "weekly") {
    return startOfWeek(date).toISOString().split("T")[0];
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildBucketLabel(date: Date, reportType: ReportPeriod): string {
  if (reportType === "daily") {
    return formatDate(date);
  }

  if (reportType === "weekly") {
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  }

  return date.toLocaleDateString("es-PY", {
    month: "long",
    year: "numeric",
  });
}

function calculateSessionMetrics(sessions: CashSession[]): ReportMetrics {
  const metrics = createEmptyMetrics();

  sessions.forEach((session) => {
    const summary = session.summary;
    const discrepancy = Math.abs(
      Number(summary?.differenceAmount ?? session.discrepancyAmount ?? 0),
    );
    const actualCash = Number(summary?.actualCash ?? session.closingAmount ?? 0);
    const expectedCash = Number(summary?.expectedCash ?? session.systemExpected ?? 0);
    const movementCounts = summary?.movementTypeCounts;
    const status = String(session.status || "").toUpperCase();

    metrics.totalSessions += 1;
    metrics.totalOpening += Number(session.openingAmount || 0);
    metrics.totalClosing += actualCash;
    metrics.totalExpected += expectedCash;
    metrics.totalDiscrepancy += discrepancy;
    metrics.totalMovements += Number(summary?.movementCount || 0);

    if (status === "OPEN") {
      metrics.openSessions += 1;
    } else if (status === "CLOSED") {
      metrics.closedSessions += 1;
    }

    if (discrepancy > 0) {
      metrics.sessionsWithDiscrepancy += 1;
    }

    if (movementCounts) {
      metrics.movementsByType.IN += Number(movementCounts.IN || 0);
      metrics.movementsByType.OUT += Number(movementCounts.OUT || 0);
      metrics.movementsByType.SALE += Number(movementCounts.SALE || 0);
      metrics.movementsByType.RETURN += Number(movementCounts.RETURN || 0);
      metrics.movementsByType.ADJUSTMENT += Number(movementCounts.ADJUSTMENT || 0);
    }
  });

  metrics.averageDiscrepancy =
    metrics.sessionsWithDiscrepancy > 0
      ? metrics.totalDiscrepancy / metrics.sessionsWithDiscrepancy
      : 0;

  return metrics;
}

function generateReportsFromSessions(
  sessions: CashSession[],
  reportType: ReportPeriod,
): CashReport[] {
  const grouped = new Map<
    string,
    { label: string; bucketDate: Date; sessions: CashSession[] }
  >();

  sessions.forEach((session) => {
    const openedAt = getSessionOpenedAt(session);
    if (!openedAt) return;

    const sessionDate = new Date(openedAt);
    if (Number.isNaN(sessionDate.getTime())) return;

    const key = buildBucketKey(sessionDate, reportType);
    const existing = grouped.get(key);

    if (existing) {
      existing.sessions.push(session);
      return;
    }

    grouped.set(key, {
      label: buildBucketLabel(sessionDate, reportType),
      bucketDate: sessionDate,
      sessions: [session],
    });
  });

  return Array.from(grouped.entries())
    .sort((left, right) => right[1].bucketDate.getTime() - left[1].bucketDate.getTime())
    .map(([key, value]) => ({
      id: `${reportType}-${key}`,
      sessionId: value.sessions[0]?.id || "",
      reportType,
      period: value.label,
      data: calculateSessionMetrics(value.sessions),
      generatedAt: value.bucketDate.toISOString(),
      generatedByUser: null,
    }));
}

function downloadReportCsv(report: CashReport) {
  const data = report.data as ReportMetrics;
  const rows = [
    ["Metrica", "Valor"],
    ["Sesiones Totales", data.totalSessions],
    ["Sesiones Abiertas", data.openSessions],
    ["Sesiones Cerradas", data.closedSessions],
    ["Total Apertura", data.totalOpening],
    ["Total Cierre", data.totalClosing],
    ["Total Esperado", data.totalExpected],
    ["Total Discrepancia", data.totalDiscrepancy],
    ["Total Movimientos", data.totalMovements],
    ["Movimientos IN", data.movementsByType.IN],
    ["Movimientos OUT", data.movementsByType.OUT],
    ["Movimientos SALE", data.movementsByType.SALE],
    ["Movimientos RETURN", data.movementsByType.RETURN],
    ["Movimientos ADJUSTMENT", data.movementsByType.ADJUSTMENT],
    ["Sesiones con Discrepancia", data.sessionsWithDiscrepancy],
    ["Discrepancia Promedio", data.averageDiscrepancy],
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_caja_${report.reportType}_${report.period.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getReportTypeBadge(type: string) {
  const labels: Record<string, string> = {
    daily: "Diario",
    weekly: "Semanal",
    monthly: "Mensual",
  };
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    daily: "default",
    weekly: "secondary",
    monthly: "outline",
  };
  return <Badge variant={variants[type] || "secondary"}>{labels[type] || type}</Badge>;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const organizationId = useCurrentOrganizationId();
  const [selectedPeriod, setSelectedPeriod] = useState<QuickPeriod>("today");
  const [selectedReportType, setSelectedReportType] = useState<ReportPeriod>("daily");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const { pagination, setTotal, setPage } = usePagination({ initialLimit: 10 });

  const handleFilterFromChange = (value: string) => {
    setSelectedPeriod("custom");
    setFilterFrom(value);
  };

  const handleFilterToChange = (value: string) => {
    setSelectedPeriod("custom");
    setFilterTo(value);
  };

  const clearFilters = () => {
    setSelectedPeriod("today");
  };

  useEffect(() => {
    const today = new Date();
    if (selectedPeriod === "today") {
      setFilterFrom(startOfDay(today).toISOString().split("T")[0]);
      setFilterTo(endOfDay(today).toISOString().split("T")[0]);
      return;
    }

    if (selectedPeriod === "week") {
      setFilterFrom(startOfWeek(today).toISOString().split("T")[0]);
      setFilterTo(endOfWeek(today).toISOString().split("T")[0]);
      return;
    }

    if (selectedPeriod === "month") {
      setFilterFrom(startOfMonth(today).toISOString().split("T")[0]);
      setFilterTo(endOfMonth(today).toISOString().split("T")[0]);
    }
  }, [selectedPeriod]);

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isFetching: sessionsFetching,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["cashReportSessions", organizationId ?? "no-org", filterFrom, filterTo],
    queryFn: async () => {
      const collected: CashSession[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({
          page: String(page),
          limit: "200",
          orderBy: "openedAt",
          orderDir: "desc",
        });

        if (filterFrom) params.set("from", filterFrom);
        if (filterTo) params.set("to", filterTo);

        const response = await api.get(`/cash/sessions?${params.toString()}`);
        const batch = Array.isArray(response.data?.sessions)
          ? (response.data.sessions as CashSession[])
          : [];

        collected.push(...batch);
        totalPages = Number(response.data?.pagination?.pages || 1);
        page += 1;
      } while (page <= totalPages);

      return collected;
    },
    enabled: Boolean(organizationId && filterFrom && filterTo),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!sessionsError) return;
    toast({
      description: (sessionsError as any)?.message || "Error cargando reportes de caja.",
      variant: "destructive",
    });
  }, [sessionsError, toast]);

  useEffect(() => {
    setPage(1);
  }, [selectedReportType, filterFrom, filterTo, setPage]);

  const reports = useMemo(
    () => generateReportsFromSessions(sessions, selectedReportType),
    [sessions, selectedReportType],
  );

  useEffect(() => {
    setTotal(reports.length);
  }, [reports.length, setTotal]);

  const paginatedReports = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return reports.slice(start, start + pagination.limit);
  }, [reports, pagination.page, pagination.limit]);

  const summary = useMemo(
    () =>
      reports.reduce(
        (acc, report) => {
          acc.totalSessions += report.data.totalSessions;
          acc.totalClosing += report.data.totalClosing;
          acc.sessionsWithDiscrepancy += report.data.sessionsWithDiscrepancy;
          acc.totalMovements += report.data.totalMovements;
          return acc;
        },
        {
          totalSessions: 0,
          totalClosing: 0,
          sessionsWithDiscrepancy: 0,
          totalMovements: 0,
        },
      ),
    [reports],
  );

  const loadingSessions = sessionsLoading || sessionsFetching;

  return (
    <UnifiedPermissionGuard resource="cash" action="read">
      <div className="space-y-6">
        {/* Header premium */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Reportes de Caja</h1>
              <p className="text-sm text-muted-foreground">
                Análisis consolidado por periodos sobre sesiones reales de caja
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSessions()}
            disabled={loadingSessions}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Controles de periodo y agrupación */}
        <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Periodo</p>
            <div className="flex flex-wrap gap-2">
              {(["today", "week", "month", "custom"] as QuickPeriod[]).map((p) => {
                const labels: Record<QuickPeriod, string> = { today: "Hoy", week: "Esta semana", month: "Este mes", custom: "Personalizado" };
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      selectedPeriod === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
            {selectedPeriod === "custom" && (
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => handleFilterFromChange(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(e) => handleFilterToChange(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Agrupación</p>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as ReportPeriod[]).map((t) => {
                const labels: Record<ReportPeriod, string> = { daily: "Diaria", weekly: "Semanal", monthly: "Mensual" };
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedReportType(t)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      selectedReportType === t
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen General — siempre arriba */}
        {reports.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-background p-4 dark:border-blue-900/30 dark:from-blue-900/20">
              <p className="text-xs font-medium text-muted-foreground">Sesiones Totales</p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalSessions}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-background p-4 dark:border-emerald-900/30 dark:from-emerald-900/20">
              <p className="text-xs font-medium text-muted-foreground">Total Cerrado</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.totalClosing)}</p>
            </div>
            <div className="rounded-xl border border-rose-200/50 bg-gradient-to-br from-rose-50/50 to-background p-4 dark:border-rose-900/30 dark:from-rose-900/20">
              <p className="text-xs font-medium text-muted-foreground">Con Discrepancia</p>
              <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.sessionsWithDiscrepancy}</p>
            </div>
            <div className="rounded-xl border border-purple-200/50 bg-gradient-to-br from-purple-50/50 to-background p-4 dark:border-purple-900/30 dark:from-purple-900/20">
              <p className="text-xs font-medium text-muted-foreground">Movimientos Totales</p>
              <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.totalMovements}</p>
            </div>
          </div>
        )}

        <ReportChartsSection reports={reports} isLoading={loadingSessions} />

        <Card>
          <CardHeader>
            <CardTitle>Reportes Generados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <TableSkeleton rows={5} columns={6} />
            ) : reports.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-600">
                No se encontraron reportes para el rango seleccionado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Sesiones</TableHead>
                      <TableHead>Total Cierre</TableHead>
                      <TableHead>Discrepancias</TableHead>
                      <TableHead>Movimientos</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{getReportTypeBadge(report.reportType)}</TableCell>
                        <TableCell>{report.period}</TableCell>
                        <TableCell>{report.data.totalSessions}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(report.data.totalClosing)}
                        </TableCell>
                        <TableCell>
                          {report.data.sessionsWithDiscrepancy > 0 ? (
                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {report.data.sessionsWithDiscrepancy}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex w-fit items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              0
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{report.data.totalMovements}</TableCell>
                        <TableCell>{formatDate(report.generatedAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReportCsv(report)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            CSV
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={Number(pagination.page || 1)}
                  totalPages={
                    Number(
                      Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 10)),
                    ) || 1
                  }
                  onPageChange={(page: number) => setPage(page)}
                  className="mt-4"
                />
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </UnifiedPermissionGuard>
  );
}
