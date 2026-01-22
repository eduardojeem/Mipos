'use client';

import React, { memo } from 'react';
import { Trash2, Edit, Download, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkEdit: () => void;
  onBulkExport: () => void;
  onClearSelection: () => void;
  className?: string;
}

export const BulkActions = memo(function BulkActions({
  selectedCount,
  onBulkDelete,
  onBulkEdit,
  onBulkExport,
  onClearSelection,
  className = ''
}: BulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={className}
      >
        <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {selectedCount} seleccionados
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Acciones disponibles:
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Acciones individuales */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkExport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkEdit}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                
                {/* Menú desplegable para más acciones */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Más acciones
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onBulkEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar en lote
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onBulkExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onBulkDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar seleccionados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Botón de limpiar selección */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
});