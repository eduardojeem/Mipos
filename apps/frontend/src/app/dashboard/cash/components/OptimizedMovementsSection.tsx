"use client";

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { ExternalLink, RefreshCw, Download, Filter } from "lucide-react";
import Link from "next/link";
import type { CashMovement } from "@/types/cash";

interface OptimizedMovementsSectionProps {
  movements: CashMovement[];
  allMovements: CashMovement[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  sessionId?: string;
}

const MovementTypeBadge = memo(({ type }: { type: string }) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    IN: "default",
    OUT: "destructive", 
    SALE: "secondary",
    RETURN: "outline",
    ADJUSTMENT: "outline"
  };

  return (
    <Badge variant={variants[type] || "outline"}>
      {type}
    </Badge>
  );
});

MovementTypeBadge.displayName = "MovementTypeBadge";

export const OptimizedMovementsSection = memo<OptimizedMovementsSectionProps>(({
  movements,
  allMovements,
  isLoading = false,
  onRefresh,
  onExport,
  sessionId
}) => {
  const movementsHref = sessionId 
    ? `/dashboard/cash/movements?sessionId=${sessionId}`
    : "/dashboard/cash/movements";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle>Movimientos Recientes</CardTitle>
            <Badge variant="outline">
              {movements.length} de {allMovements.length}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            )}
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={movementsHref}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver todos
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay movimientos recientes</p>
            <p className="text-sm">Los movimientos aparecerán aquí cuando se registren</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice(0, 10).map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {new Date(movement.createdAt).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MovementTypeBadge type={movement.type} />
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className={
                        ['IN', 'SALE'].includes(movement.type) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }>
                        {['IN', 'SALE'].includes(movement.type) ? '+' : '-'}
                        {formatCurrency(Math.abs(movement.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {movement.reason || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {movement.createdByUser?.fullName || 
                         movement.createdByUser?.email || 
                         "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {movements.length > 10 && (
          <div className="mt-4 text-center">
            <Button asChild variant="outline" size="sm">
              <Link href={movementsHref}>
                Ver todos los {allMovements.length} movimientos
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedMovementsSection.displayName = "OptimizedMovementsSection";