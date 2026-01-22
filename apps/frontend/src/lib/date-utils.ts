/**
 * Date formatting utilities
 * Provides consistent date formatting across the application
 */

/**
 * Format a date to locale date string
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
    date: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleDateString('es-PY', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options,
    });
}

/**
 * Format a date to locale date and time string
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export function formatDateTime(
    date: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleString('es-PY', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
}

/**
 * Format a date to locale time string
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatTime(
    date: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleTimeString('es-PY', {
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
}

/**
 * Format a date to relative time string (e.g., "hace 2 horas")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} d`;

    return formatDate(dateObj);
}
