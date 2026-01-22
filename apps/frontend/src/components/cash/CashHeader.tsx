"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CashHeaderProps {
    sessionOpen: boolean;
    onOpenSession: () => void;
    onCloseSession: () => void;
    onNewMovement: () => void;
    onRefresh: () => void;
    isRefreshing?: boolean;
    lastSyncAt?: Date | null;
}

export default function CashHeader({
    sessionOpen,
    onOpenSession,
    onCloseSession,
    onNewMovement,
    onRefresh,
    isRefreshing,
    lastSyncAt
}: CashHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Control de Caja</h1>
                    <Badge variant={sessionOpen ? "default" : "secondary"} className={sessionOpen ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                        {sessionOpen ? (
                            <span className="flex items-center gap-1">
                                <Unlock className="w-3 h-3" /> Abierta
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Cerrada
                            </span>
                        )}
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                    {lastSyncAt && (
                        <span className="ml-2 text-xs opacity-70">
                            • Actualizado: {lastSyncAt.toLocaleTimeString()}
                        </span>
                    )}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>

                {sessionOpen ? (
                    <>
                        <Button onClick={onNewMovement} variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Movimiento
                        </Button>
                        <Button onClick={onCloseSession} variant="destructive" className="gap-2">
                            <Lock className="w-4 h-4" />
                            Cerrar Caja
                        </Button>
                    </>
                ) : (
                    <Button onClick={onOpenSession} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Unlock className="w-4 h-4" />
                        Abrir Caja
                    </Button>
                )}
            </div>
        </div>
    );
}
