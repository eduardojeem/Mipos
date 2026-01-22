/**
 * Utilidades de formateo específicas para Paraguay
 */

import { BusinessConfig } from '@/types/business-config';

/**
 * Formatea una fecha según la configuración regional
 */
export function formatDate(date: Date | string, config: BusinessConfig): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: config.regional.timezone,
  };

  // Configurar formato según la preferencia
  switch (config.regional.dateFormat) {
    case 'dd/MM/yyyy':
      options.day = '2-digit';
      options.month = '2-digit';
      options.year = 'numeric';
      break;
    case 'MM/dd/yyyy':
      options.month = '2-digit';
      options.day = '2-digit';
      options.year = 'numeric';
      break;
    case 'yyyy-MM-dd':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat(config.regional.locale, options).format(dateObj);
}

/**
 * Formatea una hora según la configuración regional
 */
export function formatTime(date: Date | string, config: BusinessConfig): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: config.regional.timezone,
    hour: '2-digit',
    minute: '2-digit',
  };

  // Configurar formato de 12 o 24 horas
  if (config.regional.timeFormat === 'hh:mm a') {
    options.hour12 = true;
  } else {
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat(config.regional.locale, options).format(dateObj);
}

/**
 * Formatea una fecha y hora completa
 */
export function formatDateTime(date: Date | string, config: BusinessConfig): string {
  const formattedDate = formatDate(date, config);
  const formattedTime = formatTime(date, config);
  return `${formattedDate} ${formattedTime}`;
}

/**
 * Formatea un precio según la configuración de moneda
 */
export function formatPrice(amount: number, config: BusinessConfig): string {
  // Determine currency, default to 'PYG' if not set
  const currency = config?.storeSettings?.currency ?? 'PYG';

  // Determine locale safely – fallback to a generic locale if missing
  const locale = config?.regional?.locale ?? 'en-US';

  // Build formatting options
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    // For Guaraní (PYG) we want no decimal places; otherwise use typical 2 decimals
    minimumFractionDigits: currency === 'PYG' ? 0 : 2,
    maximumFractionDigits: currency === 'PYG' ? 0 : 2,
  };

  // If currency is Guaraní, round to nearest integer
  const value = currency === 'PYG' ? Math.round(amount) : amount;

  // Use the safe locale when creating the formatter
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Formatea un número según la configuración regional
 */
export function formatNumber(number: number, config: BusinessConfig): string {
  return new Intl.NumberFormat(config.regional.locale).format(number);
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(value: number, config: BusinessConfig): string {
  const options: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat(config.regional.locale, options).format(value);
}

/**
 * Obtiene la fecha actual en la zona horaria configurada
 */
export function getCurrentDate(config: BusinessConfig): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: config.regional.timezone }));
}

/**
 * Formatea un número de teléfono paraguayo
 */
export function formatPhoneNumber(phone: string): string {
  // Remover todos los caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');

  // Si empieza con 595, es formato internacional
  if (cleaned.startsWith('595')) {
    const national = cleaned.substring(3);
    if (national.length === 9) {
      // Formato: +595 9XX XXX-XXX
      return `+595 ${national.substring(0, 3)} ${national.substring(3, 6)}-${national.substring(6)}`;
    }
  }

  // Si es número nacional (9 dígitos)
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }

  // Si es número fijo (7-8 dígitos)
  if (cleaned.length >= 7 && cleaned.length <= 8) {
    if (cleaned.length === 7) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
    } else {
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
    }
  }

  return phone; // Devolver original si no coincide con ningún formato
}

/**
 * Valida un RUC paraguayo
 */
export function validateRUC(ruc: string): boolean {
  // Remover guiones y espacios
  const cleaned = ruc.replace(/[-\s]/g, '');

  // Debe tener entre 6 y 8 dígitos seguido de un guión y un dígito verificador
  const rucPattern = /^\d{6,8}-?\d$/;

  return rucPattern.test(cleaned);
}

/**
 * Formatea un RUC paraguayo
 */
export function formatRUC(ruc: string): string {
  const cleaned = ruc.replace(/\D/g, '');

  if (cleaned.length >= 7) {
    const main = cleaned.substring(0, cleaned.length - 1);
    const verifier = cleaned.substring(cleaned.length - 1);
    return `${main}-${verifier}`;
  }

  return ruc;
}