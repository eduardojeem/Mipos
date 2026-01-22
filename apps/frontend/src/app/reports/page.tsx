'use client';

import React from 'react';
import NextDynamic from 'next/dynamic';
const ReportsDashboardDynamic = NextDynamic(
  () => import('@/components/reports/reports-dashboard').then(m => m.ReportsDashboard),
  { ssr: false }
);

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <ReportsDashboardDynamic />
    </div>
  );
}
