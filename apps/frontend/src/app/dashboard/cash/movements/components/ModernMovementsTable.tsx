"use client";

import React, { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowUpDown, 
  ExternalLink, 
  Eye,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  User,
  Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { CashMovement } from "@/types/cash";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModernMovementsTableProps {
  movements: CashMovement[];
  isLoading?: boolean;
  sortKey: "date" | "amount" | "type";
  sortDir: "asc" | "desc";
  onSort: (key: "date" | "amount" | "type") => void;
  onViewDetails?: (movement: CashMovement) => void;
}

const MovementTypeBadge = memo(({ type, referenceType }: { 
  type: string; 
  referenceType?: string;
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case "IN":
        return {
          variant: "default" as const,
          icon: TrendingUp,
          color: "text-green-600",
          bg: "bg-green-50 dark:bg-green-950",
          label: "Ingreso"
        };
      case "OUT":
        return {
          variant: "destructive" as const,
          icon: TrendingDown,
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-950",
          label: "Egreso"
        };
      case "SALE":
        return {
          variant: "secondary" as const,
          icon: Receipt,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950",
          label: "Venta"
        };
      case "RETURN":
        return {
          variant: "outline" as const,
          icon: TrendingDown,
          color: "text-orange-600",
          bg: "bg-orange-50 dark:bg-orange-950",
          label: "Devolución"
        };
      case "ADJUSTMENT":
        return {
          variant: "outline" as const,
          icon: Minus,
          color: "text-gray-600",
          bg: "bg-gray-50 dark:bg-gray-950",
          label: "Ajuste"
        };
      default:
        return {
          variant: "outline" as const,
          icon: Minus,
          color: "text-gray-600",
          bg: "bg-gray-50 dark:bg-gray-950",
          label: type
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={config.variant} className={`${config.bg} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
      {referenceType === "SALE" && (
        <Badge variant="outline" className="text-xs">
          POS
        </Badge>
      )}
    </div>
  );
});

MovementTypeBadge.displayName = "MovementTypeBadge";

const MovementAmount = memo(({ amount, type }: { amount: number; type: string }) => {
  const isPositive = ['IN', 'SALE'].includes(type);
  const isNegative = ['OUT', 'RETURN'].includes(type);
  
  return (
    <div className="flex items-center space-x-2">
      <span className={`font-semibold ${
        isPositive ? 'text-green-600' : 
        isNegative ? 'text-red-600' : 
        'text-gray-600'
      }`}>
        {isPositive ? '+' : isNegative ? '-' : ''}
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
});

MovementAmount.displayName = "MovementAmount";

const UserAvatar = memo(({ user }: { user?: CashMovement['createdByUser'] }) => {
  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">Sistema</span>
      </div>
    );
  }

  const getInitials = () => {
    const name = user.fullName || '';
    const email = user.email || '';
    const source = name.trim() || email.trim();
    const parts = source.includes('@') ? source.split('@')[0].split(/[\.\s_]+/) : source.split(/[\s_]+/);
    return parts.filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';
  };

  return (
    <div className="flex items-center space-x-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs font-medium">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {user.fullName || user.email}
        </span>
        {user.fullName && user.email && (
          <span className="text-xs text-muted-foreground">
            {user.email}
          </span>
        )}
      </div>
    </div>
  );
});

UserAvatar.displayName = "UserAvatar";

const MovementReference = memo(({ movement }: { movement: CashMovement }) => {
  if (!movement.referenceType || !movement.referenceId) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const getHref = () => {
    switch (movement.referenceType) {
      case "SALE":
        return `/dashboard/sales?search=${encodeURIComponent(movement.referenceId!)}`;
      case "RETURN":
        return `/dashboard/returns?search=${encodeURIComponent(movement.referenceId!)}`;
      default:
        return null;
    }
  };

  const href = getHref();
  const shortId = movement.referenceId.slice(0, 8);

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline"
      >
        <span className="text-sm">{movement.referenceType}: {shortId}</span>
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <span className="text-sm">
      {movement.referenceType}: {shortId}
    </span>
  );
});

MovementReference.displayName = "MovementReference";

const MovementDetailsDialog = memo(({ 
  movement, 
  open, 
  onOpenChange 
}: { 
  movement: CashMovement | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  if (!movement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles del Movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <div className="mt-1">
                <MovementTypeBadge type={movement.type} referenceType={movement.referenceType || undefined} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Monto</label>
              <div className="mt-1">
                <MovementAmount amount={movement.amount} type={movement.type} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <p className="mt-1 text-sm">
                {new Date(movement.createdAt).toLocaleString('es-ES')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Usuario</label>
              <div className="mt-1">
                <UserAvatar user={movement.createdByUser} />
              </div>
            </div>
          </div>
          
          {movement.reason && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Motivo</label>
              <p className="mt-1 text-sm bg-muted p-3 rounded-md">
                {movement.reason}
              </p>
            </div>
          )}

          {(movement.referenceType || movement.referenceId) && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Referencia</label>
              <div className="mt-1">
                <MovementReference movement={movement} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">ID:</span> {movement.id}
            </div>
            <div>
              <span className="font-medium">Sesión:</span> {movement.sessionId}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

MovementDetailsDialog.displayName = "MovementDetailsDialog";

export const ModernMovementsTable = memo<ModernMovementsTableProps>(({
  movements,
  isLoading = false,
  sortKey,
  sortDir,
  onSort,
  onViewDetails
}) => {
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (movement: CashMovement) => {
    setSelectedMovement(movement);
    setDetailsOpen(true);
    onViewDetails?.(movement);
  };

  const SortButton = ({ column, children }: { column: "date" | "amount" | "type"; children: React.ReactNode }) => (
    <button
      className="inline-flex items-center gap-2 hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-sm"
      onClick={() => onSort(column)}
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 transition-opacity ${
        sortKey === column ? 'opacity-100' : 'opacity-30'
      }`} />
    </button>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">
                    <SortButton column="date">
                      <Clock className="h-4 w-4" />
                      Fecha
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <SortButton column="type">
                      <Receipt className="h-4 w-4" />
                      Tipo
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <SortButton column="amount">
                      <TrendingUp className="h-4 w-4" />
                      Monto
                    </SortButton>
                  </TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuario
                    </div>
                  </TableHead>
                  <TableHead className="w-[160px]">Referencia</TableHead>
                  <TableHead className="w-[60px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center space-y-3">
                          <Receipt className="h-12 w-12 text-muted-foreground opacity-50" />
                          <div>
                            <p className="text-lg font-medium">No hay movimientos</p>
                            <p className="text-sm text-muted-foreground">
                              Los movimientos aparecerán aquí cuando se registren
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((movement, index) => (
                      <motion.tr
                        key={movement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium">
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
                          <MovementTypeBadge 
                            type={movement.type} 
                            referenceType={movement.referenceType || undefined}
                          />
                        </TableCell>
                        <TableCell>
                          <MovementAmount amount={movement.amount} type={movement.type} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {movement.reason || (
                              <span className="text-muted-foreground italic">Sin motivo</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <UserAvatar user={movement.createdByUser} />
                        </TableCell>
                        <TableCell>
                          <MovementReference movement={movement} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(movement)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MovementDetailsDialog
        movement={selectedMovement}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
});

ModernMovementsTable.displayName = "ModernMovementsTable";