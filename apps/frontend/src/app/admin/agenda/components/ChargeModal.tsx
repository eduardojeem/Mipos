'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { Appointment } from '../hooks/useAppointments'

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  isCharging: boolean
  onConfirm: (paymentMethod: string) => Promise<unknown>
}

export function ChargeModal({ open, onOpenChange, appointment, isCharging, onConfirm }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setPaymentMethod('CASH'); setError(null) }
  }, [open])

  const handleConfirm = async () => {
    setError(null)
    try {
      await onConfirm(paymentMethod)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cobrar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar turno</DialogTitle>
          <DialogDescription>
            {appointment?.service?.name || 'Servicio'} · {appointment?.customer_label || 'Sin cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total a cobrar</p>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(Number(appointment?.price ?? 0), '')}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Se registrará una venta por este monto y el turno quedará como atendido.
          </p>
          <p className="text-xs text-muted-foreground">
            Si el turno está vinculado a un cliente y hay un programa activo de fidelización, también se acreditarán puntos automáticamente.
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCharging}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isCharging}>{isCharging ? 'Cobrando…' : 'Cobrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
