'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuth } from '@/hooks/use-auth'
import { useAdminSidebar } from './admin-sidebar-context'
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  BarChart3,
  Database,
  FileText,
  Activity,
  ChevronLeft,
  ChevronDown,
  LogOut,
  User,
  Zap,
  HardDrive,
  Wrench,
  AlertTriangle,
  Sparkles,
  Home
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'


type AdminNavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  category: string
  badge?: string
  roles?: string[]
}

export const adminNavItems: AdminNavItem[] = [
  {
    title: 'Dashboard Admin',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Panel principal de administración',
    category: 'Principal'
  },
  {
    title: 'Super Admin Panel',
    href: '/superadmin',
    icon: Shield,
    description: 'Panel de Super Administrador SaaS',
    category: 'Principal',
    badge: 'SUPER',
    roles: ['SUPER_ADMIN']
  },
  {
    title: 'Usuarios',
    href: '/admin/users',
    icon: Users,
    description: 'Gestionar usuarios del sistema',
    category: 'Gestión'
  },
  {
    title: 'Roles y Permisos',
    href: '/admin/roles',
    icon: Shield,
    description: 'Configurar roles y permisos',
    category: 'Gestión'
  },
  {
    title: 'Auditoría',
    href: '/admin/audit',
    icon: FileText,
    description: 'Registro de auditoría',
    category: 'Seguridad'
  },
  {
    title: 'Sesiones',
    href: '/admin/sessions',
    icon: Activity,
    description: 'Gestión de sesiones',
    category: 'Seguridad'
  },

  {
    title: 'Reportes',
    href: '/admin/reports',
    icon: BarChart3,
    description: 'Reportes administrativos',
    category: 'Análisis'
  },
  {
    title: 'Configuración',
    href: '/admin/settings',
    icon: Settings,
    description: 'Configuración del sistema',
    category: 'Sistema'
  },
  {
    title: 'Config. del Negocio',
    href: '/admin/business-config',
    icon: Settings,
    description: 'Datos corporativos y branding',
    category: 'Sistema'
  },


  {
    title: 'Mantenimiento',
    href: '/admin/maintenance',
    icon: Wrench,
    description: 'Herramientas de mantenimiento',
    category: 'Mantenimiento'
  }
]

const categoryConfig: Record<string, { icon: typeof Shield; color: string; gradient: string }> = {
  'Principal': { icon: Home, color: 'text-blue-500', gradient: 'from-blue-500 to-cyan-500' },
  'Gestión': { icon: Users, color: 'text-violet-500', gradient: 'from-violet-500 to-purple-500' },
  'Seguridad': { icon: Shield, color: 'text-red-500', gradient: 'from-red-500 to-orange-500' },
  'Análisis': { icon: BarChart3, color: 'text-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
  'Sistema': { icon: Database, color: 'text-amber-500', gradient: 'from-amber-500 to-yellow-500' },
  'Mantenimiento': { icon: Wrench, color: 'text-slate-500', gradient: 'from-slate-500 to-gray-500' }
}

export function AdminSidebar() {
  const { isCollapsed, toggle } = useAdminSidebar()
  const [openCategories, setOpenCategories] = useState<string[]>(['Principal', 'Gestión', 'Seguridad'])
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const filteredItems = useMemo(() => {
    const userRole = user?.role || 'USER';
    return adminNavItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(userRole);
    })
  }, [user]);

  const groupedNavItems = useMemo(() => {
    return Object.entries(
      filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
      }, {} as Record<string, typeof adminNavItems>)
    )
  }, [filteredItems]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300 shadow-sm',
        isCollapsed ? 'w-[72px]' : 'w-72'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">
                  Admin Panel
                </h2>
                <p className="text-xs text-muted-foreground">Control Center</p>
              </div>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className={cn(
                  'h-4 w-4 transition-transform duration-300',
                  isCollapsed && 'rotate-180'
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expandir' : 'Colapsar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-4">
            {groupedNavItems.map(([category, items]) => {
              const config = categoryConfig[category] || categoryConfig['Principal']
              const CategoryIcon = config.icon
              const isOpen = openCategories.includes(category)
              const hasActiveItem = items.some(item => pathname === item.href)

              if (isCollapsed) {
                return (
                  <div key={category} className="space-y-1">
                    {items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link href={item.href}>
                              <div className={cn(
                                'flex items-center justify-center w-12 h-12 mx-auto rounded-xl transition-all duration-200 group',
                                isActive
                                  ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg`
                                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                              )}>
                                <item.icon className="h-5 w-5" />
                              </div>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="flex flex-col gap-1">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )
              }

              return (
                <Collapsible
                  key={category}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      hasActiveItem
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    )}>
                      <div className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center',
                        `bg-gradient-to-br ${config.gradient} bg-opacity-10`
                      )}>
                        <CategoryIcon className={cn('w-3.5 h-3.5', config.color)} />
                      </div>
                      <span className="flex-1 text-left text-xs uppercase tracking-wider">
                        {category}
                      </span>
                      <ChevronDown className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1 mt-1">
                    {items.map((item) => {
                      const isActive = pathname === item.href

                      return (
                        <Link key={item.href} href={item.href}>
                          <div className={cn(
                            'flex items-center gap-3 px-3 py-2.5 ml-2 rounded-xl transition-all duration-200 group relative overflow-hidden',
                            isActive
                              ? `bg-gradient-to-r ${config.gradient} text-white shadow-md`
                              : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/80'
                          )}>
                            {isActive && (
                              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                            )}

                            <item.icon className={cn(
                              'h-4 w-4 flex-shrink-0 relative z-10',
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                            )} />

                            <div className="flex-1 min-w-0 relative z-10">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{item.title}</p>
                                {item.badge && (
                                  <Badge
                                    variant={isActive ? 'secondary' : 'outline'}
                                    className={cn(
                                      'text-[10px] px-1.5 py-0',
                                      isActive ? 'bg-white/20 text-white border-white/30' : ''
                                    )}
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className={cn(
                                'text-xs truncate mt-0.5',
                                isActive ? 'text-white/70' : 'text-slate-400'
                              )}>
                                {item.description}
                              </p>
                            </div>

                            {isActive && (
                              <Sparkles className="h-4 w-4 text-white/80 relative z-10" />
                            )}
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

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-200/60 dark:border-slate-700/60">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 bg-muted/50 hover:bg-muted border-border"
              asChild
            >
              <Link href="/dashboard">
                <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                <span>Ir al Dashboard</span>
              </Link>
            </Button>
          </div>
        )}

        {/* User Info */}
        <div className="p-3 border-t border-border bg-muted/30">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-background border border-border">
                <div className="relative">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-slate-900 dark:text-white">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <Badge className="text-[10px] bg-gradient-to-r from-red-500 to-rose-500 text-white border-0">
                    <Shield className="w-2.5 h-2.5 mr-1" />
                    ADMIN
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Administrador</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => signOut()}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar Sesión</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
