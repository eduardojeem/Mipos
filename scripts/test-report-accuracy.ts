import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

type DailyAgg = { day: string; orders: number; gross_total: number; net_total?: number };

async function getRawDailySales(start: string, end: string): Promise<DailyAgg[]> {
  const { data, error } = await supabase.rpc('get_raw_daily_sales', { p_start: start, p_end: end });
  if (error) throw error;
  return data as DailyAgg[];
}

async function getCachedDailySales(start: string, end: string): Promise<DailyAgg[]> {
  // Prefer view mv_daily_sales; fallback to cache table if present
  const { data, error } = await supabase.rpc('get_daily_sales_secure', { p_start: start, p_end: end });
  if (error) throw error;
  return data as DailyAgg[];
}

function toMap(rows: DailyAgg[]): Record<string, DailyAgg> {
  return rows.reduce((acc, r) => {
    acc[r.day] = r;
    return acc;
  }, {} as Record<string, DailyAgg>);
}

function round2(n: number | null | undefined): number {
  return Math.round((n ?? 0) * 100) / 100;
}

async function testDailySalesAccuracy() {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = new Date().toISOString().slice(0, 10);

  console.log('🧪 Testing daily sales accuracy for range', startStr, 'to', endStr);

  const raw = await getRawDailySales(startStr, endStr);
  const cached = await getCachedDailySales(startStr, endStr);

  const rawMap = toMap(raw);
  const cachedMap = toMap(cached);

  let passDays = 0;
  let failDays = 0;

  const days = new Set([...Object.keys(rawMap), ...Object.keys(cachedMap)]);
  for (const day of days) {
    const r = rawMap[day];
    const c = cachedMap[day];
    if (!r || !c) {
      console.log(`⚠️ Missing day ${day} in ${!r ? 'raw' : 'cached'} results`);
      failDays++;
      continue;
    }
    const ordersMatch = r.orders === c.orders;
    const grossMatch = round2(r.gross_total) === round2(c.gross_total);
    const netMatch = round2(r.net_total ?? 0) === round2(c.net_total ?? 0);
    if (ordersMatch && grossMatch && netMatch) {
      passDays++;
    } else {
      console.log(`❌ Mismatch ${day}: orders raw=${r.orders} cached=${c.orders} | gross raw=${r.gross_total} cached=${c.gross_total} | net raw=${r.net_total} cached=${c.net_total}`);
      failDays++;
    }
  }

  console.log(`\n✅ Passed days: ${passDays} | ❌ Failed days: ${failDays}`);
  if (failDays === 0) {
    console.log('🟢 Report accuracy OK');
  } else {
    console.log('🔴 Report accuracy issues detected');
    process.exitCode = 1;
  }
}

// Fallback RPC setup guidance
// Define these RPCs if not existing:
// CREATE OR REPLACE FUNCTION get_raw_daily_sales(p_start date, p_end date)
// RETURNS TABLE(day date, orders bigint, gross_total numeric, net_total numeric) AS $$
//   SELECT date_trunc('day', s.created_at)::date AS day,
//          count(*) AS orders,
//          sum(s.total) AS gross_total,
//          sum(s.net_total) AS net_total
//   FROM sales s
//   WHERE s.created_at::date BETWEEN p_start AND p_end
//   GROUP BY 1
//   ORDER BY 1;
// $$ LANGUAGE sql;

testDailySalesAccuracy().catch((e) => {
  console.error('Test failed', e);
  process.exitCode = 1;
});