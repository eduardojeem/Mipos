/**
 * Image URL Validation and Sanitization
 * Protects against XSS attacks through malicious image URLs
 */

const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  // Supabase storage
  'supabase.co',
  'supabase.com',
  // Common CDNs
  'cloudinary.com',
  'amazonaws.com',
  'cloudfront.net',
  // Add your custom domains here
  'beautypos.com',
  'beautypos-cdn.com'
];

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:'];

/**
 * Validates if an image URL is safe to use
 * @param url - The URL to validate
 * @returns true if the URL is valid and safe
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Allow data URLs for base64 images
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      console.warn(`[Security] Invalid protocol in image URL: ${parsed.protocol}`);
      return false;
    }
    
    // For data URLs, no need to check domain
    if (parsed.protocol === 'data:') {
      return true;
    }
    
    // Check if domain is in whitelist
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      parsed.hostname === domain || 
      parsed.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowed) {
      console.warn(`[Security] Domain not in whitelist: ${parsed.hostname}`);
    }
    
    return isAllowed;
  } catch (error) {
    console.warn(`[Security] Invalid URL format: ${url}`);
    return false;
  }
}

/**
 * Sanitizes an image URL, returning a safe fallback if invalid
 * @param url - The URL to sanitize
 * @param fallback - Fallback URL if validation fails
 * @returns Sanitized URL or fallback
 */
export function sanitizeImageUrl(
  url: string | null | undefined, 
  fallback: string = '/placeholder.png'
): string {
  if (!url) return fallback;
  return isValidImageUrl(url) ? url : fallback;
}

/**
 * Validates multiple image URLs
 * @param urls - Array of URLs to validate
 * @returns Array of sanitized URLs
 */
export function sanitizeImageUrls(
  urls: (string | null | undefined)[], 
  fallback: string = '/placeholder.png'
): string[] {
  return urls.map(url => sanitizeImageUrl(url, fallback));
}

/**
 * Adds a new domain to the whitelist (use with caution)
 * @param domain - Domain to add
 */
export function addAllowedDomain(domain: string): void {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
    console.info(`[Security] Added domain to whitelist: ${domain}`);
  }
}

/**
 * Gets the list of allowed domains
 * @returns Array of allowed domains
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}
