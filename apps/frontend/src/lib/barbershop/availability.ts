// Cálculo de horarios disponibles (slots) de un profesional para un día/servicio.
// Compartido entre el endpoint autenticado y el público de reservas.

import { ACTIVE_STATUSES } from './appointment-helpers'

export type WorkingBlock = { start_time: string; end_time: string }
export type BusyInterval = { start: number; end: number } // epoch ms
export type AvailabilitySlot = { start_at: string; end_at: string; label: string }

export const SLOT_STEP_MIN = 15

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Convierte fecha (Y,M,D) + minutos-del-día en hora-local a un instante absoluto (ms),
// usando el offset del cliente (Date.getTimezoneOffset(): UTC = local + offset).
export function localToUtcMs(y: number, mo: number, d: number, minutesOfDay: number, offsetMin: number): number {
  const hh = Math.floor(minutesOfDay / 60)
  const mm = minutesOfDay % 60
  return Date.UTC(y, mo - 1, d, hh, mm, 0) + offsetMin * 60_000
}

function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':')
  return Number(h) * 60 + Number(m)
}

/**
 * Genera los slots disponibles cruzando los bloques de horario del profesional
 * con sus turnos ocupados, respetando la duración del servicio. No ofrece
 * horarios en el pasado.
 */
export function computeAvailableSlots(params: {
  date: string // YYYY-MM-DD
  durationMin: number
  offsetMin: number
  blocks: WorkingBlock[]
  busy: BusyInterval[]
  now?: number
  stepMin?: number
}): AvailabilitySlot[] {
  const { date, durationMin, offsetMin, blocks, busy } = params
  const now = params.now ?? Date.now()
  const step = params.stepMin ?? SLOT_STEP_MIN

  const [y, mo, d] = date.split('-').map(Number)
  const slots: AvailabilitySlot[] = []

  for (const block of blocks) {
    const blockStart = hhmmToMinutes(block.start_time)
    const blockEnd = hhmmToMinutes(block.end_time)
    for (let m = blockStart; m + durationMin <= blockEnd; m += step) {
      const startMs = localToUtcMs(y, mo, d, m, offsetMin)
      const endMs = startMs + durationMin * 60_000
      if (startMs < now) continue // no ofrecer horarios pasados
      const overlaps = busy.some((b) => b.start < endMs && b.end > startMs)
      if (overlaps) continue
      slots.push({
        start_at: new Date(startMs).toISOString(),
        end_at: new Date(endMs).toISOString(),
        label: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
      })
    }
  }

  return slots
}

/** Día de la semana (0=domingo) de una fecha YYYY-MM-DD, sin ambigüedad de TZ. */
export function weekdayOf(date: string): number {
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
}

/** Rango absoluto [inicio, fin) del día local pedido, en ms. */
export function dayRangeMs(date: string, offsetMin: number): { startMs: number; endMs: number } {
  const [y, mo, d] = date.split('-').map(Number)
  return {
    startMs: localToUtcMs(y, mo, d, 0, offsetMin),
    endMs: localToUtcMs(y, mo, d, 24 * 60, offsetMin),
  }
}

export type AvailabilityResult =
  | { ok: false; status: number; error: string }
  | { ok: true; slots: AvailabilitySlot[]; durationMin: number; reason?: string }

/**
 * Flujo completo de disponibilidad: valida el servicio, lee los horarios del
 * profesional y sus turnos ocupados, y calcula los slots libres.
 * `admin` es el cliente Supabase service-role. Usado por el endpoint autenticado
 * y el público (mismo cálculo, distinta forma de resolver la organización).
 */
export async function loadAvailability(
  admin: any,
  params: { orgId: string; staffProfileId: string; serviceId: string; date: string; offsetMin: number },
): Promise<AvailabilityResult> {
  const { orgId, staffProfileId, serviceId, date, offsetMin } = params

  if (!staffProfileId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, status: 400, error: 'Parámetros inválidos (staff_profile_id, service_id, date)' }
  }

  const { data: service } = await admin
    .from('services')
    .select('id, duration_min')
    .eq('id', serviceId)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .maybeSingle()
  if (!service) return { ok: false, status: 404, error: 'Servicio no encontrado' }
  const durationMin = Number(service.duration_min) || 30

  // Check exceptions first
  const { data: exception } = await admin
    .from('staff_schedule_exceptions')
    .select('reason')
    .eq('staff_profile_id', staffProfileId)
    .eq('date', date)
    .maybeSingle()
    
  if (exception) {
    return { ok: true, slots: [], durationMin, reason: exception.reason || 'Día no laborable (Excepción)' }
  }

  const { data: blocks } = await admin
    .from('staff_working_hours')
    .select('start_time, end_time')
    .eq('staff_profile_id', staffProfileId)
    .eq('day_of_week', weekdayOf(date))
    .order('start_time', { ascending: true })

  if (!blocks || blocks.length === 0) {
    return { ok: true, slots: [], durationMin, reason: 'El profesional no atiende ese día' }
  }

  const { startMs, endMs } = dayRangeMs(date, offsetMin)
  const { data: existing } = await admin
    .from('appointments')
    .select('start_at, end_at')
    .eq('organization_id', orgId)
    .eq('staff_profile_id', staffProfileId)
    .in('status', ACTIVE_STATUSES)
    .gte('start_at', new Date(startMs).toISOString())
    .lt('start_at', new Date(endMs).toISOString())

  const busy: BusyInterval[] = ((existing || []) as any[]).map((a: any) => ({
    start: new Date(a.start_at).getTime(),
    end: new Date(a.end_at).getTime(),
  }))

  const slots = computeAvailableSlots({
    date,
    durationMin,
    offsetMin,
    blocks: blocks as WorkingBlock[],
    busy,
  })

  return { ok: true, slots, durationMin }
}
