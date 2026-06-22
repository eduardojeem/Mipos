'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AdminSidebarProvider, useAdminSidebar } from './admin-sidebar-context'
import { AdminSidebar } from './admin-sidebar'
import { AdminHeader } from './admin-header'
import { AdminRouteGuard } from './admin-route-guard'

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useAdminSidebar()

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <AdminRouteGuard />

      {/* Premium Animated Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col">
          <AdminSidebar />
        </aside>

        <div
          className={cn(
            'flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-x-hidden',
            isCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[280px]'
          )}
        >
          <AdminHeader compact />

          <main className="flex-1 relative z-0">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
              <div className="animate-in fade-in zoom-in-95 duration-500 fill-mode-forwards">{children}</div>
            </div>
          </main>

          <footer className="mt-auto border-t border-border/40 bg-background/40 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p className="font-medium">Panel administrativo orientado a empresa, operación, análisis y seguridad.</p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Control por plan y rol</span>
                <span className="font-semibold text-foreground/80">MiPOS Admin</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <AdminSidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminSidebarProvider>
  )
}
