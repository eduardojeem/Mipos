// Validación/normalización de profesionales y sus horarios (vertical BARBERSHOP).
// Helpers compartidos entre /api/staff/route.ts y /api/staff/[id]/route.ts.

export const STAFF_COLUMNS = 'id,user_id,display_name,specialty,commission_pct,color,is_active,walkin_only,created_at,updated_at'

export type WorkingHourInput = { day_of_week: number; start_time: string; end_time: string }

export type StaffBody = {
  display_name: string | null
  specialty: string | null
  commission_pct: number
  color: string | null
  is_active: boolean
  walkin_only: boolean
}

// HH:MM o HH:MM:SS
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/

export function parseStaffBody(raw: any): { ok: true; value: StaffBody } | { ok: false; error: string } {
  const commission = raw?.commission_pct === undefined || raw?.commission_pct === null ? 0 : Number(raw.commission_pct)
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return { ok: false, error: 'La comisión debe estar entre 0 y 100' }
  }
  return {
    ok: true,
    value: {
      display_name: typeof raw?.display_name === 'string' && raw.display_name.trim() ? raw.display_name.trim() : null,
      specialty: typeof raw?.specialty === 'string' && raw.specialty.trim() ? raw.specialty.trim() : null,
      commission_pct: commission,
      color: typeof raw?.color === 'string' && raw.color.trim() ? raw.color.trim() : null,
      is_active: raw?.is_active === false ? false : true,
      walkin_only: raw?.walkin_only === true,
    },
  }
}

export function parseWorkingHours(raw: any): { ok: true; value: WorkingHourInput[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: [] }
  if (!Array.isArray(raw)) return { ok: false, error: 'working_hours debe ser una lista' }

  // Group by day to check for overlaps
  const byDay: Record<number, WorkingHourInput[]> = {}
  const value: WorkingHourInput[] = []

  for (const item of raw) {
    const day = Number(item?.day_of_week)
    const start = String(item?.start_time || '')
    const end = String(item?.end_time || '')
    if (!Number.isInteger(day) || day < 0 || day > 6) return { ok: false, error: 'Día de semana inválido (0-6)' }
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return { ok: false, error: 'Horario inválido (formato HH:MM)' }
    if (end <= start) return { ok: false, error: 'La hora de fin debe ser mayor a la de inicio' }
    
    if (!byDay[day]) byDay[day] = []
    
    // Check overlap with existing blocks for this day
    const hasOverlap = byDay[day].some(b => (start < b.end_time && end > b.start_time))
    if (hasOverlap) return { ok: false, error: `Los horarios del día ${day} se superponen` }
    
    byDay[day].push({ day_of_week: day, start_time: start, end_time: end })
    value.push({ day_of_week: day, start_time: start, end_time: end })
  }
  return { ok: true, value }
}
