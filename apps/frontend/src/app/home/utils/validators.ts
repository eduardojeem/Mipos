/**
 * Validation utilities for home page data
 * Ensures data integrity and provides safe fallbacks
 */

/**
 * Validates and returns a number, or fallback if invalid
 * Handles NaN, undefined, null, and non-numeric values
 * 
 * @param value - Value to validate
 * @param fallback - Fallback value if validation fails
 * @returns Valid number or fallback
 */
export function validateNumber(value: any, fallback: number): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  // Handle objects that can't be converted to numbers
  try {
    const num = Number(value);
    
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return fallback;
    }
    
    return num;
  } catch {
    return fallback;
  }
}

/**
 * Validates and returns an array, or empty array if invalid
 * 
 * @param value - Value to validate
 * @returns Valid array or empty array
 */
export function validateArray<T>(value: any): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  
  return value;
}

/**
 * Validates and returns a string, or fallback if invalid
 * Trims whitespace and returns fallback for empty strings
 * 
 * @param value - Value to validate
 * @param fallback - Fallback value if validation fails
 * @returns Valid string or fallback
 */
export function validateString(value: any, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  const str = String(value).trim();
  
  if (str.length === 0) {
    return fallback;
  }
  
  return str;
}

/**
 * Validates image URL and provides fallback placeholder
 * Checks for valid string and non-empty URL
 * 
 * @param url - URL to validate
 * @param fallback - Optional fallback URL (defaults to placeholder)
 * @returns Valid URL or fallback
 */
export function validateImageUrl(
  url: any,
  fallback: string = '/api/placeholder/300/300'
): string {
  if (url === null || url === undefined) {
    return fallback;
  }
  
  const urlStr = String(url).trim();
  
  if (urlStr.length === 0) {
    return fallback;
  }
  
  // Basic URL validation - starts with http/https or /
  if (!urlStr.startsWith('http') && !urlStr.startsWith('/')) {
    return fallback;
  }
  
  return urlStr;
}
