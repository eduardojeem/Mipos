'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, X } from 'lucide-react';
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

const DEFAULT_PLAN: Plan = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  currency: 'PYG',
  trial_days: 0,
  is_active: true,
  features: [],
  limits: {
    maxUsers: 5,
    maxProducts: 100,
    maxTransactionsPerMonth: 1000,
    maxLocations: 1,
  },
};

function toSafeInteger(value: string | number, fallback = 0, allowUnlimited = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const integer = Math.trunc(parsed);
  if (allowUnlimited && integer === -1) return -1;
  return Math.max(0, integer);
}

function featureLabel(feature: Plan['features'][number]) {
  return typeof feature === 'string' ? feature : feature.name;
}

export function PlanModal({ isOpen, onClose, onSave, plan }: PlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<Plan>(DEFAULT_PLAN);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        ...DEFAULT_PLAN,
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        limits: {
          ...DEFAULT_PLAN.limits,
          ...(plan.limits || {}),
        },
      });
    } else {
      setFormData(DEFAULT_PLAN);
    }
    setActiveTab('general');
    setErrors({});
    setNewFeature('');
  }, [plan, isOpen]);

  const currencyUpper = useMemo(() => String(formData.currency || 'PYG').toUpperCase(), [formData.currency]);

  const setLimit = (key: keyof Plan['limits'], value: string) => {
    setFormData((current) => ({
      ...current,
      limits: {
        ...current.limits,
        [key]: toSafeInteger(value, current.limits[key], true),
      },
    }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const name = String(formData.name || '').trim();
    const slug = String(formData.slug || '').trim();
    const priceMonthly = Number(formData.price_monthly);
    const priceYearly = Number(formData.price_yearly);
    const trialDays = Number(formData.trial_days);

    if (!name) nextErrors.name = 'El nombre es requerido.';
    if (!plan?.id) {
      if (!slug) nextErrors.slug = 'El slug es requerido.';
      if (slug && !/^[A-Za-z0-9_-]+$/.test(slug)) nextErrors.slug = 'Usa solo letras, numeros, guiones y _.';
    }
    if (!Number.isFinite(priceMonthly) || priceMonthly < 0) nextErrors.price_monthly = 'Precio mensual invalido.';
    if (!Number.isFinite(priceYearly) || priceYearly < 0) nextErrors.price_yearly = 'Precio anual invalido.';
    if (Number.isFinite(priceMonthly) && Number.isFinite(priceYearly) && priceYearly > priceMonthly * 12) {
      nextErrors.price_yearly = 'El anual no puede superar 12 meses del mensual.';
    }
    if (!Number.isFinite(trialDays) || trialDays < 0) nextErrors.trial_days = 'Dias de prueba invalidos.';

    Object.entries(formData.limits).forEach(([key, value]) => {
      if (!Number.isFinite(value)) nextErrors[key] = 'Limite invalido.';
      if (value < -1) nextErrors[key] = 'Usa -1 para ilimitado o un numero positivo.';
    });

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error('Revisa el formulario', { description: 'Hay campos invalidos o incompletos.' });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/superadmin/plans', {
        method: plan?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan?.id ? { ...formData, id: plan.id } : formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el plan');
      }

      toast.success(plan?.id ? 'Plan actualizado' : 'Plan creado');
      onSave();
      onClose();
    } catch (error) {
      toast.error('No se pudo guardar', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    const name = newFeature.trim();
    if (!name) return;
    setFormData((current) => ({
      ...current,
      features: [...current.features, { name, included: true }],
    }));
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setFormData((current) => ({
      ...current,
      features: current.features.filter((_, featureIndex) => featureIndex !== index),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar plan' : 'Crear plan'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="pricing">Precios</TabsTrigger>
              <TabsTrigger value="limits">Limites</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Nombre</Label>
                  <Input
                    id="plan-name"
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Professional"
                  />
                  {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-slug">Slug</Label>
                  <Input
                    id="plan-slug"
                    value={formData.slug}
                    onChange={(event) => setFormData((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
                    placeholder="professional"
                    disabled={Boolean(plan?.id)}
                  />
                  {errors.slug && <p className="text-xs text-rose-600">{errors.slug}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-description">Descripcion</Label>
                <Textarea
                  id="plan-description"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  placeholder="Describe para que tipo de cliente sirve este plan."
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <Label>Estado del plan</Label>
                  <p className="text-sm text-slate-500">Los planes inactivos no deberian estar disponibles para nuevas altas.</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_active: checked }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="price-monthly">Mensual</Label>
                  <Input
                    id="price-monthly"
                    type="number"
                    value={formData.price_monthly}
                    onChange={(event) => setFormData((current) => ({ ...current, price_monthly: Number(event.target.value || 0) }))}
                  />
                  {errors.price_monthly && <p className="text-xs text-rose-600">{errors.price_monthly}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-yearly">Anual</Label>
                  <Input
                    id="price-yearly"
                    type="number"
                    value={formData.price_yearly}
                    onChange={(event) => setFormData((current) => ({ ...current, price_yearly: Number(event.target.value || 0) }))}
                  />
                  {errors.price_yearly && <p className="text-xs text-rose-600">{errors.price_yearly}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={currencyUpper} onValueChange={(value) => setFormData((current) => ({ ...current, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYG">PYG</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trial-days">Trial dias</Label>
                  <Input
                    id="trial-days"
                    type="number"
                    value={formData.trial_days}
                    onChange={(event) => setFormData((current) => ({ ...current, trial_days: toSafeInteger(event.target.value, current.trial_days) }))}
                  />
                  {errors.trial_days && <p className="text-xs text-rose-600">{errors.trial_days}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 pt-4">
              <p className="text-sm text-slate-500">Usa -1 para marcar un recurso como ilimitado.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['maxUsers', 'Usuarios'],
                  ['maxProducts', 'Productos'],
                  ['maxTransactionsPerMonth', 'Ventas/mes'],
                  ['maxLocations', 'Sucursales'],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      value={formData.limits[key as keyof Plan['limits']]}
                      onChange={(event) => setLimit(key as keyof Plan['limits'], event.target.value)}
                    />
                    {errors[key] && <p className="text-xs text-rose-600">{errors[key]}</p>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 pt-4">
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(event) => setNewFeature(event.target.value)}
                  placeholder="Ej: multi_branch"
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    addFeature();
                  }}
                />
                <Button type="button" variant="outline" onClick={addFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-md border p-3">
                {formData.features.length === 0 ? (
                  <p className="text-sm text-slate-500">Todavia no hay features cargadas.</p>
                ) : (
                  formData.features.map((feature, index) => (
                    <Badge key={`${featureLabel(feature)}-${index}`} variant="secondary" className="gap-1 rounded-md pl-2 pr-1">
                      {featureLabel(feature)}
                      <button
                        type="button"
                        className="rounded-sm p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? (
                'Guardando...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
