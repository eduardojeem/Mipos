'use client';

import React, { useState } from 'react';
import { FileText, Download, X, CheckCircle2, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface ExportConfig {
  columns: {
    sku: boolean;
    name: boolean;
    category: boolean;
    salePrice: boolean;
    costPrice: boolean;
    margin: boolean;
    stock: boolean;
    visibility: boolean;
    status: boolean;
    images: boolean;
    description: boolean;
    brand: boolean;
  };
  includeStats: boolean;
  format: 'pdf' | 'csv';
}

interface ExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: ExportConfig) => Promise<void>;
  isLoading?: boolean;
  selectedCount: number;
}

const COLUMN_DEFINITIONS = {
  sku: { label: 'SKU', description: 'Código único del producto' },
  name: { label: 'Nombre', description: 'Nombre del producto' },
  category: { label: 'Categoría', description: 'Categoría asignada' },
  salePrice: { label: 'Precio de Venta', description: 'Precio público' },
  costPrice: { label: 'Precio de Costo', description: 'Costo de adquisición' },
  margin: { label: 'Margen', description: 'Margen de ganancia %' },
  stock: { label: 'Stock', description: 'Cantidad disponible' },
  visibility: { label: 'Visibilidad', description: 'Público o Privado' },
  status: { label: 'Estado', description: 'Activo o Inactivo' },
  images: { label: 'Imágenes', description: 'Incluir en PDF (solo)' },
  description: { label: 'Descripción', description: 'Texto descriptivo' },
  brand: { label: 'Marca', description: 'Marca del producto' },
} as const;

const DEFAULT_CONFIG: ExportConfig = {
  columns: {
    sku: true,
    name: true,
    category: true,
    salePrice: true,
    costPrice: true,
    margin: true,
    stock: true,
    visibility: true,
    status: true,
    images: false,
    description: false,
    brand: false,
  },
  includeStats: true,
  format: 'pdf',
};

export function ExportConfigDialog({
  open,
  onOpenChange,
  onExport,
  isLoading = false,
  selectedCount,
}: ExportConfigDialogProps) {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_CONFIG);

  const toggleColumn = (column: keyof ExportConfig['columns']) => {
    setConfig((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [column]: !prev.columns[column],
      },
    }));
  };

  const enabledCount = Object.values(config.columns).filter(Boolean).length;
  const format = config.format;

  const handleExport = async () => {
    await onExport(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurar Exportación
          </DialogTitle>
          <DialogDescription>
            Selecciona qué columnas deseas incluir en {format === 'pdf' ? 'el PDF' : 'el CSV'}
            {selectedCount > 0 && ` (${selectedCount} producto${selectedCount !== 1 ? 's' : ''} seleccionado${selectedCount !== 1 ? 's' : ''})`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">Columnas</TabsTrigger>
            <TabsTrigger value="options">Opciones</TabsTrigger>
          </TabsList>

          {/* COLUMNAS */}
          <TabsContent value="columns" className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Habilitadas: <strong>{enabledCount}</strong> de <strong>{Object.keys(config.columns).length}</strong> columnas
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.entries(COLUMN_DEFINITIONS) as Array<[keyof typeof COLUMN_DEFINITIONS, typeof COLUMN_DEFINITIONS[keyof typeof COLUMN_DEFINITIONS]]>).map(
                  ([key, { label, description }]) => {
                    // Ocul​tar 'images' para CSV
                    if (format === 'csv' && key === 'images') return null;

                    const isEnabled = config.columns[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleColumn(key)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all',
                          isEnabled
                            ? 'border-primary bg-primary/5'
                            : 'border-border/40 bg-card hover:border-border/60 hover:bg-muted/20'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isEnabled ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium',
                            isEnabled ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {description}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Quick presets */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Presets rápidos:</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig((prev) => ({
                    ...prev,
                    columns: {
                      sku: true,
                      name: true,
                      category: true,
                      salePrice: true,
                      costPrice: true,
                      margin: true,
                      stock: true,
                      visibility: true,
                      status: true,
                      images: false,
                      description: false,
                      brand: false,
                    },
                  }))}
                  className="text-xs"
                >
                  Esencial
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig((prev) => ({
                    ...prev,
                    columns: {
                      sku: true,
                      name: true,
                      category: true,
                      salePrice: true,
                      costPrice: true,
                      margin: true,
                      stock: true,
                      visibility: true,
                      status: true,
                      images: false,
                      description: true,
                      brand: true,
                    },
                  }))}
                  className="text-xs"
                >
                  Completo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig((prev) => ({
                    ...prev,
                    columns: Object.fromEntries(
                      Object.keys(prev.columns).map((k) => [k, false])
                    ) as ExportConfig['columns'],
                  }))}
                  className="text-xs"
                >
                  Vaciar
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* OPCIONES */}
          <TabsContent value="options" className="space-y-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <h4 className="text-sm font-semibold mb-3">Configuración General</h4>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeStats}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          includeStats: e.target.checked,
                        }))
                      }
                      className="rounded border-border"
                    />
                    <div>
                      <p className="text-sm font-medium">Incluir resumen estadístico</p>
                      <p className="text-xs text-muted-foreground">
                        {format === 'pdf' ? 'Muestra total, stock, valor en PDF' : 'Solo disponible en PDF'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {format === 'pdf' && (
                <div className="rounded-lg border border-border/60 bg-card p-4">
                  <h4 className="text-sm font-semibold mb-3">Vista Previa PDF</h4>
                  <div className="bg-muted/40 rounded p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>📋 Encabezado con logo y fecha</span>
                    </div>
                    {config.includeStats && (
                      <div className="flex justify-between">
                        <span>📊 Resumen: {['Total', 'En Stock', 'Stock Bajo', 'Valor Total'].filter((_, i) => [0, 1, 2, 3][i]).length} cards</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>📄 Tabla con {enabledCount} columnas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📑 Footer con numeración de páginas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading || enabledCount === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isLoading ? 'Exportando…' : `Descargar ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
