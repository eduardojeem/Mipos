/**
 * Verticales / tipos de negocio.
 *
 * El vertical es el rubro operativo de una organizacion y gobierna que modulos
 * se priorizan en el panel, el onboarding y la navegacion.
 *
 * No confundir con:
 * - marketplace_category_id: rubro publico del marketplace.
 * - business_config.legalInfo.businessType: forma legal.
 */

export const BUSINESS_VERTICALS = ['RETAIL', 'BARBERSHOP'] as const

export type BusinessVertical = (typeof BUSINESS_VERTICALS)[number]

export const DEFAULT_VERTICAL: BusinessVertical = 'RETAIL'

export interface VerticalMeta {
  value: BusinessVertical
  label: string
  description: string
  /** Icono lucide-react para selectores. */
  icon: string
}

export const VERTICAL_META: Record<BusinessVertical, VerticalMeta> = {
  RETAIL: {
    value: 'RETAIL',
    label: 'Tienda / Retail',
    description: 'Productos, inventario, ventas, caja y catalogo publico como flujo principal.',
    icon: 'Store',
  },
  BARBERSHOP: {
    value: 'BARBERSHOP',
    label: 'Barberia / Peluqueria',
    description: 'Agenda, servicios y profesionales como flujo principal, con productos y POS incluidos.',
    icon: 'Scissors',
  },
}

export const VERTICAL_OPTIONS: VerticalMeta[] = BUSINESS_VERTICALS.map((v) => VERTICAL_META[v])

/** Normaliza cualquier valor crudo (DB/API) a un vertical valido. */
export function normalizeVertical(value: unknown): BusinessVertical {
  const upper = typeof value === 'string' ? value.toUpperCase() : ''
  return (BUSINESS_VERTICALS as readonly string[]).includes(upper)
    ? (upper as BusinessVertical)
    : DEFAULT_VERTICAL
}
