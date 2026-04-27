'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Loader2, Save } from 'lucide-react';
import { useUpdateLoyaltyProgram } from '@/hooks/use-loyalty';

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  isActive: boolean;
  members: number;
  createdAt: string;
  tier?: string;
  color?: string;
  welcomeBonus?: number;
  birthdayBonus?: number;
  referralBonus?: number;
  pointsExpirationDays?: number;
}

interface ProgramSettingsFormProps {
  program: LoyaltyProgram;
  programId: string;
}

const MAX_MIN_PURCHASE = 1_000_000;

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  min?: number;
  max?: number;
  tooltip?: string;
}

function NumberField({ label, value, onChange, error, min = 0, max, tooltip }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-sm">{label}</Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center text-muted-foreground cursor-help">
                <HelpCircle className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Input
        type="number"
        min={min}
        max={max}
        aria-invalid={!!error}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={error ? 'border-destructive' : ''}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProgramSettingsForm({ program, programId }: ProgramSettingsFormProps) {
  const updateProgram = useUpdateLoyaltyProgram();
  const [form, setForm] = useState({
    pointsPerPurchase: Number(program.pointsPerPurchase || 0),
    minimumPurchase: Number(program.minimumPurchase || 0),
    welcomeBonus: Number(program.welcomeBonus || 0),
    birthdayBonus: Number(program.birthdayBonus || 0),
    referralBonus: Number(program.referralBonus || 0),
    pointsExpirationDays: Number(program.pointsExpirationDays ?? 0),
    isActive: Boolean(program.isActive),
    description: String(program.description || ''),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
      pointsPerPurchase: Number(program.pointsPerPurchase || 0),
      minimumPurchase: Number(program.minimumPurchase || 0),
      welcomeBonus: Number(program.welcomeBonus || 0),
      birthdayBonus: Number(program.birthdayBonus || 0),
      referralBonus: Number(program.referralBonus || 0),
      pointsExpirationDays: Number(program.pointsExpirationDays ?? 0),
      isActive: Boolean(program.isActive),
      description: String(program.description || ''),
    });
    setErrors({});
  }, [program]);

  const onChange = (key: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    let msg = '';
    const numericFields = [
      'pointsPerPurchase', 'minimumPurchase', 'welcomeBonus',
      'birthdayBonus', 'referralBonus', 'pointsExpirationDays',
    ];
    if (numericFields.includes(String(key))) {
      const num = Number(value);
      if (Number.isNaN(num)) msg = 'Debe ser numérico';
      else if (num < 0) msg = 'Debe ser mayor o igual a 0';
      else if (key === 'minimumPurchase' && num > MAX_MIN_PURCHASE) msg = `Máximo ${MAX_MIN_PURCHASE}`;
      else if (key === 'pointsExpirationDays' && num > 3650) msg = 'Máximo 3650 días';
    }
    if (key === 'description' && String(value).length > 500) msg = 'Máximo 500 caracteres';
    setErrors((prev) => ({ ...prev, [String(key)]: msg }));
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const isPending = (updateProgram as { isPending?: boolean }).isPending;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Puntos por compra"
            value={form.pointsPerPurchase}
            onChange={(v) => onChange('pointsPerPurchase', v)}
            error={errors.pointsPerPurchase}
            tooltip="Cantidad de puntos otorgados por cada compra realizada."
          />
          <NumberField
            label="Compra mínima ($)"
            value={form.minimumPurchase}
            onChange={(v) => onChange('minimumPurchase', v)}
            error={errors.minimumPurchase}
            max={MAX_MIN_PURCHASE}
            tooltip={`Monto mínimo requerido para acumular puntos. Máximo $${MAX_MIN_PURCHASE.toLocaleString('es')}.`}
          />
          <NumberField
            label="Bono de bienvenida"
            value={form.welcomeBonus}
            onChange={(v) => onChange('welcomeBonus', v)}
            error={errors.welcomeBonus}
          />
          <NumberField
            label="Bono de cumpleaños"
            value={form.birthdayBonus}
            onChange={(v) => onChange('birthdayBonus', v)}
            error={errors.birthdayBonus}
          />
          <NumberField
            label="Bono por referido"
            value={form.referralBonus}
            onChange={(v) => onChange('referralBonus', v)}
            error={errors.referralBonus}
          />
          <NumberField
            label="Días de expiración de puntos"
            value={form.pointsExpirationDays}
            onChange={(v) => onChange('pointsExpirationDays', v)}
            error={errors.pointsExpirationDays}
            max={3650}
            tooltip="Días hasta que los puntos expiran (0 = sin expiración). Máximo 3650 días."
          />

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Descripción</Label>
              <span className="text-xs text-muted-foreground">{form.description.length}/500</span>
            </div>
            <Textarea
              aria-invalid={!!errors.description}
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={3}
              maxLength={500}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 md:col-span-2 rounded-lg border bg-muted/30 px-4 py-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => onChange('isActive', v)}
              id="program-active-switch"
            />
            <label htmlFor="program-active-switch" className="text-sm font-medium cursor-pointer">
              Programa activo
            </label>
            <span className="ml-auto text-xs text-muted-foreground">
              {form.isActive ? 'Los clientes pueden acumular y canjear puntos' : 'Programa desactivado'}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (!hasErrors) updateProgram.mutate({ id: programId, program: form });
            }}
            disabled={isPending || hasErrors}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
