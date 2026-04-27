'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Download, ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStatus, formatPaymentMethod, formatSaleType, getStatusBadgeVariant } from '@/lib/sales-formatters';
import { formatCurrency } from '@/lib/utils';

export interface Sale {
  id: string;
  customer_id: string | null;
  user_id: string;
  total_amount: number;
  tax_amount: number | null;
  discount_amount: number | null;
  payment_method: string;
  status: string;
  sale_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  items?: Array<{
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount: number;
    product?: { id: string; name: string; sku: string };
  }>;
}

interface SalesDataTableProps {
  data: Sale[];
  pagination: { page: number; limit: number; total: number; pages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetails: (sale: Sale) => void;
  onExport: () => void;
  isLoading?: boolean;
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function SalesDataTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetails,
  onExport,
  isLoading = false,
}: SalesDataTableProps) {
  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Cargando...'
            : pagination.total === 0
            ? 'Sin resultados'
            : `Mostrando ${startIndex}–${endIndex} de ${pagination.total} ventas`}
        </p>
        <Button onClick={onExport} variant="outline" size="sm" disabled={isLoading || pagination.total === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">ID Venta</TableHead>
              <TableHead className="w-[160px]">Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[110px]">Total</TableHead>
              <TableHead className="w-[140px]">Método de Pago</TableHead>
              <TableHead className="w-[120px]">Estado</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 opacity-40" />
                    <p className="font-medium">No se encontraron ventas</p>
                    <p className="text-sm">Intenta ajustar los filtros o el rango de fechas</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    #{sale.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(sale.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {sale.customer ? (
                      <div>
                        <p className="font-medium">{sale.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{sale.customer.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin cliente</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(sale.total_amount)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPaymentMethod(sale.payment_method)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(sale.status)}>
                      {formatStatus(sale.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatSaleType(sale.sale_type)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onViewDetails(sale)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página:</span>
          <Select
            value={String(pagination.limit)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={pagination.page <= 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            {pagination.page} / {pagination.pages || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.pages)} disabled={pagination.page >= pagination.pages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
