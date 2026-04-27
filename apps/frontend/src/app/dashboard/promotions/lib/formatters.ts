/**
 * Utilidades de formateo para promociones
 * Centraliza la lógica de formateo para evitar duplicación
 */

import type { Promotion } from '@/types/promotions';

/**
 * Formatea un descuento según su tipo
 */
export function formatDiscount(promotion: Pick<Promotion, 'discountType' | 'discountValue'>): string {
  if (promotion.discountType === 'PERCENTAGE') {
    return `${promotion.discountValue}%`;
  }
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(promotion.discountValue);
}

/**
 * Formatea un monto en moneda
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

/**
 * Formatea una fecha en formato corto
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Formatea una fecha en formato largo
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Obtiene el estado de una promoción
 */
export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export function getPromotionStatus(promotion: Pick<Promotion, 'isActive' | 'startDate' | 'endDate'>): PromotionStatus {
  const now = new Date();
  const start = new Date(promotion.startDate);
  const end = new Date(promotion.endDate);

  if (!promotion.isActive) return 'inactive';
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}

/**
 * Obtiene el texto del estado
 */
export function getStatusText(status: PromotionStatus): string {
  const texts: Record<PromotionStatus, string> = {
    active: 'Activa',
    scheduled: 'Programada',
    expired: 'Expirada',
    inactive: 'Inactiva',
  };
  return texts[status];
}

/**
 * Obtiene la variante del badge según el estado
 */
export function getStatusBadgeVariant(status: PromotionStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<PromotionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    scheduled: 'secondary',
    expired: 'destructive',
    inactive: 'outline',
  };
  return variants[status];
}

/**
 * Calcula el porcentaje de tiempo transcurrido de una promoción
 */
export function getPromotionProgress(promotion: Pick<Promotion, 'startDate' | 'endDate'>): number {
  const now = new Date().getTime();
  const start = new Date(promotion.startDate).getTime();
  const end = new Date(promotion.endDate).getTime();

  if (now < start) return 0;
  if (now > end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

/**
 * Calcula los días restantes de una promoción
 */
export function getDaysRemaining(promotion: Pick<Promotion, 'endDate'>): number {
  const now = new Date().getTime();
  const end = new Date(promotion.endDate).getTime();
  const diff = end - now;
  
  if (diff < 0) return 0;
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Formatea los días restantes en texto
 */
export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Expira hoy';
  if (days === 1) return 'Expira mañana';
  if (days < 7) return `${days} días restantes`;
  if (days < 30) return `${Math.floor(days / 7)} semanas restantes`;
  return `${Math.floor(days / 30)} meses restantes`;
}

/**
 * Valida si una promoción está próxima a expirar (menos de 7 días)
 */
export function isExpiringSoon(promotion: Pick<Promotion, 'endDate'>): boolean {
  return getDaysRemaining(promotion) <= 7 && getDaysRemaining(promotion) > 0;
}

/**
 * Calcula el ahorro total de una promoción
 */
export function calculateSavings(
  originalPrice: number,
  promotion: Pick<Promotion, 'discountType' | 'discountValue' | 'maxDiscountAmount'>
): number {
  let discount = 0;

  if (promotion.discountType === 'PERCENTAGE') {
    discount = originalPrice * (promotion.discountValue / 100);
  } else {
    discount = promotion.discountValue;
  }

  // Aplicar límite máximo si existe
  if (promotion.maxDiscountAmount && discount > promotion.maxDiscountAmount) {
    discount = promotion.maxDiscountAmount;
  }

  return Math.min(discount, originalPrice);
}

/**
 * Calcula el precio final después del descuento
 */
export function calculateFinalPrice(
  originalPrice: number,
  promotion: Pick<Promotion, 'discountType' | 'discountValue' | 'maxDiscountAmount'>
): number {
  const savings = calculateSavings(originalPrice, promotion);
  return Math.max(0, originalPrice - savings);
}

/**
 * Valida si una promoción cumple con el monto mínimo de compra
 */
export function meetsMinimumPurchase(
  subtotal: number,
  promotion: Pick<Promotion, 'minPurchaseAmount'>
): boolean {
  if (!promotion.minPurchaseAmount) return true;
  return subtotal >= promotion.minPurchaseAmount;
}

/**
 * Formatea el mensaje de monto mínimo
 */
export function formatMinimumPurchaseMessage(promotion: Pick<Promotion, 'minPurchaseAmount'>): string | null {
  if (!promotion.minPurchaseAmount) return null;
  return `Compra mínima: ${formatCurrency(promotion.minPurchaseAmount)}`;
}
