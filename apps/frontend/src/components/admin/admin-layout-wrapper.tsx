'use client'

import { ReactNode } from 'react'
import { AdminSidebarProvider, useAdminSidebar } from './admin-sidebar-context'
import { AdminSidebar } from './admin-sidebar'
import { AdminHeader } from './admin-header'
import { cn } from '@/lib/utils'

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useAdminSidebar()

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations - Subtle and neutral */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
          <AdminSidebar />
        </aside>

        {/* Main Content - Adjusts based on sidebar state */}
        <div className={cn(
          'flex flex-1 flex-col transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-72'
        )}>
          <AdminHeader compact />
          
          <main className="flex-1 overflow-y-auto bg-muted/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
              </div>
            </div>
          </main>
          
          {/* Footer */}
          <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-7xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} BeautyPOS. Panel de Administración.</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Sistema Operativo
                  </span>
                  <span>v2.0.0</span>
                </div>
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
