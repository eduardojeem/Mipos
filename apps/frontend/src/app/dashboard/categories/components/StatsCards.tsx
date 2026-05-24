'use client';

import { CheckCircle, Package, Tag, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  const activeCategories = categories.filter((category) => category.is_active).length;
  const inactiveCategories = totalCategories - activeCategories;
  const totalProducts = categories.reduce((sum, category) => sum + (category._count?.products || 0), 0);
  const categoriesWithoutProducts = categories.filter((category) => (category._count?.products || 0) === 0).length;
  const activePercentage = totalCategories > 0 ? Math.round((activeCategories / totalCategories) * 100) : 0;

  const stats = [
    {
      title: 'Categorías',
      value: totalCategories,
      icon: Tag,
      subtitle: 'Total registradas',
    },
    {
      title: 'Activas',
      value: activeCategories,
      icon: CheckCircle,
      subtitle: `${activePercentage}% del total`,
    },
    {
      title: 'Inactivas',
      value: inactiveCategories,
      icon: XCircle,
      subtitle: 'Ocultas del catálogo',
    },
    {
      title: 'Productos',
      value: totalProducts,
      icon: Package,
      subtitle: `${categoriesWithoutProducts} categorías vacías`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.title} className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{stat.subtitle}</p>
                </div>
                <div className="rounded-md border bg-muted p-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
