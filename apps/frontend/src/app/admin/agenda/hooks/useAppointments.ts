'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type Appointment = {
  id: string
  staff_profile_id: string
  service_id: string
  customer_id: string | null
  customer_name: string | null
  start_at: string
  end_at: string
  status: AppointmentStatus
  price: number
  notes: string | null
  sale_id: string | null
  customer_phone: string | null
  service: { name: string; color: string | null } | null
  staff: { name: string; color: string | null } | null
  customer_label: string | null
}

export type Slot = { start_at: string; end_at: string; label: string }

export type NewAppointmentInput = {
  staff_profile_id: string
  service_id: string
  start_at: string
  end_at: string
  customer_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  notes?: string | null
  price?: number
}

function orgHeaders(orgId: string, json = false): HeadersInit {
  return json
    ? { 'Content-Type': 'application/json', 'x-organization-id': orgId }
    : { 'x-organization-id': orgId }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}))
  return json.error || fallback
}

// Rango [from, to) del día local pedido, en ISO absoluto.
function dayRangeIso(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}

async function fetchAppointments(orgId: string, dateStr: string): Promise<Appointment[]> {
  const { from, to } = dayRangeIso(dateStr)
  const res = await fetch(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    headers: orgHeaders(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'Error al cargar turnos'))
  return (await res.json()).appointments || []
}

// Citas vencidas sin resolver: ya pasaron (start_at < ahora) pero siguen en
// BOOKED/CONFIRMED. Se busca en una ventana de 60 días para acotar el scan.
async function fetchOverdueAppointments(orgId: string): Promise<Appointment[]> {
  const now = new Date()
  const from = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const to = now.toISOString()
  const qs = new URLSearchParams({ from, to, status: 'BOOKED,CONFIRMED', limit: '200' })
  const res = await fetch(`/api/appointments?${qs.toString()}`, { headers: orgHeaders(orgId) })
  if (!res.ok) throw new Error(await readError(res, 'Error al cargar turnos vencidos'))
  return (await res.json()).appointments || []
}

export async function fetchAvailability(
  orgId: string,
  staffProfileId: string,
  serviceId: string,
  dateStr: string,
): Promise<Slot[]> {
  const tz = new Date().getTimezoneOffset()
  const qs = new URLSearchParams({ staff_profile_id: staffProfileId, service_id: serviceId, date: dateStr, tz: String(tz) })
  const res = await fetch(`/api/appointments/availability?${qs.toString()}`, { headers: orgHeaders(orgId), cache: 'no-store' })
  if (!res.ok) throw new Error(await readError(res, 'Error al calcular disponibilidad'))
  return (await res.json()).slots || []
}

export function useAppointments(dateStr: string) {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const apptQuery = useQuery({
    queryKey: ['appointments', orgId, dateStr],
    queryFn: () => fetchAppointments(orgId!, dateStr),
    enabled: !!orgId,
    staleTime: 10_000,
  })

  // Citas vencidas sin resolver (no atadas al día seleccionado).
  const overdueQuery = useQuery({
    queryKey: ['appointments', orgId, 'overdue'],
    queryFn: () => fetchOverdueAppointments(orgId!),
    enabled: !!orgId,
    staleTime: 60_000,
  })

  // Invalida todas las queries de turnos (incluida la de vencidos) tras un cambio.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments', orgId] })

  const createMutation = useMutation({
    mutationFn: async (input: NewAppointmentInput) => {
      const res = await fetch('/api/appointments', { method: 'POST', headers: orgHeaders(orgId!, true), body: JSON.stringify(input) })
      if (!res.ok) throw new Error(await readError(res, 'Error al crear el turno'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Turno agendado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/appointments/${id}`, { method: 'PUT', headers: orgHeaders(orgId!, true), body: JSON.stringify(patch) })
      if (!res.ok) throw new Error(await readError(res, 'Error al actualizar el turno'))
    },
    onSuccess: () => { invalidate() },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE', headers: orgHeaders(orgId!) })
      if (!res.ok) throw new Error(await readError(res, 'Error al eliminar el turno'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Turno eliminado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const chargeMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const res = await fetch(`/api/appointments/${id}/charge`, {
        method: 'POST',
        headers: orgHeaders(orgId!, true),
        body: JSON.stringify({ payment_method: paymentMethod }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Error al cobrar el turno'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Turno cobrado', description: 'Se registró la venta.' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  return {
    appointments: apptQuery.data ?? [],
    overdueAppointments: overdueQuery.data ?? [],
    isLoading: apptQuery.isLoading,
    isError: apptQuery.isError,
    error: apptQuery.error as Error | null,
    create: createMutation.mutateAsync,
    setStatus: (id: string, status: AppointmentStatus) => updateMutation.mutate({ id, patch: { status } }),
    reschedule: (id: string, patch: Record<string, unknown>) => updateMutation.mutateAsync({ id, patch }),
    isRescheduling: updateMutation.isPending,
    remove: deleteMutation.mutate,
    charge: (id: string, paymentMethod: string) => chargeMutation.mutateAsync({ id, paymentMethod }),
    isCreating: createMutation.isPending,
    isCharging: chargeMutation.isPending,
  }
}
