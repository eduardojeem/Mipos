/**
 * Utilidad centralizada para cálculos de ofertas y promociones
 * 
 * Este archivo centraliza toda la lógica de cálculo de descuentos
 * para evitar inconsistencias entre frontend, backend y SSR.
 * 
 * @module lib/offers/calculations
 */

// =====================================================
// TIPOS
// =====================================================

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BOGO' | 'FREE_SHIPPING';

export interface Promotion {
    id: string;
    name: string;
    description?: string;
    discountType: DiscountType;
    discountValue?: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usageCount?: number;
}

export interface OfferCalculation {
    basePrice: number;
    offerPrice: number;
    discountPercent: number;
    savings: number;
    effectiveDiscountValue: number;
}

export interface OfferValidation {
    isValid: boolean;
    isActive: boolean;
    isUpcoming: boolean;
    isExpired: boolean;
    daysRemaining: number | null;
    hoursRemaining: number | null;
    errors: string[];
}

// =====================================================
// CONSTANTES
// =====================================================

const MIN_DISCOUNT_PERCENT = 0;
const MAX_DISCOUNT_PERCENT = 100;
const MIN_PRICE = 0;

// =====================================================
// FUNCIONES DE CÁLCULO
// =====================================================

/**
 * Calcula el precio de oferta basado en la promoción
 * 
 * @param basePrice - Precio base del producto
 * @param promotion - Datos de la promoción
 * @returns Objeto con todos los cálculos de la oferta
 * 
 * @example
 * ```typescript
 * const result = calculateOfferPrice(100, {
 *   discountType: 'PERCENTAGE',
 *   discountValue: 20
 * });
 * // result.offerPrice = 80
 * // result.discountPercent = 20
 * // result.savings = 20
 * ```
 */
export function calculateOfferPrice(
    basePrice: number,
    promotion: Promotion | null
): OfferCalculation {
    // Validar precio base
    const validBasePrice = Math.max(MIN_PRICE, Number(basePrice) || 0);

    // Si no hay promoción, retornar precio base
    if (!promotion || !promotion.isActive) {
        return {
            basePrice: validBasePrice,
            offerPrice: validBasePrice,
            discountPercent: 0,
            savings: 0,
            effectiveDiscountValue: 0
        };
    }

    const discountValue = Number(promotion.discountValue) || 0;
    let offerPrice = validBasePrice;
    let discountPercent = 0;
    let effectiveDiscountValue = 0;

    switch (promotion.discountType) {
        case 'PERCENTAGE': {
            // Validar que el porcentaje esté en rango válido
            const validPercent = Math.max(
                MIN_DISCOUNT_PERCENT,
                Math.min(MAX_DISCOUNT_PERCENT, discountValue)
            );

            discountPercent = validPercent;
            effectiveDiscountValue = validBasePrice * (validPercent / 100);
            offerPrice = validBasePrice * (1 - validPercent / 100);
            break;
        }

        case 'FIXED_AMOUNT': {
            effectiveDiscountValue = Math.min(discountValue, validBasePrice);
            offerPrice = validBasePrice - effectiveDiscountValue;
            discountPercent = validBasePrice > 0
                ? (effectiveDiscountValue / validBasePrice) * 100
                : 0;
            break;
        }

        case 'BOGO': {
            // Buy One Get One: 50% de descuento
            discountPercent = 50;
            effectiveDiscountValue = validBasePrice * 0.5;
            offerPrice = validBasePrice * 0.5;
            break;
        }

        case 'FREE_SHIPPING': {
            // Envío gratis no afecta el precio del producto
            offerPrice = validBasePrice;
            discountPercent = 0;
            effectiveDiscountValue = 0;
            break;
        }

        default: {
            console.warn(`Tipo de descuento desconocido: ${promotion.discountType}`);
            offerPrice = validBasePrice;
            discountPercent = 0;
            effectiveDiscountValue = 0;
        }
    }

    // Aplicar descuento máximo si está definido
    if (promotion.maxDiscountAmount && effectiveDiscountValue > promotion.maxDiscountAmount) {
        effectiveDiscountValue = promotion.maxDiscountAmount;
        offerPrice = validBasePrice - effectiveDiscountValue;
        discountPercent = validBasePrice > 0
            ? (effectiveDiscountValue / validBasePrice) * 100
            : 0;
    }

    // Asegurar que el precio de oferta no sea negativo
    offerPrice = Math.max(MIN_PRICE, offerPrice);

    // Calcular ahorro real
    const savings = validBasePrice - offerPrice;

    return {
        basePrice: validBasePrice,
        offerPrice: Math.round(offerPrice * 100) / 100, // Redondear a 2 decimales
        discountPercent: Math.round(discountPercent * 10) / 10, // Redondear a 1 decimal
        savings: Math.round(savings * 100) / 100,
        effectiveDiscountValue: Math.round(effectiveDiscountValue * 100) / 100
    };
}

/**
 * Valida si una promoción está activa en el momento actual
 * 
 * @param promotion - Datos de la promoción
 * @param referenceDate - Fecha de referencia (por defecto: ahora)
 * @returns Objeto con validación completa
 */
export function validatePromotion(
    promotion: Promotion,
    referenceDate: Date = new Date()
): OfferValidation {
    const errors: string[] = [];
    const now = referenceDate.getTime();

    // Validar fechas
    const startDate = promotion.startDate ? new Date(promotion.startDate) : null;
    const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

    // Validar que startDate < endDate
    if (startDate && endDate && startDate >= endDate) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Calcular estados
    const isUpcoming = startDate ? startDate.getTime() > now : false;
    const isExpired = endDate ? endDate.getTime() < now : false;
    const isActive = promotion.isActive && !isUpcoming && !isExpired;

    // Calcular tiempo restante
    let daysRemaining: number | null = null;
    let hoursRemaining: number | null = null;

    if (endDate && !isExpired) {
        const diffMs = endDate.getTime() - now;
        daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
    }

    // Validar límite de uso
    if (promotion.usageLimit && promotion.usageCount) {
        if (promotion.usageCount >= promotion.usageLimit) {
            errors.push('La promoción ha alcanzado su límite de uso');
        }
    }

    // Validar valor de descuento
    if (promotion.discountType === 'PERCENTAGE') {
        if (promotion.discountValue !== undefined &&
            (promotion.discountValue < MIN_DISCOUNT_PERCENT ||
                promotion.discountValue > MAX_DISCOUNT_PERCENT)) {
            errors.push(`El porcentaje de descuento debe estar entre ${MIN_DISCOUNT_PERCENT}% y ${MAX_DISCOUNT_PERCENT}%`);
        }
    } else if (promotion.discountType === 'FIXED_AMOUNT') {
        if (promotion.discountValue !== undefined && promotion.discountValue <= 0) {
            errors.push('El monto de descuento debe ser mayor a 0');
        }
    }

    return {
        isValid: errors.length === 0 && isActive,
        isActive,
        isUpcoming,
        isExpired,
        daysRemaining,
        hoursRemaining,
        errors
    };
}

/**
 * Formatea el tiempo restante de una promoción
 * 
 * @param endDate - Fecha de fin de la promoción
 * @param referenceDate - Fecha de referencia (por defecto: ahora)
 * @returns String formateado con tiempo restante
 */
export function formatTimeRemaining(
    endDate: string | Date | null | undefined,
    referenceDate: Date = new Date()
): string {
    if (!endDate) return 'Sin fecha de término';

    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const now = referenceDate;
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return 'Finalizada';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 7) {
        return `${days} días`;
    } else if (days > 0) {
        return `${days} día${days !== 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hora${hours !== 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else {
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
}

/**
 * Calcula si una promoción está por expirar (< 24 horas)
 * 
 * @param promotion - Datos de la promoción
 * @param thresholdHours - Umbral en horas (por defecto: 24)
 * @returns true si está por expirar
 */
export function isPromotionExpiring(
    promotion: Promotion,
    thresholdHours: number = 24
): boolean {
    if (!promotion.endDate) return false;

    const validation = validatePromotion(promotion);
    return validation.hoursRemaining !== null &&
        validation.hoursRemaining > 0 &&
        validation.hoursRemaining <= thresholdHours;
}

/**
 * Obtiene el mejor precio entre múltiples promociones
 * 
 * @param basePrice - Precio base del producto
 * @param promotions - Array de promociones aplicables
 * @returns Cálculo de la mejor oferta
 */
export function getBestOffer(
    basePrice: number,
    promotions: Promotion[]
): OfferCalculation & { promotion: Promotion | null } {
    if (!promotions || promotions.length === 0) {
        const calculation = calculateOfferPrice(basePrice, null);
        return { ...calculation, promotion: null };
    }

    // Filtrar solo promociones válidas
    const validPromotions = promotions.filter(p => {
        const validation = validatePromotion(p);
        return validation.isValid;
    });

    if (validPromotions.length === 0) {
        const calculation = calculateOfferPrice(basePrice, null);
        return { ...calculation, promotion: null };
    }

    // Calcular precio para cada promoción
    const calculations = validPromotions.map(promo => ({
        promotion: promo,
        calculation: calculateOfferPrice(basePrice, promo)
    }));

    // Ordenar por mejor precio (menor offerPrice)
    calculations.sort((a, b) => a.calculation.offerPrice - b.calculation.offerPrice);

    // Retornar la mejor oferta
    const best = calculations[0];
    return {
        ...best.calculation,
        promotion: best.promotion
    };
}

// =====================================================
// UTILIDADES DE FORMATO
// =====================================================

/**
 * Formatea un porcentaje de descuento
 */
export function formatDiscountPercent(percent: number): string {
    return `${Math.round(percent)}%`;
}

/**
 * Formatea el ahorro en moneda
 */
export function formatSavings(savings: number, currencySymbol: string = '$'): string {
    return `${currencySymbol}${savings.toFixed(2)}`;
}

/**
 * Genera un mensaje descriptivo de la oferta
 */
export function getOfferDescription(calculation: OfferCalculation): string {
    if (calculation.discountPercent === 0) {
        return 'Sin descuento';
    }

    return `Ahorra ${formatDiscountPercent(calculation.discountPercent)} (${formatSavings(calculation.savings)})`;
}
