'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Calendar, Percent, Clock, AlertCircle, Package } from 'lucide-react';
import api from '@/lib/api';

interface Promotion {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
}

interface PromotionStatsProps {
  promotions: Promotion[];
  productCounts?: Record<string, number>; // ✅ Nueva prop
}

export function PromotionStats({ 
  promotions,
  productCounts = {} // ✅ Default value
}: PromotionStatsProps) {
  // ✅ Calcular total de productos desde los counts
  const totalProducts = useMemo(() => {
    return Object.values(productCounts).reduce((sum, count) => sum + count, 0);
  }, [productCounts]);

  const stats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let totalDiscount = 0;
    let discountCount = 0;

    promotions.forEach(promo => {
      const start = new Date(promo.startDate);
      const end = new Date(promo.endDate);

      if (promo.isActive) {
        if (now < start) {
          scheduled++;
        } else if (now > end) {
          expired++;
        } else {
          active++;
        }
      }

      if (promo.discountType === 'PERCENTAGE') {
        totalDiscount += promo.discountValue;
        discountCount++;
      }
    });

    const avgDiscount = discountCount > 0 ? (totalDiscount / discountCount).toFixed(1) : '0';

    return { active, scheduled, expired, avgDiscount, total: promotions.length };
  }, [promotions]);

  const statCards = [
    {
      title: 'Total',
      value: stats.total,
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Activas',
      value: stats.active,
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Programadas',
      value: stats.scheduled,
      icon: Clock,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      title: 'Productos',
      value: totalProducts,
      icon: Package,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      textColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Expiradas',
      value: stats.expired,
      icon: AlertCircle,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'Descuento Promedio',
      value: `${stats.avgDiscount}%`,
      icon: Percent,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      textColor: 'text-violet-600 dark:text-violet-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
