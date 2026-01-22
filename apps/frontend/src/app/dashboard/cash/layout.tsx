"use client";

import React from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, DollarSign } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function CashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab: "overview" | "movements" | "session" | "reports" = React.useMemo(() => {
    if (!pathname) return "overview";
    if (pathname.endsWith("/movements")) return "movements";
    if (pathname.endsWith("/session") || pathname.endsWith("/sessions")) return "session";
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caja / Arqueo</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona la apertura, cierre y movimientos de caja
          </p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="session">Sesiones</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Renderiza el contenido de la ruta activa */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}