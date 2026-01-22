import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { prisma, supabase } from '../index';
import { randomUUID } from 'crypto';

interface EvaluateItem {
  productId?: string;
  price: number;
  quantity: number;
}

type DiscountType = 'PERCENT' | 'FIXED';

interface EvaluatePromotion {
  id?: string;
  type: DiscountType;
  value: number; // percent (0-100) or fixed amount
  stacking?: boolean; // whether this promotion can stack with others
  minPurchase?: number;
  maxDiscount?: number;
  isActive?: boolean;
}

interface EvaluateCoupon {
  code?: string;
  type?: DiscountType;
  value?: number;
  isValid?: boolean;
}

interface EvaluateLoyalty {
  tierId?: string | number;
  discountPercent?: number; // optional loyalty discount percent to apply
}

interface EvaluateRequest {
  items: EvaluateItem[];
  promotions?: EvaluatePromotion[];
  coupon?: EvaluateCoupon;
  loyalty?: EvaluateLoyalty;
  allowCouponStack?: boolean;
}

const router = Router();

router.use(authenticateToken);

function checkValidation(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function applyDiscount(subtotal: number, promo: EvaluatePromotion) {
  const meetsMin = promo.minPurchase == null || subtotal >= promo.minPurchase;
  if (!meetsMin || promo.isActive === false) return 0;
  let amount = 0;
  if (promo.type === 'PERCENT') {
    amount = subtotal * (promo.value / 100);
  } else {
    amount = promo.value;
  }
  if (promo.maxDiscount != null) {
    amount = Math.min(amount, promo.maxDiscount);
  }
  return round2(Math.max(0, amount));
}

router.post('/evaluate',
  [
    body('items').isArray({ min: 1 }).withMessage('items es requerido'),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      items,
      promotions = [],
      coupon,
      loyalty,
      allowCouponStack = true,
    } = req.body as EvaluateRequest;

    const subtotal = round2(items.reduce((sum, it) => sum + (it.price * it.quantity), 0));
    const discounts: Array<{ source: string; id?: string; amount: number }> = [];

    // Promotions: if any promotion has stacking=false, apply only the best single promotion
    const anyNonStack = promotions.some(p => p.stacking === false);
    if (anyNonStack) {
      let best: { promo?: EvaluatePromotion; amount: number } = { amount: 0 };
      for (const p of promotions) {
        const amt = applyDiscount(subtotal, p);
        if (amt > best.amount) best = { promo: p, amount: amt };
      }
      if (best.promo && best.amount > 0) {
        discounts.push({ source: 'promotion', id: best.promo.id, amount: best.amount });
      }
    } else {
      // Stack all promotions that apply
      for (const p of promotions) {
        const amt = applyDiscount(subtotal, p);
        if (amt > 0) {
          discounts.push({ source: 'promotion', id: p.id, amount: amt });
        }
      }
    }

    // Coupon
    if (coupon && coupon.isValid !== false && coupon.value && coupon.type) {
      const couponAmount = applyDiscount(subtotal, {
        id: coupon.code,
        type: coupon.type,
        value: coupon.value,
        stacking: allowCouponStack,
        isActive: true,
      });
      if (couponAmount > 0) {
        if (!allowCouponStack) {
          // If not stacking allowed, compare with existing discounts and keep the best
          const existingTotal = discounts.reduce((s, d) => s + d.amount, 0);
          if (couponAmount > existingTotal) {
            discounts.splice(0, discounts.length); // remove others
            discounts.push({ source: 'coupon', id: coupon.code, amount: couponAmount });
          }
        } else {
          discounts.push({ source: 'coupon', id: coupon.code, amount: couponAmount });
        }
      }
    }

    // Loyalty
    if (loyalty?.discountPercent && loyalty.discountPercent > 0) {
      const loyaltyAmount = round2(subtotal * (loyalty.discountPercent / 100));
      discounts.push({ source: 'loyalty', id: String(loyalty.tierId ?? ''), amount: loyaltyAmount });
    }

    const totalDiscount = round2(discounts.reduce((s, d) => s + d.amount, 0));
    const total = round2(Math.max(0, subtotal - totalDiscount));

    return res.json({
      success: true,
      data: {
        subtotal,
        discounts,
        totalDiscount,
        total,
      }
    });
  }
);

// Seed example promotions into Supabase/Postgres
router.post('/promotions/seed-examples', async (req: Request, res: Response) => {
  const examples = [
    { id: randomUUID(), name: 'Verano 15%', type: 'PERCENT', value: 15, stacking: true, min_purchase: 0, max_discount: null, is_active: true, start_date: '2025-06-01', end_date: '2025-08-31' },
    { id: randomUUID(), name: 'Black Friday $30000', type: 'FIXED', value: 30000, stacking: false, min_purchase: 100000, max_discount: 30000, is_active: true, start_date: '2025-11-25', end_date: '2025-11-30' },
    { id: randomUUID(), name: 'Navidad 20%', type: 'PERCENT', value: 20, stacking: false, min_purchase: 150000, max_discount: 200000, is_active: true, start_date: '2025-12-01', end_date: '2025-12-31' },
    { id: randomUUID(), name: 'Año Nuevo $50000', type: 'FIXED', value: 50000, stacking: true, min_purchase: 200000, max_discount: 50000, is_active: true, start_date: '2026-01-01', end_date: '2026-01-10' }
  ];

  if (supabase) {
    const payload = examples.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      value: e.value,
      stacking: e.stacking,
      min_purchase: e.min_purchase,
      max_discount: e.max_discount,
      is_active: e.is_active,
      start_date: new Date(e.start_date).toISOString(),
      end_date: new Date(e.end_date).toISOString(),
      created_at: new Date().toISOString()
    }));
    const { data, error } = await supabase.from('promotions').insert(payload).select('*');
    if (error) {
      return res.status(500).json({ success: false, message: 'Error al insertar promociones en Supabase', error: error.message });
    }
    return res.json({ success: true, message: 'Ejemplos de promociones guardados', count: (data || []).length, data });
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('PERCENT','FIXED')),
        value NUMERIC NOT NULL,
        stacking BOOLEAN NOT NULL DEFAULT true,
        min_purchase NUMERIC,
        max_discount NUMERIC,
        is_active BOOLEAN NOT NULL DEFAULT true,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    for (const e of examples) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO promotions (id, name, type, value, stacking, min_purchase, max_discount, is_active, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           value = EXCLUDED.value,
           stacking = EXCLUDED.stacking,
           min_purchase = EXCLUDED.min_purchase,
           max_discount = EXCLUDED.max_discount,
           is_active = EXCLUDED.is_active,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date`,
        e.id,
        e.name,
        e.type,
        e.value,
        e.stacking,
        e.min_purchase,
        e.max_discount,
        e.is_active,
        new Date(e.start_date).toISOString(),
        new Date(e.end_date).toISOString()
      );
    }

    const rows: any = await prisma.$queryRawUnsafe(`SELECT id, name, type, value, stacking, min_purchase, max_discount, is_active, start_date, end_date FROM promotions ORDER BY created_at DESC`);
    return res.json({ success: true, message: 'Ejemplos de promociones guardados (fallback Prisma)', count: (rows || []).length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error al insertar promociones con Prisma', error: err?.message || 'Error desconocido' });
  }
});

export default router;