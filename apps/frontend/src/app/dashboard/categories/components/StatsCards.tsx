'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tag, CheckCircle, XCircle, Package } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryWithCount extends Category {
    _count?: {
        products: number;
    };
}

interface StatsCardsProps {
    categories: CategoryWithCount[];
}

export function StatsCards({ categories }: StatsCardsProps) {
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.is_active).length;
    const inactiveCategories = totalCategories - activeCategories;
    const totalProducts = categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);
    const categoriesWithoutProducts = categories.filter(c => (c._count?.products || 0) === 0).length;
    const activePercentage = totalCategories > 0 ? Math.round((activeCategories / totalCategories) * 100) : 0;

    const stats = [
        {
            title: 'Total Categorías',
            value: totalCategories,
            icon: Tag,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-950/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
        },
        {
            title: 'Activas',
            value: activeCategories,
            subtitle: `${activePercentage}% del total`,
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-50 dark:bg-green-950/20',
            iconColor: 'text-green-600 dark:text-green-400',
        },
        {
            title: 'Inactivas',
            value: inactiveCategories,
            icon: XCircle,
            color: 'from-gray-500 to-gray-600',
            bgColor: 'bg-gray-50 dark:bg-gray-950/20',
            iconColor: 'text-gray-600 dark:text-gray-400',
        },
        {
            title: 'Total Productos',
            value: totalProducts,
            subtitle: `${categoriesWithoutProducts} sin productos`,
            icon: Package,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-950/20',
            iconColor: 'text-purple-600 dark:text-purple-400',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in-50 duration-500">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card
                        key={stat.title}
                        className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-0 shadow-md"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2 flex-1">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </p>
                                    <p className="text-3xl font-bold tracking-tight">
                                        {stat.value}
                                    </p>
                                    {stat.subtitle && (
                                        <p className="text-xs text-muted-foreground">
                                            {stat.subtitle}
                                        </p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
