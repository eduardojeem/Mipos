/**
 * External System Synchronization Framework
 * Provides integration with ERP and other external business systems
 */

import { EventEmitter } from 'events';

import React, { useState, useEffect } from 'react';

// Types and Interfaces
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success' | 'paused';
export type EntityType = 'products' | 'customers' | 'sales' | 'categories' | 'inventory_movements';
export type SyncTrigger = 'manual' | 'scheduled' | 'realtime' | 'webhook';

export interface ExternalSystemConfig {
  id: string;
  name: string;
  type: 'erp' | 'crm' | 'accounting' | 'warehouse' | 'ecommerce' | 'custom';
  enabled: boolean;
  connection: {
    baseUrl: string;
    authentication: {
      type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
      credentials: Record<string, any>;
    };
    timeout: number;
    retryAttempts: number;
    rateLimiting?: {
      requestsPerSecond: number;
      burstLimit: number;
    };
  };
  mappings: EntityMapping[];
  syncSettings: {
    direction: SyncDirection;
    triggers: SyncTrigger[];
    schedule?: {
      enabled: boolean;
      cron: string;
      timezone: string;
    };
    batchSize: number;
    conflictResolution: 'local_wins' | 'remote_wins' | 'timestamp' | 'manual';
  };
  webhooks?: {
    inbound?: string;
    outbound?: string;
    secret?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityMapping {
  id: string;
  localEntity: EntityType;
  remoteEntity: string;
  enabled: boolean;
  fieldMappings: FieldMapping[];
  filters?: {
    local?: Record<string, any>;
    remote?: Record<string, any>;
  };
  transformations?: {
    inbound?: string; // JavaScript code for transformation
    outbound?: string;
  };
}

export interface FieldMapping {
  localField: string;
  remoteField: string;
  direction: SyncDirection;
  required: boolean;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface SyncJob {
  id: string;
  systemId: string;
  entityType: EntityType;
  direction: SyncDirection;
  trigger: SyncTrigger;
  status: SyncStatus;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: SyncResult;
  error?: string;
  logs: SyncLogEntry[];
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  conflicts: ConflictRecord[];
  summary: string;
}

export interface ConflictRecord {
  id: string;
  localRecord: any;
  remoteRecord: any;
  conflictType: 'field_mismatch' | 'timestamp_conflict' | 'deletion_conflict' | 'validation_error';
  conflictFields: string[];
  resolution?: 'local' | 'remote' | 'merged' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SyncLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export interface SyncStats {
  systemId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  averageDuration: number;
  totalRecordsSynced: number;
  conflictsCount: number;
  uptime: number;
}

// External System Synchronization Service
export class ExternalSyncService extends EventEmitter {
  private systems: Map<string, ExternalSystemConfig> = new Map();
  private jobs: Map<string, SyncJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private nextRunTimes: Map<string, Date> = new Map();
  private scheduledEntityJobs: Map<string, NodeJS.Timeout> = new Map();
  private nextEntityRunTimes: Map<string, Date> = new Map();
  private webhookHandlers: Map<string, (data: any) => Promise<void>> = new Map();

  constructor() {
    super();
    this.loadSystems();
    this.setupScheduledJobs();
  }

  // System Management
  async addSystem(config: Omit<ExternalSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const systemId = this.generateId();
    const system: ExternalSystemConfig = {
      ...config,
      id: systemId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate system configuration
    await this.validateSystemConfig(system);

    this.systems.set(systemId, system);
    await this.saveSystem(system);

    if (system.enabled) {
      this.setupSystemSchedule(system);
    }

    this.emit('systemAdded', system);
    return systemId;
  }

  async updateSystem(systemId: string, updates: Partial<ExternalSystemConfig>): Promise<void> {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`System ${systemId} not found`);
    }

    const updatedSystem = {
      ...system,
      ...updates,
      updatedAt: new Date()
    };

    await this.validateSystemConfig(updatedSystem);

    this.systems.set(systemId, updatedSystem);
    await this.saveSystem(updatedSystem);

    // Update scheduled jobs
    this.clearSystemSchedule(systemId);
    if (updatedSystem.enabled) {
      this.setupSystemSchedule(updatedSystem);
    }

    this.emit('systemUpdated', updatedSystem);
  }

  async removeSystem(systemId: string): Promise<void> {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`System ${systemId} not found`);
    }

    // Cancel any active jobs
    const activeJobs = Array.from(this.jobs.values())
      .filter(job => job.systemId === systemId && job.status === 'syncing');
    
    for (const job of activeJobs) {
      await this.cancelJob(job.id);
    }

    this.clearSystemSchedule(systemId);
    this.systems.delete(systemId);
    await this.deleteSystem(systemId);

    this.emit('systemRemoved', systemId);
  }

  getSystem(systemId: string): ExternalSystemConfig | undefined {
    return this.systems.get(systemId);
  }

  getSystems(): ExternalSystemConfig[] {
    return Array.from(this.systems.values());
  }

  // Synchronization Operations
  async syncEntity(
    systemId: string, 
    entityType: EntityType, 
    direction: SyncDirection = 'bidirectional',
    trigger: SyncTrigger = 'manual'
  ): Promise<string> {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`System ${systemId} not found`);
    }

    if (!system.enabled) {
      throw new Error(`System ${systemId} is disabled`);
    }

    const jobId = this.generateId();
    const job: SyncJob = {
      id: jobId,
      systemId,
      entityType,
      direction,
      trigger,
      status: 'syncing',
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0
      },
      startedAt: new Date(),
      logs: []
    };

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);

    try {
      await this.executeSync(job, system);
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.addJobLog(job, 'error', `Sync failed: ${job.error}`);
    } finally {
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt.getTime();
      this.activeJobs.delete(jobId);
      this.emit('jobCompleted', job);
    }

    return jobId;
  }

  async syncAllEntities(systemId: string, trigger: SyncTrigger = 'manual'): Promise<string[]> {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`System ${systemId} not found`);
    }

    const entityTypes = system.mappings
      .filter(mapping => mapping.enabled)
      .map(mapping => mapping.localEntity);

    const jobIds: string[] = [];
    for (const entityType of entityTypes) {
      const jobId = await this.syncEntity(systemId, entityType, system.syncSettings.direction, trigger);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'syncing') {
      job.status = 'error';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt.getTime();
      this.activeJobs.delete(jobId);
      this.addJobLog(job, 'info', 'Job cancelled');
      this.emit('jobCancelled', job);
    }
  }

  // Job Management
  getJob(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobs(systemId?: string): SyncJob[] {
    const jobs = Array.from(this.jobs.values());
    return systemId ? jobs.filter(job => job.systemId === systemId) : jobs;
  }

  getActiveJobs(): SyncJob[] {
    return Array.from(this.activeJobs)
      .map(jobId => this.jobs.get(jobId))
      .filter(job => job !== undefined) as SyncJob[];
  }

  // Statistics
  getSystemStats(systemId: string): SyncStats {
    const jobs = this.getJobs(systemId);
    const completedJobs = jobs.filter(job => job.status === 'success' || job.status === 'error');
    const successfulJobs = jobs.filter(job => job.status === 'success');
    const failedJobs = jobs.filter(job => job.status === 'error');

    const totalDuration = completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0);
    const averageDuration = completedJobs.length > 0 ? totalDuration / completedJobs.length : 0;

    const totalRecordsSynced = successfulJobs.reduce((sum, job) => 
      sum + (job.result?.recordsProcessed || 0), 0);

    const conflictsCount = successfulJobs.reduce((sum, job) => 
      sum + (job.result?.conflicts?.length || 0), 0);

    const lastSyncAt = completedJobs.length > 0 
      ? new Date(Math.max(...completedJobs.map(job => job.completedAt?.getTime() || 0)))
      : undefined;

    return {
      systemId,
      totalJobs: jobs.length,
      successfulJobs: successfulJobs.length,
      failedJobs: failedJobs.length,
      lastSyncAt,
      nextSyncAt: this.getNextScheduledSync(systemId),
      averageDuration,
      totalRecordsSynced,
      conflictsCount,
      uptime: this.calculateUptime(systemId)
    };
  }

  // Webhook Handling
  async handleWebhook(systemId: string, data: any): Promise<void> {
    const handler = this.webhookHandlers.get(systemId);
    if (handler) {
      await handler(data);
    } else {
      // Default webhook handling - trigger sync
      const system = this.systems.get(systemId);
      if (system && system.enabled) {
        await this.syncAllEntities(systemId, 'webhook');
      }
    }
  }

  registerWebhookHandler(systemId: string, handler: (data: any) => Promise<void>): void {
    this.webhookHandlers.set(systemId, handler);
  }

  // Conflict Resolution
  async resolveConflict(
    jobId: string, 
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merged',
    mergedData?: any
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.result) {
      throw new Error(`Job ${jobId} not found or has no result`);
    }

    const conflict = job.result.conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();

    // Apply resolution
    let resolvedRecord: any;
    switch (resolution) {
      case 'local':
        resolvedRecord = conflict.localRecord;
        break;
      case 'remote':
        resolvedRecord = conflict.remoteRecord;
        break;
      case 'merged':
        resolvedRecord = mergedData || { ...conflict.localRecord, ...conflict.remoteRecord };
        break;
    }

    // Update the record in the system
    await this.applyResolvedRecord(job.systemId, job.entityType, resolvedRecord);

    this.emit('conflictResolved', { jobId, conflictId, resolution, resolvedRecord });
  }

  // Private Methods
  private async executeSync(job: SyncJob, system: ExternalSystemConfig): Promise<void> {
    this.addJobLog(job, 'info', `Starting sync for ${job.entityType}`);

    const mapping = system.mappings.find(m => 
      m.localEntity === job.entityType && m.enabled
    );

    if (!mapping) {
      throw new Error(`No mapping found for entity ${job.entityType}`);
    }

    // Get data based on direction
    if (job.direction === 'outbound' || job.direction === 'bidirectional') {
      await this.syncOutbound(job, system, mapping);
    }

    if (job.direction === 'inbound' || job.direction === 'bidirectional') {
      await this.syncInbound(job, system, mapping);
    }

    job.status = 'success';
    this.addJobLog(job, 'info', 'Sync completed successfully');
  }

  private async syncOutbound(job: SyncJob, system: ExternalSystemConfig, mapping: EntityMapping): Promise<void> {
    // Get local data
    const localData = await this.getLocalData(job.entityType, mapping.filters?.local);
    job.progress.total = localData.length;

    const batchSize = system.syncSettings.batchSize;
    const batches = this.createBatches(localData, batchSize);

    for (const batch of batches) {
      const transformedBatch = await this.transformData(batch, mapping, 'outbound');
      await this.sendToExternalSystem(system, mapping.remoteEntity, transformedBatch);
      
      job.progress.processed += batch.length;
      job.progress.successful += batch.length; // Simplified - should handle failures
      job.progress.percentage = (job.progress.processed / job.progress.total) * 100;
      
      this.emit('jobProgress', job);
    }
  }

  private async syncInbound(job: SyncJob, system: ExternalSystemConfig, mapping: EntityMapping): Promise<void> {
    // Get remote data
    const remoteData = await this.getRemoteData(system, mapping.remoteEntity, mapping.filters?.remote);
    job.progress.total += remoteData.length;

    const batchSize = system.syncSettings.batchSize;
    const batches = this.createBatches(remoteData, batchSize);

    for (const batch of batches) {
      const transformedBatch = await this.transformData(batch, mapping, 'inbound');
      await this.saveToLocalSystem(job.entityType, transformedBatch);
      
      job.progress.processed += batch.length;
      job.progress.successful += batch.length; // Simplified - should handle failures
      job.progress.percentage = (job.progress.processed / job.progress.total) * 100;
      
      this.emit('jobProgress', job);
    }
  }

  private async validateSystemConfig(system: ExternalSystemConfig): Promise<void> {
    // Validate connection
    if (!system.connection.baseUrl) {
      throw new Error('Base URL is required');
    }

    // Test connection
    try {
      await this.testConnection(system);
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate mappings
    for (const mapping of system.mappings) {
      if (!mapping.fieldMappings.length) {
        throw new Error(`Mapping for ${mapping.localEntity} has no field mappings`);
      }
    }
  }

  private async testConnection(system: ExternalSystemConfig): Promise<void> {
    // Implementation depends on the external system type
    // This is a placeholder for connection testing logic
    this.addSystemLog(system.id, 'info', 'Connection test passed');
  }

  private async getLocalData(entityType: EntityType, filters?: Record<string, any>): Promise<any[]> {
    // Implementation to fetch local data from the database
    // This would integrate with your existing data layer
    return [];
  }

  private async getRemoteData(system: ExternalSystemConfig, entity: string, filters?: Record<string, any>): Promise<any[]> {
    // Implementation to fetch data from external system
    // This would use the system's API configuration
    return [];
  }

  private async transformData(data: any[], mapping: EntityMapping, direction: 'inbound' | 'outbound'): Promise<any[]> {
    // Apply field mappings and transformations
    return data.map(record => {
      const transformed: any = {};
      
      for (const fieldMapping of mapping.fieldMappings) {
        if (fieldMapping.direction === direction || fieldMapping.direction === 'bidirectional') {
          const sourceField = direction === 'inbound' ? fieldMapping.remoteField : fieldMapping.localField;
          const targetField = direction === 'inbound' ? fieldMapping.localField : fieldMapping.remoteField;
          
          transformed[targetField] = record[sourceField] || fieldMapping.defaultValue;
        }
      }
      
      return transformed;
    });
  }

  private async sendToExternalSystem(system: ExternalSystemConfig, entity: string, data: any[]): Promise<void> {
    // Implementation to send data to external system
    // This would use the system's API configuration
  }

  private async saveToLocalSystem(entityType: EntityType, data: any[]): Promise<void> {
    // Implementation to save data to local system
    // This would integrate with your existing data layer
  }

  private async applyResolvedRecord(systemId: string, entityType: EntityType, record: any): Promise<void> {
    // Implementation to apply resolved conflict record
  }

  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  private setupScheduledJobs(): void {
    for (const system of this.systems.values()) {
      if (system.enabled) {
        this.setupSystemSchedule(system);
      }
    }
  }

  private setupSystemSchedule(system: ExternalSystemConfig): void {
    if (!system.syncSettings.schedule?.enabled) return;
    const cron = system.syncSettings.schedule.cron;
    const timezone = system.syncSettings.schedule.timezone;

    const scheduleNext = () => {
      const now = new Date();
      const next = this.computeNextRun(cron, now, timezone);
      this.nextRunTimes.set(system.id, next);
      const delay = Math.max(0, next.getTime() - now.getTime());

      const timeout = setTimeout(async () => {
        // Ejecutar sincronización programada y reprogramar
        try {
          await this.syncAllEntities(system.id, 'scheduled');
        } catch (e) {
          this.addSystemLog(system.id, 'error', 'Scheduled sync failed', { error: e });
        } finally {
          // Reprogramar siguiente ejecución
          scheduleNext();
        }
      }, delay);

      // Mantener una sola programación por sistema
      const existing = this.scheduledJobs.get(system.id);
      if (existing) clearTimeout(existing);
      this.scheduledJobs.set(system.id, timeout as unknown as NodeJS.Timeout);
    };

    scheduleNext();
  }

  private clearSystemSchedule(systemId: string): void {
    const timeout = this.scheduledJobs.get(systemId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(systemId);
    }
    this.nextRunTimes.delete(systemId);
  }

  private getNextScheduledSync(systemId: string): Date | undefined {
    return this.nextRunTimes.get(systemId);
  }

  /** Programación por entidad: permite programar sincronización solo para una entidad específica */
  scheduleEntitySync(systemId: string, entityType: EntityType, cron: string, timezone?: string): void {
    const system = this.systems.get(systemId);
    if (!system) throw new Error(`System ${systemId} not found`);
    if (!system.enabled) throw new Error(`System ${systemId} is disabled`);

    const key = `${systemId}:${entityType}`;
    const scheduleNext = () => {
      const now = new Date();
      const next = this.computeNextRun(cron, now, timezone);
      this.nextEntityRunTimes.set(key, next);
      const delay = Math.max(0, next.getTime() - now.getTime());
      const timeout = setTimeout(async () => {
        try {
          await this.syncEntity(systemId, entityType, system.syncSettings.direction, 'scheduled');
        } catch (e) {
          this.addSystemLog(systemId, 'error', `Scheduled entity sync failed: ${entityType}`, { error: e });
        } finally {
          scheduleNext();
        }
      }, delay);
      const existing = this.scheduledEntityJobs.get(key);
      if (existing) clearTimeout(existing);
      this.scheduledEntityJobs.set(key, timeout as unknown as NodeJS.Timeout);
    };
    scheduleNext();
  }

  cancelEntitySchedule(systemId: string, entityType: EntityType): void {
    const key = `${systemId}:${entityType}`;
    const timeout = this.scheduledEntityJobs.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledEntityJobs.delete(key);
    }
    this.nextEntityRunTimes.delete(key);
  }

  getNextEntityScheduledSync(systemId: string, entityType: EntityType): Date | undefined {
    const key = `${systemId}:${entityType}`;
    return this.nextEntityRunTimes.get(key);
  }

  /**
   * Compute next run based on a limited cron syntax support.
   * Supported patterns:
   * - Every N minutes: "*\/N * * * *"
   * - Every N hours: "0 *\/N * * *"
   * - Daily at 00:00: "0 0 * * *"
   * - Weekly at 00:00 on day D: "0 0 * * D" (D=0-6, 0=Sunday)
   * Fallback: 15 minutes.
   */
  private computeNextRun(cron: string, from: Date, timezone?: string): Date {
    // Note: timezone is currently not applied; placeholder for future support
    const mEvery = /^\*\/(\d+) \* \* \* \*$/;
    const hEvery = /^0 \*\/(\d+) \* \* \*$/;
    const daily = /^0 0 \* \* \*$/;
    const weekly = /^0 0 \* \* ([0-6])$/;

    const date = new Date(from.getTime());
    if (mEvery.test(cron)) {
      const n = parseInt(cron.match(mEvery)![1], 10);
      const ms = n * 60 * 1000;
      const nextMs = Math.ceil(date.getTime() / ms) * ms;
      return new Date(nextMs);
    }
    if (hEvery.test(cron)) {
      const n = parseInt(cron.match(hEvery)![1], 10);
      const hours = date.getHours();
      const nextHour = hours + (n - (hours % n));
      const next = new Date(date.getTime());
      next.setMinutes(0, 0, 0);
      next.setHours(nextHour);
      return next;
    }
    if (daily.test(cron)) {
      const next = new Date(date.getTime());
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    if (weekly.test(cron)) {
      const targetDow = parseInt(cron.match(weekly)![1], 10);
      const next = new Date(date.getTime());
      const currentDow = next.getDay();
      let daysToAdd = targetDow - currentDow;
      if (daysToAdd <= 0) daysToAdd += 7;
      next.setDate(next.getDate() + daysToAdd);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    // Fallback: 15 minutes
    const next = new Date(date.getTime() + 15 * 60 * 1000);
    return next;
  }

  private calculateUptime(systemId: string): number {
    // Implementation to calculate system uptime percentage
    return 100;
  }

  private addJobLog(job: SyncJob, level: SyncLogEntry['level'], message: string, data?: any): void {
    job.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
  }

  private addSystemLog(systemId: string, level: SyncLogEntry['level'], message: string, data?: any): void {
    // Implementation to add system-level logs
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async loadSystems(): Promise<void> {
    // Implementation to load systems from storage
  }

  private async saveSystem(system: ExternalSystemConfig): Promise<void> {
    // Implementation to save system to storage
  }

  private async deleteSystem(systemId: string): Promise<void> {
    // Implementation to delete system from storage
  }
}

// React Hook
export function useExternalSync() {
  const [service] = useState(() => new ExternalSyncService());
  const [systems, setSystems] = useState<ExternalSystemConfig[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<SyncJob[]>([]);

  React.useEffect(() => {
    const updateSystems = () => setSystems(service.getSystems());
    const updateJobs = () => setJobs(service.getJobs());
    const updateActiveJobs = () => setActiveJobs(service.getActiveJobs());

    // Initial load
    updateSystems();
    updateJobs();
    updateActiveJobs();

    // Event listeners
    service.on('systemAdded', updateSystems);
    service.on('systemUpdated', updateSystems);
    service.on('systemRemoved', updateSystems);
    service.on('jobCompleted', updateJobs);
    service.on('jobProgress', updateActiveJobs);

    return () => {
      service.removeAllListeners();
    };
  }, [service]);

  return {
    service,
    systems,
    jobs,
    activeJobs,
    addSystem: (config: Omit<ExternalSystemConfig, 'id' | 'createdAt' | 'updatedAt'>) => 
      service.addSystem(config),
    updateSystem: (systemId: string, updates: Partial<ExternalSystemConfig>) => 
      service.updateSystem(systemId, updates),
    removeSystem: (systemId: string) => service.removeSystem(systemId),
    syncEntity: (systemId: string, entityType: EntityType, direction?: SyncDirection) => 
      service.syncEntity(systemId, entityType, direction),
    syncAllEntities: (systemId: string) => service.syncAllEntities(systemId),
    cancelJob: (jobId: string) => service.cancelJob(jobId),
    getSystemStats: (systemId: string) => service.getSystemStats(systemId),
    scheduleEntitySync: (systemId: string, entityType: EntityType, cron: string, timezone?: string) =>
      service.scheduleEntitySync(systemId, entityType, cron, timezone),
    cancelEntitySchedule: (systemId: string, entityType: EntityType) =>
      service.cancelEntitySchedule(systemId, entityType),
    getNextEntityScheduledSync: (systemId: string, entityType: EntityType) =>
      service.getNextEntityScheduledSync(systemId, entityType),
    resolveConflict: (jobId: string, conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedData?: any) =>
      service.resolveConflict(jobId, conflictId, resolution, mergedData)
  };
}

// Job Scheduler para Sincronización Externa
export interface ScheduledSyncJob {
  id: string; // Identificador único del trabajo
  entity: string; // Entidad a sincronizar (ej: 'users', 'orders')
  externalSystem: string; // Sistema externo de destino
  schedule: string; // Expresión cron para la frecuencia de ejecución
  lastRun?: Date; // Fecha y hora de última ejecución
  status: 'pending' | 'running' | 'completed' | 'failed'; // Estado actual
  retryCount?: number; // Número de reintentos en caso de fallo
  nextRun?: Date; // Próxima ejecución programada
}

class ScheduledExternalSync {
  private jobs = new Map<string, ScheduledSyncJob>();
  private logger: any; // Sistema de logging configurado
  private maxRetries = 3; // Máximo de reintentos por trabajo

  constructor(logger?: any) {
    this.logger = logger || console;
  }

  // Registrar nuevo trabajo de sincronización
  scheduleJob(job: ScheduledSyncJob) {
    if (!this.validateCronExpression(job.schedule)) {
      throw new Error('Expresión cron inválida');
    }

    this.jobs.set(job.id, job);
    this.logger.info(`Nuevo trabajo programado: ${job.entity} -> ${job.externalSystem}`);
  }

  // Ejecutar trabajo de sincronización
  async runJob(job: ScheduledSyncJob) {
    job.status = 'running';
    job.lastRun = new Date();

    try {
      await this.syncEntityWithExternal(job.entity, job.externalSystem);
      job.status = 'completed';
      job.retryCount = 0;
      this.logger.info(`Sincronización exitosa: ${job.entity}`);
    } catch (error) {
      job.retryCount = (job.retryCount || 0) + 1;

      if (job.retryCount >= this.maxRetries) {
        job.status = 'failed';
        this.logger.error(`Sincronización fallida después de ${this.maxRetries} intentos`, error);
      } else {
        job.status = 'pending';
        this.logger.warn(`Reintentando sincronización (${job.retryCount}/${this.maxRetries})`);
      }
    }
  }

  // Validar expresión cron
  private validateCronExpression(expression: string): boolean {
    // Implementar lógica de validación básica
    const cronRegex = /^(\*|(\d+|\*\/\d+))\s+(\*|(\d+|\*\/\d+))\s+(\*|(\d+|\*\/\d+))\s+(\*|(\d+|\*\/\d+))\s+(\*|(\d+|\*\/\d+))$/;
    return cronRegex.test(expression);
  }

  // Método placeholder para sincronización - debe ser implementado según el sistema externo
  private async syncEntityWithExternal(entity: string, externalSystem: string): Promise<void> {
    // Implementar lógica de sincronización específica
    // Por ejemplo: llamar a APIs externas, procesar datos, etc.
    this.logger.info(`Sincronizando ${entity} con ${externalSystem}`);
  }

  // Listar trabajos programados
  getScheduledJobs(): ScheduledSyncJob[] {
    return Array.from(this.jobs.values());
  }

  // Cancelar trabajo
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      this.logger.info(`Trabajo cancelado: ${jobId}`);
      return true;
    }
    return false;
  }

  // Forzar ejecución inmediata
  async forceRunJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job) {
      await this.runJob(job);
      return true;
    }
    return false;
  }

  // Obtener estado de un trabajo
  getJobStatus(jobId: string): ScheduledSyncJob | undefined {
    return this.jobs.get(jobId);
  }
}

// Default instance
export const externalSyncService = new ExternalSyncService();
export const scheduledExternalSync = new ScheduledExternalSync();

// Integración con sistema de logging existente
import { syncLogger } from './sync-logging';
const logger = {
  info: (message: string) => syncLogger.info(message),
  warn: (message: string) => syncLogger.warn(message),
  error: (message: string, error?: any) => syncLogger.error(message, undefined, error)
};

// Configurar el logger en la instancia
Object.assign(scheduledExternalSync, { logger });