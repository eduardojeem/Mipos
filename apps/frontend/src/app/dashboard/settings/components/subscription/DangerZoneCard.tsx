'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownCircle, CalendarClock, RefreshCw, ShieldOff } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function DangerZoneCard({
  canManage,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  isCanceling,
  onCancel,
  onScrollToPlans,
  onRefresh,
}: {
  canManage: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string
  isCanceling: boolean
  onCancel: () => Promise<void>
  onScrollToPlans: () => void
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const endDateLabel = useMemo(() => {
    const d = new Date(currentPeriodEnd)
    if (Number.isNaN(d.getTime())) return 'fin de periodo'
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' })
  }, [currentPeriodEnd])

  const canConfirm = confirmText.trim().toUpperCase() === 'CANCELAR'

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-rose-200/70 bg-card shadow-sm dark:border-rose-500/20">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-rose-200/60 p-5 dark:border-rose-500/20">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-rose-900 dark:text-rose-100">Zona de peligro</p>
          <p className="mt-0.5 text-sm text-rose-700/80 dark:text-rose-300/80">
            Acciones irreversibles o sensibles para tu suscripción.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 px-5 pb-5">
        {/* Cancel subscription row */}
        <div
          className={cn(
            'flex flex-col gap-3 rounded-lg border p-4',
            cancelAtPeriodEnd
              ? 'border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/10'
              : 'border-border/60 bg-muted/20'
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldOff
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  cancelAtPeriodEnd
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-muted-foreground'
                )}
              />
              <div>
                <p className="text-sm font-semibold">Cancelar suscripción</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se programará la cancelación para el{' '}
                  <span className="font-medium">{endDateLabel}</span>. Tus datos no se eliminan.
                </p>
                {cancelAtPeriodEnd && (
                  <Badge className="mt-2 border border-rose-200 bg-rose-50 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    <CalendarClock className="mr-1 h-3 w-3" />
                    Cancelación ya programada para el {endDateLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh} className="h-8">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Sync
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={() => setOpen(true)}
                disabled={!canManage || cancelAtPeriodEnd || isCanceling}
              >
                {isCanceling ? 'Cancelando...' : 'Cancelar plan'}
              </Button>
            </div>
          </div>

          {!canManage && (
            <p className="text-xs text-muted-foreground">
              Solo el OWNER o SUPER_ADMIN pueden cancelar la suscripción.
            </p>
          )}
        </div>

        {/* Change plan row */}
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ArrowDownCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Cambiar plan</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Realiza upgrade o downgrade. Verás el impacto antes de confirmar.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={onScrollToPlans}>
            Ver planes
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setConfirmText('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
              Confirmar cancelación
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tu suscripción permanecerá activa hasta el{' '}
              <strong>{endDateLabel}</strong>. Después de esa fecha, el acceso se reducirá
              automáticamente al plan gratuito.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-confirm" className="text-sm">
              Confirmación: escribe <span className="font-mono font-bold">CANCELAR</span> para confirmar
            </Label>
            <Input
              id="cancel-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CANCELAR"
              className={cn(
                canConfirm && 'border-rose-400 focus-visible:ring-rose-400/40'
              )}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canConfirm || isCanceling}
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400"
              onClick={(e) => {
                e.preventDefault()
                void onCancel().then(() => setOpen(false))
              }}
            >
              {isCanceling ? 'Cancelando...' : 'Confirmar cancelación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
