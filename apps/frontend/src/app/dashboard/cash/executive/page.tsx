"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Wallet, Banknote, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import type { Database, CashAlert } from "@/types/supabase";
import { useReactToPrint } from "react-to-print";

type BankAccountRow = Database["public"]["Tables"]["bank_accounts"]["Row"];
type CashReconciliationRow = Database["public"]["Tables"]["cash_reconciliations"]["Row"];
type CashSessionRow = Database["public"]["Tables"]["cash_sessions"]["Row"];
type CashMovementRow = Database["public"]["Tables"]["cash_movements"]["Row"];

const SeverityBadge = ({ severity }: { severity: CashAlert["severity"] }) => {
  const color = severity === "CRITICAL" ? "destructive" : severity === "WARN" ? "warning" : "default";
  return <Badge variant={color as any}>{severity}</Badge>;
};

export default function CashExecutivePage() {
  const supabase = createClient();
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: componentRef, documentTitle: "Cash Executive Report" });
  const fmtCurrency = useCurrencyFormatter();

  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [alerts, setAlerts] = useState<CashAlert[]>([]);
  const [pendingRecons, setPendingRecons] = useState<CashReconciliationRow[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSessionRow | null>(null);
  const [sessionMovements, setSessionMovements] = useState<CashMovementRow[]>([]);

  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0),
    [bankAccounts]
  );

  const currentCashBalance = useMemo(() => {
    if (!currentSession) return 0;
    const inflows = sessionMovements
      .filter((m) => ["IN", "SALE"].includes(m.type))
      .reduce((s, m) => s + Math.abs(m.amount), 0);
    const outflows = sessionMovements
      .filter((m) => ["OUT", "RETURN", "ADJUSTMENT"].includes(m.type))
      .reduce((s, m) => s + Math.abs(m.amount), 0);
    return (currentSession.opening_amount ?? 0) + inflows - outflows;
  }, [currentSession, sessionMovements]);

  const consolidatedPosition = useMemo(() => currentCashBalance + totalBankBalance, [currentCashBalance, totalBankBalance]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      // Bank accounts
      const { data: ba } = await supabase.from("bank_accounts").select("*").limit(50);
      if (isMounted && ba) setBankAccounts(ba as BankAccountRow[]);
      // Alerts
      const { data: al } = await supabase.from("cash_alerts").select("*").eq("status", "ACTIVE").order("severity", { ascending: false });
      if (isMounted && al) setAlerts(al as CashAlert[]);
      // Pending reconciliations
      const { data: cr } = await supabase
        .from("cash_reconciliations")
        .select("*")
        .in("status", ["PENDING", "DISPUTED"]) as any;
      if (isMounted && cr) setPendingRecons(cr as CashReconciliationRow[]);
      // Current open session
      const { data: cs } = await supabase.from("cash_sessions").select("*").eq("status", "OPEN").order("opening_time", { ascending: false }).limit(1).maybeSingle();
      const session = cs ?? null;
      if (isMounted) setCurrentSession(session as CashSessionRow | null);
      if (session) {
        const { data: mv } = await supabase.from("cash_movements").select("*").eq("session_id", session.id).limit(500);
        if (isMounted && mv) setSessionMovements(mv as CashMovementRow[]);
      } else {
        setSessionMovements([]);
      }
      setLoading(false);
    };
    load();

    // Realtime subscriptions (optional, non-blocking)
    const subBank = supabase
      .channel("bank_accounts-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bank_accounts" }, (payload: any) => {
        setBankAccounts((prev) => prev.map((a) => (a.id === payload.new.id ? payload.new as BankAccountRow : a)));
      })
      .subscribe();

    const subAlerts = supabase
      .channel("cash_alerts-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cash_alerts" }, (payload: any) => {
        setAlerts((prev) => [payload.new as CashAlert, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cash_alerts" }, () => {
        // re-fetch active alerts
        supabase.from("cash_alerts").select("*").eq("status", "ACTIVE").order("severity", { ascending: false }).then(({ data }: { data: any }) => data && setAlerts(data as CashAlert[]));
      })
      .subscribe();

    const subRecon = supabase
      .channel("cash_reconciliations-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cash_reconciliations" }, () => {
        supabase
          .from("cash_reconciliations")
          .select("*")
          .in("status", ["PENDING", "DISPUTED"]).then(({ data }: { data: any }) => data && setPendingRecons(data as CashReconciliationRow[]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cash_reconciliations" }, () => {
        supabase
          .from("cash_reconciliations")
          .select("*")
          .in("status", ["PENDING", "DISPUTED"]).then(({ data }: { data: any }) => data && setPendingRecons(data as CashReconciliationRow[]));
      })
      .subscribe();

    return () => {
      isMounted = false;
      try { supabase.removeChannel(subBank); } catch { }
      try { supabase.removeChannel(subAlerts); } catch { }
      try { supabase.removeChannel(subRecon); } catch { }
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const downloadCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
        return `"${s.replace(/\"/g, '""')}"`;
      }
      return s;
    };
    const csv = [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBankAccountsCSV = () => {
    const headers = ["id", "bank_name", "currency", "current_balance", "available_balance", "status", "last_sync_at"];
    const rows = bankAccounts.map(a => [a.id, a.bank_name, a.currency, a.current_balance, a.available_balance ?? "", a.status, a.last_sync_at ?? ""]);
    downloadCSV("bank_accounts.csv", headers, rows);
  };

  const exportAlertsCSV = () => {
    const headers = ["id", "alert_type", "entity_type", "entity_id", "severity", "status", "threshold_value", "current_value", "message", "created_at", "resolved_at"];
    const rows = alerts.map(a => [a.id, a.alert_type, a.entity_type ?? "", a.entity_id ?? "", a.severity, a.status, a.threshold_value ?? "", a.current_value ?? "", a.message ?? "", a.created_at, a.resolved_at ?? ""]);
    downloadCSV("cash_alerts.csv", headers, rows);
  };

  const exportReconciliationsCSV = () => {
    const headers = ["id", "bank_account_id", "period_start", "period_end", "opening_balance", "closing_balance", "bank_statement_total", "system_total", "difference", "status", "created_by", "created_at", "resolved_at"];
    const rows = pendingRecons.map(r => [r.id, r.bank_account_id, r.period_start, r.period_end, r.opening_balance, r.closing_balance, r.bank_statement_total, r.system_total, r.difference, r.status, r.created_by, r.created_at, r.resolved_at ?? ""]);
    downloadCSV("cash_reconciliations.csv", headers, rows);
  };

  return (
    <div className="space-y-6" ref={componentRef}>
      {/* Acciones de exportación */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Exportar datos para Excel/CSV/PDF</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportBankAccountsCSV}>Exportar Bancos (CSV)</Button>
          <Button variant="secondary" onClick={exportAlertsCSV}>Exportar Alertas (CSV)</Button>
          <Button variant="secondary" onClick={exportReconciliationsCSV}>Exportar Conciliaciones (CSV)</Button>
          <Button onClick={handlePrint}>Exportar PDF (Imprimir)</Button>
        </div>
      </div>

      {/* Posición Consolidada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Posición Consolidada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Caja (sesión actual)</span>
                <Activity className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold">{fmtCurrency(currentCashBalance)}</div>
              {currentSession ? (
                <div className="mt-1 text-xs text-muted-foreground">Sesión abierta: {new Date(currentSession.opening_time).toLocaleString()}</div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">No hay sesión abierta</div>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bancos</span>
                <Banknote className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold">{fmtCurrency(totalBankBalance)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{bankAccounts.length} cuenta(s)</div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Consolidado</span>
                <Wallet className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold">{fmtCurrency(consolidatedPosition)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Caja + Bancos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Liquidez
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sin alertas activas</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.alert_type}</TableCell>
                    <TableCell>{a.entity_type ?? "-"}</TableCell>
                    <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell className="max-w-[500px] truncate">{a.message ?? ""}</TableCell>
                    <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Conciliaciones pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Conciliaciones Pendientes/En disputa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRecons.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay conciliaciones pendientes</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRecons.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.bank_account_id}</TableCell>
                    <TableCell>
                      {new Date(r.period_start).toLocaleDateString()} — {new Date(r.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{fmtCurrency(r.difference)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "DISPUTED" ? "destructive" : "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}