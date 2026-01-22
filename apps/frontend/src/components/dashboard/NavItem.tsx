'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';

interface NavItemProps {
    item: {
        name: string;
        href: string;
        icon: any;
        color?: string;
        bgColor?: string;
        borderColor?: string;
        badge?: string;
        description?: string;
        subItems?: Array<{
            name: string;
            href: string;
            icon: any;
            description?: string;
        }>;
    };
    isActive: boolean;
    collapsed: boolean;
    isExpanded?: boolean;
    onToggleExpanded?: () => void;
    isSubItemActive?: (href: string) => boolean;
}

// ✅ OPTIMIZACIÓN: Componente de sub-item memoizado
const SubNavItem = React.memo<{
    subItem: {
        name: string;
        href: string;
        icon: any;
        description?: string;
    };
    isActive: boolean;
}>(({ subItem, isActive }) => {
    const Icon = subItem.icon;

    return (
        <Link
            href={subItem.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                isActive
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
            )}
        >
            <Icon className="h-4 w-4 mr-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            <div className="flex-1">
                <div>{subItem.name}</div>
                {subItem.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subItem.description}
                    </div>
                )}
            </div>
        </Link>
    );
});

SubNavItem.displayName = 'SubNavItem';

// ✅ OPTIMIZACIÓN: Componente principal memoizado
export const NavItem = React.memo<NavItemProps>(({
    item,
    isActive,
    collapsed,
    isExpanded = false,
    onToggleExpanded,
    isSubItemActive
}) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const Icon = item.icon;

    const itemClasses = cn(
        "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        collapsed ? "justify-center" : "",
        isActive
            ? `${item.bgColor || 'bg-blue-50 dark:bg-blue-900/20'} ${item.color || 'text-blue-600 dark:text-blue-400'} shadow-sm ring-1 ${item.borderColor || 'ring-blue-200 dark:ring-blue-800'}`
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
    );

    const iconClasses = cn(
        "h-5 w-5 transition-colors",
        isActive
            ? item.color || 'text-blue-600 dark:text-blue-400'
            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
    );

    return (
        <div className="space-y-1">
            {/* Main Item */}
            <div className="relative group">
                {hasSubItems ? (
                    <button
                        onClick={onToggleExpanded}
                        className={cn(itemClasses, "w-full justify-between")}
                    >
                        <div className="flex items-center space-x-3">
                            <Icon className={iconClasses} />
                            {!collapsed && (
                                <div className="flex-1 text-left">
                                    <div className="font-medium">{item.name}</div>
                                    {item.description && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {!collapsed && (
                            <div className="flex items-center space-x-2">
                                {item.badge && (
                                    <Badge variant="secondary" className="text-xs">
                                        {item.badge}
                                    </Badge>
                                )}
                                <ChevronDown className={cn(
                                    "h-4 w-4 transition-transform duration-200",
                                    isExpanded ? "rotate-180" : ""
                                )} />
                            </div>
                        )}
                    </button>
                ) : (
                    <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={itemClasses}
                    >
                        <div className="flex items-center space-x-3">
                            <Icon className={iconClasses} />
                            {!collapsed && (
                                <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    {item.description && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {!collapsed && item.badge && (
                            <Badge variant="secondary" className="text-xs">
                                {item.badge}
                            </Badge>
                        )}
                    </Link>
                )}

                {/* Active Indicator */}
                {isActive && (
                    <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full",
                        item.color?.replace('text-', 'bg-') || 'bg-blue-600'
                    )} />
                )}
            </div>

            {/* Sub Items */}
            {hasSubItems && isExpanded && !collapsed && (
                <div className="ml-8 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {item.subItems?.map((subItem) => (
                        <SubNavItem
                            key={subItem.name}
                            subItem={subItem}
                            isActive={isSubItemActive?.(subItem.href) || false}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

NavItem.displayName = 'NavItem';
