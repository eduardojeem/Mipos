import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Activity, Wallet } from "lucide-react";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { CashSession } from "@/types/cash";
import { Skeleton } from "@/components/ui/skeleton";

interface CashSessionStatusProps {
    session: CashSession | null;
    currentBalance?: number;
    loading?: boolean;
    compact?: boolean;
}

export function CashSessionStatus({ session, currentBalance, loading, compact = false }: CashSessionStatusProps) {
    const fmtCurrency = useCurrencyFormatter();
    const isOpen = !!session && (session.status || '').toUpperCase() === "OPEN";
    const openingBoxClass = isOpen ? "rounded-md border p-3 bg-blue-50 border-blue-200" : "rounded-md border p-3 bg-gray-50 border-gray-200";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Estado de la Sesión</CardTitle>
                    <div className="flex items-center gap-2">
                        <Activity className={isOpen ? "h-4 w-4 text-blue-600" : "h-4 w-4 text-gray-500"} />
                        <Badge variant={isOpen ? "default" : "secondary"}>{isOpen ? "Sesión abierta" : "Sesión cerrada"}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                )}
                {session ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <Badge variant={(session.status || '').toUpperCase() === "OPEN" ? "default" : "secondary"}>{session.status}</Badge>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{session.openedAt ? new Date(session.openedAt).toLocaleString() : '-'}</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-green-600">
                                    <Wallet className="h-5 w-5" />
                                    <div className="text-sm">
                                        <div className="font-semibold">Apertura</div>
                                        <div className="text-xl font-bold">{fmtCurrency(session.openingAmount || 0)}</div>
                                    </div>
                                </div>
                                {typeof currentBalance === 'number' && (
                                    <div className="flex items-center gap-2 text-green-700">
                                        <Wallet className="h-5 w-5" />
                                        <div className="text-sm">
                                            <div className="font-semibold">Balance actual</div>
                                            <div className="text-xl font-bold">{fmtCurrency(currentBalance)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={compact ? openingBoxClass.replace('p-3', 'p-2') : openingBoxClass}>
                            <div className="text-xs font-semibold">Resumen de apertura</div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-sm"><span className="font-medium">Fecha:</span> {session.openedAt ? new Date(session.openedAt).toLocaleString() : '-'}</div>
                                    {session.openedByUser && (
                                        <div className="text-sm"><span className="font-medium">Usuario:</span> {session.openedByUser.fullName || session.openedByUser.email}</div>
                                    )}
                                </div>
                                {session.notes && (
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                        <FileText className="h-4 w-4 mt-0.5" />
                                        <div className="text-sm">
                                            <span className="font-medium">Notas:</span> <span className="whitespace-pre-wrap">{session.notes}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={compact ? "grid grid-cols-1 md:grid-cols-2 gap-3 text-sm" : "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"}>
                            <div className="rounded-md border p-3">
                                <div className="font-semibold">Sistema</div>
                                <div className="mt-1 space-y-1">
                                    <div><span className="font-medium">Esperado:</span> {session.systemExpected != null ? fmtCurrency(session.systemExpected) : "-"}</div>
                                    <div><span className="font-medium">Diferencia:</span> {session.discrepancyAmount != null ? fmtCurrency(session.discrepancyAmount) : "-"}</div>
                                </div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="font-semibold">Cierre</div>
                                <div className="mt-1 space-y-1">
                                    <div><span className="font-medium">Monto:</span> {session.closingAmount != null ? fmtCurrency(session.closingAmount) : "-"}</div>
                                    <div><span className="font-medium">Fecha:</span> {session.closedAt ? new Date(session.closedAt).toLocaleString() : "-"}</div>
                                    {session.closedByUser && (
                                        <div className="text-xs text-muted-foreground">Cerrada por: {session.closedByUser.fullName || session.closedByUser.email}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-600">No hay sesión abierta.</div>
                )}
            </CardContent>
        </Card>
    );
}
