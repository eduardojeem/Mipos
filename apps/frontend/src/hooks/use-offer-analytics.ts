'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface OfferAnalyticsEvent {
  offer_id: string;
  product_id: string;
  promotion_id: string;
  event_type: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'detail_view';
  discount_percent: number;
  category_id?: string;
  user_agent?: string;
  screen_width?: number;
  screen_height?: number;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function useOfferAnalytics() {
  const supabase = createClient();

  const trackEvent = useCallback(async (event: Omit<OfferAnalyticsEvent, 'user_agent' | 'screen_width' | 'screen_height'>) => {
    try {
      const fullEvent: OfferAnalyticsEvent = {
        ...event,
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height
      };

      // Enviar evento a Supabase
      const { error } = await supabase
        .from('offer_analytics')
        .insert(fullEvent);

      if (error) {
        console.warn('Error tracking offer event:', error);
      }

      // También enviar a analytics externos si es necesario
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', `offer_${event.event_type}`, {
          offer_id: event.offer_id,
          product_id: event.product_id,
          discount_percent: event.discount_percent,
          category_id: event.category_id
        });
      }
    } catch (error) {
      console.warn('Error in offer analytics:', error);
    }
  }, [supabase]);

  const trackView = useCallback((offerId: string, productId: string, promotionId: string, discountPercent: number, categoryId?: string) => {
    trackEvent({
      offer_id: offerId,
      product_id: productId,
      promotion_id: promotionId,
      event_type: 'view',
      discount_percent: discountPercent,
      category_id: categoryId
    });
  }, [trackEvent]);

  const trackClick = useCallback((offerId: string, productId: string, promotionId: string, discountPercent: number, categoryId?: string) => {
    trackEvent({
      offer_id: offerId,
      product_id: productId,
      promotion_id: promotionId,
      event_type: 'click',
      discount_percent: discountPercent,
      category_id: categoryId
    });
  }, [trackEvent]);

  const trackAddToCart = useCallback((offerId: string, productId: string, promotionId: string, discountPercent: number, categoryId?: string) => {
    trackEvent({
      offer_id: offerId,
      product_id: productId,
      promotion_id: promotionId,
      event_type: 'add_to_cart',
      discount_percent: discountPercent,
      category_id: categoryId
    });
  }, [trackEvent]);

  const trackDetailView = useCallback((offerId: string, productId: string, promotionId: string, discountPercent: number, categoryId?: string) => {
    trackEvent({
      offer_id: offerId,
      product_id: productId,
      promotion_id: promotionId,
      event_type: 'detail_view',
      discount_percent: discountPercent,
      category_id: categoryId
    });
  }, [trackEvent]);

  return {
    trackView,
    trackClick,
    trackAddToCart,
    trackDetailView,
    trackEvent
  };
}
