"use client";

import React, { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart } from "lucide-react";
import { useIntersectionObserver } from "@/lib/performance";
import { CashMovement } from "@/types/cash";

const LineChart = dynamic<any>(() => import("recharts").then((m) => m.LineChart as any), { ssr: false });
const Line = dynamic<any>(() => import("recharts").then((m) => m.Line as any), { ssr: false });
const XAxis = dynamic<any>(() => import("recharts").then((m) => m.XAxis as any), { ssr: false });
const YAxis = dynamic<any>(() => import("recharts").then((m) => m.YAxis as any), { ssr: false });
const CartesianGrid = dynamic<any>(() => import("recharts").then((m) => m.CartesianGrid as any), { ssr: false });
const Tooltip = dynamic<any>(() => import("recharts").then((m) => m.Tooltip as any), { ssr: false });
const ResponsiveContainer = dynamic<any>(() => import("recharts").then((m) => m.ResponsiveContainer as any), { ssr: false });
const RechartsPieChart = dynamic<any>(() => import("recharts").then((m) => m.PieChart as any), { ssr: false });
const Pie = dynamic<any>(() => import("recharts").then((m) => m.Pie as any), { ssr: false });
const Cell = dynamic<any>(() => import("recharts").then((m) => m.Cell as any), { ssr: false });

export default function CashChartsSection({ movements }: { movements: CashMovement[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CashFlowChart movements={movements} />
      <MovementTypeChart movements={movements} />
    </div>
  );
}

function CashFlowChart({ movements }: { movements: CashMovement[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersectionObserver(containerRef as React.RefObject<Element>, { rootMargin: "100px" });
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    return last7Days.map((date) => {
      const dayMovements = movements.filter((m) => new Date(m.createdAt).toISOString().split("T")[0] === date);
      const inflows = dayMovements.filter((m) => ["IN", "SALE"].includes(m.type)).reduce((sum, m) => sum + Math.abs(m.amount), 0);
      const outflows = dayMovements.filter((m) => ["OUT", "RETURN"].includes(m.type)).reduce((sum, m) => sum + Math.abs(m.amount), 0);
      return {
        date: new Date(date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
        inflows,
        outflows,
        net: inflows - outflows,
      };
    });
  }, [movements]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Flujo de Efectivo (Últimos 7 días)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} aria-label="Gráfico de flujo de efectivo" role="figure">
          {isVisible ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number | string, name: string) => [
                  `$${Number(value).toLocaleString()}`,
                  name === "inflows" ? "Ingresos" : name === "outflows" ? "Egresos" : "Neto",
                ]} />
                <Line type="monotone" dataKey="inflows" stroke="#10b981" strokeWidth={2} name="inflows" />
                <Line type="monotone" dataKey="outflows" stroke="#ef4444" strokeWidth={2} name="outflows" />
                <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="net" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="space-y-2" aria-busy>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-72 w-full" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MovementTypeChart({ movements }: { movements: CashMovement[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersectionObserver(containerRef as React.RefObject<Element>, { rootMargin: "100px" });
  const data = useMemo(() => {
    const types = movements.reduce((acc, movement) => {
      acc[movement.type] = (acc[movement.type] || 0) + Math.abs(movement.amount);
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      SALE: "#10b981",
      IN: "#3b82f6",
      OUT: "#ef4444",
      RETURN: "#f59e0b",
      ADJUSTMENT: "#8b5cf6",
    } as Record<string, string>;

    return Object.entries(types).map(([type, amount]) => ({
      name: type === "SALE" ? "Ventas" : type === "IN" ? "Ingresos" : type === "OUT" ? "Egresos" : type === "RETURN" ? "Devoluciones" : "Ajustes",
      value: amount,
      color: colors[type] || "#6b7280",
    }));
  }, [movements]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Distribución por Tipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} aria-label="Gráfico de tipos de movimiento" role="figure">
          {isVisible ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | string) => [`$${Number(value).toLocaleString()}`, "Monto"]} />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="space-y-2" aria-busy>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-72 w-full" />
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
