'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting'

/**
 * Botón flotante "Reservar turno" para el sitio público de una barbería.
 * Se muestra solo si la organización tiene servicios Y profesionales activos
 * (señal de que acepta reservas online). Así no aparece en tiendas retail.
 */
export function BookingFloatingButton({ organizationId }: { organizationId: string }) {
  const [visible, setVisible] = useState(false)
  const { tenantHref } = useTenantPublicRouting()

  useEffect(() => {
    if (!organizationId) return
    let active = true
    const qs = new URLSearchParams({ organizationId }).toString()
    Promise.all([
      fetch(`/api/services/public?${qs}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/staff/public?${qs}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    ]).then(([sv, st]) => {
      if (!active) return
      const hasServices = Array.isArray(sv?.services) && sv.services.length > 0
      const hasStaff = Array.isArray(st?.staff) && st.staff.length > 0
      setVisible(hasServices && hasStaff)
    })
    return () => { active = false }
  }, [organizationId])

  if (!visible) return null

  return (
    <Link
      href={tenantHref('/reservar')}
      className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
    >
      <CalendarPlus className="h-4 w-4" />
      Reservar turno
    </Link>
  )
}
