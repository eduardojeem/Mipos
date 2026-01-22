import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface ItemWithIva {
  product_id: string;
  subtotal_without_iva?: number;
  iva_amount?: number;
  iva_rate?: number;
  total: number;
}

interface CartItemIvaDetailsProps {
  item: ItemWithIva;
  expanded: boolean;
  onToggle: () => void;
}

export function CartItemIvaDetails({ item, expanded, onToggle }: CartItemIvaDetailsProps) {
  return (
    <div className="mt-2" aria-live="polite" aria-atomic="true">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          aria-expanded={expanded}
          aria-controls={`iva-details-${item.product_id}`}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 rounded px-1"
        >
          <Badge variant="secondary" className="px-2 py-1">
            IVA
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div className="text-right">
          <div className="bg-blue-100 px-3 py-2 rounded-lg shadow-sm">
            <div className="text-sm font-bold text-blue-700">
              IVA ({item.iva_rate ?? 0}%)
            </div>
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(item.iva_amount || 0)}
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div id={`iva-details-${item.product_id}`} className="mt-2" role="region" aria-label="Detalles de IVA">
          <Card className="bg-gray-50">
            <div className="p-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Subtotal sin IVA</div>
                <div className="text-sm font-semibold">{formatCurrency(item.subtotal_without_iva || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total con IVA</div>
                <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}