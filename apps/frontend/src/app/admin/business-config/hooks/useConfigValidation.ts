'use client';

import { useState, useCallback } from 'react';
import { BusinessConfig } from '@/types/business-config';

interface ValidationError {
  field: string;
  message: string;
}

export function useConfigValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateBusinessInfo = useCallback((config: Partial<BusinessConfig>) => {
    const newErrors: ValidationError[] = [];

    if (!config.businessName?.trim()) {
      newErrors.push({ field: 'businessName', message: 'El nombre del negocio es requerido' });
    }

    if (!config.heroTitle?.trim()) {
      newErrors.push({ field: 'heroTitle', message: 'El título principal es requerido' });
    }

    return newErrors;
  }, []);

  const validateLegalInfo = useCallback((config: Partial<BusinessConfig>) => {
    const newErrors: ValidationError[] = [];

    if (config.legalInfo?.ruc && !/^\d{8}-\d$/.test(config.legalInfo.ruc)) {
      newErrors.push({ field: 'legalInfo.ruc', message: 'El RUC debe tener el formato 12345678-9' });
    }

    if (!config.legalInfo?.businessType?.trim()) {
      newErrors.push({ field: 'legalInfo.businessType', message: 'El tipo de empresa es requerido' });
    }

    return newErrors;
  }, []);

  const validateContact = useCallback((config: Partial<BusinessConfig>) => {
    const newErrors: ValidationError[] = [];

    if (!config.contact?.phone?.trim()) {
      newErrors.push({ field: 'contact.phone', message: 'El teléfono es requerido' });
    }

    if (!config.contact?.email?.trim()) {
      newErrors.push({ field: 'contact.email', message: 'El email es requerido' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contact.email)) {
      newErrors.push({ field: 'contact.email', message: 'El email no tiene un formato válido' });
    }

    return newErrors;
  }, []);

  const validateAddress = useCallback((config: Partial<BusinessConfig>) => {
    const newErrors: ValidationError[] = [];

    if (!config.address?.street?.trim()) {
      newErrors.push({ field: 'address.street', message: 'La dirección es requerida' });
    }

    if (!config.address?.city?.trim()) {
      newErrors.push({ field: 'address.city', message: 'La ciudad es requerida' });
    }

    if (!config.address?.department?.trim()) {
      newErrors.push({ field: 'address.department', message: 'El departamento es requerido' });
    }

    return newErrors;
  }, []);

  const validateBranding = useCallback((config: Partial<BusinessConfig>) => {
    const newErrors: ValidationError[] = [];

    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (!config.branding?.primaryColor || !colorRegex.test(config.branding.primaryColor)) {
      newErrors.push({ field: 'branding.primaryColor', message: 'El color primario debe ser un color hexadecimal válido' });
    }

    if (!config.branding?.secondaryColor || !colorRegex.test(config.branding.secondaryColor)) {
      newErrors.push({ field: 'branding.secondaryColor', message: 'El color secundario debe ser un color hexadecimal válido' });
    }

    return newErrors;
  }, []);

  const validateStoreSettings = useCallback((config: Partial<BusinessConfig>) => {
    const newErrors: ValidationError[] = [];

    if (!config.storeSettings?.currency?.trim()) {
      newErrors.push({ field: 'storeSettings.currency', message: 'La moneda es requerida' });
    }

    if (config.storeSettings?.taxRate !== undefined && (config.storeSettings.taxRate < 0 || config.storeSettings.taxRate > 1)) {
      newErrors.push({ field: 'storeSettings.taxRate', message: 'La tasa de impuesto debe estar entre 0 y 1' });
    }

    return newErrors;
  }, []);

  const validateAll = useCallback((config: Partial<BusinessConfig>) => {
    const allErrors = [
      ...validateBusinessInfo(config),
      ...validateLegalInfo(config),
      ...validateContact(config),
      ...validateAddress(config),
      ...validateBranding(config),
      ...validateStoreSettings(config),
    ];

    setErrors(allErrors);
    return allErrors;
  }, [validateBusinessInfo, validateLegalInfo, validateContact, validateAddress, validateBranding, validateStoreSettings]);

  const getFieldError = useCallback((field: string) => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  const hasErrors = errors.length > 0;

  return {
    errors,
    validateAll,
    validateBusinessInfo,
    validateLegalInfo,
    validateContact,
    validateAddress,
    validateBranding,
    validateStoreSettings,
    getFieldError,
    hasErrors,
  };
}