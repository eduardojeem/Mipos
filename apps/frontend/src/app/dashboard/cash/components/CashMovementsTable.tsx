import React, { useRef } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/loading-states";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { CashMovement } from "@/types/cash";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingCart, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CashMovementsTableProps {
    movements: CashMovement[];
    isLoading: boolean;
    pagination: any;
    controls: any;
    compact?: boolean;
    enableVirtualization?: boolean;
}

export const CashMovementsTable = React.memo(function CashMovementsTable({
    movements,
    isLoading,
    pagination,
    controls,
    compact = false,
    enableVirtualization = true
}: CashMovementsTableProps) {
    const fmtCurrency = useCurrencyFormatter();
    const parentRef = useRef<HTMLDivElement>(null);

    // Enable virtualization for large lists
    const shouldVirtualize = enableVirtualization && movements.length > 50;

    const virtualizer = useVirtualizer({
        count: movements.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60, // Estimated row height
        enabled: shouldVirtualize,
    });

    if (isLoading) {
        return <TableSkeleton rows={5} columns={6} />;
    }

    if (movements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <div className="bg-muted/50 p-4 rounded-full mb-3">
                    <RefreshCw className="w-6 h-6 opacity-50" />
                </div>
                <p>No hay movimientos registrados</p>
            </div>
        );
    }

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'IN': return { label: 'Ingreso', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ArrowUpRight };
            case 'OUT': return { label: 'Egreso', color: 'bg-red-100 text-red-700 border-red-200', icon: ArrowDownLeft };
            case 'SALE': return { label: 'Venta', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: ShoppingCart };
            case 'RETURN': return { label: 'Devolución', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Undo2 };
            case 'ADJUSTMENT': return { label: 'Ajuste', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: RefreshCw };
            default: return { label: type, color: 'bg-gray-100 text-gray-700', icon: RefreshCw };
        }
    };

    // Compute cumulative balance over displayed order (descending by created_at)
    const deltas = movements.map((m) => {
        const t = String(m.type).toUpperCase();
        if (t === 'IN' || t === 'SALE') return Math.abs(Number(m.amount) || 0);
        if (t === 'OUT' || t === 'RETURN') return -Math.abs(Number(m.amount) || 0);
        if (t === 'ADJUSTMENT') return Number(m.amount) || 0;
        return 0;
    });
    let running = 0;
    const cumulativeDesc: number[] = new Array(deltas.length);
    for (let j = deltas.length - 1; j >= 0; j--) {
        running += deltas[j];
        cumulativeDesc[j] = running;
    }

    return (
        <div className="space-y-4">
            <div
                ref={parentRef}
                className={cn("rounded-md border", compact ? "max-h-[400px] overflow-auto" : "")}
            >
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[180px]">Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">Acumulado</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="text-right">Referencia</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shouldVirtualize ? (
                            <>
                                <tr style={{ height: `${virtualizer.getTotalSize()}px` }} />
                                {virtualizer.getVirtualItems().map((virtualRow) => {
                                    const idx = virtualRow.index;
                                    const m = movements[idx];
                                    const config = getTypeConfig(m.type);
                                    const Icon = config.icon;
                                    const isPositive = ['IN', 'SALE'].includes(m.type) || (m.type === 'ADJUSTMENT' && m.amount > 0);

                                    return (
                                        <TableRow
                                            key={m.id}
                                            className="hover:bg-muted/5"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                        >
                                            <TableCell className="font-medium text-muted-foreground">
                                                {new Date(m.createdAt).toLocaleString(undefined, {
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("font-normal gap-1", config.color)}>
                                                    <Icon className="w-3 h-3" />
                                                    {config.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-mono font-medium",
                                                isPositive ? "text-emerald-600" : "text-red-600"
                                            )}>
                                                {isPositive ? "+" : ""}{fmtCurrency(m.amount)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {fmtCurrency(cumulativeDesc[idx])}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={m.reason || ""}>
                                                {m.reason || <span className="text-muted-foreground italic">Sin motivo</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                                        {(m.createdByUser?.fullName?.[0] || m.createdByUser?.email?.[0] || "?").toUpperCase()}
                                                    </div>
                                                    <span className="text-sm truncate max-w-[120px]">
                                                        {m.createdByUser?.fullName || m.createdByUser?.email?.split('@')[0] || "Sistema"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {m.referenceType === 'SALE' && m.referenceId ? (
                                                    <Link href={`/dashboard/sales?search=${encodeURIComponent(m.referenceId)}`} className="text-xs text-blue-600 hover:underline">
                                                        #{m.referenceId.slice(0, 8)}
                                                    </Link>
                                                ) : m.referenceType === 'RETURN' && m.referenceId ? (
                                                    <Link href={`/dashboard/returns?search=${encodeURIComponent(m.referenceId)}`} className="text-xs text-orange-600 hover:underline">
                                                        #{m.referenceId.slice(0, 8)}
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </>
                        ) : (
                            movements.map((m, idx) => {
                                const config = getTypeConfig(m.type);
                                const Icon = config.icon;
                                const isPositive = ['IN', 'SALE'].includes(m.type) || (m.type === 'ADJUSTMENT' && m.amount > 0);

                                return (
                                    <TableRow key={m.id} className="hover:bg-muted/5">
                                        <TableCell className="font-medium text-muted-foreground">
                                            {new Date(m.createdAt).toLocaleString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("font-normal gap-1", config.color)}>
                                                <Icon className="w-3 h-3" />
                                                {config.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={cn("text-right font-mono font-medium",
                                            isPositive ? "text-emerald-600" : "text-red-600"
                                        )}>
                                            {isPositive ? "+" : ""}{fmtCurrency(m.amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {fmtCurrency(cumulativeDesc[idx])}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={m.reason || ""}>
                                            {m.reason || <span className="text-muted-foreground italic">Sin motivo</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                                    {(m.createdByUser?.fullName?.[0] || m.createdByUser?.email?.[0] || "?").toUpperCase()}
                                                </div>
                                                <span className="text-sm truncate max-w-[120px]">
                                                    {m.createdByUser?.fullName || m.createdByUser?.email?.split('@')[0] || "Sistema"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {m.referenceType === 'SALE' && m.referenceId ? (
                                                <Link href={`/dashboard/sales?search=${encodeURIComponent(m.referenceId)}`} className="text-xs text-blue-600 hover:underline">
                                                    #{m.referenceId.slice(0, 8)}
                                                </Link>
                                            ) : m.referenceType === 'RETURN' && m.referenceId ? (
                                                <Link href={`/dashboard/returns?search=${encodeURIComponent(m.referenceId)}`} className="text-xs text-orange-600 hover:underline">
                                                    #{m.referenceId.slice(0, 8)}
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            <Pagination 
                currentPage={Number(pagination?.page || 1)} 
                totalPages={Number(pagination?.totalPages || Math.ceil(Number(pagination?.totalItems || 0) / Number(pagination?.pageSize || 10)) || 1)} 
                onPageChange={(page: number) => {
                    if (typeof controls?.onPageChange === 'function') {
                        controls.onPageChange(page);
                    } else if (typeof pagination?.setPage === 'function') {
                        pagination.setPage(page);
                    }
                }} 
            />
        </div>
    );
});
