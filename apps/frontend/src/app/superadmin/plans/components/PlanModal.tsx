'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Save, HelpCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface Plan {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  features: (string | { name: string; included: boolean })[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxTransactionsPerMonth: number;
    maxLocations: number;
  };
  is_active: boolean;
}

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  plan?: Plan | null;
}

export function PlanModal({ isOpen, onClose, onSave, plan }: PlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Plan>({
    name: '',
    slug: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'USD',
    trial_days: 0,
    is_active: true,
    features: [],
    limits: {
      maxUsers: 5,
      maxProducts: 100,
      maxTransactionsPerMonth: 1000,
      maxLocations: 1,
    },
  });

  const [newFeature, setNewFeature] = useState({ name: '', included: true });

  useEffect(() => {
    if (plan) {
      setFormData({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        limits: plan.limits || {
          maxUsers: 5,
          maxProducts: 100,
          maxTransactionsPerMonth: 1000,
          maxLocations: 1,
        },
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        currency: 'USD',
        trial_days: 0,
        is_active: true,
        features: [],
        limits: {
          maxUsers: 5,
          maxProducts: 100,
          maxTransactionsPerMonth: 1000,
          maxLocations: 1,
        },
      });
    }
  }, [plan, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = '/api/superadmin/plans';
      const method = plan?.id ? 'PUT' : 'POST';
      const body = plan?.id ? { ...formData, id: plan.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el plan');
      }

      toast.success(plan?.id ? 'Plan actualizado' : 'Plan creado');
      onSave();
      onClose();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (!newFeature.name.trim()) return;
    setFormData({
      ...formData,
      features: [...formData.features, newFeature],
    });
    setNewFeature({ name: '', included: true });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {plan ? 'Editar Plan' : 'Crear Nuevo Plan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Plan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Professional"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (Identificador)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toUpperCase() })}
                placeholder="Ej: PROFESSIONAL"
                required
                disabled={!!plan}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe los beneficios del plan..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_monthly">Precio Mensual ($)</Label>
              <Input
                id="price_monthly"
                type="number"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_yearly">Precio Anual ($)</Label>
              <Input
                id="price_yearly"
                type="number"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial_days">Días de Prueba</Label>
              <Input
                id="trial_days"
                type="number"
                value={formData.trial_days}
                onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Límites del Plan
              <HelpCircle className="h-4 w-4 text-slate-400" />
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <Label>Máx. Usuarios (-1 para ilimitado)</Label>
                <Input
                  type="number"
                  value={formData.limits.maxUsers}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxUsers: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. Productos</Label>
                <Input
                  type="number"
                  value={formData.limits.maxProducts}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxProducts: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Transacciones/Mes</Label>
                <Input
                  type="number"
                  value={formData.limits.maxTransactionsPerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxTransactionsPerMonth: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Locales</Label>
                <Input
                  type="number"
                  value={formData.limits.maxLocations}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxLocations: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Características Incluidas</Label>
            <div className="flex gap-2">
              <Input
                value={newFeature.name}
                onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                placeholder="Nueva característica..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" variant="outline" onClick={addFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.features.map((feature, idx) => (
                <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 gap-1 group">
                  {typeof feature === 'string' ? feature : feature.name}
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <div className="space-y-0.5">
              <Label>Estado del Plan</Label>
              <p className="text-sm text-muted-foreground">Activar o desactivar este plan para nuevos registros</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white min-w-[120px]"
            >
              {loading ? 'Guardando...' : <><Save className="h-4 w-4 mr-2" /> Guardar Plan</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
