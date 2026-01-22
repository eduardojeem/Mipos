'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SupplierSection } from '../config/navigation';

interface NavigationCardProps {
  section: SupplierSection;
}

export const NavigationCard = memo(function NavigationCard({
  section,
}: NavigationCardProps) {
  const Icon = section.icon;

  return (
    <Link href={section.href}>
      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 h-full">
        <CardContent className="p-4 text-center">
          <div className="relative">
            <Icon className={`h-8 w-8 mx-auto mb-2 ${section.color}`} />
            {section.badge && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {section.badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm mb-1">{section.label}</h3>
          <p className="text-xs text-muted-foreground">{section.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
});
