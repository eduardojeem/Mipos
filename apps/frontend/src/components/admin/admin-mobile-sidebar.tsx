'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Menu, ChevronDown, LogOut, Shield, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAdminNavigation } from '@/hooks/use-admin-navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export function AdminMobileSidebar() {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { sections, currentItem, role } = useAdminNavigation()

  const defaultOpen = useMemo(() => sections.slice(0, 2).map((section) => section.key), [sections])
  const [openSections, setOpenSections] = useState<string[]>(defaultOpen)

  const toggleSection = (key: string) => {
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border bg-background">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegacion administrativa</SheetTitle>
          </SheetHeader>

          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
                  <h2 className="text-lg font-semibold text-foreground">Centro de Control</h2>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {role}
                </Badge>
              </div>

              {currentItem && (
                <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Actual</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{currentItem.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentItem.description}</p>
                </div>
              )}

              <Button variant="outline" className="mt-4 w-full justify-start gap-2" asChild onClick={() => setOpen(false)}>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al dashboard
                </Link>
              </Button>
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
              <nav className="space-y-3">
                {sections.map((section) => {
                  const isOpen = openSections.includes(section.key)

                  return (
                    <Collapsible key={section.key} open={isOpen} onOpenChange={() => toggleSection(section.key)}>
                      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted">
                        <span className="flex-1">{section.label}</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 pt-1">
                        {section.items.map((item) => {
                          const isActive = currentItem?.href === item.href

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                'flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors',
                                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                              )}
                            >
                              <item.icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium">{item.title}</span>
                                  {item.superAdminOnly && <Badge variant={isActive ? 'secondary' : 'outline'} className="text-[10px]">SaaS</Badge>}
                                </div>
                                <p className={cn('mt-1 text-xs', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                                  {item.description}
                                </p>
                              </div>
                            </Link>
                          )
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </nav>
            </ScrollArea>

            <div className="border-t border-border px-4 py-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="truncate text-sm font-medium text-foreground">{user?.email || 'Administrador'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{role}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
