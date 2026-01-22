'use client';

import { useState } from 'react';
import { 
  Trash2, 
  Edit, 
  Tag, 
  DollarSign, 
  Package, 
  CheckSquare, 
  Square,
  MoreHorizontal,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Product, Category } from '@/types';

interface BatchActionsProps {
  products: Product[];
  categories: Category[];
  selectedProducts: string[];
  onSelectionChange: (productIds: string[]) => void;
  onBatchUpdate: (updates: BatchUpdateData) => Promise<void>;
  onBatchDelete: (productIds: string[]) => Promise<void>;
  className?: string;
}

interface BatchUpdateData {
  productIds: string[];
  updates: {
    category_id?: string;
    sale_price?: number;
    cost_price?: number;
    discount_percentage?: number;
    min_stock?: number;
  };
}

interface BatchDialogState {
  isOpen: boolean;
  type: 'price' | 'category' | 'stock' | 'delete' | null;
  data: {
    newPrice?: number;
    priceType?: 'sale' | 'cost';
    categoryId?: string;
    minStock?: number;
    discountPercentage?: number;
  };
}

export default function BatchActions({
  products,
  categories,
  selectedProducts,
  onSelectionChange,
  onBatchUpdate,
  onBatchDelete,
  className = ''
}: BatchActionsProps) {
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<BatchDialogState>({
    isOpen: false,
    type: null,
    data: {}
  });
  const [isLoading, setIsLoading] = useState(false);

  const selectedCount = selectedProducts.length;
  const allSelected = selectedCount === products.length && products.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < products.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const openDialog = (type: BatchDialogState['type'], initialData = {}) => {
    setDialogState({
      isOpen: true,
      type,
      data: initialData
    });
  };

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      type: null,
      data: {}
    });
  };

  const handleBatchAction = async () => {
    if (selectedCount === 0) return;

    setIsLoading(true);
    try {
      const { type, data } = dialogState;

      if (type === 'delete') {
        await onBatchDelete(selectedProducts);
        toast({
          title: 'Productos eliminados',
          description: `Se eliminaron ${selectedCount} productos exitosamente.`
        });
      } else {
        const updates: BatchUpdateData['updates'] = {};

        if (type === 'price') {
          if (data.priceType === 'sale' && data.newPrice) {
            updates.sale_price = data.newPrice;
          } else if (data.priceType === 'cost' && data.newPrice) {
            updates.cost_price = data.newPrice;
          }
        } else if (type === 'category' && data.categoryId) {
          updates.category_id = data.categoryId;
        } else if (type === 'stock') {
          if (data.minStock !== undefined) {
            updates.min_stock = data.minStock;
          }
          if (data.discountPercentage !== undefined) {
            updates.discount_percentage = data.discountPercentage;
          }
        }

        await onBatchUpdate({
          productIds: selectedProducts,
          updates
        });

        toast({
          title: 'Productos actualizados',
          description: `Se actualizaron ${selectedCount} productos exitosamente.`
        });
      }

      onSelectionChange([]);
      closeDialog();
    } catch (error: any) {
      console.error('Error in batch action:', error);
      toast({
        title: 'Error en acción masiva',
        description: error?.message || 'No se pudo completar la acción.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportSelectedProducts = () => {
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    const csvContent = [
      ['Nombre', 'SKU', 'Categoría', 'Precio Venta', 'Precio Costo', 'Stock', 'Stock Mínimo'].join(','),
      ...selectedProductsData.map(product => [
        `"${product.name}"`,
        `"${product.sku || ''}"`,
        `"${categories.find(c => c.id === product.category_id)?.name || ''}"`,
        product.sale_price,
        product.cost_price || 0,
        product.stock_quantity,
        product.min_stock || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `productos_seleccionados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportación completada',
      description: `Se exportaron ${selectedCount} productos a CSV.`
    });
  };

  if (selectedCount === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Checkbox
          checked={someSelected && !allSelected ? 'indeterminate' : allSelected}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          Seleccionar todos ({products.length})
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={someSelected && !allSelected ? 'indeterminate' : allSelected}
            onCheckedChange={handleSelectAll}
          />
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportSelectedProducts}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <Edit className="h-4 w-4 mr-2" />
                Editar
                <MoreHorizontal className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Acciones de edición</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openDialog('price')}>
                <DollarSign className="h-4 w-4 mr-2" />
                Actualizar precios
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDialog('category')}>
                <Tag className="h-4 w-4 mr-2" />
                Cambiar categoría
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDialog('stock')}>
                <Package className="h-4 w-4 mr-2" />
                Ajustar inventario
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDialog('delete')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Dialogs for batch actions */}
      <Dialog open={dialogState.isOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'delete' && 'Eliminar productos'}
              {dialogState.type === 'price' && 'Actualizar precios'}
              {dialogState.type === 'category' && 'Cambiar categoría'}
              {dialogState.type === 'stock' && 'Ajustar inventario'}
            </DialogTitle>
            <DialogDescription>
              Esta acción afectará a {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogState.type === 'delete' && (
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que quieres eliminar estos productos? Esta acción no se puede deshacer.
              </p>
            )}

            {dialogState.type === 'price' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="price-type">Tipo de precio</Label>
                  <Select
                    value={dialogState.data.priceType || 'sale'}
                    onValueChange={(value: 'sale' | 'cost') => 
                      setDialogState(prev => ({
                        ...prev,
                        data: { ...prev.data, priceType: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Precio de venta</SelectItem>
                      <SelectItem value="cost">Precio de costo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-price">Nuevo precio</Label>
                  <Input
                    id="new-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={dialogState.data.newPrice || ''}
                    onChange={(e) => 
                      setDialogState(prev => ({
                        ...prev,
                        data: { ...prev.data, newPrice: parseFloat(e.target.value) || 0 }
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {dialogState.type === 'category' && (
              <div>
                <Label htmlFor="category">Nueva categoría</Label>
                <Select
                  value={dialogState.data.categoryId || ''}
                  onValueChange={(value) => 
                    setDialogState(prev => ({
                      ...prev,
                      data: { ...prev.data, categoryId: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogState.type === 'stock' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="min-stock">Stock mínimo</Label>
                  <Input
                    id="min-stock"
                    type="number"
                    min="0"
                    placeholder="Stock mínimo"
                    value={dialogState.data.minStock || ''}
                    onChange={(e) => 
                      setDialogState(prev => ({
                        ...prev,
                        data: { ...prev.data, minStock: parseInt(e.target.value) || 0 }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Descuento (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Porcentaje de descuento"
                    value={dialogState.data.discountPercentage || ''}
                    onChange={(e) => 
                      setDialogState(prev => ({
                        ...prev,
                        data: { ...prev.data, discountPercentage: parseFloat(e.target.value) || 0 }
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBatchAction} 
              disabled={isLoading}
              variant={dialogState.type === 'delete' ? 'destructive' : 'default'}
            >
              {isLoading ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}