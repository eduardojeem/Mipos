import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportReport, type ReportFilter } from '@/hooks/use-reports';
import { api } from '@/lib/api';

// Mock api module used inside use-reports
vi.mock('@/lib/api', () => {
  return {
    api: {
      post: vi.fn(async (_endpoint: string, _filters: ReportFilter, _opts: any) => {
        const blob = new Blob([JSON.stringify({ ok: true })], { type: 'application/json' });
        return { data: blob } as any;
      }),
      get: vi.fn(),
    },
  };
});

describe('exportReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API endpoint and returns a Blob', async () => {
    const filters: ReportFilter = { startDate: '2025-01-01', endDate: '2025-01-31' };
    const blob = await exportReport('sales', 'pdf', filters);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);
    expect(api.post).toHaveBeenCalledWith('/api/reports/sales/export/pdf', filters, { responseType: 'blob' });
  });
});