/**
 * Business Config Validation Rules
 * Centralized validation patterns and functions used by both client and server
 */

// Regex patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  HTTPS_URL: /^https:\/\/.+/i,
  IMAGE_URL: /^https?:\/\/.+\.(png|jpg|jpeg|svg|ico|webp)(\?.*)?$/i,
  PDF_URL: /^https?:\/\/.+\.(pdf)(\?.*)?$/i,
  FAVICON_URL: /^https?:\/\/.+\.(ico|png)(\?.*)?$/i,
  MAP_URL: /^https?:\/\//i,
  PHONE_DIGITS: /\D/g,
  RUC_DIGITS: /\D/g,
} as const;

// Validation constraints
export const VALIDATION_CONSTRAINTS = {
  MIN_PHONE_DIGITS: 6,
  MIN_RUC_DIGITS: 6,
  MIN_BUSINESS_NAME: 2,
  CAROUSEL_RATIO_MIN: 0.5,
  CAROUSEL_RATIO_MAX: 5,
  CAROUSEL_TRANSITION_MIN: 3,
  CAROUSEL_TRANSITION_MAX: 10,
  CAROUSEL_TRANSITION_MS_MIN: 0,
  CAROUSEL_TRANSITION_MS_MAX: 5000,
  CAROUSEL_MAX_IMAGES: 10,
  OFFERS_CAROUSEL_INTERVAL_MIN: 3,
  OFFERS_CAROUSEL_INTERVAL_MAX: 10,
  TAX_RATE_MIN: 0,
  TAX_RATE_MAX: 1,
  DISCOUNT_PERCENTAGE_MIN: 0,
  DISCOUNT_PERCENTAGE_MAX: 100,
} as const;

export function isValidEmail(email: string): boolean {
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

export function isValidHexColor(color: string): boolean {
  return VALIDATION_PATTERNS.HEX_COLOR.test(color);
}

export function isValidImageUrl(url: string): boolean {
  return VALIDATION_PATTERNS.IMAGE_URL.test(url);
}

export function isValidPdfUrl(url: string): boolean {
  return VALIDATION_PATTERNS.PDF_URL.test(url);
}

export function isValidFaviconUrl(url: string): boolean {
  return VALIDATION_PATTERNS.FAVICON_URL.test(url);
}

export function isValidMapUrl(url: string): boolean {
  return url ? VALIDATION_PATTERNS.MAP_URL.test(url) : true;
}

export function isValidSocialMediaUrl(url: string): boolean {
  if (!url) return true;
  return VALIDATION_PATTERNS.HTTPS_URL.test(url);
}

export function isValidPhoneFormat(phone: string): boolean {
  const digits = phone.replace(VALIDATION_PATTERNS.PHONE_DIGITS, '');
  return digits.length >= VALIDATION_CONSTRAINTS.MIN_PHONE_DIGITS;
}

export function isValidRucFormat(ruc: string): boolean {
  const digits = ruc.replace(VALIDATION_PATTERNS.RUC_DIGITS, '');
  return digits.length >= VALIDATION_CONSTRAINTS.MIN_RUC_DIGITS;
}

export function isValidCarouselRatio(ratio: number): boolean {
  return (
    Number.isFinite(ratio) &&
    ratio > VALIDATION_CONSTRAINTS.CAROUSEL_RATIO_MIN &&
    ratio <= VALIDATION_CONSTRAINTS.CAROUSEL_RATIO_MAX
  );
}

export function isValidTaxRate(rate: number): boolean {
  return (
    typeof rate === 'number' &&
    rate >= VALIDATION_CONSTRAINTS.TAX_RATE_MIN &&
    rate <= VALIDATION_CONSTRAINTS.TAX_RATE_MAX
  );
}

export function isValidDiscountPercentage(percentage: number): boolean {
  return (
    typeof percentage === 'number' &&
    percentage >= VALIDATION_CONSTRAINTS.DISCOUNT_PERCENTAGE_MIN &&
    percentage <= VALIDATION_CONSTRAINTS.DISCOUNT_PERCENTAGE_MAX
  );
}
