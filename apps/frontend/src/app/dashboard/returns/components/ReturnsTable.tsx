'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal, Eye, CheckCircle, XCircle,
  Clock, Package, User
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/ui/permission-guard';

interface Return {
  id: string;
  returnNumber: string;
  saleId: string;
  customerId: string | null; // ✅ Can be null
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    reason: string;
  }>;
  totalAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

interface ReturnsTableProps {
  returns: Return[];
  isLoading: boolean;
  onViewDetails: (returnItem: Return) => void;
  onUpdateStatus: (id: string, status: string, notes?: string) => void;
  onProcess: (id: string) => void;
}

export function ReturnsTable({
  returns,
  isLoading,
  onViewDetails,
  onUpdateStatus,
  onProcess
}: ReturnsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }


  if (!returns?.length) {
    return (
      <div className="text-center py-16 px-4">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-muted p-3">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">No se encontraron devoluciones</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          No hay devoluciones que coincidan con los filtros seleccionados.
          Intenta ajustar los filtros o crea una nueva devolución.
        </p>
        <PermissionGuard permission="returns.create">
          <Button onClick={() => {
            // Trigger create modal - would need to lift this state up
            const event = new CustomEvent('open-create-return-modal');
            window.dispatchEvent(event);
          }}>
            <Package className="h-4 w-4 mr-2" />
            Nueva Devolución
          </Button>
        </PermissionGuard>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'Aprobada', variant: 'default' as const, icon: CheckCircle },
      processed: { label: 'Procesada', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rechazada', variant: 'destructive' as const, icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Venta Original</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((returnItem) => (
            <TableRow key={returnItem.id}>
              <TableCell className="font-medium">
                {returnItem.returnNumber}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {returnItem.customerName}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => {/* Navigate to sale */ }}
                >
                  #{returnItem.saleId}
                </Button>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {returnItem.items.length} producto{returnItem.items.length !== 1 ? 's' : ''}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(returnItem.totalAmount)}
              </TableCell>
              <TableCell>
                {getStatusBadge(returnItem.status)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(returnItem.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(returnItem)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </DropdownMenuItem>

                    {returnItem.status === 'pending' && (
                      <PermissionGuard permission="returns.approve">
                        <DropdownMenuItem
                          onClick={() => onUpdateStatus(returnItem.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprobar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onUpdateStatus(returnItem.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </DropdownMenuItem>
                      </PermissionGuard>
                    )}

                    {returnItem.status === 'approved' && (
                      <PermissionGuard permission="returns.process">
                        <DropdownMenuItem onClick={() => onProcess(returnItem.id)}>
                          <Package className="h-4 w-4 mr-2" />
                          Procesar
                        </DropdownMenuItem>
                      </PermissionGuard>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}