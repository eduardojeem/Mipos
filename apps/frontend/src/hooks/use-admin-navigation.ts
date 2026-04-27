'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { adminNavigationConfig, ADMIN_SECTION_LABELS, type AdminNavItemConfig, type AdminSectionKey } from '@/lib/admin/navigation'
import { usePlanPermissions } from '@/hooks/use-plan-permissions'
import { useResolvedRole } from '@/hooks/use-auth'

function canAccessAdminItem(item: AdminNavItemConfig, role: string, access: ReturnType<typeof usePlanPermissions>) {
  const normalizedRole = role.toUpperCase()

  if (item.superAdminOnly) {
    return normalizedRole === 'SUPER_ADMIN'
  }

  if (item.requiredRoles && !item.requiredRoles.includes(normalizedRole) && !(normalizedRole === 'SUPER_ADMIN' && item.requiredRoles.includes('ADMIN'))) {
    return false
  }

  if (item.requireAdminPanel && normalizedRole !== 'SUPER_ADMIN' && !access.canAccessAdminPanel) {
    return false
  }

  if (item.requireReports && normalizedRole !== 'SUPER_ADMIN' && !access.canAccessAnalytics) {
    return false
  }

  if (item.requiredFeature && normalizedRole !== 'SUPER_ADMIN' && !access.hasFeature(item.requiredFeature)) {
    return false
  }

  return true
}

export function useAdminNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const resolvedRole = useResolvedRole()
  const planAccess = usePlanPermissions()
  const role = resolvedRole || 'USER'

  const items = useMemo(
    () => adminNavigationConfig.filter((item) => canAccessAdminItem(item, role, planAccess)),
    [role, planAccess.canAccessAdminPanel, planAccess.canAccessAnalytics, planAccess.canUseCustomBranding]
  )

  const sections = useMemo(() => {
    return Object.entries(
      items.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = []
        acc[item.section].push(item)
        return acc
      }, {} as Record<AdminSectionKey, AdminNavItemConfig[]>)
    ).map(([key, sectionItems]) => ({
      key: key as AdminSectionKey,
      label: ADMIN_SECTION_LABELS[key as AdminSectionKey],
      items: sectionItems,
    }))
  }, [items])

  const currentItem = useMemo(() => {
    return items.find((item) => {
      if (item.exact) return pathname === item.href
      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    }) || items.find((item) => item.href === '/admin') || null
  }, [items, pathname])

  const canAccessPath = useMemo(() => {
    return (path: string) => items.some((item) => {
      if (item.exact) return path === item.href
      return path === item.href || path.startsWith(`${item.href}/`)
    })
  }, [items])

  const ensureCurrentPathAccess = () => {
    if (!pathname.startsWith('/admin')) return
    if (!canAccessPath(pathname)) {
      const fallback = items[0]?.href || '/dashboard'
      router.replace(fallback)
    }
  }

  return {
    role,
    items,
    sections,
    currentItem,
    canAccessPath,
    ensureCurrentPathAccess,
    isLoading: planAccess.loading || !planAccess.isPlanResolved,
    canAccessAdminPanel: planAccess.canAccessAdminPanel || role === 'SUPER_ADMIN',
    canAccessReports: planAccess.canAccessAnalytics || role === 'SUPER_ADMIN',
  }
}
