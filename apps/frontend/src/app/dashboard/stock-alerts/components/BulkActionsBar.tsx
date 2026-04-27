'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { Download, SlidersHorizontal, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  thresholdValue: number;
  onThresholdChange: (value: number) => void;
  onApplyThreshold: () => void;
  onExportSelection: () => void;
  onClearSelection: () => void;
  isSubmitting?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  thresholdValue,
  onThresholdChange,
  onApplyThreshold,
  onExportSelection,
  onClearSelection,
  isSubmitting = false,
}: BulkActionsBarProps) {
  return (
    <Card className="border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/30">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium">
            {selectedCount} producto{selectedCount === 1 ? '' : 's'} seleccionado{selectedCount === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-muted-foreground">
            Aplica un minimo comun o exporta la seleccion actual.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PermissionGuard permission="stock-alerts.edit">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={thresholdValue}
                onChange={(event) => onThresholdChange(Math.max(0, Number(event.target.value || 0)))}
                className="w-24"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onApplyThreshold}
                disabled={isSubmitting}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Aplicar umbral
              </Button>
            </div>
          </PermissionGuard>

          <PermissionGuard permission="stock-alerts.export">
            <Button variant="outline" size="sm" onClick={onExportSelection}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </PermissionGuard>

          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
