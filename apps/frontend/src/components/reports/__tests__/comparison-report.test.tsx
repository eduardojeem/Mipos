import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonReport } from '@/components/reports/comparison-report';

// Mock hook to avoid real network calls
vi.mock('@/hooks/use-reports', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    useCompareReports: () => ({ data: undefined, loading: false, updating: false, refresh: vi.fn() }),
    DATE_PRESETS: {
      thisMonth: { getValue: () => ({ startDate: '2025-01-01', endDate: '2025-01-31' }), label: 'Este mes' },
      lastMonth: { getValue: () => ({ startDate: '2024-12-01', endDate: '2024-12-31' }), label: 'Mes pasado' },
    },
  };
});

// Mock Select UI to avoid Radix runtime constraints in test env
vi.mock('@/components/ui/select', () => {
  const Simple = (props: any) => <div>{props.children}</div>;
  return {
    Select: Simple,
    SelectContent: Simple,
    SelectItem: Simple,
    SelectTrigger: Simple,
    SelectValue: Simple,
  };
});

describe('ComparisonReport', () => {
  it('renders header and controls', () => {
    render(<ComparisonReport />);
    expect(screen.getAllByText(/Comparación/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dimensión').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agrupar por').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeTruthy();
  });
});