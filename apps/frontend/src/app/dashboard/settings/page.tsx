'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { SettingsContent } from './components/SettingsContent'
import { SettingsLoadingSkeleton } from './components/SettingsLoadingSkeleton'
import { normalizeSettingsTab } from './components/settings-navigation'

// El antiguo tab "Empresa" se consolidó en /admin/business-config.
const COMPANY_TAB_ALIASES = new Set(['company', 'business', 'empresa'])

function SettingsContentWrapper() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get('tab')?.trim().toLowerCase() || ''
  const movedToBusinessConfig = COMPANY_TAB_ALIASES.has(rawTab)

  useEffect(() => {
    if (movedToBusinessConfig) {
      router.replace('/admin/business-config')
    }
  }, [movedToBusinessConfig, router])

  if (movedToBusinessConfig) {
    return <SettingsLoadingSkeleton />
  }

  const activeTab = normalizeSettingsTab(rawTab)

  return <SettingsContent activeTab={activeTab} />
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <SettingsContentWrapper />
    </Suspense>
  )
}
