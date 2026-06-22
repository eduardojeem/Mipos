'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Loader2, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'
import { useStaff } from '@/app/admin/staff/hooks/useStaff'
import { fetchAvailability, type Appointment, type Slot } from '../hooks/useAppointments'

export type ReschedulePatch = { start_at: string; end_at: string; staff_profile_id: string; status: 'BOOKED' }

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  isSaving: boolean
  onSubmit: (id: string, patch: ReschedulePatch) => Promise<unknown>
}

export function RescheduleModal({ open, onOpenChange, appointment, isSaving, onSubmit }: Props) {
  const orgId = useCurrentOrganizationId()
  const { toast } = useToast()
  const { staff } = useStaff()

  const activeStaff = useMemo(
    () =>
      [...staff]
        .filter((s) => s.is_active)
        .sort((a, b) => (a.display_name || a.user?.full_name || '').localeCompare(b.display_name || b.user?.full_name || '')),
    [staff],
  )

  const [dateStr, setDateStr] = useState(todayStr())
  const [staffId, setStaffId] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Al abrir, precarga el profesional original y la fecha de hoy.
  useEffect(() => {
    if (!open || !appointment) return
    setDateStr(todayStr())
    setStaffId(appointment.staff_profile_id)
    setSlot(null)
    setError(null)
  }, [open, appointment])

  // Cambiar fecha o profesional invalida el slot elegido.
  useEffect(() => { setSlot(null) }, [dateStr, staffId])

  const availabilityQuery = useQuery({
    queryKey: ['availability', orgId, staffId, appointment?.service_id, dateStr],
    queryFn: () => fetchAvailability(orgId!, staffId, appointment!.service_id, dateStr),
    enabled: open && !!orgId && !!staffId && !!appointment?.service_id,
  })
  const slots = availabilityQuery.data ?? []

  const handleConfirm = async () => {
    if (!appointment || !slot) { setError('Elegí un horario disponible'); return }
    setError(null)
    try {
      await onSubmit(appointment.id, {
        start_at: slot.start_at,
        end_at: slot.end_at,
        staff_profile_id: staffId,
        status: 'BOOKED',
      })
      toast({ title: 'Turno reagendado', description: 'Se movió al nuevo horario y quedó como reservado.' })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reagendar el turno')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Reagendar turno
          </DialogTitle>
          <DialogDescription>
            {appointment?.service?.name || 'Servicio'} · {appointment?.customer_label || appointment?.customer_name || 'Sin cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Profesional</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="Elegí un profesional" /></SelectTrigger>
              <SelectContent>
                {activeStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.display_name || s.user?.full_name || 'Profesional'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nueva fecha</Label>
            <Input type="date" value={dateStr} min={todayStr()} onChange={(e) => e.target.value && setDateStr(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Horario disponible</Label>
            {availabilityQuery.isFetching ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando horarios...
              </div>
            ) : slots.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No hay horarios disponibles ese día.</p>
            ) : (
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.start_at}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                      slot?.start_at === s.start_at
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isSaving || !slot}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Reagendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
