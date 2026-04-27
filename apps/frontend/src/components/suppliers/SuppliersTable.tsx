import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatDate } from '@/lib/utils';
import { SupplierWithStats } from '@/types/suppliers';

interface SuppliersTableProps {
  suppliers: SupplierWithStats[];
  loading: boolean;
  onSort: (field: string) => void;
  onView: (supplier: SupplierWithStats) => void;
  onEdit: (supplier: SupplierWithStats) => void;
  onDelete: (supplier: SupplierWithStats) => void;
}

export function SuppliersTable({
  suppliers,
  loading,
  onSort,
  onView,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  const fmtCurrency = useCurrencyFormatter();

  if (loading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suppliers.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-lg font-medium">No se encontraron proveedores</p>
            <p className="text-sm text-muted-foreground mt-1">Ajuste los filtros o agregue un proveedor nuevo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50 text-xs uppercase tracking-wider">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px]">
              <Button variant="ghost" onClick={() => onSort('name')} className="-ml-4 h-8 px-2 flex items-center justify-start text-xs font-semibold">
                Nombre del Proveedor <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
              </Button>
            </TableHead>
            <TableHead className="hidden md:table-cell">Contacto</TableHead>
            <TableHead className="text-right">
               <Button variant="ghost" onClick={() => onSort('totalPurchases')} className="h-8 px-2 flex items-center justify-end w-full text-xs font-semibold">
                Total Compras <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
              </Button>
            </TableHead>
            <TableHead className="text-right hidden sm:table-cell">
               <Button variant="ghost" onClick={() => onSort('totalOrders')} className="h-8 px-2 flex items-center justify-end w-full text-xs font-semibold">
                 Órdenes <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
              </Button>
            </TableHead>
            <TableHead className="text-right hidden lg:table-cell">Última Compra</TableHead>
            <TableHead className="w-[50px] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => {
            const canDelete = (supplier._count?.purchases || 0) === 0;
            return (
              <TableRow key={supplier.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium align-top">
                  <div>
                    <span className="block truncate max-w-[200px]" title={supplier.name}>{supplier.name}</span>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-xs text-muted-foreground block truncate">{supplier.taxId || 'Sin RUC'}</span>
                      <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'} className={`text-[10px] px-1 h-4 font-normal ${supplier.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : ''}`}>
                         {supplier.status === 'active' ? 'Activo' : supplier.status === 'inactive' ? 'Inactivo' : 'Pend.'}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell align-top">
                  <div className="text-sm truncate max-w-[200px]" title={supplier.contactInfo.email}>{supplier.contactInfo.email || '-'}</div>
                  <div className="text-xs text-muted-foreground mt-1">{supplier.contactInfo.phone || '-'}</div>
                </TableCell>
                <TableCell className="text-right font-medium align-top">
                  {fmtCurrency(supplier.totalPurchases || 0)}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell align-top text-muted-foreground">
                  {supplier._count?.purchases || 0}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell align-top text-xs text-muted-foreground">
                  {supplier.lastPurchase ? formatDate(supplier.lastPurchase) : 'Sin compras'}
                </TableCell>
                <TableCell className="text-right align-top">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onView(supplier)}>
                        <Eye className="mr-2 h-4 w-4 text-blue-500" />
                        Ver detalles
                      </DropdownMenuItem>
                      <PermissionGuard permission="suppliers.edit">
                        <DropdownMenuItem onClick={() => onEdit(supplier)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      </PermissionGuard>
                      <PermissionGuard permission="suppliers.delete">
                        <DropdownMenuItem
                          className={canDelete ? "text-destructive focus:bg-destructive/10" : "opacity-50"}
                          onClick={() => canDelete && onDelete(supplier)}
                          disabled={!canDelete}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
