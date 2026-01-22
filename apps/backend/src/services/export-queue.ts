import { v4 as uuidv4 } from 'uuid';
import { reportsService, ReportFilter } from './reports';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportType = 'sales' | 'inventory' | 'customers' | 'financial' | 'compare';

export interface ExportJob {
  id: string;
  type: ReportType;
  format: ExportFormat;
  filters: ReportFilter;
  payload?: any; // for compare or specialized options
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: {
    filename: string;
    contentType: string;
    size: number;
    // Store temporarily for retrieval (in-memory)
    buffer?: Buffer;
  };
}

class ExportQueueService {
  private jobs: Map<string, ExportJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_JOBS = 200; // hard cap to avoid memory growth
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24h retention for terminal jobs
  private cleanupTimer: NodeJS.Timeout | null = null;

  enqueue(type: ReportType, format: ExportFormat, filters: ReportFilter, payload?: any): ExportJob {
    const id = uuidv4();
    const job: ExportJob = {
      id,
      type,
      format,
      filters,
      payload,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    };
    this.jobs.set(id, job);
    // Prune on enqueue to keep bounded memory
    this.prune();
    // Ensure periodic cleanup is running
    this.ensureCleanup();
    this.startJob(job);
    return job;
  }

  get(id: string): ExportJob | undefined {
    return this.jobs.get(id);
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.status === 'completed' || job.status === 'failed') return false;
    job.status = 'cancelled';
    job.progress = 0;
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
    return true;
  }

  delete(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
    const deleted = this.jobs.delete(id);
    // Opportunistic prune
    this.prune();
    return deleted;
  }

  list(limit = 50): ExportJob[] {
    // Opportunistic prune before listing
    this.prune();
    const arr = Array.from(this.jobs.values());
    arr.sort((a, b) => b.createdAt - a.createdAt);
    return arr.slice(0, limit);
  }

  // Simulate progressive execution and hand off to reportsService for actual export
  private startJob(job: ExportJob) {
    job.status = 'running';
    job.startedAt = Date.now();

    let step = 0;
    const timer = setInterval(async () => {
      if (job.status !== 'running') {
        clearInterval(timer);
        this.timers.delete(job.id);
        return;
      }

      step += 1;
      job.progress = Math.min(90, step * 10); // progress up to 90% before finalization

      // Finalize around step 10
      if (step >= 9) {
        try {
          const { buffer, contentType, filename } = await this.performExport(job);
          job.result = {
            filename,
            contentType,
            size: buffer.length,
            buffer,
          };
          job.progress = 100;
          job.status = 'completed';
          job.completedAt = Date.now();
        } catch (err: any) {
          job.status = 'failed';
          job.error = err?.message || String(err);
        } finally {
          clearInterval(timer);
          this.timers.delete(job.id);
        }
      }
    }, 500);
    this.timers.set(job.id, timer);
  }

  private async performExport(job: ExportJob): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const filters = job.filters;
    let buffer: Buffer;
    let contentType = 'application/octet-stream';
    let filename = `${job.type}-report-${new Date().toISOString().split('T')[0]}`;

    // Prepare data depending on type
    switch (job.type) {
      case 'sales': {
        const data = await reportsService.generateSalesReport(filters);
        ({ buffer, contentType, filename } = await this.exportByFormat('Sales', job.format, data, filters, filename));
        break;
      }
      case 'inventory': {
        const data = await reportsService.generateInventoryReport(filters);
        ({ buffer, contentType, filename } = await this.exportByFormat('Inventory', job.format, data, filters, filename));
        break;
      }
      case 'customers': {
        const data = await reportsService.generateCustomerReport(filters);
        ({ buffer, contentType, filename } = await this.exportByFormat('Customer', job.format, data, filters, filename));
        break;
      }
      case 'financial': {
        const data = await reportsService.generateFinancialReport(filters);
        ({ buffer, contentType, filename } = await this.exportByFormat('Financial', job.format, data, filters, filename));
        break;
      }
      default: {
        // Fallback: JSON
        const json = Buffer.from(JSON.stringify({ type: job.type, filters }, null, 2));
        buffer = json;
        contentType = 'application/json';
        filename = `${filename}.json`;
      }
    }

    return { buffer, contentType, filename };
  }

  private async exportByFormat(
    reportLabel: string,
    format: ExportFormat,
    data: any,
    filters: ReportFilter,
    baseFilename: string
  ) {
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'pdf':
        buffer = await reportsService.exportToPDF(reportLabel, data, filters);
        contentType = 'application/pdf';
        filename = `${baseFilename}.pdf`;
        break;
      case 'excel':
        buffer = await reportsService.exportToExcel(reportLabel, data, filters);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${baseFilename}.xlsx`;
        break;
      case 'csv':
        buffer = await reportsService.exportToCSV(reportLabel, data, filters);
        contentType = 'text/csv';
        filename = `${baseFilename}.csv`;
        break;
      case 'json':
        buffer = await reportsService.exportToJSON(data);
        contentType = 'application/json';
        filename = `${baseFilename}.json`;
        break;
      default:
        buffer = await reportsService.exportToJSON(data);
        contentType = 'application/json';
        filename = `${baseFilename}.json`;
        break;
    }

    return { buffer, contentType, filename };
  }

  // Cleanup utilities
  private prune() {
    const now = Date.now();
    // Remove terminal jobs older than TTL
    for (const [id, job] of this.jobs.entries()) {
      const terminal = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
      if (terminal) {
        const age = (job.completedAt ?? job.createdAt ?? 0) ? now - (job.completedAt ?? job.createdAt!) : 0;
        if (age > this.TTL_MS) {
          const timer = this.timers.get(id);
          if (timer) clearInterval(timer);
          this.timers.delete(id);
          this.jobs.delete(id);
        }
      }
    }
    // Enforce max jobs cap: drop oldest terminal jobs first
    if (this.jobs.size > this.MAX_JOBS) {
      const jobsArr = Array.from(this.jobs.values());
      jobsArr.sort((a, b) => a.createdAt - b.createdAt); // oldest first
      for (const j of jobsArr) {
        if (this.jobs.size <= this.MAX_JOBS) break;
        const terminal = j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled';
        if (terminal) {
          const timer = this.timers.get(j.id);
          if (timer) clearInterval(timer);
          this.timers.delete(j.id);
          this.jobs.delete(j.id);
        }
      }
    }
  }

  private ensureCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      try {
        this.prune();
      } catch {
        // ignore cleanup errors
      }
    }, 5 * 60 * 1000); // every 5 minutes
  }
}

export const exportQueueService = new ExportQueueService();