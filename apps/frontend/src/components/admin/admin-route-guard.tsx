'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAdminNavigation } from '@/hooks/use-admin-navigation'

export function AdminRouteGuard() {
  const pathname = usePathname()
  const { isLoading, canAccessPath, ensureCurrentPathAccess } = useAdminNavigation()

  useEffect(() => {
    if (isLoading) return
    if (!pathname.startsWith('/admin')) return
    if (!canAccessPath(pathname)) {
      ensureCurrentPathAccess()
    }
  }, [isLoading, pathname, canAccessPath, ensureCurrentPathAccess])

  return null
}
