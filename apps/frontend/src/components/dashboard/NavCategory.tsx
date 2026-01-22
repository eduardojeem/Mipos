'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NavItem } from './NavItem';

type NavItemType = {
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

interface NavCategoryProps {
    categoryKey: string;
    category: {
        name: string;
        color: string;
        bgColor: string;
    };
    items: NavItemType[];
    collapsed: boolean;
    expandedItems: string[];
    isItemActive: (href: string) => boolean;
    isSubItemActive: (href: string) => boolean;
    toggleExpanded: (itemName: string) => void;
}

// ✅ OPTIMIZACIÓN: Categoría de navegación memoizada
export const NavCategory = React.memo<NavCategoryProps>(({
    categoryKey,
    category,
    items,
    collapsed,
    expandedItems,
    isItemActive,
    isSubItemActive,
    toggleExpanded
}) => {
    if (items.length === 0) return null;

    return (
        <div className="space-y-2">
            {/* Category Header */}
            {!collapsed && category && (
                <div className="flex items-center space-x-2 px-2 py-1.5 mb-3">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        category.color.replace('text-', 'bg-')
                    )} />
                    <span className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        category.color
                    )}>
                        {category.name}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
                </div>
            )}

            {/* Navigation Items */}
            {items.map((item) => (
                <NavItem
                    key={item.name}
                    item={item}
                    isActive={isItemActive(item.href)}
                    collapsed={collapsed}
                    isExpanded={expandedItems.includes(item.name)}
                    onToggleExpanded={() => toggleExpanded(item.name)}
                    isSubItemActive={isSubItemActive}
                />
            ))}
        </div>
    );
});

NavCategory.displayName = 'NavCategory';
