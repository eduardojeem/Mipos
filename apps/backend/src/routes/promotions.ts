import { Router } from 'express';
import { prisma, supabase } from '../index';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { carouselService } from '../services/carouselService';

const router = Router();

router.get('/', async (req, res) => {
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  const { page = '1', limit = '10', search = '', type, status, isActive, stacking, dateFrom, dateTo } = req.query as any;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 10));
  const s = String(search || '').trim();
  if (supabase) {
    const nowIso = new Date().toISOString();
    let q = supabase.from('promotions').select('*', { count: 'exact' }).eq('organization_id', orgId);
    if (s) q = q.ilike('name', `%${s}%`);
    if (type) q = q.eq('type', String(type).toUpperCase());
    if (typeof stacking !== 'undefined') q = q.eq('stacking', String(stacking) === 'true');
    if (typeof isActive !== 'undefined') q = q.eq('is_active', String(isActive) === 'true');
    if (dateFrom) q = q.gte('start_date', new Date(String(dateFrom)).toISOString());
    if (dateTo) q = q.lte('end_date', new Date(String(dateTo)).toISOString());
    if (status === 'scheduled') q = q.eq('is_active', true).gt('start_date', nowIso);
    if (status === 'expired') q = q.lt('end_date', nowIso);
    if (status === 'active') q = q.eq('is_active', true).lte('start_date', nowIso).gte('end_date', nowIso);
    const start = (p - 1) * l;
    q = q.order('start_date', { ascending: true }).range(start, start + l - 1);
    const { data, count, error } = await q;
    if (error) return res.status(500).json({ success: false, message: 'Error al consultar promociones', error: error.message });
    const base = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      value: r.value,
      stacking: r.stacking,
      minPurchase: r.min_purchase,
      maxDiscount: r.max_discount,
      isActive: r.is_active,
      startDate: r.start_date,
      endDate: r.end_date
    }));
    const ids = base.map(r => r.id);
    let linksMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data: links } = await supabase.from('promotions_products').select('promotion_id,product_id').eq('organization_id', orgId).in('promotion_id', ids);
      (links || []).forEach((l: any) => {
        const pid = String(l.product_id);
        const k = String(l.promotion_id);
        (linksMap[k] ||= []).push(pid);
      });
    }
    const allProductIds = Array.from(new Set(Object.values(linksMap).flat()));
    let prodMap: Record<string, { name?: string; category?: string }> = {};
    if (allProductIds.length > 0) {
      const { data: prods } = await supabase.from('products').select('*').eq('organization_id', orgId).in('id', allProductIds);
      const catIds: string[] = [];
      (prods || []).forEach((p: any) => {
        const id = String(p.id);
        const cid = String(p.category_id ?? p.categoryId ?? '') || undefined;
        if (cid) catIds.push(cid);
        prodMap[id] = {
          name: p.name ?? p.product_name ?? undefined,
          category: cid ?? (p.category ?? undefined)
        };
      });
      const uniqueCatIds = Array.from(new Set(catIds)).filter(Boolean);
      if (uniqueCatIds.length > 0) {
        const { data: cats } = await supabase.from('categories').select('id,name').eq('organization_id', orgId).in('id', uniqueCatIds);
        const catMap: Record<string, string> = {};
        (cats || []).forEach((c: any) => { catMap[String(c.id)] = String(c.name); });
        Object.keys(prodMap).forEach(pid => {
          const pcat = String((prodMap[pid] as any).category || '');
          if (pcat && catMap[pcat]) {
            (prodMap[pid] as any).category = catMap[pcat];
          }
        });
      }
    }
    const rows = base.map(r => ({
      ...r,
      applicableProducts: (linksMap[r.id] || []).map(id => ({ id, name: prodMap[id]?.name, category: prodMap[id]?.category }))
    }));
    const total = count || rows.length;
    return res.json({ success: true, data: rows, count: total, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  }
  return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
});

// Productos en oferta (vinculados a promociones activas)
router.get('/offers-products', async (req, res) => {
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  if (!supabase) return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  const nowIso = new Date().toISOString();
  const { limit = '24', offset = '0', category } = (req.query || {}) as any;
  const l = Math.max(1, Math.min(100, Number(limit) || 24));
  const o = Math.max(0, Number(offset) || 0);
  // Promociones activas por ventana de fechas
  const { data: activePromos, error: promoErr } = await supabase
    .from('promotions')
    .select('id,name,discount_type,discount_value,is_active,start_date,end_date')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .lte('start_date', nowIso)
    .gte('end_date', nowIso);
  if (promoErr) return res.status(500).json({ success: false, message: 'Error al consultar promociones', error: promoErr.message });
  const promoIds = (activePromos || []).map((p: any) => p.id);
  if (promoIds.length === 0) return res.json({ success: true, data: [], count: 0, pagination: { limit: l, offset: o, total: 0, pages: 0 } });

  // Enlaces a productos
  const { data: links, error: linkErr } = await supabase
    .from('promotions_products')
    .select('promotion_id,product_id')
    .eq('organization_id', orgId)
    .in('promotion_id', promoIds);
  if (linkErr) return res.status(500).json({ success: false, message: 'Error al consultar enlaces de promociones', error: linkErr.message });
  const productIds = Array.from(new Set((links || []).map((l: any) => String(l.product_id))));

  // Productos con posible precio de oferta
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id,name,images,sale_price,offer_price,brand,category_id')
    .eq('organization_id', orgId)
    .in('id', productIds)
    .eq('is_active', true);
  if (prodErr) return res.status(500).json({ success: false, message: 'Error al consultar productos', error: prodErr.message });

  // Obtener nombres de categorías
  const catIds = Array.from(new Set((products || []).map((p: any) => String(p.category_id || '')).filter(Boolean)));
  let catNameMap: Record<string, string> = {};
  if (catIds.length > 0) {
    const { data: cats, error: catErr } = await supabase.from('categories').select('id,name').eq('organization_id', orgId).in('id', catIds);
    if (!catErr) {
      (cats || []).forEach((c: any) => { catNameMap[String(c.id)] = String(c.name); });
    }
  }

  // Mapear por producto incluyendo datos de promoción
  const promoById: Record<string, any> = {};
  (activePromos || []).forEach((p: any) => { promoById[String(p.id)] = p; });
  const linksByProduct: Record<string, string[]> = {};
  (links || []).forEach((l: any) => {
    const pid = String(l.product_id);
    const arr = linksByProduct[pid] || [];
    arr.push(String(l.promotion_id));
    linksByProduct[pid] = arr;
  });

  let rows = (products || []).map((p: any) => {
    const promoList = (linksByProduct[String(p.id)] || []).map((prId) => promoById[prId]).filter(Boolean);
    const primaryPromo = promoList[0] || null;
    let imageUrl: string | null = null;
    try {
      if (Array.isArray(p.images) && p.images.length > 0) {
        const first = p.images[0];
        imageUrl = typeof first === 'string' ? first : (typeof first?.url === 'string' ? first.url : null);
      } else if (typeof p.images === 'string' && p.images.trim()) {
        imageUrl = p.images;
      }
    } catch {
      imageUrl = null;
    }
    const base = Number(p.sale_price || 0);
    let discounted = base;
    if (primaryPromo) {
      const dtype = String(primaryPromo.discount_type || '').toUpperCase();
      const dval = Number(primaryPromo.discount_value || 0);
      if (dtype === 'PERCENTAGE') {
        discounted = Math.max(0, base * (1 - Math.max(0, Math.min(100, dval)) / 100));
      } else if (dtype === 'FIXED_AMOUNT') {
        discounted = Math.max(0, base - dval);
      }
    }
    const offerFromProduct = p.offer_price !== null ? Number(p.offer_price) : null;
    const effective = offerFromProduct != null && offerFromProduct > 0 ? Math.min(offerFromProduct, discounted) : discounted;
    const percent = base > 0 ? Math.round((1 - effective / base) * 100) : 0;
    return {
      productId: String(p.id),
      name: p.name,
      image: imageUrl,
      salePrice: Number(p.sale_price || 0),
      offerPrice: p.offer_price !== null ? Number(p.offer_price) : null,
      brand: p.brand ? String(p.brand) : null,
      categoryId: p.category_id ? String(p.category_id) : null,
      categoryName: p.category_id ? (catNameMap[String(p.category_id)] || null) : null,
      promotion: primaryPromo ? {
        name: String(primaryPromo.name || ''),
        discountType: String(primaryPromo.discount_type || ''),
        discountValue: Number(primaryPromo.discount_value || 0),
        endDate: String(primaryPromo.end_date || ''),
      } : null,
      effectiveOfferPrice: effective,
      discountPercent: percent,
    };
  });
  if (category) {
    const cat = String(category);
    rows = rows.filter(r => String(r.categoryId || '') === cat);
  }
  // Búsqueda simple
  if (req.query?.q) {
    const q = String(req.query.q || '').toLowerCase();
    rows = rows.filter(r => String(r.name || '').toLowerCase().includes(q) || String(r.brand || '').toLowerCase().includes(q));
  }
  // Ordenamiento
  const sort = String((req.query as any)?.sort || '').toLowerCase();
  rows.sort((a, b) => {
    const savingA = Math.max(0, Number(a.salePrice || 0) - Number(a.effectiveOfferPrice || a.salePrice || 0));
    const savingB = Math.max(0, Number(b.salePrice || 0) - Number(b.effectiveOfferPrice || b.salePrice || 0));
    const endA = a.promotion?.endDate ? new Date(a.promotion.endDate).getTime() : Number.POSITIVE_INFINITY;
    const endB = b.promotion?.endDate ? new Date(b.promotion.endDate).getTime() : Number.POSITIVE_INFINITY;
    switch (sort) {
      case 'best_savings':
        return savingB - savingA;
      case 'highest_discount':
        return Number(b.discountPercent || 0) - Number(a.discountPercent || 0);
      case 'ending_soon':
        return endA - endB;
      case 'price_low_high':
        return Number(a.effectiveOfferPrice || a.salePrice || 0) - Number(b.effectiveOfferPrice || b.salePrice || 0);
      case 'price_high_low':
        return Number(b.effectiveOfferPrice || b.salePrice || 0) - Number(a.effectiveOfferPrice || a.salePrice || 0);
      default:
        return savingB - savingA;
    }
  });
  const total = rows.length;
  const paged = rows.slice(o, o + l);
  return res.json({ success: true, data: paged, count: total, pagination: { limit: l, offset: o, total, pages: Math.ceil(total / l) } });
});

const promotionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  discountValue: z.number().positive().optional(),
  value: z.number().positive().optional(),
  stacking: z.boolean().optional(),
  minPurchaseAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().nonnegative().optional(),
  isActive: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  applicableProductIds: z.array(z.string()).optional()
}).refine((d) => {
  const sd = new Date(d.startDate).getTime();
  const ed = new Date(d.endDate).getTime();
  return !isNaN(sd) && !isNaN(ed) && ed > sd;
}, { message: 'Rango de fechas inválido' });

router.post('/', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Datos inválidos', errors: parsed.error.flatten() });
  }
  const payload = parsed.data as any;
  const row = {
    name: payload.name,
    type: payload.discountType ?? payload.type,
    value: payload.discountValue ?? payload.value,
    stacking: payload.stacking ?? false,
    min_purchase: payload.minPurchaseAmount ?? 0,
    max_discount: payload.maxDiscountAmount ?? 0,
    is_active: payload.isActive,
    start_date: new Date(payload.startDate).toISOString(),
    end_date: new Date(payload.endDate).toISOString(),
    created_at: new Date().toISOString(),
    organization_id: orgId
  };
  const { data, error } = await supabase.from('promotions').insert([row]).select('*').single();
  if (error) return res.status(500).json({ success: false, message: 'Error creando promoción', error: error.message });
  const r: any = data;
  const ids: string[] = Array.isArray(payload.applicableProductIds) ? payload.applicableProductIds : [];
  if (ids.length > 0) {
    const links = ids.map((pid) => ({ promotion_id: r.id, product_id: pid, organization_id: orgId }));
    await supabase.from('promotions_products').insert(links);
  }
  let prodMap: Record<string, { name?: string; category?: string }> = {};
  if (ids.length > 0) {
    const { data: prods } = await supabase.from('products').select('*').in('id', ids);
    const catIds: string[] = [];
    (prods || []).forEach((p: any) => {
      const id = String(p.id);
      const cid = String(p.category_id ?? p.categoryId ?? '') || undefined;
      if (cid) catIds.push(cid);
      prodMap[id] = { name: p.name ?? p.product_name ?? undefined, category: cid ?? (p.category ?? undefined) };
    });
    const uniqueCatIds = Array.from(new Set(catIds)).filter(Boolean);
    if (uniqueCatIds.length > 0) {
      const { data: cats } = await supabase.from('categories').select('id,name').in('id', uniqueCatIds);
      const catMap: Record<string, string> = {};
      (cats || []).forEach((c: any) => { catMap[String(c.id)] = String(c.name); });
      Object.keys(prodMap).forEach(pid => {
        const pcat = String((prodMap[pid] as any).category || '');
        if (pcat && catMap[pcat]) {
          (prodMap[pid] as any).category = catMap[pcat];
        }
      });
    }
  }
  return res.status(201).json({ success: true, data: {
    id: r.id,
    name: r.name,
    type: r.type,
    value: r.value,
    stacking: r.stacking,
    minPurchase: r.min_purchase,
    maxDiscount: r.max_discount,
    isActive: r.is_active,
    startDate: r.start_date,
    endDate: r.end_date,
    applicableProducts: ids.map(id => ({ id, name: prodMap[id]?.name, category: prodMap[id]?.category }))
  } });
});

router.put('/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  const id = String(req.params.id || '').trim();
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Datos inválidos', errors: parsed.error.flatten() });
  }
  const payload = parsed.data as any;
  const { data: existing, error: e0 } = await supabase.from('promotions').select('*').eq('id', id).eq('organization_id', orgId).single();
  if (e0 && (e0 as any).code !== 'PGRST116') return res.status(500).json({ success: false, message: 'Error consultando promoción', error: e0.message });
  if (!existing) return res.status(404).json({ success: false, message: 'Promoción no encontrada' });
  const row = {
    name: payload.name,
    type: payload.discountType ?? payload.type,
    value: payload.discountValue ?? payload.value,
    stacking: payload.stacking ?? false,
    min_purchase: payload.minPurchaseAmount ?? 0,
    max_discount: payload.maxDiscountAmount ?? 0,
    is_active: payload.isActive,
    start_date: new Date(payload.startDate).toISOString(),
    end_date: new Date(payload.endDate).toISOString()
  };
  const { data, error } = await supabase.from('promotions').update(row).eq('id', id).eq('organization_id', orgId).select('*').single();
  if (error) return res.status(500).json({ success: false, message: 'Error actualizando promoción', error: error.message });
  const r: any = data;
  const ids: string[] = Array.isArray(payload.applicableProductIds) ? payload.applicableProductIds : [];
  if (Array.isArray(payload.applicableProductIds)) {
    await supabase.from('promotions_products').delete().eq('promotion_id', id).eq('organization_id', orgId);
    if (ids.length > 0) {
      const links = ids.map((pid) => ({ promotion_id: id, product_id: pid, organization_id: orgId }));
      await supabase.from('promotions_products').insert(links);
    }
  }
  let prodMap: Record<string, { name?: string; category?: string }> = {};
  if (ids.length > 0) {
    const { data: prods } = await supabase.from('products').select('*').eq('organization_id', orgId).in('id', ids);
    const catIds: string[] = [];
    (prods || []).forEach((p: any) => {
      const id2 = String(p.id);
      const cid = String(p.category_id ?? p.categoryId ?? '') || undefined;
      if (cid) catIds.push(cid);
      prodMap[id2] = { name: p.name ?? p.product_name ?? undefined, category: cid ?? (p.category ?? undefined) };
    });
    const uniqueCatIds = Array.from(new Set(catIds)).filter(Boolean);
    if (uniqueCatIds.length > 0) {
      const { data: cats } = await supabase.from('categories').select('id,name').eq('organization_id', orgId).in('id', uniqueCatIds);
      const catMap: Record<string, string> = {};
      (cats || []).forEach((c: any) => { catMap[String(c.id)] = String(c.name); });
      Object.keys(prodMap).forEach(pid => {
        const pcat = String((prodMap[pid] as any).category || '');
        if (pcat && catMap[pcat]) {
          (prodMap[pid] as any).category = catMap[pcat];
        }
      });
    }
  }
  return res.json({ success: true, data: {
    id: r.id,
    name: r.name,
    type: r.type,
    value: r.value,
    stacking: r.stacking,
    minPurchase: r.min_purchase,
    maxDiscount: r.max_discount,
    isActive: r.is_active,
    startDate: r.start_date,
    endDate: r.end_date,
    applicableProducts: ids.map(id => ({ id, name: prodMap[id]?.name, category: prodMap[id]?.category }))
  } });
});

router.delete('/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  const id = String(req.params.id || '').trim();
  const { data: existing, error: e0 } = await supabase.from('promotions').select('id').eq('id', id).eq('organization_id', orgId).limit(1);
  if (e0) return res.status(500).json({ success: false, message: 'Error consultando promoción', error: e0.message });
  if ((existing || []).length === 0) return res.status(404).json({ success: false, message: 'Promoción no encontrada' });
  const { error } = await supabase.from('promotions').delete().eq('id', id).eq('organization_id', orgId);
  if (error) return res.status(500).json({ success: false, message: 'Error eliminando promoción', error: error.message });
  return res.json({ success: true, message: 'Promoción eliminada' });
});

router.patch('/:id/status', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  const id = String(req.params.id || '').trim();
  const isActive = String((req.body || {}).isActive).toLowerCase() === 'true' || (req.body || {}).isActive === true;
  const { data, error } = await supabase.from('promotions').update({ is_active: isActive }).eq('id', id).eq('organization_id', orgId).select('id,is_active').single();
  if (error) return res.status(500).json({ success: false, message: 'Error actualizando estado', error: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Promoción no encontrada' });
  return res.json({ success: true, data: { id: data.id, isActive: data.is_active } });
});

router.patch('/:id/approval', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Supabase no está configurado' });
  const orgId = String(req.get('x-organization-id') || '').trim();
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
  const id = String(req.params.id || '').trim();
  const status = String((req.body || {}).status || '').toLowerCase();
  const comment = String((req.body || {}).comment || '');
  const approved = status === 'approved';
  const row: any = {
    approval_status: status || 'pending',
    approval_comment: comment || null,
    approved_by: approved ? (req as any).user?.email || (req as any).user?.id || null : null,
    approved_at: approved ? new Date().toISOString() : null
  };
  const { data, error } = await supabase.from('promotions').update(row).eq('id', id).eq('organization_id', orgId).select('id,approval_status,approval_comment,approved_by,approved_at').single();
  if (error) return res.status(500).json({ success: false, message: 'Error actualizando aprobación', error: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Promoción no encontrada' });
  return res.json({ success: true, data });
});

// ============================================================
// CAROUSEL ENDPOINTS
// ============================================================

/**
 * GET /promotions/carousel/public
 * 
 * Get public carousel with active promotions and product details
 * No authentication required - public endpoint
 * 
 * @returns {object} - Carousel data with promotion and product details
 */
router.get('/carousel/public', async (req, res) => {
  try {
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Servicio no disponible',
        data: []
      });
    }

    // Get carousel configuration
    const carousel = await carouselService.getCarousel(orgId);
    
    if (!carousel.ids || carousel.ids.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay ofertas destacadas en este momento'
      });
    }

    // Get active promotions from carousel
    const now = new Date().toISOString();
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .in('id', carousel.ids)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.gte.${now},end_date.is.null`);

    if (promoError) {
      console.error('Error fetching carousel promotions:', promoError);
      return res.status(500).json({
        success: false,
        message: 'Error al cargar ofertas destacadas',
        data: []
      });
    }

    if (!promotions || promotions.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay ofertas activas en el carrusel'
      });
    }

    // Get products for each promotion
    const promoIds = promotions.map(p => p.id);
    const { data: promoProducts, error: ppError } = await supabase
      .from('promotions_products')
      .select('promotion_id, product_id')
      .in('promotion_id', promoIds)
      .eq('organization_id', orgId);

    if (ppError) {
      console.error('Error fetching promotion products:', ppError);
    }

    const validPromoProducts = promoProducts || [];
    
    if (validPromoProducts.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay productos en las ofertas destacadas'
      });
    }

    // Get product details
    const productIds = validPromoProducts.map(pp => pp.product_id);
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('organization_id', orgId);

    if (prodError) {
      console.error('Error fetching products:', prodError);
    }

    const productsMap = new Map();
    (products || []).forEach(p => productsMap.set(p.id, p));

    // Build carousel items maintaining order
    const carouselItems = carousel.ids
      .map(promoId => {
        const promotion = promotions.find(p => p.id === promoId);
        if (!promotion) return null;

        // Get first product for this promotion
        const promoProduct = validPromoProducts.find(pp => pp.promotion_id === promoId);
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

    res.json({
      success: true,
      data: carouselItems,
      count: carouselItems.length
    });

  } catch (error: any) {
    console.error('Error fetching public carousel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cargar ofertas destacadas',
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /promotions/carousel
 * 
 * Get current carousel configuration
 * 
 * Requirements: 2.1, 2.3
 * 
 * @returns {object} - Carousel data with ids, lastModified, modifiedBy, version
 */
router.get('/carousel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
    const carousel = await carouselService.getCarousel(orgId);
    
    res.json({
      success: true,
      ...carousel,
    });
  } catch (error: any) {
    console.error('Error fetching carousel:', error);
    
    // Determine error type
    const statusCode = error.message.includes('not initialized') ? 503 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: 'Error al cargar el carrusel',
      error: error.message,
      errorType: statusCode === 503 ? 'SERVICE_UNAVAILABLE' : 'SERVER_ERROR',
    });
  }
});

/**
 * PUT /promotions/carousel
 * 
 * Update carousel configuration
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 9.1
 * 
 * @body {string[]} ids - Array of promotion IDs
 * @returns {object} - Updated carousel data
 */
router.put('/carousel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        errorType: 'UNAUTHORIZED',
      });
    }

    const ids = req.body?.ids;

    // Validate input format
    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'IDs debe ser un array',
        errorType: 'INVALID_INPUT',
      });
    }

    // Get request context for audit logging
    const context = {
      userId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Save carousel (includes validation and audit logging)
    const result = await carouselService.saveCarousel(ids, context, orgId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error saving carousel:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';

    if (error.message.includes('Validation failed')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.message.includes('not initialized')) {
      statusCode = 503;
      errorType = 'SERVICE_UNAVAILABLE';
    } else if (error.message.includes('not exist')) {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    }

    res.status(statusCode).json({
      success: false,
      message: 'Error al guardar el carrusel',
      error: error.message,
      errorType,
    });
  }
});

/**
 * GET /promotions/carousel/audit
 * 
 * Get carousel audit log
 * 
 * Requirements: 9.3
 * 
 * @query {number} limit - Maximum number of entries (default: 50)
 * @query {number} offset - Number of entries to skip (default: 0)
 * @returns {object} - Array of audit log entries
 */
router.get('/carousel/audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const logs = await carouselService.getAuditLog(limit, offset);

    res.json({
      success: true,
      logs,
      pagination: {
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit log:', error);

    res.status(500).json({
      success: false,
      message: 'Error al cargar el historial',
      error: error.message,
      errorType: 'SERVER_ERROR',
    });
  }
});

/**
 * POST /promotions/carousel/revert/:versionId
 * 
 * Revert carousel to a previous version
 * 
 * Requirements: 9.4
 * 
 * @param {string} versionId - ID of the audit log entry to revert to
 * @returns {object} - Reverted carousel data
 */
router.post('/carousel/revert/:versionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { versionId } = req.params;
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        errorType: 'UNAUTHORIZED',
      });
    }

    if (!versionId) {
      return res.status(400).json({
        success: false,
        message: 'Version ID es requerido',
        errorType: 'INVALID_INPUT',
      });
    }

    // Get request context for audit logging
    const context = {
      userId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    const result = await carouselService.revertToVersion(versionId, context);

    res.json({
      success: true,
      ...result,
      message: 'Carrusel revertido exitosamente',
    });
  } catch (error: any) {
    console.error('Error reverting carousel:', error);

    let statusCode = 500;
    let errorType = 'SERVER_ERROR';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    }

    res.status(statusCode).json({
      success: false,
      message: 'Error al revertir cambios',
      error: error.message,
      errorType,
    });
  }
});

/**
 * POST /promotions/carousel/validate
 * 
 * Validate carousel configuration without saving
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * 
 * @body {string[]} ids - Array of promotion IDs to validate
 * @returns {object} - Validation result
 */
router.post('/carousel/validate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
    const ids = req.body?.ids;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'IDs debe ser un array',
        errorType: 'INVALID_INPUT',
      });
    }

    const validation = await carouselService.validateCarousel(ids);

    res.json({
      success: true,
      validation,
    });
  } catch (error: any) {
    console.error('Error validating carousel:', error);

    res.status(500).json({
      success: false,
      message: 'Error al validar el carrusel',
      error: error.message,
      errorType: 'SERVER_ERROR',
    });
  }
});

/**
 * GET /promotions/:id/products
 * 
 * Obtiene los productos asociados a una promoción
 */
router.get('/:id/products', async (req, res) => {
  try {
    const promotionId = req.params.id;
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });
    console.log('[DEBUG] GET /promotions/:id/products called with ID:', promotionId);

    if (!supabase) {
      console.log('[DEBUG] Supabase not configured');
      return res.status(503).json({
        success: false,
        message: 'Supabase no está configurado',
      });
    }

    // Obtener productos asociados
    console.log('[DEBUG] Fetching promotion products for ID:', promotionId);
    const { data: links, error: linksError } = await supabase
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId);

    console.log('[DEBUG] Links result:', { links: links?.length || 0, error: linksError?.message });

    if (linksError) {
      console.error('Error fetching promotion products:', linksError);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: linksError.message,
      });
    }

    if (!links || links.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    const productIds = links.map((l: any) => l.product_id);

    // Obtener detalles de los productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sale_price, image, images, category_id, stock_quantity')
      .in('id', productIds)
      .eq('organization_id', orgId);

    if (productsError) {
      console.error('Error fetching products details:', productsError);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalles de productos',
        error: productsError.message,
      });
    }

    // Obtener categorías
    const categoryIds = Array.from(new Set(
      (products || []).map((p: any) => p.category_id).filter(Boolean)
    ));

    let categoryMap: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds)
        .eq('organization_id', orgId);

      (categories || []).forEach((c: any) => {
        categoryMap[c.id] = c.name;
      });
    }

    // Formatear respuesta
    const formattedProducts = (products || []).map((p: any) => {
      let imageUrl = null;
      try {
        if (Array.isArray(p.images) && p.images.length > 0) {
          const first = p.images[0];
          imageUrl = typeof first === 'string' ? first : (first?.url || null);
        } else if (typeof p.image === 'string' && p.image.trim()) {
          imageUrl = p.image;
        }
      } catch {
        imageUrl = null;
      }

      return {
        id: p.id,
        name: p.name,
        price: Number(p.sale_price || 0),
        imageUrl,
        category: p.category_id ? categoryMap[p.category_id] : null,
        categoryId: p.category_id,
        stock: Number(p.stock_quantity || 0),
      };
    });

    res.json({
      success: true,
      data: formattedProducts,
      count: formattedProducts.length,
    });
  } catch (error: any) {
    console.error('Error in GET /promotions/:id/products:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message,
    });
  }
});

/**
 * POST /promotions/:id/products
 * 
 * Asocia productos a una promoción
 */
router.post('/:id/products', async (req, res) => {
  try {
    const promotionId = req.params.id;
    const { productIds } = req.body;
    const orgId = String(req.get('x-organization-id') || '').trim();
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization header missing' });

    console.log('[DEBUG] POST /promotions/:id/products called');
    console.log('[DEBUG] promotionId:', promotionId);
    console.log('[DEBUG] productIds:', productIds);
    console.log('[DEBUG] body:', req.body);

    if (!Array.isArray(productIds) || productIds.length === 0) {
      console.log('[DEBUG] Invalid productIds array');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de productIds',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Supabase no está configurado',
      });
    }

    // Verificar que la promoción existe
    const { data: promotion, error: promoError } = await supabase
      .from('promotions')
      .select('id')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single();

    if (promoError || !promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada',
      });
    }

    // Crear las asociaciones
    // Validar que los productos pertenezcan a la misma organización
    const { data: validProducts } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', orgId)
      .in('id', productIds);
    const validIds = (validProducts || []).map((p: any) => p.id);
    const links = validIds.map(productId => ({
      promotion_id: promotionId,
      product_id: productId,
      organization_id: orgId,
    }));

    const { error: insertError } = await supabase
      .from('promotions_products')
      .insert(links);

    if (insertError) {
      console.error('Error inserting promotion products:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Error al asociar productos',
        error: insertError.message,
      });
    }

    res.json({
      success: true,
      message: `${productIds.length} producto(s) asociado(s) exitosamente`,
    });
  } catch (error: any) {
    console.error('Error in POST /promotions/:id/products:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asociar productos',
      error: error.message,
    });
  }
});

/**
 * DELETE /promotions/:id/products
 * 
 * Desasocia un producto de una promoción
 */
router.delete('/:id/products', async (req, res) => {
  try {
    const promotionId = req.params.id;
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere productId',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Supabase no está configurado',
      });
    }

    const { error } = await supabase
      .from('promotions_products')
      .delete()
      .eq('promotion_id', promotionId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error deleting promotion product:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al desasociar producto',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Producto desasociado exitosamente',
    });
  } catch (error: any) {
    console.error('Error in DELETE /promotions/:id/products:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desasociar producto',
      error: error.message,
    });
  }
});

/**
 * POST /promotions/batch/product-counts
 * 
 * Obtiene el conteo de productos para múltiples promociones en una sola llamada
 * Optimización crítica para evitar N+1 queries
 * 
 * @body {string[]} ids - Array de IDs de promociones
 * @returns {object} - Objeto con conteos { [promotionId]: count }
 */
router.post('/batch/product-counts', async (req, res) => {
  try {
    const { ids } = req.body;

    // Validación
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs',
      });
    }

    // Limitar a 100 IDs por request para evitar sobrecarga
    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 100 IDs por request',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Supabase no está configurado',
      });
    }

    // Una sola query con GROUP BY para máxima eficiencia
    const { data: results, error } = await supabase
      .from('promotions_products')
      .select('promotion_id')
      .in('promotion_id', ids);

    if (error) {
      console.error('Error fetching batch product counts:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener conteos de productos',
        error: error.message,
      });
    }

    // Contar manualmente los resultados
    const counts: Record<string, number> = {};
    
    // Inicializar todos los IDs con 0
    ids.forEach(id => {
      counts[id] = 0;
    });

    // Contar las ocurrencias
    (results || []).forEach((result: any) => {
      const promoId = result.promotion_id;
      counts[promoId] = (counts[promoId] || 0) + 1;
    });

    res.json({
      success: true,
      counts,
    });
  } catch (error: any) {
    console.error('Error in batch product counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteos de productos',
      error: error.message,
    });
  }
});

export default router;
