'use client';

import React from 'react';
import { ProductsHeader } from './ProductsHeader';
import { ProductsTabs } from './ProductsTabs';
import { SkipNavigation } from '@/components/ui/skip-navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LayoutDashboard } from 'lucide-react';

export default function ProductsPageContent() {
  return (
    <>
      <SkipNavigation />
      <div id="main-content" className="container mx-auto p-6 space-y-6 min-h-screen bg-background dark:bg-slate-900 transition-colors duration-300" role="main">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/', icon: LayoutDashboard },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Productos', href: '/dashboard/products', isCurrentPage: true }
          ]}
        />

        <ProductsHeader />
        <ProductsTabs />
      </div>
    </>
  );
}