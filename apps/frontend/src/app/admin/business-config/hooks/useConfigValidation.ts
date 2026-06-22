'use client';

import { useState, useCallback, useMemo } from 'react';
import { BusinessConfig } from '@/types/business-config';
import {
  VALIDATION_CONSTRAINTS,
  isValidEmail,
  isValidHexColor,
  isValidPhoneFormat,
  isValidRucFormat,
  isValidTaxRate,
  isValidDiscountPercentage,
} from '@/lib/validation/business-config-rules';

export interface ValidationError {
  field: string;
  message: string;
  tab: string;
  required: boolean;
}

const TAB_MAP: Record<string, string> = {
  businessName: 'content',
  heroTitle: 'content',
  heroDescription: 'content',
  heroHighlight: 'content',
  'contact.phone': 'contact',
  'contact.email': 'contact',
  'contact.whatsapp': 'contact',
  'address.street': 'contact',
  'address.city': 'contact',
  'address.department': 'contact',
  'legalInfo.businessType': 'contact',
  'legalInfo.ruc': 'contact',
  'branding.primaryColor': 'brand',
  'branding.secondaryColor': 'brand',
  'branding.logo': 'brand',
  'storeSettings.currency': 'commerce',
  'storeSettings.currencySymbol': 'commerce',
  'storeSettings.taxRate': 'commerce',
};

export function useConfigValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateAll = useCallback((config: Partial<BusinessConfig>): ValidationError[] => {
    const allErrors: ValidationError[] = [];

    // ── Contenido (requeridos) ──
    if (!config.businessName?.trim()) {
      allErrors.push({ field: 'businessName', message: 'Nombre del negocio es obligatorio', tab: 'content', required: true });
    }
    if (!config.heroTitle?.trim()) {
      allErrors.push({ field: 'heroTitle', message: 'Título principal es obligatorio', tab: 'content', required: true });
    }
    if (!config.heroDescription?.trim()) {
      allErrors.push({ field: 'heroDescription', message: 'Descripción comercial es obligatoria', tab: 'content', required: true });
    }

    // ── Contacto (requeridos) ──
    if (!config.contact?.phone?.trim()) {
      allErrors.push({ field: 'contact.phone', message: 'Teléfono público es obligatorio', tab: 'contact', required: true });
    } else if (!isValidPhoneFormat(config.contact.phone)) {
      allErrors.push({ field: 'contact.phone', message: `Teléfono debe tener al menos ${VALIDATION_CONSTRAINTS.MIN_PHONE_DIGITS} dígitos`, tab: 'contact', required: true });
    }

    // ── Contacto (opcionales con formato) ──
    if (config.contact?.email?.trim() && !isValidEmail(config.contact.email)) {
      allErrors.push({ field: 'contact.email', message: 'Email no tiene formato válido', tab: 'contact', required: false });
    }

    // ── Dirección (requeridos para publicación) ──
    if (!config.address?.city?.trim()) {
      allErrors.push({ field: 'address.city', message: 'Ciudad es obligatoria', tab: 'contact', required: true });
    }

    // ── Legal (opcionales con formato) ──
    if (config.legalInfo?.ruc && !isValidRucFormat(config.legalInfo.ruc)) {
      allErrors.push({ field: 'legalInfo.ruc', message: `RUC debe tener al menos ${VALIDATION_CONSTRAINTS.MIN_RUC_DIGITS} dígitos`, tab: 'contact', required: false });
    }

    // ── Branding (requeridos) ──
    if (config.branding?.primaryColor && !isValidHexColor(config.branding.primaryColor)) {
      allErrors.push({ field: 'branding.primaryColor', message: 'Color primario debe ser hexadecimal (#RRGGBB)', tab: 'brand', required: true });
    }
    if (config.branding?.secondaryColor && !isValidHexColor(config.branding.secondaryColor)) {
      allErrors.push({ field: 'branding.secondaryColor', message: 'Color secundario debe ser hexadecimal (#RRGGBB)', tab: 'brand', required: true });
    }

    // ── Comercio (requeridos) ──
    if (!config.storeSettings?.currency?.trim()) {
      allErrors.push({ field: 'storeSettings.currency', message: 'Código de moneda es obligatorio (ej: PYG, COP)', tab: 'commerce', required: true });
    }
    if (!config.storeSettings?.currencySymbol?.trim()) {
      allErrors.push({ field: 'storeSettings.currencySymbol', message: 'Símbolo de moneda es obligatorio (ej: Gs., $)', tab: 'commerce', required: true });
    }
    if (config.storeSettings?.taxRate !== undefined && !isValidTaxRate(config.storeSettings.taxRate)) {
      allErrors.push({ field: 'storeSettings.taxRate', message: 'IVA debe estar entre 0 y 1 (ej: 0.10 para 10%)', tab: 'commerce', required: true });
    }
    if (config.storeSettings?.maxDiscountPercentage !== undefined && !isValidDiscountPercentage(config.storeSettings.maxDiscountPercentage)) {
      allErrors.push({ field: 'storeSettings.maxDiscountPercentage', message: 'Descuento máximo debe estar entre 0 y 100%', tab: 'commerce', required: false });
    }

    setErrors(allErrors);
    return allErrors;
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  }, [errors]);

  const getTabErrors = useCallback((tab: string): ValidationError[] => {
    return errors.filter((e) => e.tab === tab);
  }, [errors]);

  const getTabErrorCount = useCallback((tab: string): number => {
    return errors.filter((e) => e.tab === tab).length;
  }, [errors]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const hasErrors = errors.length > 0;
  const requiredErrors = useMemo(() => errors.filter((e) => e.required), [errors]);
  const optionalErrors = useMemo(() => errors.filter((e) => !e.required), [errors]);

  return {
    errors,
    requiredErrors,
    optionalErrors,
    validateAll,
    getFieldError,
    getTabErrors,
    getTabErrorCount,
    clearErrors,
    hasErrors,
  };
}
