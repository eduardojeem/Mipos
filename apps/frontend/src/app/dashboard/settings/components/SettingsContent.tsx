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

    if (isNewUser && isFreePlan && normalizedTab !== 'general') {
      router.replace(`${basePath}?tab=general`)
    }
  }, [company, isLoading, normalizedTab, router, basePath])

  const currentMeta = useMemo(() => getSettingsTabMeta(normalizedTab), [normalizedTab])

  const renderContent = () => {
    switch (normalizedTab) {
      case 'general':
        return <GeneralSettings />
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
        {/* Premium Contextual Header */}
        <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-sm">
          {/* Subtle Background Gradients */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner border border-primary/10">
                <currentMeta.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{currentMeta.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{currentMeta.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0 bg-background/50 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50">
              <Badge variant="secondary" className="gap-1.5 font-semibold py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {planDisplayName || company?.plan_type || 'Plan'}
              </Badge>
              {company?.name && (
                <Badge variant="outline" className="font-semibold py-1 border-primary/20 text-primary bg-primary/5">
                  {company.name}
                </Badge>
              )}
            </div>
          </div>
        </section>

        {renderContent()}
      </main>
    </div>
  )
}
