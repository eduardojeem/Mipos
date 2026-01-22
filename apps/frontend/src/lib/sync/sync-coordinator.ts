/**
 * Sync Coordinator
 * - Orquesta los mecanismos de sincronización (Realtime, Polling, Offline Queue)
 * - Aplica scheduling con backpressure según backlog y calidad de red
 * - Expone estado para métricas y logging
 */

import { supabaseRealtimeService } from '@/lib/supabase-realtime';
import type { EntityChangePayload } from '@/lib/supabase-realtime';
import { pollingFallbackService } from './polling-fallback';
import { connectionMonitor, type NetworkQuality } from './connection-monitor';
import { syncLogger } from './sync-logging';
import { OfflineQueueManager } from './offline-queue-manager';
import { syncState } from './sync-state';

export type SyncMethod = 'realtime' | 'polling' | 'offline';

export interface SyncStatus {
  lastSyncTime?: number;
  syncMethod?: SyncMethod;
  isRealtimeActive: boolean;
  isPollingActive: boolean;
  backlogSize: number;
  errorCount: number;
  backpressureActive?: boolean;
}

interface CoordinatorConfig {
  tickIntervalMs: number;
  maxTickIntervalMs: number;
  backlogSlowdownThreshold: number; // cuando backlog supera este número, desacelerar
  backlogCriticalThreshold: number; // cuando backlog supera este número, activar solo polling
}

export class SyncCoordinator {
  private config: CoordinatorConfig;
  private status: SyncStatus = {
    isRealtimeActive: false,
    isPollingActive: false,
    backlogSize: 0,
    errorCount: 0
  };
  private tick?: NodeJS.Timeout;
  private currentTickInterval: number;
  private started = false;
  private lastNetworkQuality?: NetworkQuality;
  private queueManager: OfflineQueueManager;
  private allEntitiesUnsubscribe?: () => Promise<void>;

  constructor(config?: Partial<CoordinatorConfig>) {
    this.config = {
      tickIntervalMs: 2000,
      maxTickIntervalMs: 15000,
      backlogSlowdownThreshold: 20,
      backlogCriticalThreshold: 100,
      ...config
    };
    this.currentTickInterval = this.config.tickIntervalMs;
    this.queueManager = new OfflineQueueManager();
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  start() {
    if (this.started) return;
    this.started = true;

    // Suscribirse a todas las entidades (adaptador a EntityChangePayload)
    this.allEntitiesUnsubscribe = this.subscribeToAllEntities((change) => {
      syncLogger.recordRealtimeChange(change.entity, change.eventType);
      this.status.lastSyncTime = Date.now();
      this.status.syncMethod = 'realtime';
      syncLogger.setCoordinatorStatus(this.status);
    });

    // Estado de conexión y calidad de red
    connectionMonitor.subscribe((connState) => {
      this.status.isRealtimeActive = connState.isRealtimeActive;
      this.status.isPollingActive = connState.isPollingActive;
      // Ajustar polling SOLO si cambia la calidad de red para evitar bucles
      if (connState.networkQuality !== this.lastNetworkQuality) {
        this.updateIntervalByQuality(connState.networkQuality);
        this.lastNetworkQuality = connState.networkQuality;
      }
      // Actualizar estado centralizado
      syncState.update({
        isRealtimeActive: connState.isRealtimeActive,
        isPollingActive: connState.isPollingActive,
        networkQuality: connState.networkQuality,
      });
      syncLogger.setCoordinatorStatus(this.status);
    });

    // Configurar dispatcher de la cola offline hacia Supabase/HTTP
    this.queueManager.setDispatcher(async (op) => {
      try {
        // Despacho genérico: usar supabase para entidades conocidas
        const entity = op.entity;
        if (entity === 'products') {
          if (op.action === 'INSERT') {
            await supabaseRealtimeService.createProduct(op.payload);
          } else if (op.action === 'UPDATE') {
            await supabaseRealtimeService.updateProduct(op.payload.id, op.payload);
          } else if (op.action === 'DELETE') {
            await supabaseRealtimeService.deleteProduct(op.payload.id);
          }
        }
        // Para otras entidades, se puede extender con servicios dedicados
        return true;
      } catch (error) {
        this.status.errorCount += 1;
        syncLogger.log('error', 'Error dispatching offline op', { op, error });
        return false;
      }
    });

    // Iniciar ciclo de coordinación
    this.scheduleTick();
  }

  stop() {
    this.started = false;
    if (this.tick) clearTimeout(this.tick);
    // Cancelar todas las suscripciones activas del servicio realtime
    try {
      supabaseRealtimeService.unsubscribeAll();
    } catch (err) {
      this.status.errorCount += 1;
      syncLogger.warn('Error al cancelar suscripciones realtime', { err });
    }
    // Cancelar suscripciones creadas por subscribeToAllEntities
    if (this.allEntitiesUnsubscribe) {
      void this.allEntitiesUnsubscribe().catch(() => {/* ignore */});
      this.allEntitiesUnsubscribe = undefined;
    }
  }

  /**
   * Suscribe globalmente a todas las entidades relevantes del sistema
   * Devuelve una función de limpieza para cancelar todas las suscripciones.
   */
  subscribeToAllEntities(callback: (payload: EntityChangePayload) => void): () => Promise<void> {
    const unsubscribePromises: Promise<() => Promise<void>>[] = [];

    // Products
    try {
      const productsUnsubP = supabaseRealtimeService.subscribeToProductsGlobal((payload) => {
        callback({
          entity: 'products',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(productsUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to products', { error });
    }

    // Categories
    try {
      const categoriesUnsubP = supabaseRealtimeService.subscribeToCategoriesGlobal((payload) => {
        callback({
          entity: 'categories',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(categoriesUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to categories', { error });
    }

    // Customers
    try {
      const customersUnsubP = supabaseRealtimeService.subscribeToCustomersGlobal((payload) => {
        callback({
          entity: 'customers',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(customersUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to customers', { error });
    }

    // Sales
    try {
      const salesUnsubP = supabaseRealtimeService.subscribeToSalesGlobal((payload) => {
        callback({
          entity: 'sales',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(salesUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to sales', { error });
    }

    // Sale Items
    try {
      const saleItemsUnsubP = supabaseRealtimeService.subscribeToSaleItemsGlobal((payload) => {
        callback({
          entity: 'sale_items',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(saleItemsUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to sale_items', { error });
    }

    // Inventory Movements
    try {
      const inventoryUnsubP = supabaseRealtimeService.subscribeToInventoryMovementsGlobal((payload) => {
        callback({
          entity: 'inventory',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(inventoryUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to inventory_movements', { error });
    }

    // Roles
    try {
      const rolesUnsubP = supabaseRealtimeService.subscribeToRolesGlobal((payload) => {
        callback({
          entity: 'roles',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(rolesUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to roles', { error });
    }

    // Permissions
    try {
      const permissionsUnsubP = supabaseRealtimeService.subscribeToPermissionsGlobal((payload) => {
        callback({
          entity: 'permissions',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(permissionsUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to permissions', { error });
    }

    // Cash Sessions
    try {
      const cashSessionsUnsubP = supabaseRealtimeService.subscribeToCashSessionsGlobal((payload) => {
        callback({
          entity: 'cash_sessions',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(cashSessionsUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to cash_sessions', { error });
    }

    // Cash Movements
    try {
      const cashMovementsUnsubP = supabaseRealtimeService.subscribeToCashMovementsGlobal((payload) => {
        callback({
          entity: 'cash_movements',
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      });
      unsubscribePromises.push(cashMovementsUnsubP);
    } catch (error) {
      this.status.errorCount += 1;
      syncLogger.log('error', 'Failed to subscribe to cash_movements', { error });
    }

    return async () => {
      const unsubscribeFunctions = await Promise.allSettled(unsubscribePromises);
      for (const result of unsubscribeFunctions) {
        if (result.status === 'fulfilled') {
          try {
            await result.value();
          } catch (error) {
            syncLogger.log('warn', 'Error during unsubscribe', { error });
          }
        } else {
          syncLogger.log('warn', 'Failed to get unsubscribe function', { reason: result.reason });
        }
      }
    };
  }

  private scheduleTick() {
    if (!this.started) return;
    if (this.tick) clearTimeout(this.tick);
    this.tick = setTimeout(() => this.runTick(), this.currentTickInterval);
  }

  private async runTick() {
    // Procesar cola offline con backpressure
    this.status.backlogSize = (await this.queueManager.getPending()).length;

    const slowdown = this.config.backlogSlowdownThreshold;
    const critical = this.config.backlogCriticalThreshold;
    const bpCritical = this.status.backlogSize >= critical;
    const bpSlow = this.status.backlogSize >= slowdown && !bpCritical;

    if (bpCritical) {
      // Demasiado backlog: priorizar polling y reducir presión
      if (!this.status.isPollingActive) pollingFallbackService.start();
      this.currentTickInterval = Math.min(this.currentTickInterval * 2, this.config.maxTickIntervalMs);
      syncLogger.log('warn', 'Backlog critical, slowing down', { backlog: this.status.backlogSize });
      this.status.backpressureActive = true;
    } else if (bpSlow) {
      // Backlog moderado: desacelerar
      this.currentTickInterval = Math.min(this.currentTickInterval * 1.5, this.config.maxTickIntervalMs);
      this.status.backpressureActive = true;
    } else {
      // Normal: mantener/volver al intervalo base
      this.currentTickInterval = this.config.tickIntervalMs;
      this.status.backpressureActive = false;
    }

    // Intentar procesar la cola
    await this.queueManager.process();
    this.status.lastSyncTime = Date.now();
    // Estado centralizado
    syncState.update({
      backlogSize: this.status.backlogSize,
      backpressureActive: !!this.status.backpressureActive,
      lastSyncTime: this.status.lastSyncTime,
      tickIntervalMs: this.currentTickInterval,
      method: this.status.isRealtimeActive ? 'realtime' : (this.status.isPollingActive ? 'polling' : 'offline'),
    });
    syncLogger.setCoordinatorStatus(this.status);

    // Reprogramar
    this.scheduleTick();
  }

  private updateIntervalByQuality(quality: NetworkQuality) {
    // Delegar ajuste de intervalos al servicio de polling
    // Única fuente de ajuste para evitar bucles
    pollingFallbackService.setNetworkQuality(quality);
    // Ajustar velocidad del coordinador
    switch (quality) {
      case 'excellent':
        this.config.tickIntervalMs = 1500;
        break;
      case 'good':
        this.config.tickIntervalMs = 2000;
        break;
      case 'fair':
        this.config.tickIntervalMs = 3000;
        break;
      case 'poor':
        this.config.tickIntervalMs = 5000;
        break;
      case 'offline':
      default:
        this.config.tickIntervalMs = 7000;
        break;
    }
    syncState.update({ tickIntervalMs: this.config.tickIntervalMs });
  }

  /** API: configurar umbrales de backpressure */
  setThresholds(slowdown: number, critical: number) {
    this.config.backlogSlowdownThreshold = slowdown;
    this.config.backlogCriticalThreshold = critical;
    syncState.setThresholds(slowdown, critical);
  }

  /** API: forzar método de sincronización (útil para diagnóstico/failover) */
  forceMethod(method: SyncMethod) {
    if (method === 'polling') {
      pollingFallbackService.start();
      this.status.syncMethod = 'polling';
    } else if (method === 'realtime') {
      pollingFallbackService.stop();
      this.status.syncMethod = 'realtime';
    } else {
      // offline: detener polling; realtime queda según monitor
      pollingFallbackService.stop();
      this.status.syncMethod = 'offline';
    }
    syncState.update({ method });
    syncLogger.setCoordinatorStatus(this.status);
  }

  /** API: establecer prioridades de entidades para el polling */
  setEntityPriorities(priorities: Record<string, number>) {
    syncState.setEntityPriorities(priorities);
    try { pollingFallbackService.setEntityPriorities(priorities); } catch {}
  }
}

export const syncCoordinator = new SyncCoordinator();