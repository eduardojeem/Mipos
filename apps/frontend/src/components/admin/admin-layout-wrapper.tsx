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
    <div className="min-h-screen bg-background">
      <AdminRouteGuard />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.07),transparent_26%)]" />
      </div>

      <div className="relative flex h-screen">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col">
          <AdminSidebar />
        </aside>

        <div
          className={cn(
            'flex flex-1 flex-col transition-all duration-300 ease-in-out',
            isCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[320px]'
          )}
        >
          <AdminHeader compact />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
            </div>
          </main>

          <footer className="border-t border-border/80 bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p>Panel administrativo orientado a empresa, operacion, analisis y seguridad.</p>
              <div className="flex items-center gap-4">
                <span>Control por plan y rol</span>
                <span>MiPOS Admin</span>
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
