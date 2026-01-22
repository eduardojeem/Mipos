'use client';

import { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export type CatalogEventType =
  | 'PAGE_VIEW'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_SEARCH'
  | 'CATEGORY_FILTER'
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'UPDATE_CART_QUANTITY'
  | 'CLEAR_CART'
  | 'ADD_FAVORITE'
  | 'REMOVE_FAVORITE'
  | 'CHECKOUT_START'
  | 'CHECKOUT_COMPLETE'
  | 'ORDER_CREATED'
  | 'FILTER_APPLIED'
  | 'SORT_CHANGED'
  | 'VIEW_MODE_CHANGED'
  | 'LOAD_MORE_PRODUCTS'
  | 'PRODUCT_COMPARISON'
  | 'SHARE_PRODUCT';

export interface CatalogAuditEvent {
  eventType: CatalogEventType;
  resourceType: 'CATALOG' | 'PRODUCT' | 'CATEGORY' | 'CART' | 'ORDER' | 'FAVORITE';
  resourceId?: string;
  details?: Record<string, any>;
  sessionId?: string;
  timestamp: Date;
}

interface UseCatalogAuditOptions {
  enabled?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

export function useCatalogAudit(options: UseCatalogAuditOptions = {}) {
  const { enabled = true, batchSize = 10, flushInterval = 5000 } = options;
  
  const supabase = createClient();
  const eventQueue = useRef<CatalogAuditEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(generateSessionId());

  const flushEvents = useCallback(async () => {
    if (!enabled || eventQueue.current.length === 0) return;

    const eventsToSend = [...eventQueue.current];
    eventQueue.current = [];

    try {
      const { error } = await supabase
        .from('catalog_audit_logs')
        .insert(
          eventsToSend.map(event => ({
            event_type: event.eventType,
            resource_type: event.resourceType,
            resource_id: event.resourceId || null,
            details: event.details || {},
            session_id: event.sessionId || sessionId.current,
            created_at: event.timestamp.toISOString(),
          }))
        );

      if (error) {
        // Silently fail if audit table doesn't exist or has permission issues
        // This is non-critical functionality
        if (process.env.NODE_ENV === 'development') {
          const errInfo = {
            message: (error as any)?.message,
            code: (error as any)?.code,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
          };
          console.warn('[CatalogAudit] Audit logging disabled:', errInfo);
        }
        
        // Don't try fallback if table doesn't exist
        if ((error as any)?.code === '42P01' || (error as any)?.message?.includes('does not exist')) {
          return;
        }

        try {
          const res = await fetch('/api/catalog/audit/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: eventsToSend.map(e => ({
                eventType: e.eventType,
                resourceType: e.resourceType,
                resourceId: e.resourceId,
                details: e.details || {},
                sessionId: e.sessionId || sessionId.current,
              })),
            }),
          });

          if (!res.ok) {
            let text = '';
            try { text = await res.text(); } catch {}
            console.error('[CatalogAudit] Fallback batch request failed:', { status: res.status, statusText: res.statusText, body: text?.slice(0, 200) });
            eventQueue.current = [...eventsToSend, ...eventQueue.current];
          }
        } catch (fallbackErr) {
          // Silently fail - audit is non-critical
          if (process.env.NODE_ENV === 'development') {
            console.warn('[CatalogAudit] Fallback failed, audit disabled');
          }
        }
      }
    } catch (err) {
      // Silently fail - audit is non-critical
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CatalogAudit] Audit system unavailable');
      }
    }
  }, [supabase, enabled]);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(flushEvents, flushInterval);
  }, [flushEvents, flushInterval]);

  const logEvent = useCallback((event: Omit<CatalogAuditEvent, 'timestamp' | 'sessionId'>) => {
    if (!enabled) return;

    const fullEvent: CatalogAuditEvent = {
      ...event,
      sessionId: sessionId.current,
      timestamp: new Date(),
    };

    eventQueue.current.push(fullEvent);

    if (eventQueue.current.length >= batchSize) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  }, [enabled, batchSize, flushEvents, scheduleFlush]);

  // Convenience methods for common events
  const logPageView = useCallback((page: string, filters?: Record<string, any>) => {
    logEvent({
      eventType: 'PAGE_VIEW',
      resourceType: 'CATALOG',
      details: { page, filters },
    });
  }, [logEvent]);

  const logProductView = useCallback((productId: string, productName?: string) => {
    logEvent({
      eventType: 'PRODUCT_VIEW',
      resourceType: 'PRODUCT',
      resourceId: productId,
      details: { productName },
    });
  }, [logEvent]);

  const logSearch = useCallback((query: string, resultsCount: number) => {
    logEvent({
      eventType: 'PRODUCT_SEARCH',
      resourceType: 'CATALOG',
      details: { query, resultsCount },
    });
  }, [logEvent]);

  const logCategoryFilter = useCallback((categoryId: string, categoryName?: string) => {
    logEvent({
      eventType: 'CATEGORY_FILTER',
      resourceType: 'CATEGORY',
      resourceId: categoryId,
      details: { categoryName },
    });
  }, [logEvent]);

  const logAddToCart = useCallback((productId: string, quantity: number, productName?: string, price?: number) => {
    logEvent({
      eventType: 'ADD_TO_CART',
      resourceType: 'CART',
      resourceId: productId,
      details: { quantity, productName, price },
    });
  }, [logEvent]);

  const logRemoveFromCart = useCallback((productId: string, productName?: string) => {
    logEvent({
      eventType: 'REMOVE_FROM_CART',
      resourceType: 'CART',
      resourceId: productId,
      details: { productName },
    });
  }, [logEvent]);

  const logUpdateCartQuantity = useCallback((productId: string, oldQuantity: number, newQuantity: number) => {
    logEvent({
      eventType: 'UPDATE_CART_QUANTITY',
      resourceType: 'CART',
      resourceId: productId,
      details: { oldQuantity, newQuantity },
    });
  }, [logEvent]);

  const logClearCart = useCallback((itemCount: number, totalValue: number) => {
    logEvent({
      eventType: 'CLEAR_CART',
      resourceType: 'CART',
      details: { itemCount, totalValue },
    });
  }, [logEvent]);

  const logAddFavorite = useCallback((productId: string, productName?: string) => {
    logEvent({
      eventType: 'ADD_FAVORITE',
      resourceType: 'FAVORITE',
      resourceId: productId,
      details: { productName },
    });
  }, [logEvent]);

  const logRemoveFavorite = useCallback((productId: string) => {
    logEvent({
      eventType: 'REMOVE_FAVORITE',
      resourceType: 'FAVORITE',
      resourceId: productId,
    });
  }, [logEvent]);

  const logCheckoutStart = useCallback((cartTotal: number, itemCount: number) => {
    logEvent({
      eventType: 'CHECKOUT_START',
      resourceType: 'ORDER',
      details: { cartTotal, itemCount },
    });
  }, [logEvent]);

  const logCheckoutComplete = useCallback((orderId: string, total: number, paymentMethod: string) => {
    logEvent({
      eventType: 'CHECKOUT_COMPLETE',
      resourceType: 'ORDER',
      resourceId: orderId,
      details: { total, paymentMethod },
    });
  }, [logEvent]);

  const logOrderCreated = useCallback((orderId: string, customerEmail: string, total: number, items: number) => {
    logEvent({
      eventType: 'ORDER_CREATED',
      resourceType: 'ORDER',
      resourceId: orderId,
      details: { customerEmail, total, items },
    });
  }, [logEvent]);

  const logFilterApplied = useCallback((filterType: string, filterValue: any) => {
    logEvent({
      eventType: 'FILTER_APPLIED',
      resourceType: 'CATALOG',
      details: { filterType, filterValue },
    });
  }, [logEvent]);

  const logSortChanged = useCallback((sortBy: string) => {
    logEvent({
      eventType: 'SORT_CHANGED',
      resourceType: 'CATALOG',
      details: { sortBy },
    });
  }, [logEvent]);

  const logViewModeChanged = useCallback((viewMode: string) => {
    logEvent({
      eventType: 'VIEW_MODE_CHANGED',
      resourceType: 'CATALOG',
      details: { viewMode },
    });
  }, [logEvent]);

  const logLoadMore = useCallback((page: number, loadedCount: number) => {
    logEvent({
      eventType: 'LOAD_MORE_PRODUCTS',
      resourceType: 'CATALOG',
      details: { page, loadedCount },
    });
  }, [logEvent]);

  const logProductComparison = useCallback((productIds: string[]) => {
    logEvent({
      eventType: 'PRODUCT_COMPARISON',
      resourceType: 'PRODUCT',
      details: { productIds, count: productIds.length },
    });
  }, [logEvent]);

  const logShareProduct = useCallback((productId: string, platform: string) => {
    logEvent({
      eventType: 'SHARE_PRODUCT',
      resourceType: 'PRODUCT',
      resourceId: productId,
      details: { platform },
    });
  }, [logEvent]);

  return {
    logEvent,
    logPageView,
    logProductView,
    logSearch,
    logCategoryFilter,
    logAddToCart,
    logRemoveFromCart,
    logUpdateCartQuantity,
    logClearCart,
    logAddFavorite,
    logRemoveFavorite,
    logCheckoutStart,
    logCheckoutComplete,
    logOrderCreated,
    logFilterApplied,
    logSortChanged,
    logViewModeChanged,
    logLoadMore,
    logProductComparison,
    logShareProduct,
    flushEvents,
    sessionId: sessionId.current,
  };
}

function generateSessionId(): string {
  if (typeof window !== 'undefined') {
    let id = sessionStorage.getItem('catalog_session_id');
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('catalog_session_id', id);
    }
    return id;
  }
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default useCatalogAudit;
