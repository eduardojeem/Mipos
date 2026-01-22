import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>Gestiona la información de tus proveedores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando proveedores...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suppliers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>Gestiona la información de tus proveedores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">No se encontraron proveedores</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Proveedores</CardTitle>
        <CardDescription>Gestiona la información de tus proveedores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
            <div className="col-span-3 cursor-pointer flex items-center" onClick={() => onSort('name')}>
              Nombre <ArrowUpDown className="ml-1 h-3 w-3" />
            </div>
            <div className="col-span-2">Contacto</div>
            <div className="col-span-2 cursor-pointer flex items-center" onClick={() => onSort('totalPurchases')}>
              Total Compras <ArrowUpDown className="ml-1 h-3 w-3" />
            </div>
            <div className="col-span-2 cursor-pointer flex items-center" onClick={() => onSort('totalOrders')}>
              Órdenes <ArrowUpDown className="ml-1 h-3 w-3" />
            </div>
            <div className="col-span-2 cursor-pointer flex items-center" onClick={() => onSort('lastPurchase')}>
              Última Compra <ArrowUpDown className="ml-1 h-3 w-3" />
            </div>
            <div className="col-span-1">Acciones</div>
          </div>

          {/* Table Rows */}
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b last:border-b-0">
              <div className="col-span-3">
                <div className="font-medium">{supplier.name}</div>
                <div className="text-sm text-muted-foreground">{supplier.taxId}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm">{supplier.contactInfo.email}</div>
                <div className="text-sm text-muted-foreground">{supplier.contactInfo.phone}</div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">{fmtCurrency(supplier.totalPurchases || 0)}</div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">{supplier._count?.purchases || 0}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm">
                  {supplier.lastPurchase ? formatDate(supplier.lastPurchase) : 'Sin compras'}
                </div>
              </div>
              <div className="col-span-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(supplier)}>
                      <Eye className="mr-2 h-4 w-4" />
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
                        className="text-red-600"
                        onClick={() => onDelete(supplier)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
