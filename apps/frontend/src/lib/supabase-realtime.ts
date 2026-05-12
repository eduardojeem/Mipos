import { createClient } from './supabase';
import { api } from '@/lib/api';
import type { Database } from './supabase';
import type { BusinessConfig } from '@/types/business-config'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

/** Tipo genérico para filas de Supabase Realtime cuya estructura exacta no está en Database */
type RowData = Record<string, unknown>;
/** Tipo para errores tipados de PostgrestError (message, code, details, hint) */
type DbError = { message?: string; code?: string; details?: string; hint?: string };

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];
type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type RoleRow = Database['public']['Tables']['roles']['Row'];
type PermissionRow = Database['public']['Tables']['permissions']['Row'];
// Tipos de caja (usamos any si aún no están en Database)
type CashSessionRow = Database['public']['Tables']['cash_sessions']['Row'];
type CashMovementRow = Database['public']['Tables']['cash_movements']['Row'];

export interface ProductChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Product;
  old?: Product;
}

export interface SaleChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Sale;
  old?: Sale;
}

export interface SaleItemChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: SaleItem;
  old?: SaleItem;
}

export interface InventoryMovementChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: InventoryMovement;
  old?: InventoryMovement;
}

export interface RoleChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: RoleRow;
  old?: RoleRow;
}

export interface PermissionChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: PermissionRow;
  old?: PermissionRow;
}

export interface SettingsChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: RowData;
  old?: RowData;
  version?: number;
}

export interface BusinessConfigChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  config?: BusinessConfig;
  rawNew?: RowData;
  rawOld?: RowData;
  version?: number;
}

export interface CategoryChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Category;
  old?: Category;
}

export interface CustomerChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Customer;
  old?: Customer;
}

export interface CashSessionChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: CashSessionRow;
  old?: CashSessionRow;
}

export interface CashMovementChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: CashMovementRow;
  old?: CashMovementRow;
}

export type UnsubscribePromise = Promise<() => Promise<void>>;

export type EntityName = 'products' | 'categories' | 'customers' | 'sales' | 'sale_items' | 'inventory' | 'roles' | 'permissions' | 'cash_sessions' | 'cash_movements';

export interface EntityChangePayload {
  entity: EntityName;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: RowData;
  old?: RowData;
}

// Type guards to ensure real-time payload rows conform to expected types
const isProductRow = (row: unknown): row is Product => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'sku' in row;
};
const isSaleRow = (row: unknown): row is Sale => {
  return !!row && typeof row === 'object' && 'id' in row && 'user_id' in row && 'total_amount' in row;
};
const isSaleItemRow = (row: unknown): row is SaleItem => {
  return !!row && typeof row === 'object' && 'id' in row && 'sale_id' in row && 'product_id' in row;
};
const isInventoryMovementRow = (row: unknown): row is InventoryMovement => {
  return !!row && typeof row === 'object' && 'id' in row && 'product_id' in row && 'movement_type' in row;
};
const isRoleRow = (row: unknown): row is RoleRow => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'is_active' in row;
};
const isPermissionRow = (row: unknown): row is PermissionRow => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'resource' in row && 'action' in row;
};
const isCategoryRow = (row: unknown): row is Category => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'is_active' in row;
};
const isCustomerRow = (row: unknown): row is Customer => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'is_active' in row;
};
const isCashSessionRow = (row: unknown): row is CashSessionRow => {
  return !!row && typeof row === 'object' && 'id' in row && ('user_id' in row || 'opened_by' in row) && ('status' in row || 'session_status' in row);
};
const isCashMovementRow = (row: unknown): row is CashMovementRow => {
  return !!row && typeof row === 'object' && 'id' in row && 'session_id' in row && 'amount' in row;
};
export class SupabaseRealtimeService {
  private supabase = createClient();
  private subscriptions = new Map<string, ReturnType<typeof this.supabase.channel>>();
  /** Cache simple del estado de conexión */
  private lastConnectionCheck = 0;
  private lastIsConnected = false;
  /** Listeners para cambios de conexión y errores */
  private connectionListeners: Set<(status: string) => void> = new Set();
  private errorListeners: Set<(error: unknown) => void> = new Set();
  /** Canal dedicado para monitorear estado de conexión */
  private connectionChannel?: ReturnType<typeof this.supabase.channel>;
  /** Throttling y versionado para settings */
  private settingsThrottleTimer?: ReturnType<typeof setTimeout>;
  private settingsPendingPayload?: SettingsChangePayload;
  private settingsVersionCounter = 0;
  /** Throttling para business_config específico */
  private businessConfigThrottleTimer?: ReturnType<typeof setTimeout>;
  private businessConfigPendingPayload?: BusinessConfigChangePayload;
  private canTextSearch?: boolean;
  private textSearchProbeAt?: number;
  private productCache = new Map<string, { data: Product[]; total: number; nextCursor?: string; ts: number }>();
  private categoryCache = new Map<string, { name: string; ts: number }>();
  private cacheTTL = 30000;
  private log = createLogger('supabase-realtime');

  /**
   * Suscribirse a cambios en tiempo real de productos
   */
  subscribeToProducts(callback: (payload: ProductChangePayload) => void) {
    const subscription = this.supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          const changePayload: ProductChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isProductRow(payload.new) ? payload.new : undefined,
            old: isProductRow(payload.old) ? payload.old : undefined
          };
          // Invalida caché simple ante cualquier cambio
          this.productCache.clear();
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set('products', subscription);
    return subscription;
  }

  /**
   * Suscribirse a cambios en tiempo real de una tabla genérica
   */
  private metrics: Record<string, { count: number; lastEventAt: number }> = {};

  subscribeToTable<T extends RowData = RowData>(
    tableName: string,
    callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: T; old?: T }) => void
  ) {
    const key = `table:${tableName}`;
    const channelName = `table-${tableName}-changes`;

    const subscription = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const changePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as T | undefined,
            old: payload.old as T | undefined
          };
          const prev = this.metrics[tableName] ?? { count: 0, lastEventAt: 0 };
          this.metrics[tableName] = { count: prev.count + 1, lastEventAt: Date.now() };
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  getMetrics(): Record<string, { count: number; lastEventAt: number }> {
    return { ...this.metrics };
  }

  /**
   * Suscribirse a cambios en tiempo real de categorías
   */
  subscribeToCategories(callback: (payload: CategoryChangePayload) => void) {
    const subscription = this.supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        (payload: RealtimePostgresChangesPayload<Category>) => {
          const changePayload: CategoryChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCategoryRow(payload.new) ? payload.new : undefined,
            old: isCategoryRow(payload.old) ? payload.old : undefined
          };
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set('categories', subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en categorías con tipado estricto y manejo de errores
   */
  subscribeToCategoriesGlobal(callback: (payload: CategoryChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-categories';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload: RealtimePostgresChangesPayload<Category>) => {
          try {
            const changePayload: CategoryChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isCategoryRow(payload.new) ? payload.new : undefined,
              old: isCategoryRow(payload.old) ? payload.old : undefined
            };
            callback(changePayload);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscripción global a cambios en productos con tipado estricto y manejo de errores
   */
  subscribeToProductsGlobal(callback: (payload: ProductChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-products';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          try {
            const changePayload: ProductChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isProductRow(payload.new) ? payload.new : undefined,
              old: isProductRow(payload.old) ? payload.old : undefined
            };
            callback(changePayload);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscripción global a cambios en ventas con tipado estricto y manejo de errores
   */
  subscribeToSalesGlobal(callback: (payload: SaleChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-sales';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload: RealtimePostgresChangesPayload<Sale>) => {
          try {
            const changePayload: SaleChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isSaleRow(payload.new) ? payload.new : undefined,
              old: isSaleRow(payload.old) ? payload.old : undefined
            };
            callback(changePayload);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a cambios específicos de un producto
   */
  subscribeToProduct(productId: string, callback: (payload: ProductChangePayload) => void) {
    const subscription = this.supabase
      .channel(`product-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`
        },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          const changePayload: ProductChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isProductRow(payload.new) ? payload.new : undefined,
            old: isProductRow(payload.old) ? payload.old : undefined
          };
          
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set(`product-${productId}`, subscription);
    return subscription;
  }

  /**
   * Suscribirse a cambios globales de sale_items
   */
  subscribeToSaleItems(callback: (payload: SaleItemChangePayload) => void) {
    const subscription = this.supabase
      .channel('sale-items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        (payload: RealtimePostgresChangesPayload<SaleItem>) => {
          const changePayload: SaleItemChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleItemRow(payload.new) ? payload.new : undefined,
            old: isSaleItemRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      )
      .subscribe();
    this.subscriptions.set('sale_items', subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en los ítems de venta
   * Maneja INSERT, UPDATE, DELETE y retorna una función de desuscripción asíncrona
   */
  subscribeToSaleItemsGlobal(callback: (payload: SaleItemChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-sale-items';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        (payload: RealtimePostgresChangesPayload<SaleItem>) => {
          const changePayload: SaleItemChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleItemRow(payload.new) ? payload.new : undefined,
            old: isSaleItemRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a cambios de sale_items por venta específica
   */
  subscribeToSaleItemsBySale(saleId: string, callback: (payload: SaleItemChangePayload) => void) {
    const subscription = this.supabase
      .channel(`sale-items-${saleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items', filter: `sale_id=eq.${saleId}` },
        (payload: RealtimePostgresChangesPayload<SaleItem>) => {
          const changePayload: SaleItemChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleItemRow(payload.new) ? payload.new : undefined,
            old: isSaleItemRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      )
      .subscribe();
    this.subscriptions.set(`sale_items:${saleId}`, subscription);
    return subscription;
  }

  /**
   * Suscribirse a movimientos de inventario por producto
   */
  subscribeToInventoryMovementsByProduct(productId: string, callback: (payload: InventoryMovementChangePayload) => void) {
    const subscription = this.supabase
      .channel(`inventory-movements-${productId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements', filter: `product_id=eq.${productId}` },
        (payload: RealtimePostgresChangesPayload<InventoryMovement>) => {
          const changePayload: InventoryMovementChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isInventoryMovementRow(payload.new) ? payload.new : undefined,
            old: isInventoryMovementRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      )
      .subscribe();
    this.subscriptions.set(`inventory_movements:${productId}`, subscription);
    return subscription;
  }

  /**
   * Suscribirse a todas las entidades con filtros por rol/usuario y proyección de campos
   * - Reduce exposición de datos sensibles en el cliente
   * - Aplica filtros server-side cuando es posible mediante `filter`
   */
  subscribeToAllEntitiesSelective(
    options: {
      filters?: Partial<Record<EntityName, string>>;
      project?: Partial<Record<EntityName, string[]>>; // columnas permitidas
      redact?: Partial<Record<EntityName, string[]>>; // columnas a ocultar
    },
    callback: (payload: EntityChangePayload) => void
  ) {
    const { filters = {}, project = {}, redact = {} } = options || {};

    const makeProjection = (entity: EntityName, row: RowData): RowData => {
      if (!row) return row;
      const allow = project[entity];
      const hide = redact[entity];
      let out: RowData = row;
      if (Array.isArray(allow) && allow.length > 0) {
        out = allow.reduce<RowData>((acc, key) => {
          if (key in row) acc[key] = row[key];
          return acc;
        }, {});
      }
      if (Array.isArray(hide) && hide.length > 0) {
        hide.forEach((k) => {
          if (k in out) delete out[k];
        });
      }
      return out;
    };

    const subs: ReturnType<typeof this.supabase.channel>[] = [];

    const addSub = <T extends object>(entity: EntityName, table: string, isValid: (r: unknown) => boolean) => {
      const sub = this.supabase
        .channel(`selective-${entity}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filters[entity] ? { filter: filters[entity] as string } : {})
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            const change: EntityChangePayload = {
              entity,
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isValid(payload.new)
                ? makeProjection(entity, payload.new as unknown as RowData)
                : undefined,
              old: isValid(payload.old)
                ? makeProjection(entity, payload.old as unknown as RowData)
                : undefined,
            };
            callback(change);
          }
        )
        .subscribe();
      this.subscriptions.set(`selective:${entity}`, sub);
      subs.push(sub);
    };

    addSub<Product>('products', 'products', isProductRow);
    addSub<Category>('categories', 'categories', (r) => !!r);
    addSub<Customer>('customers', 'customers', (r) => !!r);
    addSub<Sale>('sales', 'sales', isSaleRow);
    addSub<SaleItem>('sale_items', 'sale_items', isSaleItemRow);
    addSub<InventoryMovement>('inventory', 'inventory_movements', isInventoryMovementRow);

    return subs;
  }

  /**
   * Suscribirse a cambios en tiempo real de ventas
   */
  subscribeToSales(callback: (payload: SaleChangePayload) => void) {
    const subscription = this.supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload: RealtimePostgresChangesPayload<Sale>) => {
          const change: SaleChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleRow(payload.new) ? payload.new : undefined,
            old: isSaleRow(payload.old) ? payload.old : undefined,
          };
          callback(change);
        }
      )
      .subscribe();

    this.subscriptions.set('sales', subscription);
    return subscription;
  }


  /**
   * Suscribirse a cambios en movimientos de inventario
   */
  subscribeToInventoryMovements(
    callback: (payload: InventoryMovementChangePayload) => void
  ) {
    const subscription = this.supabase
      .channel('inventory-movements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        (payload: RealtimePostgresChangesPayload<InventoryMovement>) => {
          const change: InventoryMovementChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isInventoryMovementRow(payload.new) ? payload.new : undefined,
            old: isInventoryMovementRow(payload.old) ? payload.old : undefined,
          };
          callback(change);
        }
      )
      .subscribe();

    this.subscriptions.set('inventory_movements', subscription);
    return subscription;
  }

  subscribeToPromotions(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('promotions', callback)
    this.subscriptions.set('promotions', subscription)
    return subscription
  }

  subscribeToPromotionsProducts(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('promotions_products', callback)
    this.subscriptions.set('promotions_products', subscription)
    return subscription
  }

  subscribeToPromotionsCarousel(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('promotions_carousel', callback)
    this.subscriptions.set('promotions_carousel', subscription)
    return subscription
  }

  subscribeToLoyaltyPrograms(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('loyalty_programs', callback)
    this.subscriptions.set('loyalty_programs', subscription)
    return subscription
  }

  subscribeToLoyaltyTiers(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('loyalty_tiers', callback)
    this.subscriptions.set('loyalty_tiers', subscription)
    return subscription
  }

  subscribeToCustomerLoyalty(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('customer_loyalty', callback)
    this.subscriptions.set('customer_loyalty', subscription)
    return subscription
  }

  subscribeToPointsTransactions(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('points_transactions', callback)
    this.subscriptions.set('points_transactions', subscription)
    return subscription
  }

  subscribeToLoyaltyRewards(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('loyalty_rewards', callback)
    this.subscriptions.set('loyalty_rewards', subscription)
    return subscription
  }

  subscribeToCustomerRewards(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void) {
    const subscription = this.subscribeToTable<RowData>('customer_rewards', callback)
    this.subscriptions.set('customer_rewards', subscription)
    return subscription
  }


  /**
   * Suscripción global a movimientos de inventario con filtros y manejo de errores
   * Aplica un filtro básico para ignorar cantidades no positivas
   */
  subscribeToInventoryMovementsGlobal(
    callback: (payload: InventoryMovementChangePayload) => void
  ): UnsubscribePromise {
    const channelName = 'global-inventory-movements';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements', filter: 'quantity=gt.0' },
        (payload: RealtimePostgresChangesPayload<InventoryMovement>) => {
          try {
            const change: InventoryMovementChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isInventoryMovementRow(payload.new) ? payload.new : undefined,
              old: isInventoryMovementRow(payload.old) ? payload.old : undefined,
            };
            callback(change);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a cambios de una sesión de caja específica
   */
  subscribeToCashSession(
    sessionId: string,
    callback: (payload: CashSessionChangePayload) => void
  ) {
    const channelName = `cash-session-${sessionId}`;
    const subscription = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_sessions', filter: `id=eq.${sessionId}` },
        (payload: RealtimePostgresChangesPayload<CashSessionRow>) => {
          const changePayload: CashSessionChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCashSessionRow(payload.new) ? payload.new : undefined,
            old: isCashSessionRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      )
      .subscribe();
    this.subscriptions.set(`cash_session:${sessionId}`, subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en sesiones de caja con tipado y filtros
   */
  subscribeToCashSessionsGlobal(callback: (payload: CashSessionChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-cash-sessions';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_sessions' },
        (payload: RealtimePostgresChangesPayload<CashSessionRow>) => {
          try {
            const changePayload: CashSessionChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isCashSessionRow(payload.new) ? payload.new : undefined,
              old: isCashSessionRow(payload.old) ? payload.old : undefined,
            };
            callback(changePayload);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a movimientos de caja por sesión
   */
  subscribeToCashMovementsBySession(
    sessionId: string,
    callback: (payload: CashMovementChangePayload) => void
  ) {
    const channelName = `cash-movements-${sessionId}`;
    const subscription = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_movements', filter: `session_id=eq.${sessionId}` },
        (payload: RealtimePostgresChangesPayload<CashMovementRow>) => {
          const changePayload: CashMovementChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCashMovementRow(payload.new) ? payload.new : undefined,
            old: isCashMovementRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      )
      .subscribe();
    this.subscriptions.set(`cash_movements:${sessionId}`, subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en movimientos de caja con tipado y filtros
   */
  subscribeToCashMovementsGlobal(callback: (payload: CashMovementChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-cash-movements';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_movements' },
        (payload: RealtimePostgresChangesPayload<CashMovementRow>) => {
          try {
            const changePayload: CashMovementChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isCashMovementRow(payload.new) ? payload.new : undefined,
              old: isCashMovementRow(payload.old) ? payload.old : undefined,
            };
            callback(changePayload);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a sesiones de caja abiertas (útil para detectar apertura/cierre)
   */
  subscribeToOpenCashSessions(callback: (payload: CashSessionChangePayload) => void) {
    const subscription = this.supabase
      .channel('cash-sessions-open')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_sessions', filter: `status=eq.OPEN` },
        (payload: RealtimePostgresChangesPayload<CashSessionRow>) => {
          const changePayload: CashSessionChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCashSessionRow(payload.new) ? payload.new : undefined,
            old: isCashSessionRow(payload.old) ? payload.old : undefined,
          };
          callback(changePayload);
        }
      )
      .subscribe();
    this.subscriptions.set('cash_sessions:OPEN', subscription);
    return subscription;
  }

  /**
   * Suscribirse a cambios en tiempo real de clientes
   */
  subscribeToCustomers(callback: (payload: CustomerChangePayload) => void) {
    const subscription = this.supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload: RealtimePostgresChangesPayload<Customer>) => {
          const changePayload: CustomerChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCustomerRow(payload.new) ? payload.new : undefined,
            old: isCustomerRow(payload.old) ? payload.old : undefined
          };
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set('customers', subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en clientes con tipado estricto y manejo de errores
   */
  subscribeToCustomersGlobal(callback: (payload: CustomerChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-customers';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload: RealtimePostgresChangesPayload<Customer>) => {
          try {
            const changePayload: CustomerChangePayload = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: isCustomerRow(payload.new) ? payload.new : undefined,
              old: isCustomerRow(payload.old) ? payload.old : undefined
            };
            callback(changePayload);
          } catch (err) {
            this.emitError(err);
          }
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a cambios en roles
   */
  subscribeToRoles(callback: (payload: RoleChangePayload) => void) {
    const subscription = this.supabase
      .channel('roles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        (payload: RealtimePostgresChangesPayload<RoleRow>) => {
          const changePayload: RoleChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isRoleRow(payload.new) ? payload.new : undefined,
            old: isRoleRow(payload.old) ? payload.old : undefined
          };
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set('roles', subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en roles con tipado y filtro de seguridad
   * Filtra roles activos por defecto (is_active=true)
   */
  subscribeToRolesGlobal(callback: (payload: RoleChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-roles';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles', filter: 'is_active=eq.true' },
        (payload: RealtimePostgresChangesPayload<RoleRow>) => {
          const change: RoleChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isRoleRow(payload.new) ? payload.new : undefined,
            old: isRoleRow(payload.old) ? payload.old : undefined,
          };
          callback(change);
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse a cambios en permisos
   */
  subscribeToPermissions(callback: (payload: PermissionChangePayload) => void) {
    const subscription = this.supabase
      .channel('permissions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permissions' },
        (payload: RealtimePostgresChangesPayload<PermissionRow>) => {
          const changePayload: PermissionChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isPermissionRow(payload.new) ? payload.new : undefined,
            old: isPermissionRow(payload.old) ? payload.old : undefined
          };
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set('permissions', subscription);
    return subscription;
  }

  /**
   * Suscripción global a cambios en permisos con tipado y logs
   */
  subscribeToPermissionsGlobal(callback: (payload: PermissionChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-permissions';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permissions' },
        (payload: RealtimePostgresChangesPayload<PermissionRow>) => {
          const change: PermissionChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isPermissionRow(payload.new) ? payload.new : undefined,
            old: isPermissionRow(payload.old) ? payload.old : undefined,
          };
          // Log básico para debugging
          try {
            console.debug('[permissions] change', {
              eventType: change.eventType,
              newId: change.new?.id,
              oldId: change.old?.id,
              resource: change.new?.resource || change.old?.resource,
              action: change.new?.action || change.old?.action
            });
          } catch {}
          callback(change);
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscripción global a cambios en configuraciones (settings) con versionado y throttling
   * - Consolida eventos rápidos y emite el último cambio cada ~400ms
   * - Añade un contador de versión si el registro no lo provee
   */
  subscribeToSettingsGlobal(callback: (payload: SettingsChangePayload) => void): UnsubscribePromise {
    const channelName = 'global-settings';
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload: RealtimePostgresChangesPayload<RowData>) => {
          const raw = payload.new as RowData | undefined;
          const rawOld = payload.old as RowData | undefined;
          const change: SettingsChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: raw,
            old: rawOld,
            version: (raw?.['version'] as number | undefined) ?? (rawOld?.['version'] as number | undefined) ?? (++this.settingsVersionCounter)
          };

          // Throttling: agrupar y emitir con retraso corto
          this.settingsPendingPayload = change;
          if (this.settingsThrottleTimer) {
            clearTimeout(this.settingsThrottleTimer);
          }
          this.settingsThrottleTimer = setTimeout(() => {
            try {
              if (this.settingsPendingPayload) {
                callback(this.settingsPendingPayload);
              }
            } catch (err) {
              this.emitError(err);
            } finally {
              this.settingsPendingPayload = undefined;
              this.settingsThrottleTimer = undefined;
            }
          }, 400);
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              if (this.settingsThrottleTimer) clearTimeout(this.settingsThrottleTimer);
              this.settingsPendingPayload = undefined;
              this.settingsThrottleTimer = undefined;
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscribirse específicamente a cambios de `public.settings` con key='business_config'
   * - Emite el objeto `BusinessConfig` deserializado desde `value`
   * - Aplica throttling similar (~400ms)
   */
  subscribeToBusinessConfig(callback: (payload: BusinessConfigChangePayload) => void): UnsubscribePromise {
    const channelName = 'business-config';
    let orgId: string | null = null;
    let orgIds: string[] = [];
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('selected_organization');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            orgId = parsed?.id || parsed?.organization_id || null;
          } catch {
            orgId = raw;
          }
        }
      }
      const ses = this.supabase.auth.getSession();
      if (!orgId && ses && typeof ses.then === 'function') {
        ses
          .then((res: unknown) => {
            const r = res as { data?: { session?: { user?: { id?: string } }; user?: { id?: string } } } | null;
            const uid = r?.data?.session?.user?.id ?? r?.data?.user?.id ?? null;
            if (uid) {
              return this.supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', uid);
            }
            return null;
          })
          .then((r: unknown) => {
            const resp = r as { data?: Array<{ organization_id: string }> } | null;
            if (resp?.data) {
              orgIds = (resp.data).map((m) => String(m.organization_id)).filter(Boolean);
              if (!orgId && orgIds.length === 1) orgId = orgIds[0];
            }
          })
          .catch(() => { /* no-op */ });
      }
    } catch { /* no-op */ }
    const orgFilter = orgId && String(orgId).trim() ? `organization_id=eq.${String(orgId).trim()}` : undefined;

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        orgFilter
          ? { event: '*', schema: 'public', table: 'settings', filter: `${orgFilter},key=eq.business_config` }
          : { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.business_config' },
        (payload: RealtimePostgresChangesPayload<RowData>) => {
          const rawNew = payload.new as RowData | undefined;
          const rawOld = payload.old as RowData | undefined;
          const keyNew = rawNew?.['key'];
          const keyOld = rawOld?.['key'];
          if (keyNew !== 'business_config' && keyOld !== 'business_config') return;

          if (orgIds.length > 0) {
            const oid = rawNew?.['organization_id'] ?? rawOld?.['organization_id'];
            if (oid && !orgIds.includes(String(oid))) return;
          }

          const value = (rawNew?.['value'] ?? rawOld?.['value']) ?? {};
          const change: BusinessConfigChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            config: value as BusinessConfig,
            rawNew,
            rawOld,
            version: (rawNew?.['version'] as number | undefined) ?? (rawOld?.['version'] as number | undefined) ?? (++this.settingsVersionCounter)
          };

          this.businessConfigPendingPayload = change;
          if (this.businessConfigThrottleTimer) clearTimeout(this.businessConfigThrottleTimer);
          this.businessConfigThrottleTimer = setTimeout(() => {
            try {
              if (this.businessConfigPendingPayload) {
                callback(this.businessConfigPendingPayload);
              }
            } catch (err) {
              this.emitError(err);
            } finally {
              this.businessConfigPendingPayload = undefined;
              this.businessConfigThrottleTimer = undefined;
            }
          }, 400);
        }
      );

    this.subscriptions.set(channelName, channel);

    const unsubscribePromise: UnsubscribePromise = new Promise((resolve) => {
      channel.subscribe((status: string) => {
        this.emitConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          resolve(async () => {
            try {
              if (this.businessConfigThrottleTimer) clearTimeout(this.businessConfigThrottleTimer);
              this.businessConfigPendingPayload = undefined;
              this.businessConfigThrottleTimer = undefined;
              this.supabase.removeChannel(channel);
              this.subscriptions.delete(channelName);
            } catch (err) {
              this.emitError(err);
              throw err;
            }
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.emitError(new Error(`Realtime channel ${channelName} status: ${status}`));
        }
      });
    });

    return unsubscribePromise;
  }

  /**
   * Suscripciones en tiempo real para todas las entidades clave
   * - products, categories, customers, sales, sale_items, inventory_movements, roles, permissions, cash_sessions, cash_movements
   */
  subscribeToAllEntities(callback: (payload: EntityChangePayload) => void) {
    let orgId: string | null = null;
    let orgIds: string[] = [];
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('selected_organization');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            orgId = parsed?.id || parsed?.organization_id || null;
          } catch {
            orgId = raw;
          }
        }
      }
      // Resolve orgIds asynchronously without blocking subscription creation
      const ses = this.supabase.auth.getSession();
      if (!orgId && ses && typeof ses.then === 'function') {
        ses
          .then((res: unknown) => {
            const r = res as { data?: { session?: { user?: { id?: string } }; user?: { id?: string } } } | null;
            const uid = r?.data?.session?.user?.id ?? r?.data?.user?.id ?? null;
            if (uid) {
              return this.supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', uid);
            }
            return null;
          })
          .then((r: unknown) => {
            const resp = r as { data?: Array<{ organization_id: string }> } | null;
            if (resp?.data) {
              orgIds = (resp.data).map((m) => String(m.organization_id)).filter(Boolean);
              if (!orgId && orgIds.length === 1) orgId = orgIds[0];
            }
          })
          .catch(() => { /* no-op */ });
      }
    } catch { /* no-op */ }
    const orgFilter = orgId && String(orgId).trim() ? `organization_id=eq.${String(orgId).trim()}` : undefined;

    const productsSub = this.supabase
      .channel('all-products')
      .on(
        'postgres_changes',
        orgFilter ? { event: '*', schema: 'public', table: 'products', filter: orgFilter } : { event: '*', schema: 'public', table: 'products' },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          if (orgIds.length > 0) {
            const oid = (payload.new as Record<string, unknown>)?.['organization_id'] || (payload.old as Record<string, unknown>)?.['organization_id'];
            if (oid && !orgIds.includes(String(oid))) return;
          }
          const change: EntityChangePayload = {
            entity: 'products',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isProductRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isProductRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:products', productsSub);

    // categories
    const categoriesSub = this.supabase
      .channel('all-categories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload: RealtimePostgresChangesPayload<Category>) => {
          const change: EntityChangePayload = {
            entity: 'categories',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCategoryRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isCategoryRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:categories', categoriesSub);

    // customers
    const customersSub = this.supabase
      .channel('all-customers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload: RealtimePostgresChangesPayload<Customer>) => {
          const change: EntityChangePayload = {
            entity: 'customers',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCustomerRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isCustomerRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:customers', customersSub);

    // sales
    const salesSub = this.supabase
      .channel('all-sales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload: RealtimePostgresChangesPayload<Sale>) => {
          const change: EntityChangePayload = {
            entity: 'sales',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isSaleRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:sales', salesSub);

    // sale_items
    const saleItemsSub = this.supabase
      .channel('all-sale-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        (payload: RealtimePostgresChangesPayload<SaleItem>) => {
          const change: EntityChangePayload = {
            entity: 'sale_items',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleItemRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isSaleItemRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:sale_items', saleItemsSub);

    // inventory_movements
    const inventorySub = this.supabase
      .channel('all-inventory-movements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        (payload: RealtimePostgresChangesPayload<InventoryMovement>) => {
          const change: EntityChangePayload = {
            entity: 'inventory',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isInventoryMovementRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isInventoryMovementRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:inventory_movements', inventorySub);

    // roles
    const rolesSub = this.supabase
      .channel('all-roles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        (payload: RealtimePostgresChangesPayload<RoleRow>) => {
          const change: EntityChangePayload = {
            entity: 'roles',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isRoleRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isRoleRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:roles', rolesSub);

    // permissions
    const permissionsSub = this.supabase
      .channel('all-permissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permissions' },
        (payload: RealtimePostgresChangesPayload<PermissionRow>) => {
          const change: EntityChangePayload = {
            entity: 'permissions',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isPermissionRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isPermissionRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:permissions', permissionsSub);

    // cash_sessions
    const cashSessionsSub = this.supabase
      .channel('all-cash-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_sessions' },
        (payload: RealtimePostgresChangesPayload<CashSessionRow>) => {
          const change: EntityChangePayload = {
            entity: 'cash_sessions',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCashSessionRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isCashSessionRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:cash_sessions', cashSessionsSub);

    // cash_movements
    const cashMovementsSub = this.supabase
      .channel('all-cash-movements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_movements' },
        (payload: RealtimePostgresChangesPayload<CashMovementRow>) => {
          const change: EntityChangePayload = {
            entity: 'cash_movements',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isCashMovementRow(payload.new) ? (payload.new as unknown as RowData) : undefined,
            old: isCashMovementRow(payload.old) ? (payload.old as unknown as RowData) : undefined,
          };
          callback(change);
        }
      )
      .subscribe();
    this.subscriptions.set('all:cash_movements', cashMovementsSub);

    return [productsSub, categoriesSub, customersSub, salesSub, saleItemsSub, inventorySub, rolesSub, permissionsSub, cashSessionsSub, cashMovementsSub];
  }

  /**
   * Desuscribirse de un canal específico
   */
  unsubscribe(channelName: string) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      this.supabase.removeChannel(subscription);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Desuscribirse de todos los canales
   */
  unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      this.supabase.removeChannel(subscription);
    });
    this.subscriptions.clear();
  }

  /**
   * Obtener el estado de las suscripciones
   */
  getSubscriptionStatus() {
    const status: Record<string, string> = {};
    this.subscriptions.forEach((subscription, channelName) => {
      status[channelName] = subscription.state;
    });
    return status;
  }

  /**
   * Verificar si hay conexión activa a Realtime
   * - Considera estado de canales suscritos
   * - Cachea durante ~2s para evitar costo
   */
  isConnected(): boolean {
    const now = Date.now();
    if (now - this.lastConnectionCheck < 2000) {
      return this.lastIsConnected;
    }
    let connected = false;
    this.subscriptions.forEach((subscription) => {
      if (subscription?.state === 'subscribed') connected = true;
    });
    this.lastIsConnected = connected;
    this.lastConnectionCheck = now;
    return connected;
  }

  /**
   * Registrar callback para cambios de estado de conexión de Realtime
   * Emite estados compatibles con ConnectionMonitor (p.ej. 'SUBSCRIBED', 'DISCONNECTED')
   */
  onConnectionChange(listener: (status: string) => void): () => void {
    this.connectionListeners.add(listener);
    this.ensureConnectionMonitorChannel();
    // Emitir estado inicial basado en suscripciones actuales
    listener(this.isConnected() ? 'SUBSCRIBED' : 'DISCONNECTED');
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Registrar callback para errores de Realtime
   */
  onError(listener: (error: unknown) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Intentar reconectar Realtime creando un canal de monitoreo fresco
   */
  async reconnect(): Promise<void> {
    try {
      if (this.connectionChannel) {
        try {
          this.supabase.removeChannel(this.connectionChannel);
        } catch {}
        this.connectionChannel = undefined;
      }
      this.ensureConnectionMonitorChannel();
    } catch (err) {
      this.emitError(err);
      throw err;
    }
  }

  /**
   * Crear/asegurar canal de monitoreo de conexión y reenviar estados
   */
  private ensureConnectionMonitorChannel(): void {
    if (this.connectionChannel) return;
    const channel = this.supabase.channel('connection-monitor');
    channel.subscribe((status: string) => {
      this.emitConnectionStatus(status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.emitError(new Error(`Realtime channel status: ${status}`));
      }
      if (status === 'CLOSED') {
        this.emitConnectionStatus('DISCONNECTED');
      }
    });
    this.connectionChannel = channel;
  }

  private emitConnectionStatus(status: string): void {
    const normalized =
      status === 'SUBSCRIBED' ? 'SUBSCRIBED' :
      status === 'CLOSED' ? 'DISCONNECTED' :
      status === 'TIMED_OUT' ? 'CHANNEL_ERROR' :
      status;
    this.connectionListeners.forEach((l) => {
      try { l(normalized); } catch {}
    });
  }

  private emitError(error: unknown): void {
    this.errorListeners.forEach((l) => {
      try { l(error); } catch {}
    });
  }

  /**
   * Operaciones CRUD con Supabase directamente
   */
  async createProduct(product: ProductInsert): Promise<Product | null> {
    try {
      const safeProduct: Omit<ProductInsert, 'offer_price'> & Record<string, unknown> = { ...product };
      delete (safeProduct as Record<string, unknown>)['offer_price'];

      // Ensure organization_id for multitenancy (read from localStorage if available)
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('selected_organization');
          if (raw && !safeProduct.organization_id) {
            let orgId: string | null = null;
            try {
              const parsed = JSON.parse(raw);
              orgId = parsed?.id || parsed?.organization_id || null;
            } catch {
              orgId = raw;
            }
            if (orgId && String(orgId).trim()) {
              safeProduct.organization_id = String(orgId).trim();
            }
          }
        }
      } catch {}

      const { data, error } = await this.supabase
        .from('products')
        .insert(safeProduct)
        .select()
        .single();

      if (error) {
        try {
          const fallback = await api.post('/products', safeProduct);
          return (fallback.data?.product ?? fallback.data) as Product;
        } catch (apiErr) {
          const dbErr = error as DbError;
          const message = dbErr.message ?? 'Error al crear producto';
          console.error('Error creating product:', {
            message: dbErr.message,
            code: dbErr.code,
            details: dbErr.details,
            hint: dbErr.hint
          });
          const normalized = Object.assign(new Error(message), {
            code: dbErr.code,
            details: dbErr.details,
            hint: dbErr.hint
          });
          throw normalized;
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, updates: ProductUpdate): Promise<Product | null> {
    try {
      const safeUpdates = __makeSafeUpdates(updates);
      let orgId: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('selected_organization');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              orgId = parsed?.id || parsed?.organization_id || null;
            } catch {
              orgId = raw;
            }
          }
        }
      } catch {}

      const { data, error } = await this.supabase
        .from('products')
        .update(safeUpdates)
        .eq('id', id)
        .eq('organization_id', orgId ?? '')
        .select()
        .single();

      if (error) {
        try {
          const fallback = await api.put(`/products/${id}`, safeUpdates);
          return (fallback.data?.product ?? fallback.data) as Product;
        } catch (apiErr) {
          const dbErr = error as DbError;
          const message = dbErr.message ?? 'Error al actualizar producto';
          console.error('Error updating product:', {
            message: dbErr.message,
            code: dbErr.code,
            details: dbErr.details,
            hint: dbErr.hint
          });
          throw Object.assign(new Error(message), {
            code: dbErr.code,
            details: dbErr.details,
            hint: dbErr.hint
          });
        }
      }

      return data ?? null;
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      let orgId: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('selected_organization');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              orgId = parsed?.id || parsed?.organization_id || null;
            } catch {
              orgId = raw;
            }
          }
        }
      } catch {}

      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId ?? '');

      if (error) {
        const dbErr = error as DbError;
        const message = dbErr.message ?? 'Error al eliminar producto en Supabase';
        console.error('Error deleting product:', {
          message: dbErr.message,
          code: dbErr.code,
          details: dbErr.details,
          hint: dbErr.hint
        });
        throw Object.assign(new Error(message), {
          code: dbErr.code,
          details: dbErr.details,
          hint: dbErr.hint
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  }

  async getProducts(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    cursorUpdatedAt?: string;
    sortBy?: 'name' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    isActive?: boolean;
    dateFrom?: string;
    dateTo?: string;
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
    fields?: string[];
    includeCategory?: boolean;
  }): Promise<{ products: Product[]; total: number; hasMore?: boolean; nextCursor?: string }> {
    try {
      const cacheable = !filters?.cursorUpdatedAt;
      const key = JSON.stringify({
        page: filters?.page || 1,
        limit: filters?.limit || 25,
        search: filters?.search || '',
        categoryId: filters?.categoryId || '',
        sortBy: filters?.sortBy || 'updated_at',
        sortOrder: filters?.sortOrder || 'desc',
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
        minStock: filters?.minStock,
        maxStock: filters?.maxStock,
        isActive: filters?.isActive,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        stockStatus: filters?.stockStatus,
        fields: (filters?.fields || []).join(','),
        includeCategory: !!filters?.includeCategory
      });
      const now = Date.now();
      if (cacheable) {
        const cached = this.productCache.get(key);
        if (cached && (now - cached.ts) < this.cacheTTL) {
          this.log.debug('Cache hit for products', { key });
          return { products: cached.data, total: cached.total, hasMore: !!cached.nextCursor, nextCursor: cached.nextCursor };
        }
      }
      const t0 = performance.now ? performance.now() : Date.now();
      const countMode = filters?.cursorUpdatedAt ? 'planned' : ('exact' as const);

      const canQuery = typeof this.supabase.from === 'function';
      if (!canQuery) {
        const params: Record<string, string | number | boolean> = {};
        if (filters?.page) params['page'] = filters.page;
        if (filters?.limit) params['limit'] = filters.limit;
        if (filters?.search) params['search'] = filters.search;
        if (filters?.categoryId) params['categoryId'] = filters.categoryId;
        if (filters?.sortBy) params['sort'] = filters.sortBy;
        if (filters?.sortOrder) params['order'] = filters.sortOrder;
        if (filters?.minPrice !== undefined) params['min_price'] = filters.minPrice;
        if (filters?.maxPrice !== undefined) params['max_price'] = filters.maxPrice;
        if (filters?.minStock !== undefined) params['min_stock'] = filters.minStock;
        if (filters?.maxStock !== undefined) params['max_stock'] = filters.maxStock;
        const { data } = await api.get('/products', { params });
        const items: Product[] = (data?.products || data?.data || []) as Product[];
        const total = data?.count ?? data?.pagination?.total ?? items.length;
        return { products: items, total: total || 0, hasMore: (items.length || 0) >= (filters?.limit || 10), nextCursor: undefined };
      }

      let query = this.supabase
        .from('products')
        .select('*', { count: countMode });

      let orgId: string | null = null;
      let orgIds: string[] = [];
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('selected_organization');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              orgId = parsed?.id || parsed?.organization_id || null;
            } catch {
              orgId = raw;
            }
          }
        }
        if (!orgId) {
          const { data: sessionData } = await this.supabase.auth.getSession();
          const uid = sessionData?.session?.user?.id ?? null;
          if (uid) {
            const { data: mem } = await this.supabase.from('organization_members').select('organization_id').eq('user_id', uid);
            orgIds = (mem || []).map((m: Record<string, unknown>) => String(m['organization_id'])).filter(Boolean);
            if (orgIds.length === 1) orgId = orgIds[0];
          }
        }
      } catch {}
      if (orgId && String(orgId).trim()) {
        query = query.eq('organization_id', String(orgId).trim());
      } else if (orgIds.length > 0) {
        query = query.in('organization_id', orgIds);
      }

      // Aplicar filtros
      if (filters?.search) {
        const term = filters.search.replace(/%/g, '').trim();
        if (term) {
          const now = Date.now();
          const recentProbe = this.textSearchProbeAt && (now - (this.textSearchProbeAt as number) < 300000);
          let canTS = this.canTextSearch;
          if (canTS === undefined || !recentProbe) {
            try {
              const probe = await this.supabase
                .from('products')
                .select('id', { count: 'planned' })
                .textSearch('search_vector', 'a', { type: 'websearch' })
                .limit(1);
              canTS = !probe.error;
            } catch {
              canTS = false;
            }
            this.canTextSearch = !!canTS;
            this.textSearchProbeAt = now;
          }
          if (canTS) {
            query = query.textSearch('search_vector', term, { type: 'websearch' });
          } else {
            query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`);
          }
        }
      }

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.stockStatus) {
        switch (filters.stockStatus) {
          case 'in_stock':
            query = query.eq('is_in_stock', true);
            break;
          case 'low_stock':
            query = query.eq('is_low_stock', true);
            break;
          case 'out_of_stock':
            query = query.eq('is_out_of_stock', true);
            break;
          case 'critical':
            query = query.or('is_out_of_stock.eq.true,is_low_stock.eq.true');
            break;
        }
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', !!filters.isActive);
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte('sale_price', filters.minPrice);
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte('sale_price', filters.maxPrice);
      }

      if (filters?.minStock !== undefined) {
        query = query.gte('stock_quantity', filters.minStock);
      }
      if (filters?.maxStock !== undefined) {
        query = query.lte('stock_quantity', filters.maxStock);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Orden y Paginación (cursor por updated_at)
      const limit = filters?.limit || 10;
      const orderField: 'name' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at' = filters?.sortBy || 'updated_at';
      const ascending = (filters?.sortOrder || 'desc') === 'asc';
      query = query.order(orderField, { ascending });
      if (filters?.cursorUpdatedAt && orderField === 'updated_at') {
        query = query.lt('updated_at', filters.cursorUpdatedAt).limit(limit);
      } else {
        const page = filters?.page || 1;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }
      let { data, error, count } = await query;

      if (error) {
        const fbCountMode = filters?.cursorUpdatedAt ? 'planned' : ('exact' as const);
        let fb = this.supabase
          .from('products')
          .select('*', { count: fbCountMode })
          .order(orderField, { ascending });
        if (orgId && String(orgId).trim()) {
          fb = fb.eq('organization_id', String(orgId).trim());
        } else if (orgIds.length > 0) {
          fb = fb.in('organization_id', orgIds);
        }
        if (filters?.search) {
          const term = filters.search.replace(/%/g, '').trim();
          if (term) {
            fb = fb.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`);
          }
        }
        if (filters?.categoryId) {
          fb = fb.eq('category_id', filters.categoryId);
        }
        if (filters?.stockStatus) {
          switch (filters.stockStatus) {
            case 'in_stock':
              fb = fb.eq('is_in_stock', true);
              break;
            case 'low_stock':
              fb = fb.eq('is_low_stock', true);
              break;
            case 'out_of_stock':
              fb = fb.eq('is_out_of_stock', true);
              break;
            case 'critical':
              fb = fb.or('is_out_of_stock.eq.true,is_low_stock.eq.true');
              break;
          }
        }
        if (filters?.isActive !== undefined) {
          fb = fb.eq('is_active', !!filters.isActive);
        }
        if (filters?.minPrice !== undefined) {
          fb = fb.gte('sale_price', filters.minPrice);
        }
        if (filters?.maxPrice !== undefined) {
          fb = fb.lte('sale_price', filters.maxPrice);
        }
        if (filters?.minStock !== undefined) {
          fb = fb.gte('stock_quantity', filters.minStock);
        }
        if (filters?.maxStock !== undefined) {
          fb = fb.lte('stock_quantity', filters.maxStock);
        }
        if (filters?.dateFrom) {
          fb = fb.gte('created_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
          fb = fb.lte('created_at', filters.dateTo);
        }
        if (filters?.cursorUpdatedAt) {
          if (orderField === 'updated_at') {
            fb = fb.lt('updated_at', filters.cursorUpdatedAt).limit(limit);
          } else {
            const page = filters?.page || 1;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            fb = fb.range(from, to);
          }
        } else {
          const page = filters?.page || 1;
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          fb = fb.range(from, to);
        }
        const r = await fb;
        data = r.data;
        error = r.error;
        count = r.count;

        if (error) {
          let fb2 = this.supabase
            .from('products')
            .select('*', { count: fbCountMode })
            .order(orderField, { ascending });
          if (orgId && String(orgId).trim()) {
            fb2 = fb2.eq('organization_id', String(orgId).trim());
          } else if (orgIds.length > 0) {
            fb2 = fb2.in('organization_id', orgIds);
          }
          if (filters?.search) {
            const term = filters.search.replace(/%/g, '').trim();
            if (term) {
              fb2 = fb2.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`);
            }
          }
          if (filters?.categoryId) {
            fb2 = fb2.eq('category_id', filters.categoryId);
          }
          if (filters?.stockStatus) {
            switch (filters.stockStatus) {
              case 'in_stock':
                fb2 = fb2.eq('is_in_stock', true);
                break;
              case 'low_stock':
                fb2 = fb2.eq('is_low_stock', true);
                break;
              case 'out_of_stock':
                fb2 = fb2.eq('is_out_of_stock', true);
                break;
              case 'critical':
                fb2 = fb2.or('is_out_of_stock.eq.true,is_low_stock.eq.true');
                break;
            }
          }
          if (filters?.isActive !== undefined) {
            fb2 = fb2.eq('is_active', !!filters.isActive);
          }
          if (filters?.minPrice !== undefined) {
            fb2 = fb2.gte('sale_price', filters.minPrice);
          }
          if (filters?.maxPrice !== undefined) {
            fb2 = fb2.lte('sale_price', filters.maxPrice);
          }
          if (filters?.minStock !== undefined) {
            fb2 = fb2.gte('stock_quantity', filters.minStock);
          }
          if (filters?.maxStock !== undefined) {
            fb2 = fb2.lte('stock_quantity', filters.maxStock);
          }
          if (filters?.dateFrom) {
            fb2 = fb2.gte('created_at', filters.dateFrom);
          }
          if (filters?.dateTo) {
            fb2 = fb2.lte('created_at', filters.dateTo);
          }
          if (filters?.cursorUpdatedAt) {
            if (orderField === 'updated_at') {
              fb2 = fb2.lt('updated_at', filters.cursorUpdatedAt).limit(limit);
            } else {
              const page = filters?.page || 1;
              const from = (page - 1) * limit;
              const to = from + limit - 1;
              fb2 = fb2.range(from, to);
            }
          } else {
            const page = filters?.page || 1;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            fb2 = fb2.range(from, to);
          }
          const r2 = await fb2;
          data = r2.data;
          error = r2.error;
          count = r2.count;
        }
      }

      const dbErr = error as DbError | undefined;
      const errMsg = typeof dbErr?.message === 'string' ? dbErr.message.trim() : '';
      const errCode = typeof dbErr?.code === 'string' ? dbErr.code : '';
      const errDetails = typeof dbErr?.details === 'string' ? dbErr.details : '';
      const errHint = typeof dbErr?.hint === 'string' ? dbErr.hint : '';
      const meaningfulError = !!error && (errMsg || errCode || errDetails || errHint);
      if (meaningfulError) {
        const message = errMsg || 'Error al obtener productos de Supabase';
        const normalized = Object.assign(new Error(message), {
          code: errCode,
          details: errDetails,
          hint: errHint
        });
        const offlineLikely = (typeof navigator !== 'undefined' && !navigator.onLine) || (String(errMsg).toLowerCase().includes('offline'));
        if (offlineLikely) {
          const cached = this.productCache.get(key);
          if (cached) {
            return { products: cached.data, total: cached.total, hasMore: !!cached.nextCursor, nextCursor: cached.nextCursor };
          }
          return { products: [], total: 0, hasMore: false, nextCursor: undefined };
        }
        throw normalized;
      }

      let products = data || [];
      // Reducir columnas si se solicitaron campos específicos
      const ensureFields = new Set<string>([...(filters?.fields || [])]);
      ensureFields.add('updated_at');
      if (filters?.fields && filters.fields.length > 0) {
        products = (products as Record<string, unknown>[]).map((row: Record<string, unknown>) => {
          const next: Record<string, unknown> = {};
          ensureFields.forEach(f => { next[f] = row?.[f]; });
          return next;
        });
      }
      try {
        const ids = Array.from(new Set((products as Record<string, unknown>[]).map(r => r?.['category_id']).filter(Boolean)));
        if (ids.length) {
          const { data: cats } = await this.supabase.from('categories').select('id,name').in('id', ids);
          const map = new Map<string, string>();
          (cats || []).forEach((c: Record<string, unknown>) => { if (c?.['id']) map.set(String(c['id']), String(c['name'] || '')); });
          products = (products as Record<string, unknown>[]).map(r => {
            const cid = r?.['category_id'] ? String(r['category_id']) : '';
            const cname = cid ? map.get(cid) : undefined;
            return cname ? { ...r, category: { id: cid, name: cname } } : r;
          });
        }
      } catch {}
      const nextCursor = products.length > 0 ? products[products.length - 1].updated_at : undefined;
      const t1 = performance.now ? performance.now() : Date.now();
      this.log.info('Products query duration', { ms: Math.round((t1 - t0) as number), count: products.length });
      const result = {
        products,
        total: count || 0,
        hasMore: (products.length || 0) >= limit,
        nextCursor: nextCursor ? String(nextCursor) : undefined
      };
      if (cacheable) this.productCache.set(key, { data: products as Product[], total: result.total, nextCursor: result.nextCursor, ts: now });
      return result;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  /**
   * Canal POS multiplexado — consolida hasta 10 suscripciones en UN solo canal WebSocket.
   *
   * Anteriormente `usePOSRealtimeSync` abría 10 canales simultáneos agotando el límite
   * de conexiones de Supabase. Este método crea un único canal con múltiples listeners
   * de postgres_changes, lo que consume exactamente 1 conexión WebSocket en lugar de 10.
   *
   * Retorna un objeto con método `unsubscribe()` para cleanup limpio.
   */
  createPOSMultiplexedChannel(handlers: {
    onSaleChange?: (payload: SaleChangePayload) => void;
    onSaleItemChange?: (payload: SaleItemChangePayload) => void;
    onInventoryChange?: (payload: InventoryMovementChangePayload) => void;
    onProductChange?: (payload: ProductChangePayload) => void;
    onPromotionChange?: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void;
    onCouponChange?: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void;
    onRoleOrPermissionChange?: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: RowData; old?: RowData }) => void;
  }): { unsubscribe: () => void } {
    const channelName = 'pos-multiplexed';

    // Limpiar canal anterior si existía
    const existing = this.subscriptions.get(channelName);
    if (existing) {
      try { this.supabase.removeChannel(existing); } catch { }
      this.subscriptions.delete(channelName);
    }

    let channel = this.supabase.channel(channelName);

    // Ventas
    if (handlers.onSaleChange) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload: RealtimePostgresChangesPayload<Sale>) => {
          handlers.onSaleChange!({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleRow(payload.new) ? payload.new : undefined,
            old: isSaleRow(payload.old) ? payload.old : undefined,
          });
        }
      );
    }

    // Ítems de venta
    if (handlers.onSaleItemChange) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        (payload: RealtimePostgresChangesPayload<SaleItem>) => {
          handlers.onSaleItemChange!({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isSaleItemRow(payload.new) ? payload.new : undefined,
            old: isSaleItemRow(payload.old) ? payload.old : undefined,
          });
        }
      );
    }

    // Movimientos de inventario
    if (handlers.onInventoryChange) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        (payload: RealtimePostgresChangesPayload<InventoryMovement>) => {
          handlers.onInventoryChange!({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isInventoryMovementRow(payload.new) ? payload.new : undefined,
            old: isInventoryMovementRow(payload.old) ? payload.old : undefined,
          });
        }
      );
    }

    // Productos
    if (handlers.onProductChange) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          this.productCache.clear(); // Invalida caché local
          handlers.onProductChange!({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isProductRow(payload.new) ? payload.new : undefined,
            old: isProductRow(payload.old) ? payload.old : undefined,
          });
        }
      );
    }

    // Promociones + promotions_products (mismo handler)
    if (handlers.onPromotionChange) {
      const promoHandler = (payload: RealtimePostgresChangesPayload<RowData>) => {
        handlers.onPromotionChange!({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new || undefined,
          old: payload.old || undefined,
        });
      };
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, promoHandler)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions_products' }, promoHandler);
    }

    // Cupones + coupon_usages (mismo handler)
    if (handlers.onCouponChange) {
      const couponHandler = (payload: RealtimePostgresChangesPayload<RowData>) => {
        handlers.onCouponChange!({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new || undefined,
          old: payload.old || undefined,
        });
      };
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, couponHandler)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coupon_usages' }, couponHandler);
    }

    // Roles + permisos (mismo handler)
    if (handlers.onRoleOrPermissionChange) {
      const authHandler = (payload: RealtimePostgresChangesPayload<RowData>) => {
        handlers.onRoleOrPermissionChange!({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new || undefined,
          old: payload.old || undefined,
        });
      };
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, authHandler)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'permissions' }, authHandler);
    }

    channel.subscribe((status: string) => {
      this.emitConnectionStatus(status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.log.warn('POS multiplexed channel error', { status });
      }
    });

    this.subscriptions.set(channelName, channel);

    return {
      unsubscribe: () => {
        try {
          this.supabase.removeChannel(channel);
          this.subscriptions.delete(channelName);
        } catch (err) {
          this.log.warn('Error removing POS multiplexed channel', { err });
        }
      },
    };
  }

  async getProductSalesSummary(params: { dateFrom?: string; dateTo?: string; categoryId?: string; limit?: number }): Promise<{ top: Array<{ id: string; name: string; sales_count: number; revenue: number }>; low: Array<{ id: string; name: string; sales_count: number; revenue: number }> }> {
    const limit = params.limit || 20;
    let q = this.supabase
      .from('sale_items')
      .select('product_id, quantity, total_price, created_at, product:products(id,name,category_id)');
    if (params.dateFrom) q = q.gte('created_at', params.dateFrom);
    if (params.dateTo) q = q.lte('created_at', params.dateTo);
    if (params.categoryId) q = q.eq('product.category_id', params.categoryId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const map = new Map<string, { id: string; name: string; sales_count: number; revenue: number }>();
    (data || []).forEach((row: { product_id?: string; product?: { name?: string }; quantity?: number | string; total_price?: number | string }) => {
      const id = row.product_id;
      if (!id) return;
      const name = row.product?.name || id;
      const prev = map.get(id) || { id, name, sales_count: 0, revenue: 0 };
      const qty = Number(row.quantity) || 1;
      const total = Number(row.total_price) || 0;
      prev.sales_count += qty;
      prev.revenue += total;
      map.set(id, prev);
    });
    const arr = Array.from(map.values());
    const top = [...arr].sort((a,b)=> b.sales_count - a.sales_count).slice(0, limit);
    const low = [...arr].sort((a,b)=> a.sales_count - b.sales_count).slice(0, limit);
    return { top, low };
  }
}

export function __makeSafeUpdates(updates: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...updates };
  delete out['offer_price'];
  return out;
}

// Singleton instance
export const realtimeService = new SupabaseRealtimeService();
// Alias para compatibilidad con importaciones existentes en el coordinador
export const supabaseRealtimeService = realtimeService;
