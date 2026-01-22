import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/enhanced-auth';
import { apiRateLimit } from '../middleware/rate-limiter';
import { prisma, supabase } from '../index';

const router = express.Router();

// Validation schema for coupon validation request
const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  subtotal: z.number().min(0, 'Subtotal must be >= 0'),
  customerId: z.string().optional()
});

// Mock coupon configuration until database integration is completed
// TODO: Replace with real database-backed coupons table
const mockCoupons = [
  {
    code: 'DESC10',
    type: 'PERCENTAGE' as const,
    value: 10,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    minPurchase: 50000,
    maxDiscount: 100000,
    usageLimitPerCustomer: 5
  },
  {
    code: 'FIJO50000',
    type: 'FIXED_AMOUNT' as const,
    value: 50000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-12-31'),
    minPurchase: 100000,
    maxDiscount: 50000,
    usageLimitPerCustomer: 3
  },
  {
    code: 'NAVIDAD',
    type: 'PERCENTAGE' as const,
    value: 20,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    minPurchase: 150000,
    maxDiscount: 200000,
    usageLimitPerCustomer: 1
  }
];

type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT';
type Coupon = {
  code: string;
  type: CouponType;
  value: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  usageLimit?: number;
};

const runtimeCoupons: Coupon[] = mockCoupons.map(c => ({
  code: c.code,
  type: c.type,
  value: c.value,
  startDate: c.startDate,
  endDate: c.endDate,
  isActive: true,
  usageLimit: c.usageLimitPerCustomer
}));

const couponSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{8,12}$/),
  type: z.enum(['PERCENTAGE','FIXED_AMOUNT']),
  value: z.number().refine(v => v > 0 && v <= 100, { message: 'Valor inválido' }).or(z.number().refine(v => v > 0, { message: 'Valor inválido' })),
  startDate: z.string().refine(s => !isNaN(Date.parse(s))),
  endDate: z.string().refine(s => !isNaN(Date.parse(s))),
  isActive: z.boolean(),
  usageLimit: z.number().int().min(0).optional()
}).refine((data) => new Date(data.endDate).getTime() > new Date(data.startDate).getTime(), { message: 'Fecha fin debe ser posterior a inicio' });

function normalizeCode(code: string) { return code.trim().toUpperCase(); }
function isActiveNow(c: Coupon) {
  const now = new Date();
  return c.isActive && now >= c.startDate && now <= c.endDate;
}

router.get('/', apiRateLimit, requirePermission('sales','read'), asyncHandler(async (req, res) => {
  const { page = '1', limit = '10', search = '', status, dateFrom, dateTo } = req.query as any;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 10));
  const s = String(search || '').trim();
  if (supabase) {
    const nowIso = new Date().toISOString();
    let q = supabase.from('coupons').select('*', { count: 'exact' });
    if (s) q = q.ilike('code', `%${s.toUpperCase()}%`);
    if (dateFrom) q = q.gte('start_date', new Date(String(dateFrom)).toISOString());
    if (dateTo) q = q.lte('end_date', new Date(String(dateTo)).toISOString());
    if (status === 'inactive') q = q.eq('is_active', false);
    if (status === 'scheduled') { q = q.eq('is_active', true).gt('start_date', nowIso); }
    if (status === 'expired') { q = q.lt('end_date', nowIso); }
    if (status === 'active') { q = q.eq('is_active', true).lte('start_date', nowIso).gte('end_date', nowIso); }
    const start = (p - 1) * l;
    q = q.order('start_date', { ascending: true }).range(start, start + l - 1);
    const { data, count, error } = await q;
    if (error) return res.status(500).json({ success: false, message: 'Error al consultar cupones', error: error.message });
    const rows = (data || []).map((c: any) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      startDate: c.start_date,
      endDate: c.end_date,
      isActive: c.is_active,
      usageLimit: c.usage_limit ?? null
    }));
    const total = count || rows.length;
    return res.json({ success: true, data: rows, count: total, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  }
  const sU = s.toUpperCase();
  let items = runtimeCoupons.slice();
  if (sU) items = items.filter(c => c.code.includes(sU));
  if (status === 'active') items = items.filter(c => { const n = new Date(); return c.isActive && n >= c.startDate && n <= c.endDate; });
  if (status === 'inactive') items = items.filter(c => !c.isActive);
  if (status === 'scheduled') items = items.filter(c => { const n = new Date(); return c.isActive && n < c.startDate; });
  if (status === 'expired') items = items.filter(c => { const n = new Date(); return n > c.endDate; });
  if (dateFrom) { const df = new Date(String(dateFrom)); items = items.filter(c => c.startDate >= df); }
  if (dateTo) { const dt = new Date(String(dateTo)); items = items.filter(c => c.endDate <= dt); }
  const total = items.length;
  const start = (p - 1) * l;
  const data = items.slice(start, start + l).map(c => ({ code: c.code, type: c.type, value: c.value, startDate: c.startDate.toISOString(), endDate: c.endDate.toISOString(), isActive: c.isActive, usageLimit: c.usageLimit }));
  return res.json({ success: true, data, count: total, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
}));

router.post('/', apiRateLimit, requirePermission('sales','create'), asyncHandler(async (req, res) => {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) { return res.status(400).json({ success: false, message: 'Datos inválidos', errors: parsed.error.flatten() }); }
  const payload = parsed.data;
  const code = normalizeCode(payload.code);
  if (supabase) {
    const { data: exists, error: err0 } = await supabase.from('coupons').select('code').eq('code', code).limit(1);
    if (err0) return res.status(500).json({ success: false, message: 'Error verificando código', error: err0.message });
    if ((exists || []).length > 0) return res.status(409).json({ success: false, message: 'Código ya existe' });
    const row = {
      code,
      type: payload.type,
      value: payload.value,
      start_date: new Date(payload.startDate).toISOString(),
      end_date: new Date(payload.endDate).toISOString(),
      is_active: payload.isActive,
      usage_limit: payload.usageLimit ?? null,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('coupons').insert([row]).select('*').single();
    if (error) return res.status(500).json({ success: false, message: 'Error creando cupón', error: error.message });
    return res.status(201).json({ success: true, data });
  }
  if (runtimeCoupons.some(c => c.code === code)) { return res.status(409).json({ success: false, message: 'Código ya existe' }); }
  const item: Coupon = { code, type: payload.type, value: payload.value, startDate: new Date(payload.startDate), endDate: new Date(payload.endDate), isActive: payload.isActive, usageLimit: payload.usageLimit };
  runtimeCoupons.push(item);
  return res.status(201).json({ success: true, data: item });
}));

router.put('/:code', apiRateLimit, requirePermission('sales','update'), asyncHandler(async (req, res) => {
  const current = normalizeCode(String(req.params.code || ''));
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) { return res.status(400).json({ success: false, message: 'Datos inválidos', errors: parsed.error.flatten() }); }
  const payload = parsed.data;
  const nextCode = normalizeCode(payload.code);
  if (supabase) {
    const { data: existing, error: e0 } = await supabase.from('coupons').select('*').eq('code', current).single();
    if (e0 && (e0 as any).code !== 'PGRST116') return res.status(500).json({ success: false, message: 'Error consultando cupón', error: e0.message });
    if (!existing) return res.status(404).json({ success: false, message: 'Código no encontrado' });
    if (nextCode !== current) {
      const { data: dupe } = await supabase.from('coupons').select('code').eq('code', nextCode).limit(1);
      if ((dupe || []).length > 0) return res.status(409).json({ success: false, message: 'Código ya existe' });
    }
    const row = {
      code: nextCode,
      type: payload.type,
      value: payload.value,
      start_date: new Date(payload.startDate).toISOString(),
      end_date: new Date(payload.endDate).toISOString(),
      is_active: payload.isActive,
      usage_limit: payload.usageLimit ?? null
    };
    const { data, error } = await supabase.from('coupons').update(row).eq('code', current).select('*').single();
    if (error) return res.status(500).json({ success: false, message: 'Error actualizando cupón', error: error.message });
    return res.json({ success: true, data });
  }
  const idx = runtimeCoupons.findIndex(c => c.code === current);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Código no encontrado' });
  if (nextCode !== current && runtimeCoupons.some(c => c.code === nextCode)) { return res.status(409).json({ success: false, message: 'Código ya existe' }); }
  runtimeCoupons[idx] = { code: nextCode, type: payload.type, value: payload.value, startDate: new Date(payload.startDate), endDate: new Date(payload.endDate), isActive: payload.isActive, usageLimit: payload.usageLimit };
  return res.json({ success: true, data: runtimeCoupons[idx] });
}));

router.delete('/:code', apiRateLimit, requirePermission('sales','delete'), asyncHandler(async (req, res) => {
  const current = normalizeCode(String(req.params.code || ''));
  if (supabase) {
    const { data: existing, error: e0 } = await supabase.from('coupons').select('code').eq('code', current).limit(1);
    if (e0) return res.status(500).json({ success: false, message: 'Error consultando cupón', error: e0.message });
    if ((existing || []).length === 0) return res.status(404).json({ success: false, message: 'Código no encontrado' });
    const { error } = await supabase.from('coupons').delete().eq('code', current);
    if (error) return res.status(500).json({ success: false, message: 'Error eliminando cupón', error: error.message });
    return res.json({ success: true, message: 'Código eliminado' });
  }
  const idx = runtimeCoupons.findIndex(c => c.code === current);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Código no encontrado' });
  runtimeCoupons.splice(idx, 1);
  return res.json({ success: true, message: 'Código eliminado' });
}));

// Seed example coupons into Supabase/Postgres
router.post('/seed-examples', apiRateLimit, requirePermission('sales','create'), asyncHandler(async (_req, res) => {
  const examples = [
    { code: 'DESC10', type: 'PERCENTAGE', value: 10, start_date: '2025-01-01', end_date: '2026-01-01', is_active: true, usage_limit: 5 },
    { code: 'FIJO50000', type: 'FIXED_AMOUNT', value: 50000, start_date: '2025-01-01', end_date: '2026-12-31', is_active: true, usage_limit: 3 },
    { code: 'NAVIDAD', type: 'PERCENTAGE', value: 20, start_date: '2025-12-01', end_date: '2025-12-31', is_active: true, usage_limit: 1 },
  ];

  if (supabase) {
    const payload = examples.map(e => ({
      code: e.code,
      type: e.type,
      value: e.value,
      start_date: new Date(e.start_date).toISOString(),
      end_date: new Date(e.end_date).toISOString(),
      is_active: e.is_active,
      usage_limit: e.usage_limit,
      created_at: new Date().toISOString()
    }));
    const { data, error } = await supabase.from('coupons').insert(payload).select('*');
    if (error) {
      return res.status(500).json({ success: false, message: 'Error al insertar cupones en Supabase', error: error.message });
    }
    return res.json({ success: true, message: 'Ejemplos de cupones guardados', count: (data || []).length, data });
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('PERCENTAGE','FIXED_AMOUNT')),
        value NUMERIC NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        usage_limit INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    for (const e of examples) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO coupons (code, type, value, start_date, end_date, is_active, usage_limit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE SET
           type = EXCLUDED.type,
           value = EXCLUDED.value,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           is_active = EXCLUDED.is_active,
           usage_limit = EXCLUDED.usage_limit`,
        e.code,
        e.type,
        e.value,
        new Date(e.start_date).toISOString(),
        new Date(e.end_date).toISOString(),
        e.is_active,
        e.usage_limit ?? null
      );
    }

    const rows: any = await prisma.$queryRawUnsafe(`SELECT code, type, value, start_date, end_date, is_active, usage_limit FROM coupons ORDER BY code ASC`);
    return res.json({ success: true, message: 'Ejemplos de cupones guardados (fallback Prisma)', count: (rows || []).length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error al insertar cupones con Prisma', error: err?.message || 'Error desconocido' });
  }
}));

// Helper to find coupon by code (case-insensitive)
function findCouponByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  return mockCoupons.find(c => c.code.toUpperCase() === normalized) || null;
}

// POST /validate - validate a coupon against subtotal and rules
router.post(
  '/validate',
  apiRateLimit,
  requirePermission('sales', 'create'),
  asyncHandler(async (req, res) => {
    const parsed = validateCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de cupón inválidos',
        errors: parsed.error.flatten()
      });
    }

    const { code, subtotal } = parsed.data;

    const coupon = findCouponByCode(code);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Cupón no encontrado o inválido'
      });
    }

    // Check date validity
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Este cupón aún no está activo'
      });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Este cupón ha expirado'
      });
    }

    // Check minimum purchase
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Compra mínima requerida: ${coupon.minPurchase}`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' = coupon.type;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = Math.floor((subtotal * coupon.value) / 100);
    } else {
      discountAmount = Math.floor(coupon.value);
    }

    // Cap discount
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }

    // Ensure discount does not exceed subtotal
    discountAmount = Math.min(discountAmount, Math.floor(subtotal));

    return res.json({
      success: true,
      data: {
        code: coupon.code,
        discountAmount,
        discountType,
        message: 'Cupón aplicado correctamente'
      }
    });
  })
);

export default router;