'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, XCircle, Clock, Package,
  User, Calendar, DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

interface ReturnDetailsModalProps {
  return: {
    id: string;
    returnNumber: string;
    saleId: string;
    customerId: string;
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
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, status: string, notes?: string) => void;
  onProcess: (id: string) => void;
}

const logger = createLogger('ReturnDetailsModal');

export function ReturnDetailsModal({
  return: returnItem,
  open,
  onOpenChange,
  onUpdate,
  onProcess
}: ReturnDetailsModalProps) {
  const [notes, setNotes] = useState(returnItem.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { label: 'Aprobada', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      processed: { label: 'Procesada', variant: 'default' as const, icon: CheckCircle, color: 'text-blue-600' },
      rejected: { label: 'Rechazada', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
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

  const handleUpdateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await onUpdate(returnItem.id, status, notes);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating return:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProcess = async () => {
    setIsUpdating(true);
    try {
      await onProcess(returnItem.id);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error processing return:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Devolución #{returnItem.returnNumber}</DialogTitle>
              <DialogDescription>
                Detalles completos de la devolución
              </DialogDescription>
            </div>
            {getStatusBadge(returnItem.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Cliente</span>
              </div>
              <p className="font-medium">{returnItem.customerName}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Venta Original</span>
              </div>
              <p className="font-medium">#{returnItem.saleId}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Fecha de Solicitud</span>
              </div>
              <p className="font-medium">{formatDate(returnItem.createdAt)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Monto Total</span>
              </div>
              <p className="font-medium">{formatCurrency(returnItem.totalAmount)}</p>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h4 className="font-medium">Productos a Devolver</h4>
            <div className="space-y-2">
              {returnItem.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      Cantidad: {item.quantity} • Razón: {item.reason}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Reason and Notes */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Razón Principal</h4>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{returnItem.reason}</p>
            </div>

            {returnItem.notes && (
              <div>
                <h4 className="font-medium mb-2">Notas Existentes</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{returnItem.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Agregar Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas sobre esta devolución..."
                rows={3}
              />
            </div>
          </div>

          {/* Processing Info */}
          {returnItem.processedAt && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Información de Procesamiento</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Procesado el: {formatDate(returnItem.processedAt)}</p>
                  {returnItem.processedBy && (
                    <p>Procesado por: {returnItem.processedBy}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cerrar
          </Button>

          {returnItem.status === 'pending' && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleUpdateStatus('rejected')}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button
                onClick={() => handleUpdateStatus('approved')}
                disabled={isUpdating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </>
          )}

          {returnItem.status === 'approved' && (
            <Button
              onClick={handleProcess}
              disabled={isUpdating}
            >
              <Package className="h-4 w-4 mr-2" />
              Procesar Devolución
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}