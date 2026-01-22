import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateOfferPrice } from '@/lib/offers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Math.max(Number(searchParams.get('page') || 1), 1)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 24), 1), 100)
    const offset = (page - 1) * limit

    // Parámetros de filtrado
    const status = searchParams.get('status') || 'active'
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const sort = searchParams.get('sort') || 'best_savings'

    const now = new Date().toISOString()

    // Paso 1: Obtener promociones según estado
    let promotionsQuery = supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)

    if (status === 'active') {
      promotionsQuery = promotionsQuery
        .or(`end_date.gte.${now},end_date.is.null`)
        .lte('start_date', now)
    } else if (status === 'upcoming') {
      promotionsQuery = promotionsQuery
        .gt('start_date', now)
    } else if (status === 'ended') {
      promotionsQuery = promotionsQuery
        .or(`is_active.eq.false,end_date.lt.${now}`)
    }

    const { data: promotions, error: promoError } = await promotionsQuery

    if (promoError) {
      console.error('Error fetching promotions:', promoError)
      return NextResponse.json(
        { error: 'Error al cargar promociones', details: promoError.message },
        { status: 500 }
      )
    }

    if (!promotions || promotions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    const promotionIds = (promotions as any[]).map((p: any) => p.id)

    // Paso 2: Obtener relaciones producto-promoción
    const { data: promoProducts, error: ppError } = await supabase
      .from('promotions_products')
      .select('promotion_id, product_id')
      .in('promotion_id', promotionIds)

    if (ppError) {
      console.error('Error fetching promotions_products:', ppError)
      return NextResponse.json(
        { error: 'Error al cargar relaciones', details: ppError.message },
        { status: 500 }
      )
    }

    if (!promoProducts || promoProducts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    const productIds = (promoProducts as any[]).map((pp: any) => pp.product_id)

    // Paso 3: Obtener productos con filtros
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        description,
        sale_price,
        cost_price,
        stock_quantity,
        min_stock,
        category_id,
        barcode,
        image_url,
        images,
        is_active,
        created_at,
        updated_at
      `, { count: 'exact' })
      .in('id', productIds)
      .eq('is_active', true)

    // Filtro por búsqueda
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    // Filtro por categoría
    if (category && category !== 'all') {
      query = query.eq('category_id', category)
    }

    // Ordenamiento
    switch (sort) {
      case 'best_savings':
        query = query.order('sale_price', { ascending: false })
        break
      case 'price_low_high':
        query = query.order('sale_price', { ascending: true })
        break
      case 'price_high_low':
        query = query.order('sale_price', { ascending: false })
        break
      default:
        query = query.order('name', { ascending: true })
    }

    // Paginación
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Error al cargar productos', details: error.message },
        { status: 500 }
      )
    }

    // Paso 4: Combinar datos
    const promotionsMap: Record<string, any> = {};
    (promotions as any[]).forEach((p: any) => { promotionsMap[p.id] = p; });
    const productPromoMap: Record<string, string> = {};
    
    (promoProducts as any[]).forEach((pp: any) => {
      productPromoMap[pp.product_id] = pp.promotion_id;
    })

    // Transformar datos para el frontend
    const offers = (data || []).map((product: any) => {
      const promotionId = productPromoMap[product.id]
      const promotion = promotionId ? promotionsMap[promotionId] : null

      return {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          basePrice: product.sale_price,
          costPrice: product.cost_price,
          stockQuantity: product.stock_quantity,
          minStock: product.min_stock,
          categoryId: product.category_id,
          categoryName: product.categories?.name,
          barcode: product.barcode,
          image: product.image_url,
          images: product.images,
          isActive: product.is_active
        },
        promotion: promotion ? {
          id: promotion.id,
          name: promotion.name,
          description: promotion.description,
          discountType: promotion.discount_type,
          discountValue: promotion.discount_value,
          startDate: promotion.start_date,
          endDate: promotion.end_date,
          isActive: promotion.is_active
        } : null
      }
    }).filter((offer: any) => offer.promotion !== null)

    // Calcular precio de oferta usando utilidad centralizada
    let offersWithPrices = offers.map((offer: any) => {
      if (!offer.promotion) return offer

      const basePrice = offer.product.basePrice || 0
      const calculation = calculateOfferPrice(basePrice, offer.promotion)

      return {
        ...offer,
        offerPrice: calculation.offerPrice,
        discountPercent: calculation.discountPercent,
        savings: calculation.savings
      }
    })

    if (sort === 'highest_discount') {
      offersWithPrices = offersWithPrices.sort((a: any, b: any) => (b.discountPercent || 0) - (a.discountPercent || 0))
    } else if (sort === 'ending_soon') {
      offersWithPrices = offersWithPrices.sort((a: any, b: any) => {
        const aEnd = a.promotion?.endDate ? new Date(a.promotion.endDate).getTime() : Number.POSITIVE_INFINITY
        const bEnd = b.promotion?.endDate ? new Date(b.promotion.endDate).getTime() : Number.POSITIVE_INFINITY
        return aEnd - bEnd
      })
    } else if (sort === 'best_savings') {
      offersWithPrices = offersWithPrices.sort((a: any, b: any) => (b.savings || 0) - (a.savings || 0))
    }

    return NextResponse.json({
      success: true,
      data: offersWithPrices,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Unexpected error in offers API:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
}
