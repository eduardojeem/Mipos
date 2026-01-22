'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useAuth } from '@/hooks/use-auth'
import { AdminMobileSidebar } from './admin-mobile-sidebar'
import { adminNavItems } from './admin-sidebar'
import { cn } from '@/lib/utils'
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  ChevronRight,
  Command,
  Sparkles,
  Clock,
  Moon,
  Sun,
  Zap,
  ShoppingCart,
  Package,
  Users,
  FileText,
  HelpCircle,
  ExternalLink,
  Keyboard,
  TrendingUp,
  Calendar,
  RefreshCw
} from 'lucide-react'

const breadcrumbLabels: Record<string, string> = {
  'admin': 'Admin',
  'users': 'Usuarios',
  'roles': 'Roles y Permisos',
  'audit': 'Auditoría',
  'sessions': 'Sesiones',
  'conflicts': 'Conflictos',
  'reports': 'Reportes',
  'system': 'Sistema',
  'settings': 'Configuración',
  'business-config': 'Config. Negocio',

  'backup': 'Respaldos',
  'maintenance': 'Mantenimiento',
  'security': 'Seguridad',

}

const quickActions = [
  { label: 'Nueva Venta', href: '/dashboard/pos', icon: ShoppingCart, color: 'text-emerald-500' },
  { label: 'Agregar Producto', href: '/dashboard/products/create', icon: Package, color: 'text-blue-500' },
  { label: 'Ver Usuarios', href: '/admin/users', icon: Users, color: 'text-violet-500' },
  { label: 'Reportes', href: '/admin/reports', icon: FileText, color: 'text-amber-500' },
]

export function AdminHeader({ compact = false }: { compact?: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [isDark, setIsDark] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Check dark mode
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
  }

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
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
      isLast: index === segments.length - 1
    }))
  }, [pathname])

  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Stock Bajo',
      message: '8 productos requieren reabastecimiento',
      time: '5 min',
      unread: true,
      action: '/dashboard/products?filter=low_stock'
    },
    {
      id: 2,
      type: 'info',
      title: 'Actualización Disponible',
      message: 'Nueva versión del sistema disponible',
      time: '1 hora',
      unread: true,
      action: '/admin/system'
    },

  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <TooltipProvider delayDuration={0}>
      <header className={cn(
        'sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm',
        compact ? 'px-4 py-2' : 'px-6 py-3'
      )}>
        <div className="flex items-center justify-between gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <AdminMobileSidebar />

            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  {crumb.isLast ? (
                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Center Section - Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-slate-400 bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 group-hover:text-violet-500 transition-colors" />
              <span className="flex-1 text-left text-sm">Buscar en el panel...</span>
              <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 shadow-sm">
                <Command className="h-3 w-3" />K
              </kbd>
            </Button>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5">
            {/* Current Time */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium tabular-nums">{currentTime}</span>
            </div>

            {/* System Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 cursor-default">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Online</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Sistema Operativo</p>
                <p className="text-xs text-muted-foreground">Base de datos conectada</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1 hidden lg:block" />

            {/* Quick Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30"
                >
                  <Zap className="h-4 w-4 text-violet-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones Rápidas</p>
                </div>
                {quickActions.map((action) => (
                  <DropdownMenuItem key={action.href} asChild className="gap-3 cursor-pointer">
                    <Link href={action.href}>
                      <action.icon className={cn('h-4 w-4', action.color)} />
                      <span>{action.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-3 cursor-pointer">
                  <Link href="/admin">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <span>Ver Dashboard Admin</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Go to POS */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  asChild
                >
                  <Link href="/dashboard/pos">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ir al POS</TooltipContent>
            </Tooltip>

            {/* Dashboard */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  asChild
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4 text-blue-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dashboard Principal</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Dark Mode Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={toggleDarkMode}
                >
                  {isDark ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                  <Bell className="h-4 w-4 text-slate-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center animate-pulse">
                      <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Notificaciones</p>
                      <p className="text-xs text-slate-500">{unreadCount} sin leer</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:text-violet-700">
                    Marcar todo leído
                  </Button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <Link
                      key={notification.id}
                      href={notification.action}
                      className={cn(
                        'flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group',
                        notification.unread && 'bg-violet-50/50 dark:bg-violet-950/20',
                        index !== notifications.length - 1 && 'border-b border-slate-100 dark:border-slate-800'
                      )}
                    >
                      <div className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
                        notification.type === 'warning' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                        notification.type === 'info' && 'bg-gradient-to-br from-blue-400 to-indigo-500',
                        notification.type === 'success' && 'bg-gradient-to-br from-emerald-400 to-teal-500'
                      )}>
                        {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-white" />}
                        {notification.type === 'info' && <Sparkles className="h-5 w-5 text-white" />}
                        {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{notification.title}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                            <Clock className="h-3 w-3" />
                            {notification.time}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-violet-600 dark:text-violet-400 group-hover:underline">
                            Ver detalles →
                          </span>
                        </div>
                      </div>
                      {notification.unread && (
                        <div className="w-2.5 h-2.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex-shrink-0 mt-1 shadow-lg shadow-violet-500/30" />
                      )}
                    </Link>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50">
                  <Button
                    variant="outline"
                    className="w-full text-sm gap-2 hover:bg-white dark:hover:bg-slate-800"
                    asChild
                  >
                    <Link href="/admin/notifications">
                      <Bell className="h-4 w-4" />
                      Ver todas las notificaciones
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Link>
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4 text-slate-500 hover:rotate-90 transition-transform duration-300" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configuración</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-2 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="relative">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25 ring-2 ring-white dark:ring-slate-800">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {user?.email?.split('@')[0] || 'Admin'}
                    </p>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Admin</span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                {/* User Card */}
                <div className="p-3 mb-2 rounded-xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-indigo-500/20 border border-violet-200/50 dark:border-violet-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user?.email}</p>
                      <Badge className="text-[10px] bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 mt-1 shadow-sm">
                        <Shield className="w-2.5 h-2.5 mr-1" />
                        SUPER ADMIN
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-violet-200/30 dark:border-violet-700/30">
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>Desde 2024</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <RefreshCw className="w-3 h-3" />
                      <span>Activo</span>
                    </div>
                  </div>
                </div>

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/admin/profile">
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Mi Perfil</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/admin/security">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <span>Seguridad</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem className="rounded-lg gap-3 py-2.5" onClick={() => setSearchOpen(true)}>
                  <Keyboard className="h-4 w-4 text-slate-500" />
                  <span>Atajos de Teclado</span>
                  <kbd className="ml-auto text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">⌘K</kbd>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4 text-blue-500" />
                    <span>Dashboard Principal</span>
                    <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/dashboard/pos">
                    <ShoppingCart className="h-4 w-4 text-emerald-500" />
                    <span>Punto de Venta</span>
                    <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <a href="https://docs.beautypos.com" target="_blank" rel="noopener noreferrer">
                    <HelpCircle className="h-4 w-4 text-slate-500" />
                    <span>Centro de Ayuda</span>
                    <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                  </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-lg gap-3 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search */}
        <div className={cn('mt-3 md:hidden', compact && 'mt-2')}>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-slate-400 bg-slate-50/80 dark:bg-slate-800/50"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>Buscar en admin panel...</span>
          </Button>
        </div>
      </header>

      {/* Command Dialog for Search */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Buscar páginas, acciones, configuraciones..." />
        <CommandList>
          <CommandEmpty>
            <div className="py-6 text-center">
              <Search className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No se encontraron resultados</p>
              <p className="text-xs text-slate-400 mt-1">Intenta con otros términos de búsqueda</p>
            </div>
          </CommandEmpty>

          <CommandGroup heading="Acciones Rápidas">
            {quickActions.map((action) => (
              <CommandItem
                key={action.href}
                onSelect={() => {
                  setSearchOpen(false)
                  router.push(action.href)
                }}
                className="flex items-center gap-3 py-3"
              >
                <div className={cn('w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center', action.color)}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Páginas del Admin">
            {adminNavItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  setSearchOpen(false)
                  router.push(item.href)
                }}
                className="flex items-center gap-3 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-[10px]">{item.category}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </TooltipProvider>
  )
}
