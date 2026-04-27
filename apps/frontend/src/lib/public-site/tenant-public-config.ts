import type { BusinessConfig } from '@/types/business-config';
import { defaultBusinessConfig } from '@/types/business-config';

export type TenantPublicSections = NonNullable<BusinessConfig['publicSite']>['sections'];
export type TenantPublicContent = NonNullable<BusinessConfig['publicSite']>['content'];

export function getTenantPublicSections(
  config?: Partial<BusinessConfig> | null
): TenantPublicSections {
  return {
    ...defaultBusinessConfig.publicSite!.sections,
    ...(config?.publicSite?.sections || {}),
  };
}

export function getTenantPublicContent(
  config?: Partial<BusinessConfig> | null
): TenantPublicContent {
  return {
    ...defaultBusinessConfig.publicSite!.content,
    ...(config?.publicSite?.content || {}),
  };
}

export function getTenantHeroImage(config?: Partial<BusinessConfig> | null): string {
  const content = getTenantPublicContent(config);
  if (content.heroImageUrl && content.heroImageUrl.trim().length > 0) {
    return content.heroImageUrl;
  }

  const carouselImage =
    Array.isArray(config?.carousel?.images) && config?.carousel?.images[0]?.url
      ? config.carousel.images[0].url
      : '';

  if (carouselImage) {
    return carouselImage;
  }

  return config?.branding?.logo || '/api/placeholder/960/960';
}

export function getTenantAnnouncement(config?: Partial<BusinessConfig> | null): string {
  return getTenantPublicContent(config).announcementText?.trim() || '';
}

export function buildWhatsAppHref(
  config?: Partial<BusinessConfig> | null,
  message?: string
): string | null {
  const raw = String(config?.contact?.whatsapp || config?.contact?.phone || '').replace(/\D/g, '');
  if (!raw) return null;

  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${raw}${suffix}`;
}

export function hasTenantContactInfo(config?: Partial<BusinessConfig> | null): boolean {
  return Boolean(
    config?.contact?.phone ||
      config?.contact?.email ||
      config?.contact?.whatsapp ||
      config?.address?.street
  );
}
