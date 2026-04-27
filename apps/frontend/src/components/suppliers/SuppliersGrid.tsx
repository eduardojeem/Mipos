import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2, Mail, Phone, CalendarDays } from 'lucide-react';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatDate } from '@/lib/utils';
import { SupplierWithStats } from '@/types/suppliers';

interface SuppliersGridProps {
  suppliers: SupplierWithStats[];
  loading: boolean;
  onView: (supplier: SupplierWithStats) => void;
  onEdit: (supplier: SupplierWithStats) => void;
  onDelete: (supplier: SupplierWithStats) => void;
}

export function SuppliersGrid({
  suppliers,
  loading,
  onView,
  onEdit,
  onDelete,
}: SuppliersGridProps) {
  const fmtCurrency = useCurrencyFormatter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <Card key={idx} className="animate-pulse shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2 pt-4">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center bg-card shadow-sm">
        <p className="text-muted-foreground text-sm">No se encontraron proveedores</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {suppliers.map((supplier) => {
        const canDelete = (supplier._count?.purchases || 0) === 0;

        return (
          <Card key={supplier.id} className="group hover:shadow-lg transition-all duration-300">
            {/* Gradient Top Bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${
                supplier.status === 'active' ? 'from-green-400 to-green-600' : 
                supplier.status === 'inactive' ? 'from-red-400 to-red-600' : 'from-yellow-400 to-yellow-600'
              }`} 
            />

            <CardHeader className="pb-2 relative">
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(supplier)}>
                      <Eye className="mr-2 h-4 w-4 text-blue-500" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <PermissionGuard permission="suppliers.edit">
                      <DropdownMenuItem onClick={() => onEdit(supplier)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </PermissionGuard>
                    <PermissionGuard permission="suppliers.delete">
                      <DropdownMenuItem 
                        onClick={() => canDelete && onDelete(supplier)}
                        disabled={!canDelete}
                        className={canDelete ? "text-destructive focus:text-destructive focus:bg-destructive/10" : "opacity-50"}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardTitle className="text-lg pr-8 line-clamp-1 truncate" title={supplier.name}>
                {supplier.name}
              </CardTitle>
              <CardDescription>
                RUC/NIT: {supplier.taxId || 'N/A'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pb-4">
              <div className="flex gap-2 items-center flex-wrap">
                <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'} 
                       className={supplier.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : ''}>
                  {supplier.status === 'active' ? 'Activo' : supplier.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
                </Badge>
                {supplier.category && (
                  <Badge variant="outline" className="text-xs">{supplier.category}</Badge>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-2" title={supplier.contactInfo.email}>
                  <Mail className="h-3.5 w-3.5 opacity-70" />
                  <span className="truncate">{supplier.contactInfo.email || 'Sin correo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 opacity-70" />
                  <span>{supplier.contactInfo.phone || 'Sin teléfono'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                  <span>Última Compra: {supplier.lastPurchase ? formatDate(supplier.lastPurchase) : 'Ninguna'}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 border-t bg-muted/20 flex flex-col items-start text-sm">
               <div className="flex justify-between w-full font-medium">
                  <span className="text-muted-foreground">Total Compras:</span>
                  <span>{fmtCurrency(supplier.totalPurchases || 0)}</span>
               </div>
               <div className="flex justify-between w-full mt-1">
                 <span className="text-muted-foreground">Órdenes:</span>
                 <span className="bg-primary/10 text-primary px-1.5 rounded">{supplier._count?.purchases || 0}</span>
               </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
