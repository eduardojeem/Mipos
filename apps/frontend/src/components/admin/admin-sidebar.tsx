'use client'

import Link from 'next/link'
import { ChevronLeft, LogOut, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useAdminSidebar } from './admin-sidebar-context'
import { useAdminNavigation } from '@/hooks/use-admin-navigation'

export function AdminSidebar() {
  const { isCollapsed, toggle } = useAdminSidebar()
  const { user, signOut } = useAuth()
  const { sections, currentItem, role } = useAdminNavigation()

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        'flex h-full flex-col border-r border-border bg-background/95 backdrop-blur',
        isCollapsed ? 'w-[80px]' : 'w-[320px]'
      )}>
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
              <h2 className="truncate text-lg font-semibold text-foreground">Centro de Control</h2>
            </div>
          )}

          <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8 rounded-lg">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
          </Button>
        </div>

        {!isCollapsed && currentItem && (
          <div className="border-b border-border px-4 py-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Seccion actual</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{currentItem.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentItem.description}</p>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-5">
            {sections.map((section) => (
              <div key={section.key} className="space-y-2">
                {!isCollapsed && (
                  <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {section.label}
                  </p>
                )}

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = currentItem?.href === item.href

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors',
                          isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{item.title}</span>
                            {item.superAdminOnly && (
                              <Badge variant={isActive ? 'secondary' : 'outline'} className="text-[10px]">SaaS</Badge>
                            )}
                          </div>
                          <p className={cn('mt-1 text-xs', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-border px-3 py-3">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user?.email || 'Administrador'}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{role}</p>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="mx-auto flex h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar sesion</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
