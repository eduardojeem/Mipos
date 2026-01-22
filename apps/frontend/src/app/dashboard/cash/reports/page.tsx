"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Download, FileText, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { UnifiedPermissionGuard } from "@/components/auth/UnifiedPermissionGuard";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { TableSkeleton } from "@/components/ui/loading-states";
import { useToast } from "@/components/ui/use-toast";
import type { CashReport, CashSession } from "@/types/cash";
import CashFilters from "@/components/cash/CashFilters";
import { ReportChartsSection } from "./components/ReportChartsSection";



const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function ReportsPage() {
  const [reports, setReports] = useState<CashReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");
  const [selectedReportType, setSelectedReportType] = useState<string>("daily");
  const { toast } = useToast();

  // Paginación
  const { pagination, controls, isLoading: pagLoading, setTotal, setPage } = usePagination({ initialLimit: 10 });

  // Filtros
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const clearFilters = () => {
    setFilterFrom("");
    setFilterTo("");
  };

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedPeriod === "today") {
      const from = new Date(today);
      const to = new Date(today);
      to.setDate(to.getDate() + 1);
      setFilterFrom(from.toISOString().split("T")[0]);
      setFilterTo(to.toISOString().split("T")[0]);
    } else if (selectedPeriod === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFilterFrom(start.toISOString().split("T")[0]);
      setFilterTo(end.toISOString().split("T")[0]);
    } else if (selectedPeriod === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFilterFrom(start.toISOString().split("T")[0]);
      setFilterTo(end.toISOString().split("T")[0]);
    }
  }, [selectedPeriod]);

  // React Query: Sessions for reports
  const {
    data: sessionsRes,
    isLoading: sessionsLoading,
    isFetching: sessionsFetching,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["cashSessionsAll"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/cash/sessions`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const loadingSessions = sessionsLoading || sessionsFetching;

  useEffect(() => {
    if (sessionsRes?.sessions) {
      const sess: CashSession[] = sessionsRes.sessions || [];
      // Generate reports from sessions data
      const generatedReports = generateReportsFromSessions(sess);
      setReports(generatedReports);
    }
    if (sessionsError) {
      toast({ description: (sessionsError as any)?.message || "Error cargando sesiones", variant: "destructive" });
    }
  }, [sessionsRes, sessionsError]);

  const generateReportsFromSessions = (sessions: CashSession[]): CashReport[] => {
    const reports: CashReport[] = [];

    // Daily report
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = sessions.filter(s => {
      const openedDate = new Date((s.openedAt || s.opening_time) as string);
      return openedDate >= today && openedDate < tomorrow;
    });

    if (todaySessions.length > 0) {
      const dailyData = calculateSessionMetrics(todaySessions);
      reports.push({
        id: `daily-${today.toISOString().split('T')[0]}`,
        sessionId: todaySessions[0]?.id || "",
        reportType: "daily",
        period: today.toISOString().split('T')[0],
        data: dailyData,
        generatedAt: new Date().toISOString(),
        generatedByUser: null
      });
    }

    // Weekly report
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekSessions = sessions.filter(s => {
      const openedDate = new Date((s.openedAt || s.opening_time) as string);
      return openedDate >= weekStart && openedDate <= weekEnd;
    });

    if (weekSessions.length > 0) {
      const weeklyData = calculateSessionMetrics(weekSessions);
      reports.push({
        id: `weekly-${weekStart.toISOString().split('T')[0]}`,
        sessionId: weekSessions[0]?.id || "",
        reportType: "weekly",
        period: `${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`,
        data: weeklyData,
        generatedAt: new Date().toISOString(),
        generatedByUser: null
      });
    }

    // Monthly report
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthSessions = sessions.filter(s => {
      const openedDate = new Date((s.openedAt || s.opening_time) as string);
      return openedDate >= monthStart && openedDate <= monthEnd;
    });

    if (monthSessions.length > 0) {
      const monthlyData = calculateSessionMetrics(monthSessions);
      reports.push({
        id: `monthly-${monthStart.toISOString().split('T')[0]}`,
        sessionId: monthSessions[0]?.id || "",
        reportType: "monthly",
        period: monthStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        data: monthlyData,
        generatedAt: new Date().toISOString(),
        generatedByUser: null
      });
    }

    return reports;
  };

  const calculateSessionMetrics = (sessions: CashSession[]) => {
    const metrics = {
      totalSessions: sessions.length,
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
        ADJUSTMENT: 0
      },
      averageDiscrepancy: 0,
      sessionsWithDiscrepancy: 0
    };

    sessions.forEach(session => {
      metrics.totalOpening += session.openingAmount;
      if (session.closingAmount) {
        metrics.totalClosing += session.closingAmount;
        metrics.closedSessions++;
      } else {
        metrics.openSessions++;
      }

      if (session.systemExpected) metrics.totalExpected += session.systemExpected;
      if (session.discrepancyAmount) {
        metrics.totalDiscrepancy += session.discrepancyAmount;
        metrics.sessionsWithDiscrepancy++;
      }

      if (session.movements) {
        metrics.totalMovements += session.movements.length;
        session.movements.forEach(movement => {
          if (metrics.movementsByType[movement.type as keyof typeof metrics.movementsByType] !== undefined) {
            metrics.movementsByType[movement.type as keyof typeof metrics.movementsByType]++;
          }
        });
      }
    });

    if (metrics.sessionsWithDiscrepancy > 0) {
      metrics.averageDiscrepancy = metrics.totalDiscrepancy / metrics.sessionsWithDiscrepancy;
    }

    return metrics;
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const reportDate = new Date(r.generatedAt);
      const fromOk = filterFrom ? reportDate >= new Date(filterFrom) : true;
      const toOk = filterTo ? reportDate <= new Date(filterTo) : true;
      const byType = selectedReportType ? r.reportType === selectedReportType : true;
      return fromOk && toOk && byType;
    });
  }, [reports, filterFrom, filterTo, selectedReportType]);

  useEffect(() => {
    setTotal(filteredReports.length);
  }, [filteredReports.length, setTotal]);

  const paginatedReports = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredReports.slice(start, start + pagination.limit);
  }, [filteredReports, pagination.page, pagination.limit]);

  const exportReportCSV = (report: CashReport) => {
    const data = report.data;
    const csv = [
      ["Métrica", "Valor"],
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
      ["Discrepancia Promedio", data.averageDiscrepancy]
    ];

    const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const csvWithBOM = "\ufeff" + csvContent;
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_caja_${report.reportType}_${report.period.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getReportTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      daily: "default",
      weekly: "secondary",
      monthly: "outline",
    };
    return <Badge variant={variants[type] || "secondary"}>{type.toUpperCase()}</Badge>;
  };

  return (
    <UnifiedPermissionGuard resource="cash" action="read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Reportes de Caja
            </h1>
            <p className="text-sm text-muted-foreground">
              Análisis y reportes de rendimiento de caja
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchSessions()} disabled={loadingSessions}>
            Actualizar
          </Button>
        </div>

        <CashFilters
          title="Filtros de Reportes"
          filters={[
            {
              key: "quickPeriod",
              label: "Periodo rápido",
              type: "select",
              value: selectedPeriod,
              onChange: setSelectedPeriod,
              options: [
                { value: "today", label: "Hoy" },
                { value: "week", label: "Semana" },
                { value: "month", label: "Mes" },
              ],
            },
            {
              key: "reportType",
              label: "Tipo de Reporte",
              type: "select",
              value: selectedReportType,
              onChange: setSelectedReportType,
              options: [
                { value: "daily", label: "Diario" },
                { value: "weekly", label: "Semanal" },
                { value: "monthly", label: "Mensual" },
              ],
            },
            { key: "from", label: "Desde", type: "date", value: filterFrom, onChange: setFilterFrom },
            { key: "to", label: "Hasta", type: "date", value: filterTo, onChange: setFilterTo },
          ]}
          onClear={clearFilters}
          columns={3}
        />

        {/* Charts Section */}
        <ReportChartsSection reports={filteredReports} isLoading={loadingSessions} />

        {/* Tabla de reportes */}
        <Card>
          <CardHeader>
            <CardTitle>Reportes Generados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <TableSkeleton rows={5} columns={6} />
            ) : filteredReports.length === 0 ? (
              <div className="text-sm text-gray-600 text-center py-8">No se encontraron reportes</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Sesiones</TableHead>
                      <TableHead>Total Cierre</TableHead>
                      <TableHead>Discrepancias</TableHead>
                      <TableHead>Movimientos</TableHead>
                      <TableHead>Generado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{getReportTypeBadge(r.reportType)}</TableCell>
                        <TableCell>{r.period}</TableCell>
                        <TableCell>{r.data.totalSessions}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(r.data.totalClosing)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {r.data.sessionsWithDiscrepancy > 0 ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {r.data.sessionsWithDiscrepancy}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                0
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{r.data.totalMovements}</TableCell>
                        <TableCell>{new Date(r.generatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportReportCSV(r)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            CSV
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination 
                  currentPage={Number(pagination?.page || 1)}
                  totalPages={Number(Math.ceil(Number(pagination?.total || 0) / Number(pagination?.limit || 10)) || 1)}
                  onPageChange={(page: number) => setPage(page)}
                  className="mt-4"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen general */}
        {filteredReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumen General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredReports.reduce((sum, r) => sum + r.data.totalSessions, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Sesiones Totales</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(filteredReports.reduce((sum, r) => sum + r.data.totalClosing, 0))}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Cerrado</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {filteredReports.reduce((sum, r) => sum + r.data.sessionsWithDiscrepancy, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Sesiones con Discrepancia</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {filteredReports.reduce((sum, r) => sum + r.data.totalMovements, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Movimientos Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </UnifiedPermissionGuard>
  );
}
