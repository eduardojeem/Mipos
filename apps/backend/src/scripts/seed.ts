import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || (!service && !anon)) return null;
  return createClient(url, service || anon!);
}

async function getPrisma(): Promise<null> { return null; }

async function seedCoupons(supabase: SupabaseClient | null, prisma: null) {
  const examples = [
    { code: 'DESC10', type: 'PERCENTAGE', value: 10, start_date: '2025-01-01', end_date: '2026-01-01', is_active: true, usage_limit: 5 },
    { code: 'FIJO50000', type: 'FIXED_AMOUNT', value: 50000, start_date: '2025-01-01', end_date: '2026-12-31', is_active: true, usage_limit: 3 },
    { code: 'NAVIDAD', type: 'PERCENTAGE', value: 20, start_date: '2025-12-01', end_date: '2025-12-31', is_active: true, usage_limit: 1 }
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
    const { data, error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' }).select('*');
    if (!error) return { count: (data || []).length, data };
    throw new Error('Error al insertar en Supabase: ' + error.message + '. Asegúrate de crear la tabla "coupons" y de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY configurados.');
  }

  throw new Error('Supabase no está configurado. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
}

async function seedPromotions(supabase: SupabaseClient | null, prisma: null) {
  const examples = [
    { id: randomUUID(), name: 'Verano 15%', type: 'PERCENTAGE', value: 15, stacking: true, min_purchase: 0, max_discount: null, is_active: true, start_date: '2025-06-01', end_date: '2025-08-31' },
    { id: randomUUID(), name: 'Black Friday $30000', type: 'FIXED_AMOUNT', value: 30000, stacking: false, min_purchase: 100000, max_discount: 30000, is_active: true, start_date: '2025-11-25', end_date: '2025-11-30' },
    { id: randomUUID(), name: 'Navidad 20%', type: 'PERCENTAGE', value: 20, stacking: false, min_purchase: 150000, max_discount: 200000, is_active: true, start_date: '2025-12-01', end_date: '2025-12-31' },
    { id: randomUUID(), name: 'Año Nuevo $50000', type: 'FIXED_AMOUNT', value: 50000, stacking: true, min_purchase: 200000, max_discount: 50000, is_active: true, start_date: '2026-01-01', end_date: '2026-01-10' }
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
    const { data, error } = await supabase.from('promotions').upsert(payload, { onConflict: 'id' }).select('*');
    if (!error) return { count: (data || []).length, data };
    throw new Error('Error al insertar en Supabase: ' + error.message + '. Asegúrate de crear la tabla "promotions" y de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY configurados.');
  }

  throw new Error('Supabase no está configurado. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
}

async function main() {
  const supabase = getSupabase();
  const prisma = await getPrisma();
  const c = await seedCoupons(supabase, prisma);
  const p = await seedPromotions(supabase, prisma);
  try {
    if (supabase) {
      const promos = (p.data || []) as any[];
      const byName = new Map<string, string>();
      promos.forEach(r => { if (r?.name && r?.id) byName.set(String(r.name), String(r.id)); });
      const sampleLinks = [
        { promotion: 'Verano 15%', products: ['p1','p2','p3'] },
        { promotion: 'Black Friday $30000', products: ['p4','p5'] }
      ];
      const rows: any[] = [];
      sampleLinks.forEach(({ promotion, products }) => {
        const pid = byName.get(promotion);
        if (pid) products.forEach(pr => rows.push({ promotion_id: pid, product_id: pr }));
      });
      if (rows.length > 0) {
        await supabase.from('promotions_products').insert(rows);
      }
    }
  } catch {}
  console.log(JSON.stringify({ coupons: c.count, promotions: p.count }));
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});