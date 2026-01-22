import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

interface PriceChangeData {
  productName: string;
  previousPrice: number;
  newPrice: number;
  quantity: number;
  savings: number;
  priceType: 'mayorista' | 'minorista';
}

interface WholesalePriceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  priceChange: PriceChangeData | null;
  onCancel?: () => void;
}

export function WholesalePriceConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  priceChange,
  onCancel,
}: WholesalePriceConfirmationModalProps) {
  const fmtCurrency = useCurrencyFormatter();
  const [timeLeft, setTimeLeft] = useState(10);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleCancel();
    }
  }, [isOpen, timeLeft]);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(10);
      setIsConfirming(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error confirming price change:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  if (!priceChange) return null;

  const { productName, previousPrice, newPrice, quantity, savings, priceType } = priceChange;
  const isPriceIncrease = newPrice > previousPrice;
  const percentageChange = ((newPrice - previousPrice) / previousPrice) * 100;
  const totalPrevious = previousPrice * quantity;
  const totalNew = newPrice * quantity;
  const totalSavings = savings * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPriceIncrease ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
            Cambio de Precio Detectado
          </DialogTitle>
          <DialogDescription>
            Se aplicará el precio {priceType} para este producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{productName}</h3>
                <Badge variant="outline" className="mt-1">
                  Precio {priceType}
                </Badge>
              </div>
              <Badge 
                variant={isPriceIncrease ? "destructive" : "default"}
                className="ml-2"
              >
                {isPriceIncrease ? '+' : '-'}{Math.abs(percentageChange).toFixed(1)}%
              </Badge>
            </div>
          </Card>

          {/* Price Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Precio Anterior</div>
              <div className="text-2xl font-bold text-muted-foreground">
                {fmtCurrency(previousPrice)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total: {fmtCurrency(totalPrevious)}
              </div>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Nuevo Precio</div>
              <div className="text-2xl font-bold text-primary">
                {fmtCurrency(newPrice)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total: {fmtCurrency(totalNew)}
              </div>
            </Card>
          </div>

          {/* Savings Info */}
          {!isPriceIncrease && totalSavings > 0 && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-semibold text-green-800">
                    Ahorro Total: {fmtCurrency(totalSavings)}
                  </div>
                  <div className="text-sm text-green-700">
                    Por {quantity} unidad{quantity > 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Warning for Price Increase */}
          {isPriceIncrease && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-semibold text-yellow-800">
                    Aumento de Precio
                  </div>
                  <div className="text-sm text-yellow-700">
                    El precio aumentó {fmtCurrency(newPrice - previousPrice)} por unidad
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Additional Info */}
          <Card className="p-4 bg-muted">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Esta confirmación se mostrará solo cuando cambie el tipo de precio aplicado
              </div>
            </div>
          </Card>

          {/* Timer */}
          <div className="text-center text-sm text-muted-foreground">
            Esta confirmación se cerrará automáticamente en {timeLeft} segundos
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className={isPriceIncrease ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Confirmando...
              </>
            ) : (
              'Confirmar Cambio'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}