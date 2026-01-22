'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Grid, 
  List, 
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

// Hook para detectar si es dispositivo móvil
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Retorna false durante SSR para evitar problemas de hidratación
  if (!mounted) return false;
  
  return isMobile;
}

// Hook para detectar orientación del dispositivo
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Retorna 'portrait' durante SSR para evitar problemas de hidratación
  if (!mounted) return 'portrait';

  return orientation;
}

// Componente de navegación móvil
interface MobileNavProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function MobileNav({ children, title = "Menú", className }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]" aria-labelledby="mobile-nav-title">
          <SheetHeader>
            <SheetTitle id="mobile-nav-title">{title}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full py-4">
            {children}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Componente de tarjeta móvil optimizada
interface MobileCardProps {
  title: string;
  subtitle?: string;
  content: ReactNode;
  actions?: ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ 
  title, 
  subtitle, 
  content, 
  actions, 
  badge, 
  badgeVariant = 'default',
  className,
  onClick 
}: MobileCardProps) {
  return (
    <Card 
      className={cn(
        "w-full cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
        onClick && "hover:bg-accent/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {badge && (
              <Badge variant={badgeVariant} className="text-xs">
                {badge}
              </Badge>
            )}
            {actions && (
              <div className="flex items-center gap-1">
                {actions}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}

// Componente de lista móvil
interface MobileListProps {
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    content?: ReactNode;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    actions?: ReactNode;
  }>;
  children?: ReactNode;
  onItemClick?: (id: string) => void;
  className?: string;
  emptyMessage?: string;
}

export function MobileList({ 
  items, 
  children,
  onItemClick, 
  className, 
  emptyMessage = "No hay elementos para mostrar" 
}: MobileListProps) {
  // If using children pattern
  if (children) {
    return (
      <div className={cn("space-y-3", className)}>
        {children}
      </div>
    );
  }

  // If using items pattern
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <MobileCard
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          content={item.content}
          badge={item.badge}
          badgeVariant={item.badgeVariant}
          actions={item.actions}
          onClick={() => onItemClick?.(item.id)}
        />
      ))}
    </div>
  );
}

// Componente de acciones móviles
interface MobileActionsProps {
  actions: Array<{
    label: string;
    icon: ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    disabled?: boolean;
  }>;
  className?: string;
}

export function MobileActions({ actions, className }: MobileActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto" aria-labelledby="mobile-actions-title">
          <SheetHeader>
            <SheetTitle id="mobile-actions-title">Acciones</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                className="justify-start h-12"
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                disabled={action.disabled}
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Componente de filtros móviles
interface MobileFiltersProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function MobileFilters({ children, title = "Filtros", className }: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {title}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]" aria-labelledby="mobile-filters-title">
          <SheetHeader>
            <SheetTitle id="mobile-filters-title">{title}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full py-4">
            {children}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Componente de búsqueda móvil
interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MobileSearch({ value, onChange, placeholder = "Buscar...", className }: MobileSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("md:hidden", className)}>
      {!isExpanded ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Componente de vista responsiva
interface ResponsiveViewProps {
  desktop: ReactNode;
  mobile: ReactNode;
  className?: string;
}

export function ResponsiveView({ desktop, mobile, className }: ResponsiveViewProps) {
  return (
    <div className={className}>
      <div className="hidden md:block">
        {desktop}
      </div>
      <div className="block md:hidden">
        {mobile}
      </div>
    </div>
  );
}

// Componente de grid responsivo
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, md: 3, lg: 4 }, 
  gap = 4,
  className 
}: ResponsiveGridProps) {
  const gridClasses = [
    `grid`,
    `gap-${gap}`,
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  );
}

// Componente de espaciado móvil
interface MobileSpacingProps {
  children: ReactNode;
  className?: string;
}

export function MobileSpacing({ children, className }: MobileSpacingProps) {
  return (
    <div className={cn("px-4 py-2 md:px-6 md:py-4", className)}>
      {children}
    </div>
  );
}

// Componente de contenedor móvil
interface MobileContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function MobileContainer({ 
  children, 
  className, 
  maxWidth = 'full' 
}: MobileContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      "w-full mx-auto px-4 sm:px-6 lg:px-8",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}

// Componente de tabs móviles
interface MobileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: ReactNode;
    badge?: string;
  }>;
  defaultTab?: string;
  className?: string;
}

export function MobileTabs({ tabs, defaultTab, className }: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={cn("w-full", className)}>
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto scrollbar-hide border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              "whitespace-nowrap min-w-0",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge && (
                <Badge variant="secondary" className="text-xs">
                  {tab.badge}
                </Badge>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

// Componente de acordeón móvil
interface MobileAccordionProps {
  items: Array<{
    id: string;
    title: string;
    content: ReactNode;
    defaultOpen?: boolean;
  }>;
  className?: string;
  allowMultiple?: boolean;
}

export function MobileAccordion({ items, className, allowMultiple = false }: MobileAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(items.filter(item => item.defaultOpen).map(item => item.id))
  );

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader 
            className="cursor-pointer py-3"
            onClick={() => toggleItem(item.id)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              {openItems.has(item.id) ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          {openItems.has(item.id) && (
            <CardContent className="pt-0">
              {item.content}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}