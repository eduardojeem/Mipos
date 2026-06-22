'use client'

import { useUserOrganizations } from './use-user-organizations'
import { useAuth } from './use-auth'
import { DEFAULT_VERTICAL, normalizeVertical, type BusinessVertical } from '@/config/verticals'

/**
 * Vertical (tipo de negocio) de la organización actualmente seleccionada.
 * Gobierna qué módulos del panel se muestran. Mientras carga, devuelve el
 * default (RETAIL) para no ocultar módulos por error.
 */
export function useCurrentVertical(): BusinessVertical {
  const { user } = useAuth()
  const { selectedOrganization } = useUserOrganizations(user?.id)
  return normalizeVertical(selectedOrganization?.vertical) || DEFAULT_VERTICAL
}
