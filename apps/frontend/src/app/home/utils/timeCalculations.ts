/**
 * Time and date calculation utilities for home page
 * Handles date formatting, time remaining calculations, and expiration checks
 */

/**
 * Calculates time remaining until a date
 * Returns human-readable string or null if no date provided
 * 
 * @param endDate - ISO date string or date string
 * @returns Human-readable time remaining or null
 */
export function getTimeRemaining(endDate?: string): string | null {
  if (!endDate) {
    return null;
  }
  
  try {
    const end = new Date(endDate);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(end.getTime())) {
      return null;
    }
    
    const diff = end.getTime() - now.getTime();
    
    // Already expired
    if (diff <= 0) {
      return 'Finalizada';
    }
    
    // Calculate days
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) {
      return `${days} ${days === 1 ? 'día' : 'días'} restante${days === 1 ? '' : 's'}`;
    }
    
    // Calculate hours
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} restante${hours === 1 ? '' : 's'}`;
    }
    
    // Calculate minutes
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} restante${minutes === 1 ? '' : 's'}`;
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return null;
  }
}

/**
 * Formats a date string for display
 * 
 * @param date - ISO date string
 * @param locale - Locale for formatting (default: 'es-PY')
 * @returns Formatted date string
 */
export function formatDate(date: string, locale: string = 'es-PY'): string {
  try {
    const d = new Date(date);
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return date; // Return original if invalid
    }
    
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date;
  }
}

/**
 * Checks if a date is in the past (expired)
 * 
 * @param date - ISO date string
 * @returns True if date is in the past, false otherwise
 */
export function isExpired(date: string): boolean {
  try {
    const d = new Date(date);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return false; // Treat invalid dates as not expired
    }
    
    return d.getTime() < now.getTime();
  } catch (error) {
    console.error('Error checking expiration:', error);
    return false;
  }
}

/**
 * Parses a date string safely
 * Returns null if date is invalid
 * 
 * @param date - Date string to parse
 * @returns Date object or null
 */
export function parseDate(date: string): Date | null {
  try {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
      return null;
    }
    
    return d;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}
