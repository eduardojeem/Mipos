'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  Tag,
  Truck,
  BarChart3,
  Shield,
  Star,
  Percent,
  Home,
  Zap,
  DollarSign,
  Search,
  LogOut,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useIsAdmin } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavCategory } from './NavCategory';

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
  category?: string;
  description?: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  badge?: string;
  subItems?: Array<{
    name: string;
    href: string;
    icon: any;
    description?: string;
  }>;
};

export const navigation: NavItem[] = [
  {
    name: 'Dashboard Principal',
    href: '/dashboard',
    icon: Home,
    roles: ['ADMIN', 'CASHIER'],
    category: 'main',
    description: 'Vista general del sistema',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  {
    name: 'Punto de Venta',
    href: '/dashboard/pos',
    icon: ShoppingCart,
    roles: ['ADMIN', 'CASHIER'],
    category: 'sales',
    description: 'Procesar ventas y transacciones',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badge: 'Activo'
  },
  {
    name: 'Historial de Ventas',
    href: '/dashboard/sales',
    icon: FileText,
    roles: ['ADMIN', 'CASHIER'],
    category: 'sales',
    description: 'Ver y gestionar ventas realizadas',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    name: 'Promociones',
    href: '/dashboard/promotions',
    icon: Percent,
    roles: ['ADMIN', 'CASHIER'],
    category: 'sales',
    description: 'Administra ofertas y descuentos',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    name: 'Pedidos Web',
    href: '/dashboard/orders',
    icon: ShoppingBag,
    roles: ['ADMIN', 'CASHIER'],
    category: 'sales',
    description: 'Gestión de pedidos online',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    name: 'Productos',
    href: '/dashboard/products?tab=products',
    icon: Package,
    roles: ['ADMIN', 'CASHIER'],
    category: 'inventory',
    description: 'Gestión completa de productos',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800'
  },
  {
    name: 'Categorías',
    href: '/dashboard/categories',
    icon: Tag,
    roles: ['ADMIN'],
    category: 'inventory',
    description: 'Organizar productos por categorías',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800'
  },
  {
    name: 'Proveedores',
    href: '/dashboard/suppliers',
    icon: Truck,
    roles: ['ADMIN'],
    category: 'inventory',
    description: 'Gestión de proveedores',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800'
  },
  {
    name: 'Clientes',
    href: '/dashboard/customers',
    icon: Users,
    roles: ['ADMIN', 'CASHIER'],
    category: 'management',
    description: 'Gestión de base de clientes',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  {
    name: 'Caja',
    href: '/dashboard/cash',
    icon: DollarSign,
    roles: ['ADMIN', 'CASHIER'],
    category: 'management',
    description: 'Estado, movimientos y arqueos de caja',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  {
    name: 'Lealtad',
    href: '/dashboard/loyalty',
    icon: Star,
    roles: ['ADMIN', 'CASHIER'],
    category: 'management',
    description: 'Programas de fidelización',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  {
    name: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['ADMIN'],
    category: 'analytics',
    description: 'Análisis y estadísticas',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800'
  },
  {
    name: 'Administración',
    href: '/admin',
    icon: Shield,
    roles: ['ADMIN'],
    category: 'admin',
    description: 'Panel de administración del sistema',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  {
    name: 'Configuración',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['ADMIN'],
    category: 'admin',
    description: 'Configuración del sistema',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
];

const categories = {
  main: { 
    name: 'Principal', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    gradient: 'from-blue-500 to-cyan-500'
  },
  sales: { 
    name: 'Ventas', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    gradient: 'from-emerald-500 to-teal-500'
  },
  inventory: { 
    name: 'Inventario', 
    color: 'text-violet-600 dark:text-violet-400', 
    bgColor: 'bg-violet-50 dark:bg-violet-900/30',
    gradient: 'from-violet-500 to-purple-500'
  },
  management: { 
    name: 'Gestión', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    gradient: 'from-amber-500 to-orange-500'
  },
  analytics: { 
    name: 'Análisis', 
    color: 'text-indigo-600 dark:text-indigo-400', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
    gradient: 'from-indigo-500 to-blue-500'
  },
  content: { 
    name: 'Contenido', 
    color: 'text-cyan-600 dark:text-cyan-400', 
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/30',
    gradient: 'from-cyan-500 to-blue-500'
  },
  admin: { 
    name: 'Administración', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    gradient: 'from-red-500 to-rose-500'
  },
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('beautypos-sidebar-collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();

  const filteredNavigation = useMemo(() => {
    const userRole = user?.role || 'CASHIER';
    
    return navigation.filter(item => {
      const hasRole = !item.roles || item.roles.includes(userRole) || (userRole === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
      if (!hasRole) return false;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesSubItems = item.subItems?.some(sub => 
          sub.name.toLowerCase().includes(query) || 
          sub.description?.toLowerCase().includes(query)
        );
        
        return matchesName || matchesDescription || matchesSubItems;
      }
      
      return true;
    });
  }, [user, searchQuery]);

  const groupedNavigation = useMemo(() => filteredNavigation.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>), [filteredNavigation]);

  const toggleExpanded = useCallback((itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  }, []);

  const isItemActive = useCallback((href: string) => {
    if (!pathname) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  }, [pathname]);

  const isSubItemActive = useCallback((href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }, [pathname]);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const newState = !prev;
      try {
        localStorage.setItem('beautypos-sidebar-collapsed', String(newState));
      } catch {
        // ignore
      }
      return newState;
    });
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        id="main-sidebar" 
        role="complementary" 
        aria-label="Barra lateral de navegación" 
        className={cn(
          "flex flex-col h-screen bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 ease-in-out shadow-xl dark:shadow-slate-950/50",
          collapsed ? "w-[72px]" : "w-72"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-slate-800/50">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-lg bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  BeautyPOS
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sistema de Ventas</p>
              </div>
            </Link>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleCollapsed}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className={cn(
                  'h-4 w-4 transition-transform duration-300',
                  collapsed && 'rotate-180'
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expandir' : 'Colapsar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User Info */}
        {!collapsed && user && (
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user.email?.split('@')[0]}
                </p>
                <Badge
                  className={cn(
                    "text-[10px]",
                    user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                      ? "bg-gradient-to-r from-red-500 to-rose-500 text-white border-0"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {!collapsed && (
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar en menú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:border-violet-300 dark:focus:border-violet-600 transition-colors"
                aria-label="Buscar en el menú de navegación"
              />
            </div>
            {searchQuery && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {filteredNavigation.length} resultado{filteredNavigation.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-4" role="navigation" aria-label="Menú principal">
            {Object.entries(groupedNavigation).map(([categoryKey, items]) => {
              const category = categories[categoryKey as keyof typeof categories];

              return (
                <NavCategory
                  key={categoryKey}
                  categoryKey={categoryKey}
                  category={category}
                  items={items}
                  collapsed={collapsed}
                  expandedItems={expandedItems}
                  isItemActive={isItemActive}
                  isSubItemActive={isSubItemActive}
                  toggleExpanded={toggleExpanded}
                />
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-900/50 dark:to-transparent">
          {!collapsed ? (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
              <div className="text-center pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span>Sistema Operativo</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  © 2024 BeautyPOS v2.0
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-semibold text-sm">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
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
      </aside>
    </TooltipProvider>
  );
}
