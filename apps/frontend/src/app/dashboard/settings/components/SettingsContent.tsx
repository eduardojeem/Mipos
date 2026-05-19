'use client'

import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import SettingsSidebar from './SettingsSidebar'
import { usePlanSyncContext } from '@/contexts/plan-sync-context'
import { SettingsLoadingSkeleton } from './SettingsLoadingSkeleton'
import { Badge } from '@/components/ui/badge'
import { normalizeSettingsTab, getSettingsTabMeta } from './settings-navigation'
import {
  CompanyProfileSettings,
  GeneralSettings,
  InventorySettings,
  SalesBillingSettings,
  SecurityWorkspaceSettings,
} from './SettingsSections'

interface SettingsContentProps {
  activeTab: string
}

const AppearanceTab = dynamic(() => import('./AppearanceTab').then((module) => module.AppearanceTab), {
  ssr: false,
  loading: () => <SettingsLoadingSkeleton />,
})

export function SettingsContent({ activeTab }: SettingsContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { company, isLoading, planDisplayName } = usePlanSyncContext()
  const normalizedTab = normalizeSettingsTab(activeTab)
  const basePath = pathname?.startsWith('/admin') ? '/admin/settings' : '/dashboard/settings'

  useEffect(() => {
    if (isLoading || !company) return

    const isNewUser = !company.name || !company.industry || !company.size
    const isFreePlan = company.plan_type === 'free'

    if (isNewUser && isFreePlan && !['general', 'company'].includes(normalizedTab)) {
      router.replace(`${basePath}?tab=general`)
    }
  }, [company, isLoading, normalizedTab, router, basePath])

  const currentMeta = useMemo(() => getSettingsTabMeta(normalizedTab), [normalizedTab])

  const renderContent = () => {
    switch (normalizedTab) {
      case 'general':
        return <GeneralSettings />
      case 'company':
        return <CompanyProfileSettings />
      case 'sales':
        return <SalesBillingSettings />
      case 'inventory':
        return <InventorySettings />
      case 'appearance':
        return <AppearanceTab />
      case 'security':
        return <SecurityWorkspaceSettings />
      default:
        return <GeneralSettings />
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 gap-6">
        <SettingsSidebar />
        <div className="min-w-0 flex-1">
          <SettingsLoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 items-start gap-6">
      <SettingsSidebar />

      <main className="min-w-0 flex-1 space-y-6">
        {/* Contextual header — icon and name come from active tab */}
        <section className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <currentMeta.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{currentMeta.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{currentMeta.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {planDisplayName || company?.plan_type || 'Plan'}
            </Badge>
            {company?.name && (
              <Badge variant="outline">{company.name}</Badge>
            )}
          </div>
        </section>

        {renderContent()}
      </main>
    </div>
  )
}
