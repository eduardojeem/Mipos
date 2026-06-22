'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type MyStaffProfile = {
  id: string
  display_name: string | null
  specialty: string | null
  color: string | null
  is_active: boolean
} | null

/**
 * Ficha de profesional del usuario logueado (o null si no es barbero agendable).
 * Permite que un barbero filtre la agenda para ver solo sus turnos.
 */
export function useMyStaffProfile() {
  const orgId = useCurrentOrganizationId()

  const query = useQuery({
    queryKey: ['my-staff-profile', orgId],
    queryFn: async (): Promise<MyStaffProfile> => {
      const res = await fetch('/api/staff/me', {
        headers: { 'x-organization-id': orgId! },
        cache: 'no-store',
      })
      if (!res.ok) return null
      const json = await res.json().catch(() => ({}))
      return (json?.staff as MyStaffProfile) ?? null
    },
    enabled: !!orgId,
    staleTime: 60_000,
  })

  return { myStaff: query.data ?? null, isLoading: query.isLoading }
}
