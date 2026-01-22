/**
 * Utilidades de validación para promociones
 */

export interface PromotionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount?: number;
  usageLimit?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableProducts?: any[];
  createdAt?: string;
}

/**
 * Valida los datos de una promoción
 */
export const validatePromotion = (promotion: Promotion | null): PromotionValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!promotion) {
    errors.push('Promoción no encontrada');
    return { isValid: false, errors, warnings };
  }
  
  // Validaciones críticas
  if (!promotion.id?.trim()) {
    errors.push('ID de promoción faltante');
  }
  
  if (!promotion.name?.trim()) {
    errors.push('Nombre de promoción faltante');
  } else if (promotion.name.length > 100) {
    warnings.push('El nombre es muy largo (máximo 100 caracteres)');
  }
  
  if (!promotion.description?.trim()) {
    warnings.push('Descripción de promoción faltante');
  } else if (promotion.description.length > 500) {
    warnings.push('La descripción es muy larga (máximo 500 caracteres)');
  }
  
  // Validar tipo y valor de descuento
  if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(promotion.discountType)) {
    errors.push('Tipo de descuento inválido');
  }
  
  if (typeof promotion.discountValue !== 'number' || promotion.discountValue <= 0) {
    errors.push('Valor de descuento inválido');
  } else {
    if (promotion.discountType === 'PERCENTAGE' && promotion.discountValue > 100) {
      errors.push('El porcentaje de descuento no puede ser mayor a 100%');
    }
    if (promotion.discountType === 'FIXED_AMOUNT' && promotion.discountValue > 10000) {
      warnings.push('El descuento fijo es muy alto');
    }
  }
  
  // Validar fechas
  if (!promotion.startDate) {
    errors.push('Fecha de inicio faltante');
  }
  
  if (!promotion.endDate) {
    errors.push('Fecha de fin faltante');
  }
  
  if (promotion.startDate && promotion.endDate) {
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);
    const now = new Date();
    
    if (isNaN(start.getTime())) {
      errors.push('Fecha de inicio inválida');
    }
    
    if (isNaN(end.getTime())) {
      errors.push('Fecha de fin inválida');
    }
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (start >= end) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
      
      if (end < now && promotion.isActive) {
        warnings.push('La promoción está marcada como activa pero ya expiró');
      }
      
      if (start > now && promotion.isActive) {
        warnings.push('La promoción está marcada como activa pero aún no ha comenzado');
      }
    }
  }
  
  // Validar límites de uso
  if (promotion.usageLimit !== undefined) {
    if (typeof promotion.usageLimit !== 'number' || promotion.usageLimit < 0) {
      errors.push('Límite de uso inválido');
    } else if (promotion.usageLimit === 0) {
      warnings.push('El límite de uso es 0, la promoción no podrá ser utilizada');
    }
  }
  
  if (promotion.usageCount !== undefined) {
    if (typeof promotion.usageCount !== 'number' || promotion.usageCount < 0) {
      errors.push('Contador de uso inválido');
    }
  }
  
  // Validar montos mínimos y máximos
  if (promotion.minPurchaseAmount !== undefined) {
    if (typeof promotion.minPurchaseAmount !== 'number' || promotion.minPurchaseAmount < 0) {
      errors.push('Monto mínimo de compra inválido');
    }
  }
  
  if (promotion.maxDiscountAmount !== undefined) {
    if (typeof promotion.maxDiscountAmount !== 'number' || promotion.maxDiscountAmount < 0) {
      errors.push('Monto máximo de descuento inválido');
    }
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings 
  };
};

/**
 * Calcula el estado actual de una promoción
 */
export const getPromotionStatus = (promotion: Promotion) => {
  const now = new Date();
  const start = new Date(promotion.startDate);
  const end = new Date(promotion.endDate);

  if (!promotion.isActive) return 'inactive';
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
};

/**
 * Calcula el tiempo restante para una promoción
 */
export const getTimeRemaining = (endDate: string): string | null => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};