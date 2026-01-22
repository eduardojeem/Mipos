'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingCart,
  User,
  LogOut,
  Settings,
  Shield,
  LayoutDashboard,
  Menu,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

// Navegación principal constante
const MAIN_NAV = [
  { name: 'Inicio', href: '/' },
  { name: 'Ofertas', href: '/offers?status=active' },
];

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { config } = useBusinessConfig();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userNavigation = useMemo(() => {
    if (!user) return [] as Array<{ name: string; href: string; icon: any }>;
    const entries: Array<{ name: string; href: string; icon: any }> = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
    ];
    if (user.role === 'ADMIN') entries.unshift({ name: 'Administración', href: '/admin', icon: Shield });
    return entries;
  }, [user]);

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b shadow-sm supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md transition-transform group-hover:scale-105 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                {config.branding?.logo ? (
                  <img src={config.branding.logo} alt="Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <ShoppingCart className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-bold tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">
                  {config.businessName || 'BeautyPOS'}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {config.tagline || 'Sistema de Ventas'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {MAIN_NAV.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  pathname === item.href
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 rounded-full pl-2 pr-4 gap-2 border border-transparent hover:border-border hover:bg-muted/50 transition-all">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium max-w-[100px] truncate hidden sm:block">
                      {user.name?.split(' ')[0] || 'Usuario'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name || 'Usuario'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userNavigation.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href} className="cursor-pointer">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="hidden sm:flex">
                  <Link href="/auth/signin">Ingresar</Link>
                </Button>
                <Button asChild className="rounded-full px-6 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0">
                  <Link href="/auth/signup">Empezar Gratis</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Trigger */}
            <div className="md:hidden ml-1">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
                  <SheetHeader className="p-6 border-b text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        {config.branding?.logo ? (
                          <img src={config.branding.logo} alt="Logo" className="w-full h-full object-contain bg-white rounded-lg" />
                        ) : (
                          <ShoppingCart className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <SheetTitle className="text-lg font-bold">{config.businessName || 'BeautyPOS'}</SheetTitle>
                        <p className="text-xs text-muted-foreground">{config.tagline || 'Sistema de Ventas'}</p>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex flex-col h-[calc(100vh-85px)] justify-between p-6">
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground px-2 mb-2">Navegación</h4>
                        {MAIN_NAV.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                              pathname === item.href
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted text-foreground/80"
                            )}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>

                      {user && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-muted-foreground px-2 mb-2">Mi Cuenta</h4>
                          {userNavigation.map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted text-foreground/80 transition-colors"
                            >
                              <item.icon className="h-4 w-4" />
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {user ? (
                        <Button
                          variant="destructive"
                          className="w-full justify-start gap-2"
                          onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                        >
                          <LogOut className="h-4 w-4" />
                          Cerrar Sesión
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" asChild className="w-full">
                            <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>Ingresar</Link>
                          </Button>
                          <Button asChild className="w-full">
                            <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>Registrarse</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}