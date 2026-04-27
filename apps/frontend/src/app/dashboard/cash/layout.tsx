"use client";

import React from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart2,
  DollarSign,
  History,
  LayoutDashboard,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentOrganizationId } from "@/hooks/use-current-organization";

export default function CashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const organizationId = useCurrentOrganizationId();

  const currentTab: "overview" | "movements" | "session" | "reports" =
    React.useMemo(() => {
      if (!pathname) return "overview";
      if (pathname.endsWith("/movements")) return "movements";
      if (
        pathname.endsWith("/session") ||
        pathname.endsWith("/sessions")
      )
        return "session";
      if (pathname.endsWith("/reports")) return "reports";
      return "overview";
    }, [pathname]);

  const handleTabChange = (value: string) => {
    if (value === currentTab) return;
    if (value === "overview") router.push("/dashboard/cash");
    if (value === "movements") router.push("/dashboard/cash/movements");
    if (value === "session") router.push("/dashboard/cash/sessions");
    if (value === "reports") router.push("/dashboard/cash/reports");
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Caja", icon: DollarSign, isCurrentPage: true },
        ]}
      />

      {/* Header premium */}
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-background via-muted/20 to-background px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Caja / Arqueo
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona la apertura, el cierre y los movimientos de caja
            </p>
          </div>
        </div>
      </div>

      {!organizationId && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            Selecciona una organización en el encabezado antes de operar la caja.
          </div>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-10">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Movimientos</span>
          </TabsTrigger>
          <TabsTrigger value="session" className="gap-2">
            <History className="h-4 w-4" />
            <span>Sesiones</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Reportes</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Renderiza el contenido de la ruta activa */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
