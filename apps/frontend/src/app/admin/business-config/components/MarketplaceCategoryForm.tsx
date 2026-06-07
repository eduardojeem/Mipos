'use client';

import {
  Store, Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home, Dumbbell,
  BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, UtensilsCrossed,
  Layers3, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarketplaceCategory } from '@/app/dashboard/settings/hooks/useMarketplaceCategory';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Laptop, Shirt, ShoppingCart, Pill, Sparkles,
  Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, Store, Layers3,
};

function CategoryIcon({ name, color }: { name: string | null; color: string }) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : Store;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: color }}>
      <Icon className="h-3.5 w-3.5 text-white" />
    </span>
  );
}

export function MarketplaceCategoryForm() {
  const {
    allCategories: marketplaceCategories,
    currentCategoryId,
    updateCategory: saveMarketplaceCategory,
    isSaving,
    isLoading,
  } = useMarketplaceCategory();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Rubro en el marketplace
        </CardTitle>
        <CardDescription>
          Los clientes encuentran tu empresa bajo esta categoría en <span className="font-medium">/home/categorias</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={currentCategoryId ?? '__none__'}
          onValueChange={(v) => saveMarketplaceCategory(v === '__none__' ? null : v)}
          disabled={isLoading || isSaving}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el rubro público…">
              {currentCategoryId ? (
                (() => {
                  const cat = marketplaceCategories.find((c) => c.id === currentCategoryId);
                  return cat ? (
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon ?? null} color={cat.color} />
                      {cat.name}
                    </span>
                  ) : 'Selecciona el rubro público…';
                })()
              ) : (
                <span className="text-muted-foreground">Sin rubro asignado</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground italic">Sin rubro asignado</span>
            </SelectItem>
            {marketplaceCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <CategoryIcon name={cat.icon ?? null} color={cat.color} />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentCategoryId ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Tu empresa aparece en el marketplace bajo este rubro.
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Sin rubro, tu empresa no aparecerá en el directorio del marketplace.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
