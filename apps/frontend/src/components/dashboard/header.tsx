'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useNotifications } from '@/hooks/use-notifications';
import { useDeviceType } from '@/components/ui/responsive-layout';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  Menu, 
  X, 
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  LogOut,
  Shield,
  ExternalLink,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { SearchResults } from '@/components/search/SearchResults';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { cn } from '@/lib/utils';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { useUserOrganizations } from '@/hooks/use-user-organizations';

interface HeaderProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  compact?: boolean;
}

export function Header({ onMenuClick, isMobileMenuOpen, compact = false }: HeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { config } = useBusinessConfig();
  const { selectedOrganization } = useUserOrganizations(user?.id);
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    results,
    groupedResults,
    isLoading,
    isEmpty,
    hasResults
  } = useGlobalSearch(searchQuery);

  const {
    notifications,
    unreadCount,
    hasUnread,
    isLoading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotifications();

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSearchOpen || !hasResults) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].href);
          setIsSearchOpen(false);
          setSearchQuery('');
        }
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, hasResults, selectedIndex, results, router]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      setIsSearchOpen(true);
    }
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-violet-600 focus:text-white focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-lg focus:z-50"
        >
          Saltar al contenido
        </a>
        
        <div className={cn("flex h-16 items-center justify-between", compact ? 'px-4' : 'px-6')}>
          {/* Mobile menu button removed as per user request */}
          {/* 
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 rounded-lg"
            onClick={onMenuClick}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-controls="main-sidebar"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button> 
          */}

          {/* Branding pill (desktop) */}
          <div className="hidden lg:flex">
            <Link
              href="/dashboard"
              aria-label="Ir al Dashboard"
              className="group inline-flex items-center gap-3 rounded-xl px-3 py-2 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200"
            >
              <div className="relative">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-md overflow-hidden group-hover:scale-105 transition-transform">
                  {config.branding?.logo ? (
                    <img src={config.branding.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Zap className="w-4 h-4 text-white" />
                  )}
                </span>
              </div>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {config.businessName || 'BeautyPOS'}
                </span>
                {selectedOrganization?.name && (
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {selectedOrganization.name}
                  </span>
                )}
              </span>
            </Link>
          </div>

          {/* Search */}
          <div className="flex flex-1 items-center justify-center px-4 lg:px-8">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative w-full max-w-[220px] sm:max-w-sm lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder={
                      isMobile
                        ? "Buscar..."
                        : deviceType === 'tablet'
                          ? "Buscar productos..."
                          : "Buscar productos, clientes... (⌘K)"
                    }
                    className="pl-9 pr-4 text-sm h-10 bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:border-violet-300 dark:focus:border-violet-600 transition-all"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
                    aria-label="Buscar en el sistema"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <SearchResults
                  results={results}
                  groupedResults={groupedResults}
                  isLoading={isLoading}
                  isEmpty={isEmpty}
                  query={searchQuery}
                  selectedIndex={selectedIndex}
                  onSelect={(result) => {
                    router.push(result.href);
                    handleCloseSearch();
                  }}
                  onClose={handleCloseSearch}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5">
            {isMobile && (
              <div className="lg:hidden">
                <OrganizationSwitcher />
              </div>
            )}
            {/* Organization Switcher (SaaS multitenancy) */}
            {!isMobile && (
              <div className="hidden lg:block">
                <OrganizationSwitcher />
              </div>
            )}

            {/* Current Time (desktop only) */}
            {!isMobile && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium tabular-nums">{currentTime}</span>
              </div>
            )}

            {/* System Status */}
            {!isMobile && (
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
            )}

            <Separator orientation="vertical" className="h-6 mx-1 hidden lg:block" />

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Sync Status Indicator */}
            <SyncStatusIndicator size="sm" showDetails={!isMobile} />

            {/* Notifications */}
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-lg"
                  aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} nuevas)` : ''}`}
                >
                  <Bell className="h-4 w-4 text-slate-500" />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center animate-pulse">
                      <span className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 sm:w-96 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50"
                sideOffset={8}
              >
                <NotificationsList
                  notifications={notifications}
                  isLoading={notificationsLoading}
                  unreadCount={unreadCount}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onDelete={deleteNotification}
                  onClearAll={clearAll}
                  onClose={() => setIsNotificationsOpen(false)}
                />
              </PopoverContent>
            </Popover>

            {/* Settings (desktop) */}
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    asChild
                  >
                    <Link href="/dashboard/settings">
                      <Settings className="h-4 w-4 text-slate-500 hover:rotate-90 transition-transform duration-300" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configuración</TooltipContent>
              </Tooltip>
            )}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-800 shadow-md">
                        <AvatarImage
                          src={user?.avatar || '/avatars/default.png'}
                          alt={`Foto de perfil de ${user?.name || user?.email || 'Usuario'}`}
                          loading="lazy"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
                          {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                    </div>
                    {!isMobile && (
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {user?.name || user?.email?.split('@')[0] || 'Usuario'}
                        </p>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {user?.role || 'Usuario'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl" align="end" forceMount>
                {/* User Card */}
                <div className="p-3 mb-2 rounded-xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-indigo-500/20 border border-violet-200/50 dark:border-violet-700/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-lg font-bold">
                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user?.name || user?.email}</p>
                      <Badge className={cn(
                        "text-[10px] mt-1",
                        user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
                          ? "bg-gradient-to-r from-red-500 to-rose-500 text-white border-0"
                          : "bg-slate-100 dark:bg-slate-700"
                      )}>
                        <Shield className="w-2.5 h-2.5 mr-1" />
                        {user?.role || 'Usuario'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/dashboard/profile">
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>

                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem asChild className="rounded-lg gap-3 py-2.5">
                      <Link href="/admin">
                        <Shield className="h-4 w-4 text-red-500" />
                        <span>Panel de Admin</span>
                        <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
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
      </header>
    </TooltipProvider>
  );
}
