import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatDate } from '@/lib/utils';
import { SupplierWithStats } from '@/types/suppliers';

interface SupplierViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierWithStats | null;
}

export function SupplierViewDialog({
  open,
  onOpenChange,
  supplier,
}: SupplierViewDialogProps) {
  const fmtCurrency = useCurrencyFormatter();

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles del Proveedor</DialogTitle>
          <DialogDescription>
            Información completa de {supplier.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
                <p className="text-sm">{supplier.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">RUC/NIT</Label>
                <p className="text-sm">{supplier.taxId || 'No especificado'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-sm">{supplier.contactInfo.email || 'No especificado'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                <p className="text-sm">{supplier.contactInfo.phone || 'No especificado'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Dirección</Label>
                <p className="text-sm">{supplier.contactInfo.address || 'No especificada'}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Estadísticas de Compras</h3>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{supplier._count?.purchases || 0}</div>
                  <p className="text-xs text-muted-foreground">Órdenes de Compra</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{fmtCurrency(supplier.totalPurchases || 0)}</div>
                  <p className="text-xs text-muted-foreground">Total Compras</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {supplier.lastPurchase ? formatDate(supplier.lastPurchase) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Última Compra</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Notas</h3>
              <p className="text-sm text-muted-foreground">{supplier.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
