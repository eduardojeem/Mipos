import { createClient } from "@/lib/supabase/server";
import OffersClient, { OfferItem, Product, Promotion, DiscountType } from "./OffersClient";
import { Metadata } from "next";
import { calculateOfferPrice } from "@/lib/offers";
import { getCurrentOrganization } from "@/lib/organization/get-current-organization";

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  // ✅ Obtener config de la organización específica
  const { data: configData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organization.id)
    .single();

  const config = configData?.value;
  const businessName = config?.business_name || organization.name || 'Nuestra Tienda';

  return {
    title: `Ofertas y Promociones | ${businessName}`,
    description: `🔥 Descubre nuestras ofertas activas con descuentos exclusivos. ¡Compra ahora y ahorra!`,
    robots: { index: true, follow: true },
  };
}

export default async function OffersPage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const now = new Date().toISOString();

  // ✅ Obtener promociones activas de la organización
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_active', true)
    .lte('start_date', now)
    .or(`end_date.gte.${now},end_date.is.null`)
    .order('created_at', { ascending: false })
    .limit(50); // Límite para mejor performance

  if (!promotions || promotions.length === 0) {
    return <OffersClient initialOffers={[]} initialCategories={[]} />;
  }

  // ✅ Obtener productos de las promociones (filtrados por organización)
  const { data: promoProducts } = await supabase
    .from('promotions_products')
    .select(`
      product_id,
      promotion_id,
      products!inner(
        id, name, sale_price, stock_quantity, 
        image_url, images, category_id, is_active,
        organization_id
      )
    `)
    .in('promotion_id', promotions.map((p: any) => p.id))
    .eq('products.is_active', true)
    .eq('products.organization_id', organization.id)
    .limit(100);

  // Construir las ofertas
  const offers: OfferItem[] = [];
  const categoryIds = new Set<string>();

  for (const pp of promoProducts || []) {
    const product = pp.products as any;
    const promotion = promotions.find((p: any) => p.id === pp.promotion_id);

    if (!product || !promotion) continue;

    const calc = calculateOfferPrice(Number(product.sale_price || 0), {
      id: String(promotion.id),
      name: promotion.name,
      discountType: promotion.discount_type as DiscountType,
      discountValue: Number(promotion.discount_value || 0),
      isActive: true,
      startDate: promotion.start_date,
      endDate: promotion.end_date,
    });

    const image = Array.isArray(product.images) && product.images[0]?.url
      ? product.images[0].url
      : product.image_url || '/api/placeholder/300/300';

    offers.push({
      product: {
        id: String(product.id),
        name: product.name,
        image,
        sale_price: calc.basePrice,
        stock_quantity: product.stock_quantity || 0,
      },
      basePrice: calc.basePrice,
      offerPrice: calc.offerPrice,
      discountPercent: calc.discountPercent,
      promotion: {
        id: String(promotion.id),
        name: promotion.name,
        discountType: promotion.discount_type as DiscountType,
        discountValue: Number(promotion.discount_value || 0),
        endDate: promotion.end_date,
        isActive: true,
      },
    });

    if (product.category_id) {
      categoryIds.add(String(product.category_id));
    }
  }

  // ✅ Obtener categorías de la organización
  const { data: categories } = categoryIds.size > 0
    ? await supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', organization.id)
      .in('id', Array.from(categoryIds))
    : { data: [] };

  return (
    <OffersClient
      initialOffers={offers}
      initialCategories={(categories || []).map((c: any) => ({ id: String(c.id), name: c.name }))}
    />
  );
}
