'use client';

/**
 * Modales de acción para la sección de Lealtad:
 *  - CreateProgramModal  → crea un nuevo programa
 *  - CreateRewardModal   → crea una nueva recompensa
 *  - RedeemRewardModal   → canjea una recompensa para un cliente
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trophy, Gift, Star } from 'lucide-react';
import {
  useCreateLoyaltyProgram,
  useCreateReward,
  useRedeemReward,
  type Reward,
} from '@/hooks/use-loyalty';

// ── CreateProgramModal ─────────────────────────────────────────────────────────

interface CreateProgramFormData {
  name: string;
  description: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  pointsExpirationDays: number;
  isActive: boolean;
}

interface CreateProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProgramModal({ open, onOpenChange }: CreateProgramModalProps) {
  const mutation = useCreateLoyaltyProgram();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<CreateProgramFormData>({
      defaultValues: {
        name: '', description: '',
        pointsPerPurchase: 1, minimumPurchase: 0,
        welcomeBonus: 50, birthdayBonus: 100, referralBonus: 200,
        pointsExpirationDays: 365, isActive: true,
      },
    });

  const isActive = watch('isActive');

  const onSubmit = handleSubmit(async (data) => {
    await mutation.mutateAsync({
      name: data.name,
      description: data.description || undefined,
      pointsPerPurchase: Number(data.pointsPerPurchase),
      minimumPurchase: Number(data.minimumPurchase),
      welcomeBonus: Number(data.welcomeBonus),
      birthdayBonus: Number(data.birthdayBonus),
      referralBonus: Number(data.referralBonus),
      pointsExpirationDays: Number(data.pointsExpirationDays) || undefined,
      isActive: data.isActive,
    });
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            Nuevo Programa de Lealtad
          </DialogTitle>
          <DialogDescription>
            Crea un programa con reglas de puntos, bonos y expiración.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="prog-name">Nombre <span className="text-destructive">*</span></Label>
            <Input
              id="prog-name"
              placeholder="Ej: Club Premium"
              {...register('name', { required: 'El nombre es obligatorio' })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="prog-desc">Descripción</Label>
            <Textarea id="prog-desc" rows={2} placeholder="Descripción del programa..." {...register('description')} />
          </div>

          {/* Puntos + Mínimo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prog-pts">Puntos por compra</Label>
              <Input id="prog-pts" type="number" min={0} step={0.1}
                {...register('pointsPerPurchase', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prog-min">Compra mínima (Gs)</Label>
              <Input id="prog-min" type="number" min={0}
                {...register('minimumPurchase', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Bonos */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'welcomeBonus', label: 'Bienvenida' },
              { id: 'birthdayBonus', label: 'Cumpleaños' },
              { id: 'referralBonus', label: 'Referido' },
            ].map(({ id, label }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={`prog-${id}`} className="text-xs">{label}</Label>
                <Input id={`prog-${id}`} type="number" min={0}
                  {...register(id as keyof CreateProgramFormData, { valueAsNumber: true })} />
              </div>
            ))}
          </div>

          {/* Expiración + Activo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prog-exp">Expiración (días)</Label>
              <Input id="prog-exp" type="number" min={1} placeholder="365"
                {...register('pointsExpirationDays', { valueAsNumber: true })} />
            </div>
            <div className="flex items-end justify-between rounded-xl border bg-muted/20 px-3 py-2">
              <Label htmlFor="prog-active" className="text-sm">Activo</Label>
              <Switch id="prog-active" checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2 bg-purple-600 hover:bg-purple-700">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              Crear Programa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── CreateRewardModal ──────────────────────────────────────────────────────────

interface CreateRewardFormData {
  name: string;
  description: string;
  type: Reward['type'];
  value: number;
  pointsCost: number;
  maxRedemptions: number;
  validUntil: string;
  isActive: boolean;
}

interface CreateRewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programs: Array<{ id: string; name: string }>;
  onProgramChange?: (id: string) => void;
}

export function CreateRewardModal({
  open,
  onOpenChange,
  programId,
  programs,
  onProgramChange,
}: CreateRewardModalProps) {
  const mutation = useCreateReward();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<CreateRewardFormData>({
      defaultValues: {
        name: '', description: '', type: 'DISCOUNT_PERCENTAGE',
        value: 10, pointsCost: 100, maxRedemptions: 0, validUntil: '', isActive: true,
      },
    });

  const isActive = watch('isActive');
  const rewardType = watch('type');

  const typeLabels: Record<Reward['type'], string> = {
    DISCOUNT_PERCENTAGE: 'Descuento %',
    DISCOUNT_FIXED: 'Descuento fijo (Gs)',
    FREE_PRODUCT: 'Producto gratis',
    FREE_SHIPPING: 'Envío gratis',
    CUSTOM: 'Personalizado',
  };
  const valuePlaceholders: Partial<Record<Reward['type'], string>> = {
    DISCOUNT_PERCENTAGE: '10 (= 10%)',
    DISCOUNT_FIXED: '5000',
    FREE_PRODUCT: '0',
    FREE_SHIPPING: '0',
    CUSTOM: '0',
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!programId) return;
    await mutation.mutateAsync({
      programId,
      reward: {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        value: Number(data.value),
        pointsCost: Number(data.pointsCost),
        maxRedemptions: Number(data.maxRedemptions) || undefined,
        validUntil: data.validUntil || undefined,
        isActive: data.isActive,
      },
    });
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Nueva Recompensa
          </DialogTitle>
          <DialogDescription>
            Define qué recibe el cliente al canjear sus puntos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Programa */}
          {programs.length > 1 && (
            <div className="space-y-1.5">
              <Label>Programa</Label>
              <Select value={programId} onValueChange={onProgramChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="rew-name">Nombre <span className="text-destructive">*</span></Label>
            <Input id="rew-name" placeholder="Ej: Descuento 10% próxima compra"
              {...register('name', { required: 'Requerido' })} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="rew-desc">Descripción</Label>
            <Textarea id="rew-desc" rows={2} {...register('description')} />
          </div>

          {/* Tipo + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={rewardType} onValueChange={(v) => setValue('type', v as Reward['type'])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rew-value">Valor</Label>
              <Input id="rew-value" type="number" min={0} step={0.01}
                placeholder={valuePlaceholders[rewardType] ?? '0'}
                {...register('value', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Costo + Max */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rew-cost" className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" /> Costo (puntos)
              </Label>
              <Input id="rew-cost" type="number" min={1}
                {...register('pointsCost', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rew-max">Máx. canjes (0 = ilimitado)</Label>
              <Input id="rew-max" type="number" min={0}
                {...register('maxRedemptions', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Vencimiento + Activo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rew-exp">Válida hasta</Label>
              <Input id="rew-exp" type="date" {...register('validUntil')} />
            </div>
            <div className="flex items-end justify-between rounded-xl border bg-muted/20 px-3 py-2">
              <Label htmlFor="rew-active" className="text-sm">Activa</Label>
              <Switch id="rew-active" checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !programId}
              className="gap-2 bg-pink-600 hover:bg-pink-700">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              Crear Recompensa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── RedeemRewardModal ──────────────────────────────────────────────────────────

interface RedeemRewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  rewards: Array<{ id: string; name: string; pointsCost: number; isActive: boolean }>;
}

export function RedeemRewardModal({
  open,
  onOpenChange,
  programId,
  rewards,
}: RedeemRewardModalProps) {
  const mutation = useRedeemReward();
  const [customerId, setCustomerId] = useState('');
  const [rewardId, setRewardId] = useState('');

  const activeRewards = rewards.filter((r) => r.isActive);
  const selectedReward = activeRewards.find((r) => r.id === rewardId);

  const handleRedeem = async () => {
    if (!customerId.trim() || !rewardId || !programId) return;
    await mutation.mutateAsync({ customerId: customerId.trim(), programId, rewardId });
    setCustomerId('');
    setRewardId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Canjear Recompensa
          </DialogTitle>
          <DialogDescription>
            Ingresa el ID del cliente y selecciona la recompensa a canjear.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="redeem-customer">ID del Cliente <span className="text-destructive">*</span></Label>
            <Input
              id="redeem-customer"
              placeholder="UUID del cliente..."
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Recompensa <span className="text-destructive">*</span></Label>
            <Select value={rewardId} onValueChange={setRewardId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar recompensa..." />
              </SelectTrigger>
              <SelectContent>
                {activeRewards.length === 0 ? (
                  <SelectItem value="__none" disabled>Sin recompensas activas</SelectItem>
                ) : (
                  activeRewards.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — {r.pointsCost.toLocaleString('es')} pts
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedReward && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
              <p className="font-semibold text-amber-700 dark:text-amber-400">{selectedReward.name}</p>
              <p className="mt-0.5 text-amber-600/80 dark:text-amber-500/80">
                Costo: <strong>{selectedReward.pointsCost.toLocaleString('es')}</strong> puntos
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setCustomerId(''); setRewardId(''); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleRedeem}
            disabled={mutation.isPending || !customerId.trim() || !rewardId}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            Canjear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
