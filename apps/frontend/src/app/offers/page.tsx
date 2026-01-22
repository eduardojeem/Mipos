import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import OffersClient, { OfferItem, Product, Promotion, DiscountType } from "./OffersClient";
import { Metadata } from "next";
import { calculateOfferPrice } from "@/lib/offers";

// Generar metadatos dinámicos para SEO con soporte para parámetros de estado
export async function generateMetadata(
  props: { searchParams: Promise<{ status?: string }> }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  // Obtener configuración del negocio
  const { data: config } = await supabase
    .from('business_config')
    .select('business_name')
    .single();

  // Determinar el estado del filtro
  const status = searchParams?.status || 'active';
  const now = new Date().toISOString();

  let offersCount = 0;
  if (status === 'active') {
    const base = supabase.from('promotions').select('*', { count: 'exact', head: true });
    if (typeof (base as any).or === 'function') {
      const { count } = await base
        .eq('is_active', true)
        .or(`end_date.gte.${now},end_date.is.null`)
        .lte('start_date', now);
      offersCount = count || 0;
    } else {
      const { count: c1 } = await supabase
        .from('promotions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);
      const { count: c2 } = await supabase
        .from('promotions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('start_date', now)
        .is('end_date', null);
      offersCount = (c1 || 0) + (c2 || 0);
    }
  } else if (status === 'upcoming') {
    const { count } = await supabase
      .from('promotions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('start_date', now);
    offersCount = count || 0;
  } else if (status === 'ended') {
    const base = supabase.from('promotions').select('*', { count: 'exact', head: true });
    if (typeof (base as any).or === 'function') {
      const { count } = await base.or(`is_active.eq.false,end_date.lt.${now}`);
      offersCount = count || 0;
    } else {
      const { count } = await supabase
        .from('promotions')
        .select('*', { count: 'exact', head: true })
        .lt('end_date', now);
      offersCount = count || 0;
    }
  }

  const businessName = config?.business_name || 'Nuestra Tienda';

  // Generar títulos y descripciones específicas por estado
  let title: string;
  let description: string;
  let canonicalUrl = '/offers';

  if (status === 'active') {
    title = offersCount > 0
      ? `${offersCount} Ofertas Activas - Descuentos Exclusivos | ${businessName}`
      : `Ofertas Activas | ${businessName}`;
    description = offersCount > 0
      ? `🔥 ${offersCount} ofertas activas con descuentos hasta 70%. Productos en promoción con precios especiales. ¡Compra ahora y ahorra! Envío gratis disponible.`
      : `Descubre nuestras próximas ofertas y promociones especiales en ${businessName}.`;
    canonicalUrl = '/offers?status=active';
  } else if (status === 'upcoming') {
    title = offersCount > 0
      ? `${offersCount} Ofertas Próximas - Prepárate para Ahorrar | ${businessName}`
      : `Próximas Ofertas | ${businessName}`;
    description = offersCount > 0
      ? `🚀 ${offersCount} ofertas próximas que no te puedes perder. Date prisa y marca tu calendario para aprovechar estos increíbles descuentos.`
      : `Mantente alerta para nuestras próximas promociones y ofertas especiales.`;
    canonicalUrl = '/offers?status=upcoming';
  } else if (status === 'ended') {
    title = offersCount > 0
      ? `${offersCount} Ofertas Finalizadas - Ofertas Pasadas | ${businessName}`
      : `Ofertas Finalizadas | ${businessName}`;
    description = offersCount > 0
      ? `📅 Revisa nuestras ${offersCount} ofertas finalizadas. No te pierdas las próximas promociones y mantente informado de nuevos descuentos.`
      : `Consulta nuestro historial de ofertas y promociones anteriores.`;
    canonicalUrl = '/offers?status=ended';
  } else {
    title = `Ofertas y Promociones | ${businessName}`;
    description = `Descubre todas nuestras ofertas, promociones especiales y descuentos exclusivos en ${businessName}. Los mejores precios garantizados.`;
  }

  // Palabras clave específicas por estado
  const baseKeywords = [
    'ofertas',
    'descuentos',
    'promociones',
    'rebajas',
    'ofertas especiales',
    'descuentos exclusivos',
    businessName,
    'comprar barato',
    'precios bajos'
  ];

  const statusKeywords = {
    active: ['ofertas activas', 'descuentos ahora', 'promociones vigentes', 'ofertas del momento'],
    upcoming: ['ofertas próximas', 'próximos descuentos', 'promociones futuras', 'ofertas programadas'],
    ended: ['ofertas finalizadas', 'promociones pasadas', 'descuentos anteriores', 'historial ofertas']
  };

  const keywords = [...baseKeywords, ...(statusKeywords[status as keyof typeof statusKeywords] || [])].join(', ');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: businessName,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}${canonicalUrl}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function OffersPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const status = searchParams?.status || 'active';

  const supabase = await createClient();

  // 1. Obtener categorías para el filtro
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  const categories = categoriesData || [];

  // 2. Obtener promociones según estado
  const now = new Date().toISOString();

  let promotionsData: any[] = [];
  let promoError: any = null;
  if (status === 'active') {
    const base = supabase.from('promotions').select('*');
    if (typeof (base as any).or === 'function') {
      const { data, error } = await base
        .eq('is_active', true)
        .or(`end_date.gte.${now},end_date.is.null`)
        .lte('start_date', now);
      promotionsData = data || [];
      promoError = error;
    } else {
      const { data: d1, error: e1 } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);
      const { data: d2, error: e2 } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .is('end_date', null);
      const map = new Map<string, any>();
      (d1 || []).concat(d2 || []).forEach((p: any) => map.set(p.id, p));
      promotionsData = Array.from(map.values());
      promoError = e1 || e2 || null;
    }
  } else if (status === 'upcoming') {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .gt('start_date', now);
    promotionsData = data || [];
    promoError = error;
  } else if (status === 'ended') {
    const base = supabase.from('promotions').select('*');
    if (typeof (base as any).or === 'function') {
      const { data, error } = await base.or(`is_active.eq.false,end_date.lt.${now}`);
      promotionsData = data || [];
      promoError = error;
    } else {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .lt('end_date', now);
      promotionsData = data || [];
      promoError = error;
    }
  }

  if (promoError) {
    console.error("Error fetching promotions:", promoError);
  }

  const activePromotions = promotionsData || [];
  const offers: OfferItem[] = [];

  if (activePromotions.length > 0) {
    const promoIds = activePromotions.map((p: any) => p.id);

    // 3. Obtener relaciones producto-promoción
    const { data: promoProductsData, error: ppError } = await supabase
      .from('promotions_products')
      .select('promotion_id, product_id')
      .in('promotion_id', promoIds);

    if (ppError) console.error("Error fetching promo_products:", ppError);

    const validPromoProducts = promoProductsData || [];

    if (validPromoProducts.length > 0) {
      const productIds = validPromoProducts.map((pp: any) => pp.product_id);

      // 4. Obtener detalles de productos
      const { data: productsData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (prodError) console.error("Error fetching products:", prodError);

      const productsMap = new Map();
      (productsData || []).forEach((p: any) => productsMap.set(p.id, p));

      // 5. Combinar todo
      validPromoProducts.forEach((pp: any) => {
        const productData = productsMap.get(pp.product_id);
        const promotionData = activePromotions.find((p: any) => p.id === pp.promotion_id);

        if (productData && promotionData) {
          // Mapear la promoción
          const promotion: Promotion = {
            id: promotionData.id,
            name: promotionData.name,
            description: promotionData.description,
            discountType: promotionData.discount_type as DiscountType,
            discountValue: promotionData.discount_value,
            startDate: promotionData.start_date,
            endDate: promotionData.end_date,
            isActive: promotionData.is_active,
            minPurchaseAmount: promotionData.min_purchase_amount,
            maxDiscountAmount: promotionData.max_discount_amount,
            usageLimit: promotionData.usage_limit,
            usageCount: promotionData.usage_count,
          };

          // Calcular precios usando utilidad centralizada
          const basePrice = Number(productData.sale_price || productData.price || 0);
          const calculation = calculateOfferPrice(basePrice, promotion);
          const { offerPrice, discountPercent } = calculation;

          // Construir objeto Product compatible
          const product: Product = {
            id: productData.id,
            name: productData.name,
            sale_price: productData.sale_price,
            retail_price: productData.retail_price,
            price: productData.price,
            stock_quantity: productData.stock_quantity,
            category_id: productData.category_id,
            sku: productData.sku,
            brand: productData.brand,
            images: Array.isArray(productData.image)
              ? productData.image.map((url: string) => ({ url }))
              : (typeof productData.image === 'string' ? [{ url: productData.image }] : []),
            image: typeof productData.image === 'string' ? productData.image : undefined,
            categoryName: categories.find((c: any) => c.id === productData.category_id)?.name
          };

          offers.push({
            product,
            promotion,
            basePrice,
            offerPrice,
            discountPercent
          });
        }
      });
    }
  }

  // Eliminar duplicados (si un producto tiene múltiples ofertas, quedarse con la mejor)
  const uniqueOffersMap = new Map<string, OfferItem>();
  offers.forEach(offer => {
    const existing = uniqueOffersMap.get(offer.product.id);
    if (!existing || offer.offerPrice < existing.offerPrice) {
      uniqueOffersMap.set(offer.product.id, offer);
    }
  });

  const finalOffers = Array.from(uniqueOffersMap.values());

  // Schema.org - ItemList (Ofertas)
  const offersSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ofertas y Promociones',
    description: 'Descubre las mejores ofertas y descuentos en nuestros productos',
    numberOfItems: finalOffers.length,
    itemListElement: finalOffers.slice(0, 20).map((offer, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: offer.product.name,
        offers: {
          '@type': 'Offer',
          price: offer.offerPrice.toString(),
          priceCurrency: 'USD',
          availability: offer.product.stock_quantity && offer.product.stock_quantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          priceValidUntil: offer.promotion.endDate || undefined,
        },
        category: offer.product.categoryName,
      },
    })),
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offersSchema),
        }}
      />

      <OffersClient
        initialOffers={finalOffers}
        initialCategories={categories}
      />
    </>
  );
}
