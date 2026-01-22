import type { DiscountType } from './calculations';

export type DiscountEntry = { type: DiscountType; value: number };

export function composeDiscounts(subtotalWithIva: number, entries: DiscountEntry[]): number {
  let remaining = Math.max(0, Number(subtotalWithIva) || 0);
  let total = 0;
  for (const e of entries) {
    const val = Math.max(0, Number(e.value) || 0);
    if (e.type === 'PERCENTAGE') {
      const pct = Math.min(val, 100);
      const d = (remaining * pct) / 100;
      total += d;
      remaining = Math.max(0, remaining - d);
    } else {
      const amt = Math.min(val, remaining);
      total += amt;
      remaining = Math.max(0, remaining - amt);
    }
  }
  return total;
}

export function discountBreakdown(subtotalWithIva: number, entries: DiscountEntry[]): number[] {
  let remaining = Math.max(0, Number(subtotalWithIva) || 0);
  const out: number[] = [];
  for (const e of entries) {
    const val = Math.max(0, Number(e.value) || 0);
    if (e.type === 'PERCENTAGE') {
      const pct = Math.min(val, 100);
      const d = (remaining * pct) / 100;
      out.push(d);
      remaining = Math.max(0, remaining - d);
    } else {
      const amt = Math.min(val, remaining);
      out.push(amt);
      remaining = Math.max(0, remaining - amt);
    }
  }
  return out;
}