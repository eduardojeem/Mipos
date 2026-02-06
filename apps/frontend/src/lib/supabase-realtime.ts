import { createClient } from './supabase';
import { api } from '@/lib/api';
import type { Database } from './supabase';
import type { BusinessConfig } from '@/types/business-config'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

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
  new?: any;
  old?: any;
  version?: number;
}

export interface BusinessConfigChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  config?: BusinessConfig;
  rawNew?: any;
  rawOld?: any;
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
  new?: any;
  old?: any;
}

// Type guards to ensure real-time payload rows conform to expected types
const isProductRow = (row: any): row is Product => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'sku' in row;
};
const isSaleRow = (row: any): row is Sale => {
  return !!row && typeof row === 'object' && 'id' in row && 'user_id' in row && 'total_amount' in row;
};
const isSaleItemRow = (row: any): row is SaleItem => {
  return !!row && typeof row === 'object' && 'id' in row && 'sale_id' in row && 'product_id' in row;
};
const isInventoryMovementRow = (row: any): row is InventoryMovement => {
  return !!row && typeof row === 'object' && 'id' in row && 'product_id' in row && 'movement_type' in row;
};
const isRoleRow = (row: any): row is RoleRow => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'is_active' in row;
};
const isPermissionRow = (row: any): row is PermissionRow => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'resource' in row && 'action' in row;
};
const isCategoryRow = (row: any): row is Category => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'is_active' in row;
};
const isCustomerRow = (row: any): row is Customer => {
  return !!row && typeof row === 'object' && 'id' in row && 'name' in row && 'is_active' in row;
};
const isCashSessionRow = (row: any): row is CashSessionRow => {
  return !!row && typeof row === 'object' && 'id' in row && ('user_id' in row || 'opened_by' in row) && ('status' in row || 'session_status' in row);
};
const isCashMovementRow = (row: any): row is CashMovementRow => {
  return !!row && typeof row === 'object' && 'id' in row && 'session_id' in row && 'amount' in row;
};
export class SupabaseRealtimeService {
  private supabase = createClient();
  private subscriptions = new Map<string, any>();
  /** Cache simple del estado de conexión */
  private lastConnectionCheck = 0;
  private lastIsConnected = false;
  /** Listeners para cambios de conexión y errores */
  private connectionListeners: Set<(status: string) => void> = new Set();
  private errorListeners: Set<(error: any) => void> = new Set();
  /** Canal dedicado para monitorear estado de conexión */
  private connectionChannel?: any;
  /** Throttling y versionado para settings */
  private settingsThrottleTimer?: any;
  private settingsPendingPayload?: SettingsChangePayload;
  private settingsVersionCounter = 0;
  /** Throttling para business_config específico */
  private businessConfigThrottleTimer?: any;
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
          console.log('Product change detected:', payload);
          
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
  subscribeToTable<T extends { [key: string]: any } = { [key: string]: any }>(
    tableName: string,
    callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: T; old?: T }) => void
  ) {
    const key = `table:${tableName}`;
    const channelName = `table-${tableName}-changes`;
    (this as any).metrics = (this as any).metrics || {};

    const subscription = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const changePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as T | undefined,
            old: payload.old as T | undefined
          };
          const m = (this as any).metrics;
          const prev = m[tableName] || { count: 0, lastEventAt: 0 };
          m[tableName] = { count: prev.count + 1, lastEventAt: Date.now() };
          callback(changePayload);
        }
      )
      .subscribe();

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  getMetrics(): Record<string, { count: number; lastEventAt: number }> {
    return { ...(this as any).metrics };
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

    const makeProjection = (entity: EntityName, row: any) => {
      if (!row) return row;
      const allow = project[entity];
      const hide = redact[entity];
      let out = row;
      if (Array.isArray(allow) && allow.length > 0) {
        out = allow.reduce((acc: any, key: string) => {
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

    const subs: any[] = [];

    const addSub = <T extends { [key: string]: any }>(entity: EntityName, table: string, isValid: (r: any) => boolean) => {
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
                ? makeProjection(entity, payload.new)
                : undefined,
              old: isValid(payload.old)
                ? makeProjection(entity, payload.old)
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

  subscribeToPromotions(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('promotions', callback)
    this.subscriptions.set('promotions', subscription)
    return subscription
  }

  subscribeToPromotionsProducts(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('promotions_products', callback)
    this.subscriptions.set('promotions_products', subscription)
    return subscription
  }

  subscribeToPromotionsCarousel(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('promotions_carousel', callback)
    this.subscriptions.set('promotions_carousel', subscription)
    return subscription
  }

  subscribeToLoyaltyPrograms(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('loyalty_programs', callback)
    this.subscriptions.set('loyalty_programs', subscription)
    return subscription
  }

  subscribeToLoyaltyTiers(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('loyalty_tiers', callback)
    this.subscriptions.set('loyalty_tiers', subscription)
    return subscription
  }

  subscribeToCustomerLoyalty(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('customer_loyalty', callback)
    this.subscriptions.set('customer_loyalty', subscription)
    return subscription
  }

  subscribeToPointsTransactions(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('points_transactions', callback)
    this.subscriptions.set('points_transactions', subscription)
    return subscription
  }

  subscribeToLoyaltyRewards(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('loyalty_rewards', callback)
    this.subscriptions.set('loyalty_rewards', subscription)
    return subscription
  }

  subscribeToCustomerRewards(callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void) {
    const subscription = this.subscribeToTable<any>('customer_rewards', callback)
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
        (payload: RealtimePostgresChangesPayload<any>) => {
          const change: SettingsChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new,
            old: payload.old,
            version: (payload.new as any)?.version ?? (payload.old as any)?.version ?? (++this.settingsVersionCounter)
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
      const ses = (this.supabase as any).auth?.getSession?.();
      if (!orgId && ses && typeof ses.then === 'function') {
        ses
          .then((res: any) => {
            const session = res?.data || res;
            const uid = session?.session?.user?.id || session?.user?.id || null;
            if (uid) {
              return this.supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', uid);
            }
            return null;
          })
          .then((r: any) => {
            if (r && r.data) {
              orgIds = (r.data || []).map((m: any) => String(m.organization_id)).filter(Boolean);
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
        (payload: RealtimePostgresChangesPayload<any>) => {
          const keyNew = (payload.new as any)?.key;
          const keyOld = (payload.old as any)?.key;
          if (keyNew !== 'business_config' && keyOld !== 'business_config') return;

          if (orgIds.length > 0) {
            const oid = (payload.new as any)?.organization_id || (payload.old as any)?.organization_id;
            if (oid && !orgIds.includes(String(oid))) return;
          }

          const value = ((payload.new as any)?.value ?? (payload.old as any)?.value) || {};
          const change: BusinessConfigChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            config: value as BusinessConfig,
            rawNew: payload.new,
            rawOld: payload.old,
            version: (payload.new as any)?.version ?? (payload.old as any)?.version ?? (++this.settingsVersionCounter)
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
      const ses = (this.supabase as any).auth?.getSession?.();
      if (!orgId && ses && typeof ses.then === 'function') {
        ses
          .then((res: any) => {
            const session = res?.data || res;
            const uid = session?.session?.user?.id || session?.user?.id || null;
            if (uid) {
              return this.supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', uid);
            }
            return null;
          })
          .then((r: any) => {
            if (r && r.data) {
              orgIds = (r.data || []).map((m: any) => String(m.organization_id)).filter(Boolean);
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
            const oid = (payload.new as any)?.organization_id || (payload.old as any)?.organization_id;
            if (oid && !orgIds.includes(String(oid))) return;
          }
          const change: EntityChangePayload = {
            entity: 'products',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: isProductRow(payload.new) ? payload.new : undefined,
            old: isProductRow(payload.old) ? payload.old : undefined,
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
            new: isCategoryRow(payload.new) ? payload.new : undefined,
            old: isCategoryRow(payload.old) ? payload.old : undefined,
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
            new: isCustomerRow(payload.new) ? payload.new : undefined,
            old: isCustomerRow(payload.old) ? payload.old : undefined,
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
            new: isSaleRow(payload.new) ? payload.new : undefined,
            old: isSaleRow(payload.old) ? payload.old : undefined,
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
            new: isSaleItemRow(payload.new) ? payload.new : undefined,
            old: isSaleItemRow(payload.old) ? payload.old : undefined,
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
            new: isInventoryMovementRow(payload.new) ? payload.new : undefined,
            old: isInventoryMovementRow(payload.old) ? payload.old : undefined,
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
            new: isRoleRow(payload.new) ? payload.new : undefined,
            old: isRoleRow(payload.old) ? payload.old : undefined,
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
            new: isPermissionRow(payload.new) ? payload.new : undefined,
            old: isPermissionRow(payload.old) ? payload.old : undefined,
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
            new: isCashSessionRow(payload.new) ? payload.new : undefined,
            old: isCashSessionRow(payload.old) ? payload.old : undefined,
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
            new: isCashMovementRow(payload.new) ? payload.new : undefined,
            old: isCashMovementRow(payload.old) ? payload.old : undefined,
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
    this.subscriptions.forEach((subscription, channelName) => {
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
  onError(listener: (error: any) => void): () => void {
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

  private emitError(error: any): void {
    this.errorListeners.forEach((l) => {
      try { l(error); } catch {}
    });
  }

  /**
   * Operaciones CRUD con Supabase directamente
   */
  async createProduct(product: ProductInsert): Promise<Product | null> {
    try {
      const safeProduct: any = { ...product };
      delete safeProduct.offer_price;

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
          const raw = (fallback.data?.product ?? fallback.data) as any;
          return raw as Product;
        } catch (apiErr) {
          const message = (error as any)?.message || 'Error al crear producto';
          console.error('Error creating product:', {
            message: (error as any)?.message,
            code: (error as any)?.code,
            details: (error as any)?.details,
            hint: (error as any)?.hint
          });
          const normalized: any = new Error(message);
          normalized.code = (error as any)?.code;
          normalized.details = (error as any)?.details;
          normalized.hint = (error as any)?.hint;
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
      const safeUpdates: any = __makeSafeUpdates(updates as any);
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
        .eq('organization_id', orgId as any)
        .select()
        .single();

      if (error) {
        try {
          const fallback = await api.put(`/products/${id}`, safeUpdates);
          const raw = (fallback.data?.product ?? fallback.data) as any;
          return raw as Product;
        } catch (apiErr) {
          const message = (error as any)?.message || 'Error al actualizar producto';
          console.error('Error updating product:', {
            message: (error as any)?.message,
            code: (error as any)?.code,
            details: (error as any)?.details,
            hint: (error as any)?.hint
          });
          const normalized: any = new Error(message);
          normalized.code = (error as any)?.code;
          normalized.details = (error as any)?.details;
          normalized.hint = (error as any)?.hint;
          throw normalized;
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
        .eq('organization_id', orgId as any);

      if (error) {
        const message = (error as any)?.message || 'Error al eliminar producto en Supabase';
        console.error('Error deleting product:', {
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint
        });
        const normalized: any = new Error(message);
        normalized.code = (error as any)?.code;
        normalized.details = (error as any)?.details;
        normalized.hint = (error as any)?.hint;
        throw normalized;
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
      const countMode: any = filters?.cursorUpdatedAt ? 'planned' : 'exact';

      const canQuery = typeof (this.supabase as any)?.from === 'function';
      if (!canQuery) {
        const params: any = {};
        if (filters?.page) params.page = filters.page;
        if (filters?.limit) params.limit = filters.limit;
        if (filters?.search) params.search = filters.search;
        if (filters?.categoryId) params.categoryId = filters.categoryId;
        if (filters?.sortBy) params.sort = filters.sortBy;
        if (filters?.sortOrder) params.order = filters.sortOrder;
        if (filters?.minPrice !== undefined) params.min_price = filters.minPrice;
        if (filters?.maxPrice !== undefined) params.max_price = filters.maxPrice;
        if (filters?.minStock !== undefined) params.min_stock = filters.minStock;
        if (filters?.maxStock !== undefined) params.max_stock = filters.maxStock;
        const { data } = await api.get('/products', { params });
        const items = (data?.products || data?.data || []) as any[];
        const total = data?.count ?? data?.pagination?.total ?? items.length;
        return { products: items as any, total: total || 0, hasMore: (items.length || 0) >= (filters?.limit || 10), nextCursor: undefined };
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
          const { data: session } = await (this.supabase as any).auth.getSession?.();
          const uid = session?.session?.user?.id || session?.user?.id || null;
          if (uid) {
            const { data: mem } = await this.supabase.from('organization_members').select('organization_id').eq('user_id', uid);
            orgIds = (mem || []).map((m: any) => String(m.organization_id)).filter(Boolean);
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
        const fbCountMode: any = filters?.cursorUpdatedAt ? 'planned' : 'exact';
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

      const errMsg = typeof (error as any)?.message === 'string' ? ((error as any).message || '').trim() : '';
      const errCode = typeof (error as any)?.code === 'string' ? (error as any).code : '';
      const errDetails = typeof (error as any)?.details === 'string' ? (error as any).details : '';
      const errHint = typeof (error as any)?.hint === 'string' ? (error as any).hint : '';
      const meaningfulError = !!error && (errMsg || errCode || errDetails || errHint);
      if (meaningfulError) {
        const message = errMsg || 'Error al obtener productos de Supabase';
        const normalized: any = new Error(message);
        normalized.code = errCode;
        normalized.details = errDetails;
        normalized.hint = errHint;
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
        products = (products as any[]).map((row: any) => {
          const next: any = {};
          ensureFields.forEach(f => { next[f] = row?.[f]; });
          return next;
        });
      }
      try {
        const ids = Array.from(new Set((products as any[]).map(r => r?.category_id).filter(Boolean)));
        if (ids.length) {
          const { data: cats } = await this.supabase.from('categories').select('id,name').in('id', ids);
          const map = new Map<string, string>();
          (cats || []).forEach((c: any) => { if (c?.id) map.set(String(c.id), String(c.name || '')); });
          products = (products as any[]).map(r => {
            const cid = r?.category_id ? String(r.category_id) : '';
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
      if (cacheable) this.productCache.set(key, { data: products as any[], total: result.total, nextCursor: result.nextCursor, ts: now });
      return result;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  async getProductSalesSummary(params: { dateFrom?: string; dateTo?: string; categoryId?: string; limit?: number }): Promise<{ top: Array<{ id: string; name: string; sales_count: number; revenue: number }>; low: Array<{ id: string; name: string; sales_count: number; revenue: number }> }> {
    const limit = params.limit || 20;
    let q = this.supabase
      .from('sale_items')
      .select('product_id, quantity, total_price, created_at, product:products(id,name,category_id)');
    if (params.dateFrom) q = q.gte('created_at', params.dateFrom);
    if (params.dateTo) q = q.lte('created_at', params.dateTo);
    if (params.categoryId) q = q.eq('product.category_id', params.categoryId as any);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const map = new Map<string, { id: string; name: string; sales_count: number; revenue: number }>();
    (data || []).forEach((row: any) => {
      const id = row.product_id;
      const name = row.product?.name || row.product_id;
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

export function __makeSafeUpdates(updates: any) {
  const out: any = { ...updates };
  delete out.offer_price;
  return out;
}

// Singleton instance
export const realtimeService = new SupabaseRealtimeService();
// Alias para compatibilidad con importaciones existentes en el coordinador
export const supabaseRealtimeService = realtimeService;
