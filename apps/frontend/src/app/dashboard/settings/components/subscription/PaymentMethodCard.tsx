'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CreditCard,
  Edit3,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type PaymentMethod = {
  id: string
  provider: string
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
}

export type PaymentMethodUpdateInput = {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

type PaymentMethodValidation =
  | { ok: false; message: string }
  | { ok: true; normalized: string; m: number; y: number }

function normalizeLast4(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : ''
}

function getCardBrandInfo(brand: string | null) {
  const b = String(brand || '').toUpperCase()
  if (b.includes('VISA')) return { color: 'bg-blue-600', short: 'VISA' }
  if (b.includes('MASTERCARD') || b.includes('MASTER'))
    return { color: 'bg-rose-600', short: 'MC' }
  if (b.includes('AMEX') || b.includes('AMERICAN'))
    return { color: 'bg-emerald-600', short: 'AMEX' }
  if (b.includes('DISCOVER')) return { color: 'bg-orange-500', short: 'DISC' }
  return { color: 'bg-slate-600', short: b.slice(0, 4) || '···' }
}

function getExpiryStatus(exp_month: number | null, exp_year: number | null) {
  if (!exp_month || !exp_year) return 'unknown'
  const now = new Date()
  const cardDate = new Date(exp_year, exp_month - 1, 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const in3Months = new Date(now.getFullYear(), now.getMonth() + 3, 1)
  if (cardDate < now) return 'expired'
  if (cardDate < nextMonth) return 'expiring-now'
  if (cardDate < in3Months) return 'expiring-soon'
  return 'valid'
}

function CardVisual({ brand, last4 }: { brand: string | null; last4: string | null }) {
  const { color, short } = getCardBrandInfo(brand)
  return (
    <div
      className={cn(
        'relative flex h-28 w-48 shrink-0 flex-col justify-between overflow-hidden rounded-xl p-4 text-white shadow-lg',
        color
      )}
    >
      {/* Decorative circles */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-2 h-24 w-24 rounded-full bg-white/10" />
      <div className="flex items-center justify-between">
        <Wifi className="h-4 w-4 rotate-90 opacity-70" />
        <span className="text-xs font-bold tracking-widest opacity-90">{short}</span>
      </div>
      <div>
        <p className="font-mono text-sm tracking-[0.2em] opacity-80">
          **** **** **** {last4 || '----'}
        </p>
      </div>
    </div>
  )
}

export function PaymentMethodCard({
  canManage,
  paymentMethod,
  isLoading,
  error,
  isSaving,
  onSave,
  onRefresh,
}: {
  canManage: boolean
  paymentMethod: PaymentMethod | null
  isLoading: boolean
  error?: string | null
  isSaving: boolean
  onSave: (input: PaymentMethodUpdateInput) => Promise<void>
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')
  const [last4, setLast4] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')

  useEffect(() => {
    if (!open) return
    setBrand(paymentMethod?.brand || '')
    setLast4(paymentMethod?.last4 || '')
    setExpMonth(paymentMethod?.exp_month ? String(paymentMethod.exp_month) : '')
    setExpYear(paymentMethod?.exp_year ? String(paymentMethod.exp_year) : '')
  }, [open, paymentMethod])

  const validation = useMemo<PaymentMethodValidation>(() => {
    const normalized = normalizeLast4(last4)
    const m = Number(expMonth)
    const y = Number(expYear)
    const nowYear = new Date().getFullYear()

    if (!brand.trim()) return { ok: false, message: 'Ingresa la marca (ej. VISA)' }
    if (normalized.length !== 4) return { ok: false, message: 'Ingresa los últimos 4 dígitos' }
    if (!Number.isFinite(m) || m < 1 || m > 12) return { ok: false, message: 'Mes inválido (01–12)' }
    if (!Number.isFinite(y) || y < nowYear) return { ok: false, message: `Año inválido (mín. ${nowYear})` }
    return { ok: true, normalized, m, y }
  }, [brand, expMonth, expYear, last4])

  const save = async () => {
    if (!validation.ok) return
    const { normalized, m, y } = validation
    await onSave({ brand: brand.trim(), last4: normalized, exp_month: m, exp_year: y })
    setOpen(false)
  }

  const expiryStatus = getExpiryStatus(paymentMethod?.exp_month ?? null, paymentMethod?.exp_year ?? null)

  const expiryBadge = {
    expired: {
      label: 'Vencida',
      cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    },
    'expiring-now': {
      label: 'Vence pronto',
      cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    },
    'expiring-soon': {
      label: 'Vence en 3 meses',
      cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    },
    valid: {
      label: 'Vigente',
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
    unknown: { label: 'Sin datos', cls: 'border-border bg-muted text-muted-foreground' },
  }[expiryStatus]

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Configuración de pago</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Gestiona tu método de pago para renovaciones y upgrades.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={!canManage || isLoading}
          >
            <Edit3 className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {error ? (
          <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <CardVisual brand={paymentMethod?.brand ?? null} last4={paymentMethod?.last4 ?? null} />

            <div className="flex flex-1 flex-col gap-3">
              {paymentMethod ? (
                <>
                  <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Marca</span>
                      <span className="font-semibold">{paymentMethod.brand || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Número</span>
                      <span className="font-mono font-semibold">
                        **** **** **** {paymentMethod.last4 || '----'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Vencimiento</span>
                      <span className="font-medium">
                        {paymentMethod.exp_month && paymentMethod.exp_year
                          ? `${String(paymentMethod.exp_month).padStart(2, '0')} / ${paymentMethod.exp_year}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Proveedor</span>
                      <span className="font-medium capitalize">{paymentMethod.provider || '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('border text-xs', expiryBadge.cls)}>
                      {expiryBadge.label}
                    </Badge>
                    <Badge className="border border-border bg-muted/30 text-xs text-muted-foreground">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Datos enmascarados
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-6 text-center">
                  <Building2 className="h-7 w-7 text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-medium">Sin método configurado</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Agrega una tarjeta para gestionar renovaciones.
                    </p>
                  </div>
                </div>
              )}

              {!canManage && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Solo OWNER o SUPER_ADMIN pueden editar el método de pago.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Actualizar método de pago
            </DialogTitle>
            <DialogDescription>
              Solo se almacenan datos enmascarados: marca, últimos 4 dígitos y vencimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live preview */}
            <div className="flex justify-center py-2">
              <CardVisual brand={brand || null} last4={last4 || null} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pm-brand">Marca de tarjeta</Label>
                <Input
                  id="pm-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="VISA"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-last4">Últimos 4 dígitos</Label>
                <Input
                  id="pm-last4"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value)}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4242"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-exp-month">Mes de vencimiento</Label>
                <Input
                  id="pm-exp-month"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-exp-year">Año de vencimiento</Label>
                <Input
                  id="pm-exp-year"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={String(new Date().getFullYear() + 2)}
                />
              </div>
            </div>

            {!validation.ok && (
              <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {validation.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={!validation.ok || isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
