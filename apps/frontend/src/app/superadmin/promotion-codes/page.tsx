'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Copy,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Ticket,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/lib/toast';

type BillingCycle = 'monthly' | 'yearly';

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  currency?: string;
  is_active: boolean;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  subscription_plan?: string;
  subscription_status?: string;
};

type PromotionCode = {
  id: string;
  codePreview: string;
  label: string;
  targetPlanId: string;
  targetPlan: {
    id: string;
    name: string | null;
    slug: string | null;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
  } | null;
  billingCycle: BillingCycle;
  durationDays: number | null;
  durationMonths: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PromotionResponse = {
  success: boolean;
  data: PromotionCode[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    redemptions: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
};

type Redemption = {
  id: string;
  redeemed_at: string;
  status: 'applied' | 'failed';
  error_message: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  target_plan: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatPlan(plan: PromotionCode['targetPlan']) {
  if (!plan) return 'Plan no disponible';
  return plan.name || plan.slug || 'Plan';
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="rounded-2xl glass-card hover-lift hover-glow border-border/50 bg-background/60">
      <CardContent className="p-6">
        <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground/80">{helper}</div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminPromotionCodesPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [selectedCodeLabel, setSelectedCodeLabel] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    label: '',
    targetPlanId: '',
    billingCycle: 'monthly' as BillingCycle,
    durationDays: '',
    durationMonths: '',
    maxRedemptions: '1',
    expiresAt: '',
    code: '',
  });
  const [redeemForm, setRedeemForm] = useState({
    organizationId: '',
    code: '',
  });

  const promotionQuery = useQuery({
    queryKey: ['superadmin-promotion-codes', search],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '50' });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/superadmin/promotion-codes?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar codigos');
      return json as PromotionResponse;
    },
  });

  const redemptionsQuery = useQuery({
    queryKey: ['superadmin-promotion-redemptions', selectedCodeId],
    queryFn: async () => {
      if (!selectedCodeId) return [];
      const response = await fetch(`/api/superadmin/promotion-codes/${selectedCodeId}/redemptions`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar canjes');
      return (json.data || []) as Redemption[];
    },
    enabled: !!selectedCodeId && isTrackingModalOpen,
  });

  const plansQuery = useQuery({
    queryKey: ['superadmin-promotion-plans'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/plans?status=active&pageSize=50');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar planes');
      return (json.plans || []) as Plan[];
    },
  });

  const organizationsQuery = useQuery({
    queryKey: ['superadmin-promotion-organizations'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/organizations?pageSize=100&sortBy=name&sortOrder=asc');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar organizaciones');
      return (json.organizations || []) as Organization[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/promotion-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: createForm.label,
          targetPlanId: createForm.targetPlanId,
          billingCycle: createForm.billingCycle,
          durationDays: createForm.durationDays || null,
          durationMonths: createForm.durationMonths || null,
          maxRedemptions: createForm.maxRedemptions || null,
          expiresAt: createForm.expiresAt || null,
          code: createForm.code || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo crear el codigo');
      return json as { plainCode: string; message: string };
    },
    onSuccess: (result) => {
      setGeneratedCode(result.plainCode);
      setIsCreateModalOpen(false);
      setCreateForm((current) => ({
        ...current,
        label: '',
        code: '',
      }));
      queryClient.invalidateQueries({ queryKey: ['superadmin-promotion-codes'] });
      toast({ title: 'Codigo creado', description: 'El codigo completo se muestra una sola vez.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al crear código', description: error.message, variant: 'destructive' });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/promotion-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(redeemForm),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo canjear el codigo');
      return json as { message: string };
    },
    onSuccess: (result) => {
      setRedeemForm({ organizationId: '', code: '' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-promotion-codes'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Suscripcion sincronizada', description: result.message });
    },
    onError: (error: Error) => {
      toast({ title: 'No se pudo canjear', description: error.message, variant: 'destructive' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/superadmin/promotion-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo actualizar el codigo');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-promotion-codes'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar', description: error.message, variant: 'destructive' });
    },
  });

  const plans = plansQuery.data || [];
  const organizations = organizationsQuery.data || [];
  const codes = promotionQuery.data?.data || [];
  const summary = promotionQuery.data?.summary || { total: 0, active: 0, inactive: 0, redemptions: 0 };

  const canCreate = useMemo(() => {
    return createForm.label.trim() && createForm.targetPlanId && !createMutation.isPending;
  }, [createForm.label, createForm.targetPlanId, createMutation.isPending]);

  const canRedeem = useMemo(() => {
    return redeemForm.organizationId && redeemForm.code.trim().length >= 8 && !redeemMutation.isPending;
  }, [redeemForm.organizationId, redeemForm.code, redeemMutation.isPending]);

  return (
    <div className="space-y-6">
      
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-6 md:p-8 backdrop-blur-2xl glass-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Ticket className="h-3.5 w-3.5" />
              <span className="tracking-wide">Facturación SaaS</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Promociones por código
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Crea códigos que activan planes reales y sincronizan suscripciones, períodos y límites de forma automática.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => promotionQuery.refetch()}
              disabled={promotionQuery.isFetching}
              className="h-10 gap-2 shadow-sm bg-background/50 border-border/50 hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${promotionQuery.isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 gap-2 shadow-sm shadow-primary/20 hover-glow"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Código</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Codigos" value={String(summary.total)} helper="Total creados" />
        <SummaryCard label="Activos" value={String(summary.active)} helper="Disponibles para canje" />
        <SummaryCard label="Inactivos" value={String(summary.inactive)} helper="Pausados o cerrados" />
        <SummaryCard label="Canjes" value={String(summary.redemptions)} helper="Aplicados al sistema" />
      </div>

      {generatedCode && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Codigo generado</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="rounded bg-white px-2 py-1 text-sm font-semibold">{generatedCode}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(generatedCode);
                toast({ title: 'Codigo copiado' });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Activar suscripcion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organizacion</Label>
              <Select
                value={redeemForm.organizationId}
                onValueChange={(value) => setRedeemForm((current) => ({ ...current, organizationId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar organizacion" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input
                value={redeemForm.code}
                onChange={(event) => setRedeemForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="MIPOS-XXXX-XXXX-XXXX"
              />
            </div>
            <Button className="w-full" onClick={() => redeemMutation.mutate()} disabled={!canRedeem}>
              {redeemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sincronizar suscripcion
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-border/50 glass-card">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Código</DialogTitle>
            <DialogDescription>
              Configura los parámetros del código promocional. Los campos opcionales pueden dejarse en blanco.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Datos Básicos</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre interno</Label>
                  <Input
                    value={createForm.label}
                    onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Ej. Lanzamiento junio"
                  />
                  <p className="text-[10px] text-muted-foreground/80">Solo visible para administradores.</p>
                </div>
                <div className="space-y-2">
                  <Label>Código manual</Label>
                  <Input
                    value={createForm.code}
                    onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))}
                    placeholder="Opcional (Ej. VERANO)"
                  />
                  <p className="text-[10px] text-muted-foreground/80">Dejar en blanco para autogenerar.</p>
                </div>
                <div className="space-y-2">
                  <Label>Plan del sistema</Label>
                  <Select
                    value={createForm.targetPlanId}
                    onValueChange={(value) => setCreateForm((current) => ({ ...current, targetPlanId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name || plan.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ciclo</Label>
                  <Select
                    value={createForm.billingCycle}
                    onValueChange={(value: BillingCycle) => setCreateForm((current) => ({ ...current, billingCycle: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground/80">Frecuencia de renovación del plan.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Reglas y Límites</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Canjes máximos</Label>
                  <Input
                    type="number"
                    min="1"
                    value={createForm.maxRedemptions}
                    onChange={(event) => setCreateForm((current) => ({ ...current, maxRedemptions: event.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground/80">Veces que se puede usar en total.</p>
                </div>
                <div className="space-y-2">
                  <Label>Vence</Label>
                  <Input
                    type="datetime-local"
                    value={createForm.expiresAt}
                    onChange={(event) => setCreateForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground/80">Fecha tope para canjear (opcional).</p>
                </div>
                <div className="space-y-2">
                  <Label>Duración en días</Label>
                  <Input
                    type="number"
                    min="1"
                    value={createForm.durationDays}
                    onChange={(event) => setCreateForm((current) => ({ ...current, durationDays: event.target.value, durationMonths: '' }))}
                    placeholder="Opcional"
                  />
                  <p className="text-[10px] text-muted-foreground/80">Días que dura el plan gratis.</p>
                </div>
                <div className="space-y-2">
                  <Label>Duración en meses</Label>
                  <Input
                    type="number"
                    min="1"
                    value={createForm.durationMonths}
                    onChange={(event) => setCreateForm((current) => ({ ...current, durationMonths: event.target.value, durationDays: '' }))}
                    placeholder="Opcional"
                  />
                  <p className="text-[10px] text-muted-foreground/80">Meses que dura el plan gratis.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!canCreate}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Promoción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Codigos existentes</CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre"
            />
          </div>
        </CardHeader>
        <CardContent>
          {promotionQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando codigos
            </div>
          ) : codes.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              No hay codigos para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Promocion</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono text-xs">{code.codePreview}</TableCell>
                      <TableCell>
                        <div className="font-medium">{code.label}</div>
                        <div className="text-xs text-slate-500">{code.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}</div>
                      </TableCell>
                      <TableCell>{formatPlan(code.targetPlan)}</TableCell>
                      <TableCell>
                        {code.redemptionCount}
                        {code.maxRedemptions ? ` / ${code.maxRedemptions}` : ' / ilimitado'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>Desde: {formatDate(code.startsAt)}</div>
                        <div>Hasta: {formatDate(code.expiresAt)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={code.isActive ? 'default' : 'secondary'}>
                          {code.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Ver canjes"
                            onClick={() => {
                              setSelectedCodeId(code.id);
                              setSelectedCodeLabel(code.label);
                              setIsTrackingModalOpen(true);
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: code.id, isActive: !code.isActive })}
                          >
                            {code.isActive ? 'Pausar' : 'Activar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
        <DialogContent className="sm:max-w-[700px] border-border/50 glass-card">
          <DialogHeader>
            <DialogTitle>Seguimiento de Canjes</DialogTitle>
            <DialogDescription>
              Historial de uso del código promocional <span className="font-semibold text-foreground">{selectedCodeLabel}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {redemptionsQuery.isLoading ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando historial...
              </div>
            ) : redemptionsQuery.data?.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
                Nadie ha utilizado este código todavía.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto rounded-md border border-border/50">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Organización</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Plan Asignado</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptionsQuery.data?.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{redemption.organization?.name}</div>
                          <div className="text-xs text-muted-foreground">/{redemption.organization?.slug}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(redemption.redeemed_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {redemption.target_plan ? (redemption.target_plan.name || redemption.target_plan.slug) : 'No especificado'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={redemption.status === 'applied' ? 'default' : 'destructive'} className={redemption.status === 'applied' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                            {redemption.status === 'applied' ? 'Exitoso' : 'Fallido'}
                          </Badge>
                          {redemption.error_message && (
                            <div className="mt-1 text-[10px] text-red-500 max-w-[120px] truncate" title={redemption.error_message}>
                              {redemption.error_message}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
