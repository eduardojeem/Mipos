'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Command,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useAdminNavigation } from '@/hooks/use-admin-navigation'
import { AdminMobileSidebar } from './admin-mobile-sidebar'
import { cn } from '@/lib/utils'

const breadcrumbLabels: Record<string, string> = {
  admin: 'Admin',
  users: 'Usuarios',
  roles: 'Roles',
  audit: 'Auditoria',
  sessions: 'Sesiones',
  reports: 'Reportes',
  security: 'Seguridad',
  profile: 'Perfil',
  'business-config': 'Empresa',
  subscriptions: 'Plan y Suscripcion',
  plans: 'Planes SaaS',
  maintenance: 'Mantenimiento',
}

export function AdminHeader({ compact = false }: { compact?: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { role, currentItem, items, canAccessAdminPanel, canAccessReports } = useAdminNavigation()

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const breadcrumbs = useMemo(() => {
    const segments = pathname?.split('/').filter(Boolean) || []

    return segments.map((segment, index) => ({
      label: breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: '/' + segments.slice(0, index + 1).join('/'),
      isLast: index === segments.length - 1,
    }))
  }, [pathname])

  const quickLinks = useMemo(() => {
    return items
      .filter((item) => item.href !== pathname)
      .slice(0, 4)
  }, [items, pathname])

  return (
    <>
      <header
        className={cn(
          'border-b border-border bg-background/80 backdrop-blur-xl',
          compact ? 'px-4 py-3 lg:px-6' : 'px-6 py-4'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AdminMobileSidebar />

            <div className="hidden min-w-0 sm:block">
              <nav className="flex items-center gap-1 text-sm">
                <Link href="/admin" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Admin
                </Link>
                {breadcrumbs.slice(1).map((crumb) => (
                  <div key={crumb.href} className="flex min-w-0 items-center gap-1">
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    {crumb.isLast ? (
                      <span className="truncate font-semibold text-foreground">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>

              {currentItem && (
                <div className="mt-1">
                  <h1 className="truncate text-lg font-semibold text-foreground">{currentItem.title}</h1>
                  <p className="truncate text-sm text-muted-foreground">{currentItem.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="hidden max-w-md flex-1 md:flex">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-muted/40 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left text-sm">Buscar en administracion</span>
              <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium">
                <Command className="h-3 w-3" />
                K
              </kbd>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden gap-1 lg:inline-flex">
              <Shield className="h-3 w-3" />
              {role}
            </Badge>

            <Badge variant={canAccessAdminPanel ? 'default' : 'secondary'} className="hidden lg:inline-flex">
              {canAccessAdminPanel ? 'Admin habilitado' : 'Admin restringido'}
            </Badge>

            <Badge variant={canAccessReports ? 'outline' : 'secondary'} className="hidden xl:inline-flex">
              {canAccessReports ? 'Reportes activos' : 'Sin reportes'}
            </Badge>

            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 rounded-xl px-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden text-left lg:block">
                    <p className="max-w-[180px] truncate text-sm font-medium text-foreground">
                      {user?.email || 'Administrador'}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2">
                  <p className="truncate text-sm font-medium text-foreground">{user?.email || 'Administrador'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Acceso definido por rol y por plan de la empresa.
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile">
                    <User className="mr-2 h-4 w-4" />
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuracion
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className={cn('mt-3 md:hidden', compact && 'mt-2')}>
          <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" />
            <span>Buscar en administracion</span>
          </Button>
        </div>
      </header>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Buscar modulos, rutas o configuraciones..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>

          {quickLinks.length > 0 && (
            <>
              <CommandGroup heading="Siguiente paso">
                {quickLinks.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => {
                      setSearchOpen(false)
                      router.push(item.href)
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Secciones administrativas">
            {items.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  setSearchOpen(false)
                  router.push(item.href)
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {item.superAdminOnly && <Badge variant="outline">SaaS</Badge>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
