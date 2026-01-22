import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CashFilters from "@/components/cash/CashFilters";
import { CashMovementsTable } from "./CashMovementsTable";
import type { CashMovement } from "@/types/cash";
import type { PaginationState, PaginationControls } from "@/hooks/usePagination";
import type { LoadingStates } from "../types/cash.types";

interface CashDashboardHookView {
    lastSyncAt: Date | null;
    movementsHref: string;
    fetchMovements: () => Promise<any>;
    fetchSession: () => Promise<any>;
    loadingStates: LoadingStates;
    sessionLoading: boolean;
    clearFilters: () => void;
    exportMovementsCSV: () => void;
    showAdvancedFilters: boolean;
    setShowAdvancedFilters: (v: boolean | ((prev: boolean) => boolean)) => void;
    createdByMe: boolean;
    setCreatedByMe: (v: boolean | ((prev: boolean) => boolean)) => void;
    filterType: string;
    setFilterType: (v: string) => void;
    filterSearch: string;
    setFilterSearch: (v: string) => void;
    filterFrom: string;
    setFilterFrom: (v: string) => void;
    filterTo: string;
    setFilterTo: (v: string) => void;
    filterAmountMin: string;
    setFilterAmountMin: (v: string) => void;
    filterAmountMax: string;
    setFilterAmountMax: (v: string) => void;
    movementsLoading: boolean;
    paginatedMovements: CashMovement[];
    pagination: PaginationState;
    controls: PaginationControls;
    filteredMovements: CashMovement[];
}

interface CashMovementsSectionProps {
    hook: CashDashboardHookView;
}

export function CashMovementsSection({ hook }: CashMovementsSectionProps) {
    const {
        lastSyncAt,
        movementsHref,
        fetchMovements,
        fetchSession,
        loadingStates,
        sessionLoading,
        clearFilters,
        exportMovementsCSV,
        showAdvancedFilters,
        setShowAdvancedFilters,
        createdByMe,
        setCreatedByMe,
        filterType,
        setFilterType,
        filterSearch,
        setFilterSearch,
        filterFrom,
        setFilterFrom,
        filterTo,
        setFilterTo,
        filterAmountMin,
        setFilterAmountMin,
        filterAmountMax,
        setFilterAmountMax,
        movementsLoading,
        paginatedMovements,
        pagination,
        controls,
        filteredMovements
    } = hook;

    const loadingMovements = movementsLoading || loadingStates.fetchingData;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Movimientos</CardTitle>
                    <div className="flex items-center gap-2">
                        {lastSyncAt && (
                            <span className="text-xs text-muted-foreground mr-2">Última sync: {lastSyncAt.toLocaleTimeString()}</span>
                        )}
                        <Button asChild size="sm" variant="default">
                            <Link href={movementsHref || "/dashboard/cash/movements"}>Ver todos</Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                            <Link href={movementsHref || "/dashboard/cash/movements"}>Sesión actual</Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={async () => { await Promise.all([fetchMovements(), fetchSession()]); }} disabled={loadingMovements || sessionLoading}>
                            Sincronizar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearFilters} disabled={loadingMovements}>
                            Limpiar filtros
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportMovementsCSV} disabled={loadingMovements} aria-label="Exportar movimientos a CSV">
                            Exportar CSV
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setFilterType('SALE')} disabled={loadingMovements}>
                            Ventas POS
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { try { setFilterType('SALE'); setFilterFrom(''); setFilterTo(''); } catch { } }}
                            disabled={loadingMovements}
                            aria-label="Ventas de la sesión"
                        >
                            Ventas de la sesión
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                try {
                                    const now = new Date();
                                    const yyyy = now.getFullYear();
                                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                                    const dd = String(now.getDate()).padStart(2, '0');
                                    const todayStart = `${yyyy}-${mm}-${dd}T00:00:00`;
                                    const todayEnd = `${yyyy}-${mm}-${dd}T23:59:59`;
                                    setFilterType('SALE');
                                    setFilterFrom(todayStart);
                                    setFilterTo(todayEnd);
                                    setShowAdvancedFilters(true);
                                } catch { }
                            }}
                            disabled={loadingMovements}
                            aria-label="Ventas de hoy"
                        >
                            Ventas de hoy
                        </Button>
                        <Button
                            variant={createdByMe ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setCreatedByMe((v: boolean) => !v)}
                            disabled={loadingMovements}
                            aria-pressed={createdByMe}
                        >
                            Solo mis ventas
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowAdvancedFilters((v: boolean) => !v)} aria-expanded={showAdvancedFilters} aria-controls="advanced-filters">
                            Filtros avanzados
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <CashFilters
                    title="Filtros"
                    headerRight={null} // Actions are already in the card header
                    filters={[
                        {
                            key: "type",
                            label: "Tipo",
                            type: "select",
                            value: filterType,
                            onChange: setFilterType,
                            options: [
                                { value: "all", label: "Todos" },
                                { value: "IN", label: "Ingreso" },
                                { value: "OUT", label: "Egreso" },
                                { value: "ADJUSTMENT", label: "Ajuste" },
                                { value: "SALE", label: "Venta" },
                                { value: "RETURN", label: "Devolución" },
                            ],
                        },
                        { key: "search", label: "Buscar motivo", type: "text", value: filterSearch, onChange: setFilterSearch },
                        { key: "from", label: "Desde", type: "date", value: filterFrom, onChange: setFilterFrom, hidden: !showAdvancedFilters },
                        { key: "to", label: "Hasta", type: "date", value: filterTo, onChange: setFilterTo, hidden: !showAdvancedFilters },
                        { key: "amountMin", label: "Monto mínimo", type: "number", value: filterAmountMin, onChange: setFilterAmountMin, hidden: !showAdvancedFilters },
                        { key: "amountMax", label: "Monto máximo", type: "number", value: filterAmountMax, onChange: setFilterAmountMax, hidden: !showAdvancedFilters },
                    ]}
                    onClear={clearFilters}
                    columns={4}
                />

                <CashMovementsTable
                    movements={paginatedMovements}
                    isLoading={loadingMovements}
                    pagination={pagination}
                    controls={controls}
                    compact={true}
                />

            </CardContent>
        </Card>
    );
}
