'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Menu,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  mobileSidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function ResponsiveLayout({
  children,
  sidebar,
  mobileSidebar,
  header,
  className
}: ResponsiveLayoutProps) {
  const { config } = useBusinessConfig();
  const businessName = config.businessName || 'Mi empresa';
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  const DeviceIndicator = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div
        className="fixed bottom-4 left-4 z-[999] bg-slate-900/90 dark:bg-slate-800/90 text-white px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 shadow-lg border border-slate-700/50 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-label={`Modo de visualización: ${deviceType}`}
      >
        {deviceType === 'mobile' && <Smartphone className="w-4 h-4 text-blue-400" aria-hidden="true" />}
        {deviceType === 'tablet' && <Tablet className="w-4 h-4 text-violet-400" aria-hidden="true" />}
        {deviceType === 'desktop' && <Monitor className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
        <span className="capitalize">{deviceType}</span>
        <span className="text-slate-400 ml-2">
          {typeof window !== 'undefined' && `${window.innerWidth}×${window.innerHeight}`}
        </span>
      </div>
    );
  };

  // Mobile Layout
  if (deviceType === 'mobile') {
    return (
      <div className={cn(
        "min-h-screen bg-slate-50 dark:bg-slate-950",
        className
      )}>
        <DeviceIndicator />

        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between">
            {(mobileSidebar || sidebar) && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80"
                    aria-label="Abrir menú de navegación"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-80 p-0 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50"
                  aria-describedby={undefined}
                >
                  <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                  <SheetDescription className="sr-only">Navegación principal</SheetDescription>

                  <div className="flex-1 overflow-y-auto">
                    {mobileSidebar || sidebar}
                  </div>

                  <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {businessName} © {new Date().getFullYear()}
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <div className="flex-1 px-4">
              {header}
            </div>
          </div>
        </div>

        <main id="main-content" className="relative z-10 p-4">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Tablet Layout
  if (deviceType === 'tablet') {
    return (
      <div className={cn(
        "min-h-screen bg-slate-50 dark:bg-slate-950",
        className
      )}>
        <DeviceIndicator />

        <div className="relative flex h-screen">
          {/* Tablet Sidebar */}
          {sidebar && (
            <aside className="flex flex-col h-full z-20">
              {sidebar}
            </aside>
          )}

          {/* Tablet Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tablet Header */}
            {header && (
              <div className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                {header}
              </div>
            )}

            {/* Tablet Content */}
            <main id="main-content" className="relative z-10 flex-1 overflow-y-auto p-6">
              <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
                {children}
              </div>
            </main>

            {/* Tablet Footer */}
            <footer className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="px-6 py-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <p>© {new Date().getFullYear()} {businessName}</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span>Sistema en linea</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={cn(
      "min-h-screen bg-slate-50 dark:bg-slate-950",
      className
    )}>
      <DeviceIndicator />

      <div className="relative flex h-screen">
        {/* Desktop Sidebar */}
        {sidebar && (
          <aside className="flex flex-col h-full z-20">
            {sidebar}
          </aside>
        )}

        {/* Desktop Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop Header */}
          {header && (
            <div className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
              {header}
            </div>
          )}

          {/* Desktop Content */}
          <main id="main-content" className="relative z-10 flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
              {children}
            </div>
          </main>

          {/* Desktop Footer */}
          <footer className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-8 py-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <p>© {new Date().getFullYear()} {businessName}. Todos los derechos reservados.</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span>Sistema en linea</span>
                  </div>
                  <span>MITIENDA</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// Hook para detectar el tipo de dispositivo
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  return deviceType;
}

// Componente para grids responsivos
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export function ResponsiveGrid({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 }
}: ResponsiveGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      `grid-cols-${cols.mobile}`,
      `md:grid-cols-${cols.tablet}`,
      `lg:grid-cols-${cols.desktop}`,
      className
    )}>
      {children}
    </div>
  );
}

// Componente para contenedores responsivos
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function ResponsiveContainer({
  children,
  className,
  size = 'lg'
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      "mx-auto px-4 sm:px-6 lg:px-8",
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
}
