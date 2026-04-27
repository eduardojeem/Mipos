export type CarouselPayload = {
  success: boolean;
  ids: string[];
};

type CachedEntry = {
  expiresAt: number;
  payload: CarouselPayload;
};

export const carouselCache = new Map<string, CachedEntry>();

export function getCarouselCacheKey(organizationId: string): string {
  return `carousel:${organizationId}`;
}
