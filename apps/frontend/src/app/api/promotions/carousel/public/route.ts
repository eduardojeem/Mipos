import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/promotions/carousel/public
 * 
 * Public endpoint to fetch carousel with active promotions and product details
 * No authentication required - reads directly from Supabase
 */
export async function GET() {
  try {
    console.log('[API/Carousel/Public] Fetching carousel from Supabase...');

    const supabase = await createClient();

    // Get carousel configuration
    const { data: carouselData, error: carouselError } = await supabase
      .from('promotions_carousel')
      .select('promotion_id, position')
      .order('position', { ascending: true });

    if (carouselError) {
      console.error('[API/Carousel/Public] Carousel error:', carouselError);
      return NextResponse.json(
        {
          success: false,
          message: 'Error al cargar el carrusel',
          data: [],
        },
        { status: 500 }
      );
    }

    if (!carouselData || carouselData.length === 0) {
      console.log('[API/Carousel/Public] No carousel items found');
      return NextResponse.json(
        {
          success: true,
          data: [],
          message: 'No hay ofertas destacadas configuradas',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    const promotionIds = carouselData.map((item: any) => item.promotion_id);
    console.log('[API/Carousel/Public] Found promotion IDs:', promotionIds);

    // Get active promotions
    const now = new Date().toISOString();
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .in('id', promotionIds)
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.gte.${now},end_date.is.null`);

    if (promoError) {
      console.error('[API/Carousel/Public] Promotions error:', promoError);
      return NextResponse.json(
        {
          success: false,
          message: 'Error al cargar promociones',
          data: [],
        },
        { status: 500 }
      );
    }

    if (!promotions || promotions.length === 0) {
      console.log('[API/Carousel/Public] No active promotions found');
      return NextResponse.json(
        {
          success: true,
          data: [],
          message: 'No hay ofertas activas en el carrusel',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Get products for promotions
    const { data: promoProducts, error: ppError } = await supabase
      .from('promotions_products')
      .select('promotion_id, product_id')
      .in('promotion_id', promotions.map((p: any) => p.id));

    if (ppError) {
      console.error('[API/Carousel/Public] Promo products error:', ppError);
    }

    const validPromoProducts = promoProducts || [];
    
    if (validPromoProducts.length === 0) {
      console.log('[API/Carousel/Public] No products found for promotions');
      return NextResponse.json(
        {
          success: true,
          data: [],
          message: 'No hay productos en las ofertas destacadas',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Get product details
    const productIds = validPromoProducts.map((pp: any) => pp.product_id);
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (prodError) {
      console.error('[API/Carousel/Public] Products error:', prodError);
    }

    const productsMap = new Map();
    (products || []).forEach((p: any) => productsMap.set(p.id, p));

    // Build carousel items maintaining order
    const carouselItems = carouselData
      .map((carouselItem: any) => {
        const promotion = promotions.find((p: any) => p.id === carouselItem.promotion_id);
        if (!promotion) return null;

        // Get first product for this promotion
        const promoProduct = validPromoProducts.find((pp: any) => pp.promotion_id === promotion.id);
        if (!promoProduct) return null;

        const product = productsMap.get(promoProduct.product_id);
        if (!product) return null;

        // Calculate offer price
        const basePrice = Number(product.sale_price || product.price || 0);
        let offerPrice = basePrice;
        let discountPercent = 0;

        if (promotion.discount_type === 'PERCENTAGE' && promotion.discount_value) {
          discountPercent = promotion.discount_value;
          offerPrice = basePrice * (1 - promotion.discount_value / 100);
        } else if (promotion.discount_type === 'FIXED_AMOUNT' && promotion.discount_value) {
          offerPrice = Math.max(0, basePrice - promotion.discount_value);
          discountPercent = basePrice > 0 ? ((basePrice - offerPrice) / basePrice) * 100 : 0;
        }

        // Apply max discount limit if set
        if (promotion.max_discount_amount && (basePrice - offerPrice) > promotion.max_discount_amount) {
          offerPrice = basePrice - promotion.max_discount_amount;
          discountPercent = basePrice > 0 ? (promotion.max_discount_amount / basePrice) * 100 : 0;
        }

        return {
          promotion: {
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            discountType: promotion.discount_type,
            discountValue: promotion.discount_value,
            startDate: promotion.start_date,
            endDate: promotion.end_date,
            isActive: promotion.is_active,
          },
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            brand: product.brand,
            image: product.image,
            images: Array.isArray(product.image) 
              ? product.image.map((url: string) => ({ url }))
              : (typeof product.image === 'string' ? [{ url: product.image }] : []),
            stock_quantity: product.stock_quantity,
            category_id: product.category_id,
          },
          basePrice,
          offerPrice: Math.round(offerPrice * 100) / 100,
          discountPercent: Math.round(discountPercent * 100) / 100,
        };
      })
      .filter(Boolean); // Remove nulls

    console.log('[API/Carousel/Public] Returning', carouselItems.length, 'carousel items');

    return NextResponse.json(
      {
        success: true,
        data: carouselItems,
        count: carouselItems.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API/Carousel/Public] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error al cargar ofertas destacadas',
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
