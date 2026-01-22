/**
 * Scheduled Export System
 * Manages automated exports with configurable schedules and delivery options
 */

import { ExportConfig, batchOperationsService } from './batch-operations';
import React from 'react';

export interface ScheduledExportConfig extends ExportConfig {
  id?: string;
  name: string;
  description?: string;
  schedule: ExportSchedule;
  delivery: DeliveryConfig;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExportSchedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number; // For custom intervals (in minutes)
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface DeliveryConfig {
  method: 'download' | 'email' | 'webhook' | 'storage';
  recipients?: string[]; // Email addresses
  webhookUrl?: string;
  storageLocation?: string;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
}

export interface ScheduledExportJob {
  id: string;
  configId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: {
    success: boolean;
    filename?: string;
    fileSize?: number;
    recordCount?: number;
    error?: string;
  };
  retryCount: number;
  maxRetries: number;
}

export interface ScheduledExportStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  lastSuccessfulRun?: Date;
  nextScheduledRun?: Date;
}

class ScheduledExportService {
  private configs: Map<string, ScheduledExportConfig> = new Map();
  private jobs: Map<string, ScheduledExportJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.loadConfigs();
    this.loadJobs();
  }

  /**
   * Start the scheduled export service
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleAllConfigs();
    
    // Check for pending jobs every minute
    setInterval(() => {
      this.processPendingJobs();
    }, 60000);

    console.log('Scheduled export service started');
  }

  /**
   * Stop the scheduled export service
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    console.log('Scheduled export service stopped');
  }

  /**
   * Create a new scheduled export configuration
   */
  async createConfig(config: Omit<ScheduledExportConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date();
    
    const scheduledConfig: ScheduledExportConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
      nextRun: this.calculateNextRun(config.schedule)
    };

    this.configs.set(id, scheduledConfig);
    await this.saveConfigs();

    if (scheduledConfig.enabled && this.isRunning) {
      this.scheduleConfig(scheduledConfig);
    }

    return id;
  }

  /**
   * Update an existing scheduled export configuration
   */
  async updateConfig(id: string, updates: Partial<ScheduledExportConfig>): Promise<void> {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Scheduled export config not found: ${id}`);
    }

    const updatedConfig: ScheduledExportConfig = {
      ...config,
      ...updates,
      id,
      updatedAt: new Date(),
      nextRun: updates.schedule ? this.calculateNextRun(updates.schedule) : config.nextRun
    };

    this.configs.set(id, updatedConfig);
    await this.saveConfigs();

    // Reschedule if needed
    this.clearSchedule(id);
    if (updatedConfig.enabled && this.isRunning) {
      this.scheduleConfig(updatedConfig);
    }
  }

  /**
   * Delete a scheduled export configuration
   */
  async deleteConfig(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Scheduled export config not found: ${id}`);
    }

    this.configs.delete(id);
    this.clearSchedule(id);
    await this.saveConfigs();

    // Cancel any pending jobs for this config
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.configId === id && job.status === 'pending');
    
    for (const job of pendingJobs) {
      await this.cancelJob(job.id);
    }
  }

  /**
   * Get all scheduled export configurations
   */
  getConfigs(): ScheduledExportConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get a specific scheduled export configuration
   */
  getConfig(id: string): ScheduledExportConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get all jobs for a specific configuration
   */
  getConfigJobs(configId: string): ScheduledExportJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.configId === configId)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  /**
   * Get statistics for a scheduled export configuration
   */
  getConfigStats(configId: string): ScheduledExportStats {
    const jobs = this.getConfigJobs(configId);
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const failedJobs = jobs.filter(job => job.status === 'failed');
    
    const executionTimes = completedJobs
      .filter(job => job.startedAt && job.completedAt)
      .map(job => job.completedAt!.getTime() - job.startedAt!.getTime());

    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    const lastSuccessfulJob = completedJobs
      .filter(job => job.result?.success)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

    const config = this.configs.get(configId);

    return {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      averageExecutionTime,
      lastSuccessfulRun: lastSuccessfulJob?.completedAt,
      nextScheduledRun: config?.nextRun
    };
  }

  /**
   * Manually trigger an export job
   */
  async triggerExport(configId: string): Promise<string> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Scheduled export config not found: ${configId}`);
    }

    const jobId = this.generateId();
    const job: ScheduledExportJob = {
      id: jobId,
      configId,
      status: 'pending',
      scheduledAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.jobs.set(jobId, job);
    await this.saveJobs();

    // Execute immediately
    this.executeJob(job);

    return jobId;
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'pending' || job.status === 'running') {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.jobs.set(jobId, job);
      await this.saveJobs();
    }
  }

  /**
   * Get job details
   */
  getJob(jobId: string): ScheduledExportJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get recent jobs across all configurations
   */
  getRecentJobs(limit = 50): ScheduledExportJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, limit);
  }

  private scheduleAllConfigs(): void {
    for (const config of this.configs.values()) {
      if (config.enabled) {
        this.scheduleConfig(config);
      }
    }
  }

  private scheduleConfig(config: ScheduledExportConfig): void {
    if (!config.id) return;

    const nextRun = config.nextRun || this.calculateNextRun(config.schedule);
    const delay = nextRun.getTime() - Date.now();

    if (delay > 0) {
      const timer = setTimeout(() => {
        this.createAndExecuteJob(config);
        
        // Schedule next run
        const updatedConfig = {
          ...config,
          lastRun: new Date(),
          nextRun: this.calculateNextRun(config.schedule)
        };
        this.configs.set(config.id!, updatedConfig);
        this.saveConfigs();
        
        // Reschedule for next run
        this.scheduleConfig(updatedConfig);
      }, delay);

      this.timers.set(config.id, timer);
    }
  }

  private clearSchedule(configId: string): void {
    const timer = this.timers.get(configId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(configId);
    }
  }

  private async createAndExecuteJob(config: ScheduledExportConfig): Promise<void> {
    const jobId = this.generateId();
    const job: ScheduledExportJob = {
      id: jobId,
      configId: config.id!,
      status: 'pending',
      scheduledAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.jobs.set(jobId, job);
    await this.saveJobs();

    this.executeJob(job);
  }

  private async executeJob(job: ScheduledExportJob): Promise<void> {
    const config = this.configs.get(job.configId);
    if (!config) {
      job.status = 'failed';
      job.result = { success: false, error: 'Configuration not found' };
      job.completedAt = new Date();
      this.jobs.set(job.id, job);
      await this.saveJobs();
      return;
    }

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.jobs.set(job.id, job);
      await this.saveJobs();

      // Execute the export
      const result = await batchOperationsService.exportData(config);

      if (result.success) {
        // Handle delivery
        await this.deliverExport(config.delivery, result);

        job.status = 'completed';
        job.result = {
          success: true,
          filename: result.fileName,
          fileSize: result.fileSize,
          recordCount: result.progress.processedRecords
        };
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error(`Export job ${job.id} failed:`, error);
      
      job.status = 'failed';
      job.result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // Retry if possible
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'pending';
        
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, job.retryCount) * 60000; // 2^n minutes
        setTimeout(() => {
          this.executeJob(job);
        }, retryDelay);
      }
    } finally {
      job.completedAt = new Date();
      this.jobs.set(job.id, job);
      await this.saveJobs();

      // Send notifications if configured
      if (config.delivery.notifyOnSuccess && job.result?.success) {
        await this.sendNotification(config, job, 'success');
      } else if (config.delivery.notifyOnFailure && !job.result?.success) {
        await this.sendNotification(config, job, 'failure');
      }
    }
  }

  private async deliverExport(delivery: DeliveryConfig, result: any): Promise<void> {
    switch (delivery.method) {
      case 'email':
        if (delivery.recipients?.length) {
          await this.sendEmailDelivery(delivery.recipients, result);
        }
        break;
      
      case 'webhook':
        if (delivery.webhookUrl) {
          await this.sendWebhookDelivery(delivery.webhookUrl, result);
        }
        break;
      
      case 'storage':
        if (delivery.storageLocation) {
          await this.saveToStorage(delivery.storageLocation, result);
        }
        break;
      
      case 'download':
      default:
        // File is already available for download
        break;
    }
  }

  private async sendEmailDelivery(recipients: string[], result: any): Promise<void> {
    // Implementation would depend on your email service
    console.log('Sending email delivery to:', recipients, result.filename);
  }

  private async sendWebhookDelivery(webhookUrl: string, result: any): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'export_completed',
          filename: result.filename,
          downloadUrl: result.downloadUrl,
          summary: result.summary,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Webhook delivery failed:', error);
    }
  }

  private async saveToStorage(location: string, result: any): Promise<void> {
    // Implementation would depend on your storage service
    console.log('Saving to storage:', location, result.filename);
  }

  private async sendNotification(
    config: ScheduledExportConfig, 
    job: ScheduledExportJob, 
    type: 'success' | 'failure'
  ): Promise<void> {
    const message = type === 'success'
      ? `Export "${config.name}" completed successfully`
      : `Export "${config.name}" failed: ${job.result?.error}`;

    console.log('Notification:', message);
    // Implementation would depend on your notification service
  }

  private processPendingJobs(): void {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .filter(job => job.scheduledAt.getTime() <= Date.now());

    for (const job of pendingJobs) {
      this.executeJob(job);
    }
  }

  private calculateNextRun(schedule: ExportSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.type) {
      case 'once':
        return schedule.startDate || now;

      case 'daily':
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
        } else {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = schedule.dayOfWeek || 0;
        const currentDay = next.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        next.setDate(next.getDate() + (daysUntilTarget || 7));
        
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1;
        next.setDate(targetDate);
        
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'custom':
        const intervalMs = (schedule.interval || 60) * 60000; // Convert minutes to milliseconds
        next.setTime(now.getTime() + intervalMs);
        break;
    }

    // Respect end date
    if (schedule.endDate && next > schedule.endDate) {
      return schedule.endDate;
    }

    return next;
  }

  private generateId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadConfigs(): Promise<void> {
    try {
      const stored = localStorage.getItem('scheduled_export_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        for (const config of configs) {
          // Convert date strings back to Date objects
          if (config.lastRun) config.lastRun = new Date(config.lastRun);
          if (config.nextRun) config.nextRun = new Date(config.nextRun);
          if (config.createdAt) config.createdAt = new Date(config.createdAt);
          if (config.updatedAt) config.updatedAt = new Date(config.updatedAt);
          if (config.schedule.startDate) config.schedule.startDate = new Date(config.schedule.startDate);
          if (config.schedule.endDate) config.schedule.endDate = new Date(config.schedule.endDate);
          
          this.configs.set(config.id, config);
        }
      }
    } catch (error) {
      console.error('Failed to load scheduled export configs:', error);
    }
  }

  private async saveConfigs(): Promise<void> {
    try {
      const configs = Array.from(this.configs.values());
      localStorage.setItem('scheduled_export_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save scheduled export configs:', error);
    }
  }

  private async loadJobs(): Promise<void> {
    try {
      const stored = localStorage.getItem('scheduled_export_jobs');
      if (stored) {
        const jobs = JSON.parse(stored);
        for (const job of jobs) {
          // Convert date strings back to Date objects
          if (job.scheduledAt) job.scheduledAt = new Date(job.scheduledAt);
          if (job.startedAt) job.startedAt = new Date(job.startedAt);
          if (job.completedAt) job.completedAt = new Date(job.completedAt);
          
          this.jobs.set(job.id, job);
        }
      }
    } catch (error) {
      console.error('Failed to load scheduled export jobs:', error);
    }
  }

  private async saveJobs(): Promise<void> {
    try {
      const jobs = Array.from(this.jobs.values());
      localStorage.setItem('scheduled_export_jobs', JSON.stringify(jobs));
    } catch (error) {
      console.error('Failed to save scheduled export jobs:', error);
    }
  }
}

// Export singleton instance
export const scheduledExportService = new ScheduledExportService();

// React hook for using scheduled exports
export function useScheduledExports() {
  const [configs, setConfigs] = React.useState<ScheduledExportConfig[]>([]);
  const [jobs, setJobs] = React.useState<ScheduledExportJob[]>([]);

  React.useEffect(() => {
    const updateConfigs = () => setConfigs(scheduledExportService.getConfigs());
    const updateJobs = () => setJobs(scheduledExportService.getRecentJobs());

    updateConfigs();
    updateJobs();

    // Update every 30 seconds
    const interval = setInterval(() => {
      updateConfigs();
      updateJobs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    configs,
    jobs,
    createConfig: scheduledExportService.createConfig.bind(scheduledExportService),
    updateConfig: scheduledExportService.updateConfig.bind(scheduledExportService),
    deleteConfig: scheduledExportService.deleteConfig.bind(scheduledExportService),
    triggerExport: scheduledExportService.triggerExport.bind(scheduledExportService),
    cancelJob: scheduledExportService.cancelJob.bind(scheduledExportService),
    getConfigStats: scheduledExportService.getConfigStats.bind(scheduledExportService)
  };
}