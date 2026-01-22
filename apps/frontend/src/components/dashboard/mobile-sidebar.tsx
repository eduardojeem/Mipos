'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { navigation as sidebarNavigation, type NavItem as SidebarNavItem } from '@/components/dashboard/sidebar';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { config } = useBusinessConfig();

  const filteredNavigation: SidebarNavItem[] = sidebarNavigation.filter(item => {
    const userRole = user?.role || 'CASHIER';
    if (!item.roles) return true;
    return item.roles.includes(userRole) || (userRole === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
  });

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
            className="fixed top-4 left-4 z-50 lg:hidden bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white/90 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Abrir menú de navegación"
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-80 p-0 focus:outline-none"
          onKeyDown={handleKeyDown}
          aria-labelledby="mobile-nav-title"
          aria-describedby="mobile-nav-description"
        >
          <SheetHeader className="sr-only">
            <SheetTitle id="mobile-nav-title">Menú de Navegación</SheetTitle>
          </SheetHeader>
          <div
            className="flex flex-col h-full bg-white dark:bg-gray-800"
            id="mobile-navigation"
            role="navigation"
            aria-label="Navegación principal"
          >
            <div className="sr-only" id="mobile-nav-description">
              Menú de navegación del sistema POS con acceso a todas las funcionalidades
            </div>

            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
                  role="img"
                  aria-label="Logo del sistema POS"
                >
                  {config.branding?.logo ? (
                    <img src={config.branding.logo} alt="Logo" className="w-full h-full object-contain bg-white" />
                  ) : (
                    <ShoppingCart className="w-6 h-6 text-white" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {config.businessName || 'BeautyPOS'}
                  </h1>
                </div>
              </div>
            </div>

            <nav
              className="flex-1 p-6 space-y-2 overflow-y-auto"
              role="navigation"
              aria-label="Menú principal"
            >
              {filteredNavigation.map((item, index) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && (pathname?.startsWith(item.href) ?? false));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 hover:scale-105'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    aria-describedby={`nav-item-${index}`}
                    tabIndex={0}
                  >
                    <item.icon className="h-5 w-5 mr-3" aria-hidden="true" />
                    <span>{item.name}</span>
                    <span className="sr-only" id={`nav-item-${index}`}>
                      {isActive ? ' - Página actual' : ''}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div
                className="p-6 border-t border-gray-200 dark:border-gray-700"
                role="region"
                aria-label="Información del usuario"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                    role="img"
                    aria-label={`Avatar de ${user.name || user.full_name || user.email?.split('@')[0] || 'Usuario'}`}
                  >
                    <span className="text-lg font-bold text-white" aria-hidden="true">
                      {(user.name || user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {user.name || user.full_name || user.email?.split('@')[0] || 'Usuario'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      <span className="sr-only">Rol: </span>
                      {user.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
