'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Power, Calendar, Percent } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
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
}

interface PromotionListItemProps {
  promotion: Promotion;
  productCount?: number; // ✅ Nueva prop
  onRefresh: () => void;
}

export function PromotionListItem({ promotion, productCount = 0, onRefresh }: PromotionListItemProps) {
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);

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
      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
    },
    scheduled: {
      label: 'Programada',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    },
    expired: {
      label: 'Expirada',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
    },
    inactive: {
      label: 'Inactiva',
      className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
    },
  };

  const handleToggleStatus = async () => {
    try {
      setIsToggling(true);
      await api.patch(`/promotions/${promotion.id}/status`, {
        isActive: !promotion.isActive,
      });
      toast({
        title: 'Estado actualizado',
        description: `Promoción ${!promotion.isActive ? 'activada' : 'desactivada'} exitosamente`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
    
    try {
      await api.delete(`/promotions/${promotion.id}`);
      toast({
        title: 'Promoción eliminada',
        description: 'La promoción se ha eliminado exitosamente',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la promoción',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-800">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {promotion.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                  {promotion.description}
                </p>
              </div>
              <Badge className={statusConfig[status].className}>
                {statusConfig[status].label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {promotion.discountType === 'PERCENTAGE'
                    ? `${promotion.discountValue}%`
                    : formatCurrency(promotion.discountValue)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                </span>
              </div>

              {promotion.usageLimit && (
                <div className="text-slate-600 dark:text-slate-400">
                  Usos: {promotion.usageCount || 0} / {promotion.usageLimit}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={isToggling}
              className="gap-2"
              aria-label={promotion.isActive ? 'Desactivar' : 'Activar'}
            >
              <Power className="h-4 w-4" />
              {promotion.isActive ? 'Desactivar' : 'Activar'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              aria-label="Editar"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-2 text-red-600 hover:text-red-700"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
