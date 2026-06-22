// Validación/normalización de servicios (vertical BARBERSHOP).
// Vive en lib (no en el route) porque los archivos de ruta de Next solo pueden
// exportar handlers HTTP; los helpers compartidos entre route.ts y [id]/route.ts
// deben importarse desde acá.

export const SERVICE_COLUMNS =
  'id,name,description,duration_min,price,category,color,is_active,created_at,updated_at'

export type ServiceBody = {
  name: string
  description: string | null
  duration_min: number
  price: number
  category: string | null
  color: string | null
  is_active: boolean
}

export function parseServiceBody(raw: any): { ok: true; value: ServiceBody } | { ok: false; error: string } {
  const name = String(raw?.name || '').trim()
  if (!name) return { ok: false, error: 'El nombre es requerido' }

  const duration = Number(raw?.duration_min)
  if (!Number.isFinite(duration) || duration <= 0) {
    return { ok: false, error: 'La duración debe ser un número mayor a 0' }
  }

  const price = Number(raw?.price)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'El precio debe ser un número mayor o igual a 0' }
  }

  return {
    ok: true,
    value: {
      name,
      description: typeof raw?.description === 'string' && raw.description.trim() ? raw.description.trim() : null,
      duration_min: Math.round(duration),
      price,
      category: typeof raw?.category === 'string' && raw.category.trim() ? raw.category.trim() : null,
      color: typeof raw?.color === 'string' && raw.color.trim() ? raw.color.trim() : null,
      is_active: raw?.is_active === false ? false : true,
    },
  }
}
