'use client';

import { AlertTriangle, Briefcase, Lock, Scissors, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useVertical } from '@/app/dashboard/settings/hooks/useVertical';
import { VERTICAL_OPTIONS, type BusinessVertical } from '@/config/verticals';

const ICON_MAP: Record<string, LucideIcon> = { Store, Scissors };

function VerticalIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Briefcase;
  return <Icon className="h-5 w-5" />;
}

export function VerticalForm() {
  const { vertical, lock, updateVertical, isLoading, isSaving } = useVertical();
  const isLockedForUser = lock.locked && !lock.canChange;
  const disabled = isLoading || isSaving || isLockedForUser;

  const handleVerticalChange = (nextVertical: BusinessVertical) => {
    if (nextVertical === vertical || disabled) return;

    const message = lock.locked
      ? 'Esta empresa ya tiene datos operativos. Cambiar el tipo de negocio puede afectar menus, reportes y flujos activos. Queres forzar el cambio?'
      : 'El tipo de negocio define los modulos principales de la empresa. Queres cambiarlo?';

    if (window.confirm(message)) {
      updateVertical(nextVertical);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Tipo de negocio
        </CardTitle>
        <CardDescription>
          Define los modulos operativos de la empresa. Se elige al crear la cuenta y queda protegido cuando ya hay
          datos cargados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lock.locked && (
          <div
            className={cn(
              'rounded-lg border p-3 text-sm',
              lock.canChange
                ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100'
                : 'border-border bg-muted/40 text-muted-foreground',
            )}
          >
            <div className="flex items-start gap-3">
              {lock.canChange ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : (
                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {lock.canChange ? 'Cambio reservado para superadmin' : 'Tipo de negocio bloqueado'}
                </p>
                <p className="mt-1">
                  {lock.message || 'La empresa ya tiene datos operativos vinculados al rubro actual.'}
                </p>
                {lock.reasons.length > 0 && (
                  <p className="mt-2 text-xs">
                    Datos detectados: {lock.reasons.map((reason) => `${reason.label} (${reason.count})`).join(', ')}.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {VERTICAL_OPTIONS.map((opt) => {
            const isActive = vertical === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled || isActive}
                onClick={() => handleVerticalChange(opt.value as BusinessVertical)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                  isActive
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted',
                  disabled && !isActive && 'cursor-not-allowed opacity-60',
                  isActive && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <VerticalIcon name={opt.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Si una empresa necesita cambiar de rubro despues de operar, conviene revisar datos, permisos, modulos y
          reportes antes de forzarlo.
        </p>
      </CardContent>
    </Card>
  );
}
