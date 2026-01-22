'use client';

import { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical, Calendar, Percent, Eye, Power, Package, ExternalLink, Copy, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-helpers';
import { PromotionDetailsDialog } from './PromotionDetailsDialog';
import { EditPromotionDialog } from './EditPromotionDialog';
import { DuplicatePromotionDialog } from './DuplicatePromotionDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import api from '@/lib/api';

interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount?: number;
  usageLimit?: number;
  applicableProducts?: any[];
}

interface PromotionCardProps {
  promotion: Promotion;
  productCount?: number; // ✅ Ahora viene como prop
  onRefresh: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const PromotionCard = memo(function PromotionCard({ 
  promotion, 
  productCount = 0, // ✅ Default value
  onRefresh, 
  isSelected = false, 
  onToggleSelect 
}: PromotionCardProps) {
  const { toast } = useToast();
  
  // ✅ Debug log
  console.log(`[PromotionCard] ${promotion.name} - productCount:`, productCount);
  
  // ✅ Loading states consolidados
  const [loadingStates, setLoadingStates] = useState({
    toggling: false,
    deleting: false,
  });
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // ✅ Nuevo estado

  const getStatus = () => {
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);

    if (!promotion.isActive) return 'inactive';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';
    return 'active';
  };

  const status = getStatus();

  const statusConfig = {
    active: {
      label: 'Activa',
      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800',
    },
    scheduled: {
      label: 'Programada',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    },
    expired: {
      label: 'Expirada',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800',
    },
    inactive: {
      label: 'Inactiva',
      className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
  };

  // ✅ useCallback para evitar re-creación
  const handleToggleStatus = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, toggling: true }));
      
      await api.patch(`/promotions/${promotion.id}/status`, {
        isActive: !promotion.isActive,
      });
      
      toast({
        title: 'Estado actualizado',
        description: `Promoción ${!promotion.isActive ? 'activada' : 'desactivada'} exitosamente`,
      });
      
      onRefresh();
    } catch (error: any) {
      console.error(`Failed to toggle promotion ${promotion.id}:`, error);
      
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, toggling: false }));
    }
  }, [promotion.id, promotion.isActive, onRefresh, toast]);

  // ✅ Función de eliminación mejorada
  const handleDelete = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, deleting: true }));
      
      await api.delete(`/promotions/${promotion.id}`);
      
      toast({
        title: 'Promoción eliminada',
        description: 'La promoción se ha eliminado exitosamente',
      });
      
      onRefresh();
    } catch (error: any) {
      console.error(`Failed to delete promotion ${promotion.id}:`, error);
      
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: false }));
      setIsDeleteDialogOpen(false);
    }
  }, [promotion.id, onRefresh, toast]);

  return (
    <Card className={`group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-slate-200 dark:border-slate-800 overflow-hidden ${
      isSelected ? 'ring-2 ring-violet-600 dark:ring-violet-400' : ''
    }`}>
      <div className={`h-2 bg-gradient-to-r ${
        status === 'active' ? 'from-green-500 to-emerald-500' :
        status === 'scheduled' ? 'from-yellow-500 to-orange-500' :
        status === 'expired' ? 'from-red-500 to-pink-500' :
        'from-slate-400 to-slate-500'
      }`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Checkbox */}
          {onToggleSelect && (
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(promotion.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate mb-2">
              {promotion.name}
            </h3>
            <Badge className={statusConfig[status].className}>
              {statusConfig[status].label}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Más opciones"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={handleToggleStatus} 
                disabled={loadingStates.toggling}
              >
                {loadingStates.toggling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    {promotion.isActive ? 'Desactivar' : 'Activar'}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDuplicateOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600"
                disabled={loadingStates.deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
          {promotion.description}
        </p>

        <div className="flex items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/30">
              <Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-500">Descuento</p>
              <p className="font-bold text-slate-900 dark:text-white">
                {promotion.discountType === 'PERCENTAGE'
                  ? `${promotion.discountValue}%`
                  : formatCurrency(promotion.discountValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-500">Vigencia</p>
              <p className="font-medium text-slate-900 dark:text-white text-xs">
                {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Product Count */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/30">
              <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-500">Productos</p>
              <p className="font-bold text-slate-900 dark:text-white">
                {productCount} asociado{productCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {promotion.usageLimit && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Usos</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {promotion.usageCount || 0} / {promotion.usageLimit}
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                style={{
                  width: `${Math.min(((promotion.usageCount || 0) / promotion.usageLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDetailsOpen(true)}
            className="flex-1 gap-2"
          >
            <Eye className="h-4 w-4" />
            Ver Detalles
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/offers?promotion=${promotion.id}`, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Details Dialog */}
      <PromotionDetailsDialog
        promotion={promotion}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* Edit Dialog */}
      <EditPromotionDialog
        promotion={promotion}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={() => {
          onRefresh();
          toast({
            title: 'Promoción actualizada',
            description: 'Los cambios se han guardado exitosamente',
          });
        }}
      />

      {/* Duplicate Dialog */}
      <DuplicatePromotionDialog
        promotion={promotion}
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        onSuccess={onRefresh}
      />

      {/* ✅ Dialog de confirmación mejorado */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        promotionName={promotion.name}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        loading={loadingStates.deleting}
        details={[
          `${productCount} producto${productCount !== 1 ? 's' : ''} asociado${productCount !== 1 ? 's' : ''}`,
          `${promotion.usageCount || 0} uso${(promotion.usageCount || 0) !== 1 ? 's' : ''} registrado${(promotion.usageCount || 0) !== 1 ? 's' : ''}`
        ]}
      />
    </Card>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparación optimizada para memo
  // Solo re-renderizar si cambian estas props críticas
  return (
    prevProps.promotion.id === nextProps.promotion.id &&
    prevProps.promotion.isActive === nextProps.promotion.isActive &&
    prevProps.promotion.name === nextProps.promotion.name &&
    prevProps.promotion.usageCount === nextProps.promotion.usageCount &&
    prevProps.productCount === nextProps.productCount &&
    prevProps.isSelected === nextProps.isSelected
  );
});
