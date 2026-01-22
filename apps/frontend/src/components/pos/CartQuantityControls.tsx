import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CartQuantityControlsProps {
  productId: string;
  quantity: number;
  stockQuantity?: number;
  onChangeQuantity: (productId: string, delta: number) => void;
  onDirectChange: (productId: string, value: string) => void;
}

export function CartQuantityControls({
  productId,
  quantity,
  stockQuantity,
  onChangeQuantity,
  onDirectChange,
}: CartQuantityControlsProps) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Controles de cantidad">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChangeQuantity(productId, -1)}
        disabled={quantity <= 1}
        className="h-8 w-8 sm:h-7 sm:w-7 p-0 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
      </Button>
      <Input
        type="number"
        min={1}
        value={quantity}
        inputMode="numeric"
        onChange={(e) => onDirectChange(productId, e.target.value)}
        className="w-16 sm:w-20 h-9 sm:h-8 text-center font-semibold text-sm sm:text-xs border border-border rounded focus:ring-1 focus:ring-primary/30"
        max={stockQuantity ?? 999}
        aria-label="Cantidad"
        aria-describedby={`stock-status-${productId}`}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChangeQuantity(productId, 1)}
        disabled={typeof stockQuantity === 'number' ? quantity >= stockQuantity : false}
        className="h-8 w-8 sm:h-7 sm:w-7 p-0 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
      </Button>
      {typeof stockQuantity === 'number' && quantity >= stockQuantity ? (
        <span id={`stock-status-${productId}`} className="ml-2 text-[10px] text-orange-600" role="status" aria-live="polite">
          Máximo {stockQuantity}
        </span>
      ) : null}
    </div>
  );
}