'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit, 
  X, 
  Loader2,
  Eye,
  EyeOff,
  Tag,
  Package
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkOperationsBarProps {
  selectedCount: number;
  onBulkDelete: () => Promise<boolean>;
  onBulkUpdate: (updates: any) => Promise<boolean>;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

interface BulkUpdateData {
  category_id?: string;
  is_active?: boolean;
  min_stock?: number;
  discount_percentage?: number;
}

export default function BulkOperationsBar({
  selectedCount,
  onBulkDelete,
  onBulkUpdate,
  onClearSelection,
  isProcessing = false
}: BulkOperationsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [updateData, setUpdateData] = useState<BulkUpdateData>({});
  const [updateFields, setUpdateFields] = useState<Set<string>>(new Set());

  if (selectedCount === 0) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await onBulkDelete();
      if (success) {
        setShowDeleteDialog(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async () => {
    if (updateFields.size === 0) return;
    
    setIsUpdating(true);
    try {
      const updates: any = {};
      updateFields.forEach(field => {
        if (updateData[field as keyof BulkUpdateData] !== undefined) {
          updates[field] = updateData[field as keyof BulkUpdateData];
        }
      });
      
      const success = await onBulkUpdate(updates);
      if (success) {
        setShowUpdateDialog(false);
        setUpdateData({});
        setUpdateFields(new Set());
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleUpdateField = (field: string, checked: boolean) => {
    const newFields = new Set(updateFields);
    if (checked) {
      newFields.add(field);
    } else {
      newFields.delete(field);
    }
    setUpdateFields(newFields);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-800">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {selectedCount} producto{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Deseleccionar todo
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpdateDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar en lote
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Eliminar seleccionados
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar {selectedCount} producto{selectedCount > 1 ? 's' : ''}? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar {selectedCount} producto{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk update dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar productos en lote</DialogTitle>
            <DialogDescription>
              Selecciona los campos que quieres actualizar para {selectedCount} producto{selectedCount > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Category update */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="category"
                checked={updateFields.has('category_id')}
                onCheckedChange={(checked) => toggleUpdateField('category_id', checked as boolean)}
              />
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categoría
              </Label>
            </div>
            {updateFields.has('category_id') && (
              <Select 
                value={updateData.category_id || ''} 
                onValueChange={(value) => setUpdateData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cat1">Categoría 1</SelectItem>
                  <SelectItem value="cat2">Categoría 2</SelectItem>
                  {/* Would be populated with real categories */}
                </SelectContent>
              </Select>
            )}

            {/* Status update */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status"
                checked={updateFields.has('is_active')}
                onCheckedChange={(checked) => toggleUpdateField('is_active', checked as boolean)}
              />
              <Label htmlFor="status" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Estado
              </Label>
            </div>
            {updateFields.has('is_active') && (
              <Select 
                value={updateData.is_active?.toString() || ''} 
                onValueChange={(value) => setUpdateData(prev => ({ ...prev, is_active: value === 'true' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Min stock update */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="minStock"
                checked={updateFields.has('min_stock')}
                onCheckedChange={(checked) => toggleUpdateField('min_stock', checked as boolean)}
              />
              <Label htmlFor="minStock" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Stock mínimo
              </Label>
            </div>
            {updateFields.has('min_stock') && (
              <Input
                type="number"
                placeholder="Stock mínimo"
                value={updateData.min_stock || ''}
                onChange={(e) => setUpdateData(prev => ({ 
                  ...prev, 
                  min_stock: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            )}

            {/* Discount update */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="discount"
                checked={updateFields.has('discount_percentage')}
                onCheckedChange={(checked) => toggleUpdateField('discount_percentage', checked as boolean)}
              />
              <Label htmlFor="discount" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Descuento (%)
              </Label>
            </div>
            {updateFields.has('discount_percentage') && (
              <Input
                type="number"
                placeholder="Porcentaje de descuento"
                min="0"
                max="100"
                value={updateData.discount_percentage || ''}
                onChange={(e) => setUpdateData(prev => ({ 
                  ...prev, 
                  discount_percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
              />
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUpdateDialog(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={isUpdating || updateFields.size === 0}
              className="gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
              Actualizar {selectedCount} producto{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}