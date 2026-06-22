'use client';

import type { ComponentType, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * Tarjeta reutilizable para secciones del editor business-config.
 * Mantiene consistencia visual en todos los editores.
 */
export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-background/80">
      <CardHeader className="border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-6 sm:p-8 sm:pt-8">{children}</CardContent>
    </Card>
  );
}
