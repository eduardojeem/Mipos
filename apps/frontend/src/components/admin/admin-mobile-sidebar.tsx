'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Menu,
  ShoppingCart,
  Zap,
  ChevronDown,
  LogOut,
  User,
  Home,
  Users,
  BarChart3,
  Database,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { adminNavItems } from './admin-sidebar';

const categoryConfig: Record<string, { icon: typeof Shield; color: string; gradient: string }> = {
  'Principal': { icon: Home, color: 'text-blue-500', gradient: 'from-blue-500 to-cyan-500' },
  'Gestión': { icon: Users, color: 'text-violet-500', gradient: 'from-violet-500 to-purple-500' },
  'Seguridad': { icon: Shield, color: 'text-red-500', gradient: 'from-red-500 to-orange-500' },
  'Análisis': { icon: BarChart3, color: 'text-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
  'Sistema': { icon: Database, color: 'text-amber-500', gradient: 'from-amber-500 to-yellow-500' },
  'Mantenimiento': { icon: Wrench, color: 'text-slate-500', gradient: 'from-slate-500 to-gray-500' }
}

const groupedNavItems = Object.entries(
  adminNavItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof adminNavItems>)
)

export function AdminMobileSidebar() {
  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['Principal', 'Gestión']);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
            aria-label="Abrir menú de administración"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="w-80 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60"
          onKeyDown={handleKeyDown}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de Administración</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white/50 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                  <p className="text-violet-200 text-sm">Control Center</p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Shield className="w-3 h-3 mr-1" />
                  Administrador
                </Badge>
              </div>
            </div>

            {/* Quick Link to Dashboard */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                asChild
                onClick={() => setOpen(false)}
              >
                <Link href="/dashboard">
                  <ShoppingCart className="h-4 w-4 text-slate-500" />
                  <span>Ir al Dashboard Principal</span>
                </Link>
              </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
              <nav className="space-y-3">
                {groupedNavItems.map(([category, items]) => {
                  const config = categoryConfig[category] || categoryConfig['Principal']
                  const CategoryIcon = config.icon
                  const isOpen = openCategories.includes(category)
                  const hasActiveItem = items.some(item => pathname === item.href)

                  return (
                    <Collapsible
                      key={category}
                      open={isOpen}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          hasActiveItem
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        )}>
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center',
                            `bg-gradient-to-br ${config.gradient}`
                          )}>
                            <CategoryIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="flex-1 text-left font-semibold">
                            {category}
                          </span>
                          <ChevronDown className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            isOpen && 'rotate-180'
                          )} />
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-1 mt-1 ml-2">
                        {items.map((item) => {
                          const isActive = pathname === item.href

                          return (
                            <Link 
                              key={item.href} 
                              href={item.href}
                              onClick={() => setOpen(false)}
                            >
                              <div className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                                isActive
                                  ? `bg-gradient-to-r ${config.gradient} text-white shadow-md`
                                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                              )}>
                                <item.icon className={cn(
                                  'h-4 w-4 flex-shrink-0',
                                  isActive ? 'text-white' : 'text-slate-400'
                                )} />

                                <div className="flex-1 min-w-0">
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

            {/* User Info */}
            {user && (
              <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-slate-900 dark:text-white">
                      {user.name || user.email?.split('@')[0] || 'Admin'}
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
                  className="w-full mt-3 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => {
                    setOpen(false)
                    signOut()
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
