import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha según el timezone de la organización
 * Por defecto usa 'America/Argentina/Buenos_Aires' si no se especifica
 */
export function formatDateForOrganization(
  date: Date | string,
  organizationTimezone?: string,
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const tz = organizationTimezone || 'America/Argentina/Buenos_Aires';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return formatInTimeZone(dateObj, tz, formatString, { locale: es });
  } catch (error) {
    // Fallback a formato UTC si hay error con timezone
    console.error(`Error formateando fecha con timezone ${tz}:`, error);
    return format(dateObj, formatString, { locale: es });
  }
}

/**
 * Formatea fecha para CSV (sin horas, solo fecha)
 */
export function formatDateForCSV(
  date: Date | string,
  organizationTimezone?: string
): string {
  return formatDateForOrganization(date, organizationTimezone, 'yyyy-MM-dd');
}

/**
 * Formatea fecha y hora completa para CSV
 */
export function formatDateTimeForCSV(
  date: Date | string,
  organizationTimezone?: string
): string {
  return formatDateForOrganization(date, organizationTimezone, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Timezones comunes en LATAM
 */
export const COMMON_TIMEZONES = {
  'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Mexico_City': 'México',
  'America/Bogota': 'Colombia',
  'America/Lima': 'Perú',
  'America/Santiago': 'Chile',
  'America/Sao_Paulo': 'Brasil',
  'America/Caracas': 'Venezuela',
  'America/Panama': 'Panamá',
} as const;
