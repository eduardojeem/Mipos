'use client';

import { memo } from 'react';
import { NavigationCard } from './NavigationCard';
import { SUPPLIER_SECTIONS } from '../config/navigation';

export const NavigationGrid = memo(function NavigationGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {SUPPLIER_SECTIONS.map((section) => (
        <NavigationCard key={section.href} section={section} />
      ))}
    </div>
  );
});
