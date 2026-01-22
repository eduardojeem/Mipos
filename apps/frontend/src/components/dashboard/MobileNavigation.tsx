'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NavSubItem {
    name: string;
    href: string;
    icon: any;
    description?: string;
}

interface NavItem {
    name: string;
    href: string;
    icon: any;
    badge?: string;
    description?: string;
    color?: string;
    bgColor?: string;
    borderColor?: string;
    subItems?: NavSubItem[];
}

interface MobileNavigationProps {
    items: NavItem[];
    onItemClick?: () => void;
}

export function MobileNavigation({ items, onItemClick }: MobileNavigationProps) {
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const pathname = usePathname();

    const toggleExpanded = useCallback((itemName: string) => {
        setExpandedItems(prev =>
            prev.includes(itemName)
                ? prev.filter(name => name !== itemName)
                : [...prev, itemName]
        );
    }, []);

    const isActive = useCallback((href: string) => {
        if (!pathname) return false;
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    }, [pathname]);

    const handleLinkClick = useCallback(() => {
        // Cerrar el sheet/modal al hacer click en un link
        onItemClick?.();
    }, [onItemClick]);

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        
        const query = searchQuery.toLowerCase();
        return items.filter(item => {
            const matchesName = item.name.toLowerCase().includes(query);
            const matchesDescription = item.description?.toLowerCase().includes(query);
            const matchesSubItems = item.subItems?.some(sub => 
                sub.name.toLowerCase().includes(query) || 
                sub.description?.toLowerCase().includes(query)
            );
            
            return matchesName || matchesDescription || matchesSubItems;
        });
    }, [items, searchQuery]);

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="p-3 border-b border-border dark:border-slate-800 bg-gradient-to-br from-transparent to-slate-50/30 dark:to-slate-900/30">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-slate-500 pointer-events-none" />
                    <Input
                        type="search"
                        placeholder="Buscar en menú..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9 h-10 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 focus:dark:bg-slate-900/70 focus:dark:border-slate-700"
                        aria-label="Buscar en el menú de navegación"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 dark:hover:bg-slate-800"
                            onClick={() => setSearchQuery('')}
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {searchQuery && (
                    <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">
                        {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto space-y-1 p-3" role="navigation" aria-label="Navegación principal móvil">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isItemActive = isActive(item.href);
                const isExpanded = expandedItems.includes(item.name);
                const Icon = item.icon;

                if (hasSubItems) {
                    return (
                        <div key={item.name} className="space-y-1">
                            {/* Parent Item with Accordion */}
                            <button
                                onClick={() => toggleExpanded(item.name)}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                                    isItemActive
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white shadow-lg dark:shadow-blue-900/50'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:shadow-sm'
                                )}
                                aria-expanded={isExpanded}
                                aria-controls={`submenu-${item.name}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                    <span className="truncate">{item.name}</span>
                                    {item.badge && (
                                        <Badge variant="secondary" className="text-xs">
                                            {item.badge}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 transition-transform" aria-hidden="true" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 transition-transform" aria-hidden="true" />
                                    )}
                                </div>
                            </button>

                            {/* Sub Items with Slide Animation */}
                            {isExpanded && (
                                <div
                                    id={`submenu-${item.name}`}
                                    className="ml-4 space-y-0.5 border-l-2 border-blue-200 dark:border-blue-800 pl-3 animate-in slide-in-from-top-2"
                                    role="group"
                                    aria-label={`Sub-menú de ${item.name}`}
                                >
                                    {item.subItems!.map((subItem) => {
                                        const SubIcon = subItem.icon;
                                        const isSubActive = isActive(subItem.href);

                                        return (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                onClick={handleLinkClick}
                                                className={cn(
                                                    'flex items-start space-x-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
                                                    isSubActive
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                                )}
                                                aria-current={isSubActive ? 'page' : undefined}
                                            >
                                                <SubIcon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate">{subItem.name}</div>
                                                    {subItem.description && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-500 truncate mt-0.5">
                                                            {subItem.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                }

                // Simple Item (sin sub-items)
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={handleLinkClick}
                        className={cn(
                            'flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                            isItemActive
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white shadow-lg dark:shadow-blue-900/50'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:scale-[1.02] hover:shadow-sm'
                        )}
                        aria-current={isItemActive ? 'page' : undefined}
                    >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
                                {item.badge}
                            </Badge>
                        )}
                    </Link>
                );
            })
                ) : (
                    <div className="text-center py-12 text-muted-foreground dark:text-slate-500">
                        <Search className="h-12 w-12 mx-auto mb-3 opacity-50 dark:opacity-30" />
                        <p className="text-sm font-medium dark:text-slate-400">No se encontraron resultados</p>
                        <p className="text-xs mt-1 dark:text-slate-500">Intenta con otros términos de búsqueda</p>
                    </div>
                )}
            </nav>
        </div>
    );
}
