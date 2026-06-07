import type { GlobalProductCard } from '@/lib/public-site/data';

export function formatMarketplaceCurrency(value: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function normalizeMarketplaceHref(href: string): string {
  return String(href || '')
    .replace(/^https?:\/\/localhost(?=\/)/i, '')
    .replace(/^https?:\/\/127\.0\.0\.1(?=\/)/i, '');
}

export function buildProductDetailHref(product: GlobalProductCard): string {
  const raw = normalizeMarketplaceHref(String(product.organizationHref || ''));
  const baseUrl = raw.replace(/\/home\/?$/, '');
  // Si no hay href de organización válido, linkeamos al catálogo global
  if (!baseUrl || baseUrl === '/') {
    return `/home/catalogo`;
  }
  return `${baseUrl}/catalog/${encodeURIComponent(product.id)}`;
}
