import { describe, it, expect } from 'vitest';
import { serializeFilters, type ReportFilter } from '@/hooks/use-reports';

describe('serializeFilters', () => {
  it('serializes only defined filters and skips empty values', () => {
    const filters: ReportFilter = {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      productId: '123',
      categoryId: '', // should be skipped
      customerId: undefined,
      status: 'paid',
    };
    const key = serializeFilters(filters);
    expect(key).toBe('startDate=2025-01-01&endDate=2025-01-31&productId=123&status=paid');
  });

  it('returns empty string for empty filters', () => {
    const key = serializeFilters({});
    expect(key).toBe('');
  });
});