'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessConfigData } from '@/contexts/BusinessConfigContext';

type Item = { id: string; description: string; quantity: number; unitPrice: number };

export function PosInvoiceItemsCard({
  items,
  onItemsChange,
  discount,
  onDiscountChange,
  tax,
  onTaxChange,
  notes,
  onNotesChange,
  isDraft,
}: {
  items: Item[];
  onItemsChange: (items: Item[]) => void;
  discount: number;
  onDiscountChange: (value: number) => void;
  tax: number;
  onTaxChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  isDraft: boolean;
}) {
  const { config } = useBusinessConfigData();
  const taxEnabled = (config as any)?.storeSettings?.taxEnabled !== false;

  const addItem = () => {
    onItemsChange([...items, { id: `${Date.now()}-${items.length}`, description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((it) => it.id !== id));
  };

  const updateItem = (id: string, patch: Partial<Omit<Item, 'id'>>) => {
    onItemsChange(
      items.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        next.quantity = Number(next.quantity);
        next.unitPrice = Number(next.unitPrice);
        return next;
      })
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ítems</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={it.description}
                  onChange={(e) => updateItem(it.id, { description: e.target.value })}
                  disabled={!isDraft}
                />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Cantidad</Label>
                <Input
                  type="number"
                  value={it.quantity}
                  onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value || 0) })}
                  disabled={!isDraft}
                />
              </div>
              <div className="col-span-6 space-y-1">
                <Label className="text-xs">Precio</Label>
                <Input
                  type="number"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value || 0) })}
                  disabled={!isDraft}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(it.id)}
                  disabled={!isDraft || items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addItem} disabled={!isDraft}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar ítem
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Descuento</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => onDiscountChange(Number(e.target.value || 0))}
              disabled={!isDraft}
            />
          </div>
          <div className="space-y-2">
            <Label>Impuesto</Label>
            <Input
              type="number"
              value={tax}
              onChange={(e) => onTaxChange(Number(e.target.value || 0))}
              disabled={!isDraft || !taxEnabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={3} />
        </div>
      </CardContent>
    </Card>
  );
}

