'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PremiumDashboardCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'glass';
  delay?: number;
  onClick?: () => void;
}

export function PremiumDashboardCard({
  children,
  className,
  variant = 'default',
  onClick,
}: PremiumDashboardCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'overflow-hidden border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      {children}
    </Card>
  );
}
