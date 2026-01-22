'use client';

import React from 'react';
import { Package, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface POSStatsProps {
    productsCount: number;
    cartItemsCount: number;
    cartTotal: number;
    salesToday?: number;
}

export function POSStats({ productsCount, cartItemsCount, cartTotal, salesToday = 0 }: POSStatsProps) {
    const stats = [
        {
            icon: Package,
            label: 'Productos',
            value: productsCount,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-950',
            textColor: 'text-blue-600 dark:text-blue-400',
        },
        {
            icon: ShoppingCart,
            label: 'En Carrito',
            value: cartItemsCount,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-50 dark:bg-green-950',
            textColor: 'text-green-600 dark:text-green-400',
        },
        {
            icon: DollarSign,
            label: 'Total',
            value: formatCurrency(cartTotal),
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-950',
            textColor: 'text-purple-600 dark:text-purple-400',
            isPrice: true,
        },
    ];

    if (salesToday > 0) {
        stats.push({
            icon: TrendingUp,
            label: 'Ventas Hoy',
            value: salesToday,
            color: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-50 dark:bg-orange-950',
            textColor: 'text-orange-600 dark:text-orange-400',
        });
    }

    return (
        <div className="hidden lg:flex items-center gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="flex items-center gap-2 group cursor-default"
                    >
                        {/* Icon container with gradient */}
                        <div className={`relative w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300`}>
                            {/* Animated glow effect on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />

                            <Icon className={`w-5 h-5 ${stat.textColor} relative z-10`} />
                        </div>

                        {/* Text */}
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                            <p className={`font-bold ${stat.textColor} text-sm`}>
                                {stat.isPrice ? stat.value : typeof stat.value === 'number' ? stat.value : stat.value}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
