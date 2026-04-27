'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { SettingsContent } from './components/SettingsContent'
import { SettingsLoadingSkeleton } from './components/SettingsLoadingSkeleton'
import { normalizeSettingsTab } from './components/settings-navigation'

function SettingsContentWrapper() {
  const searchParams = useSearchParams()
  const activeTab = normalizeSettingsTab(searchParams?.get('tab'))

  return <SettingsContent activeTab={activeTab} />
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <SettingsContentWrapper />
    </Suspense>
  )
}
