/**
 * Business Configuration Validation Utility
 *
 * This file contains validation logic for business configuration.
 * Uses centralized validation rules from lib/validation/business-config-rules.ts
 */

import type { BusinessConfig } from '@/types/business-config'
import {
  VALIDATION_CONSTRAINTS,
  isValidEmail,
  isValidHexColor,
  isValidImageUrl,
  isValidPdfUrl,
  isValidFaviconUrl,
  isValidMapUrl,
  isValidSocialMediaUrl,
  isValidPhoneFormat,
  isValidRucFormat,
  isValidCarouselRatio,
  isValidTaxRate,
  isValidDiscountPercentage,
} from '@/lib/validation/business-config-rules'

export function validateBusinessConfig(cfg: BusinessConfig): { ok: true } | { ok: false, errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  // Basic business info validation
  if (!cfg.businessName || cfg.businessName.trim().length < VALIDATION_CONSTRAINTS.MIN_BUSINESS_NAME) {
    errors['businessName'] = 'El nombre del negocio es requerido'
  }

  // Contact validation
  if (!cfg.contact?.phone?.trim()) {
    errors['contact.phone'] = 'Completa el telefono publico del negocio antes de guardar'
  } else if (!isValidPhoneFormat(cfg.contact.phone)) {
    errors['contact.phone'] = 'Teléfono inválido'
  }

  if (cfg.contact.email && !isValidEmail(cfg.contact.email)) {
    errors['contact.email'] = 'Email inválido'
  }

  // Store settings validation
  if (cfg.storeSettings) {
    if (!isValidTaxRate(cfg.storeSettings.taxRate)) {
      errors['storeSettings.taxRate'] = 'IVA debe estar entre 0 y 1 (ej. 0.10)'
    }
    if (cfg.storeSettings.lowStockThreshold !== undefined && cfg.storeSettings.lowStockThreshold < 0) {
      errors['storeSettings.lowStockThreshold'] = 'El umbral de stock bajo debe ser positivo'
    }
    if (cfg.storeSettings.shippingCost !== undefined && cfg.storeSettings.shippingCost < 0) {
      errors['storeSettings.shippingCost'] = 'El costo de envio debe ser positivo'
    }
    if (cfg.storeSettings.maxDiscountPercentage !== undefined && !isValidDiscountPercentage(cfg.storeSettings.maxDiscountPercentage)) {
      errors['storeSettings.maxDiscountPercentage'] = 'Porcentaje de descuento debe estar entre 0 y 100'
    }
    const zones = cfg.storeSettings.freeShippingRegions || []
    zones.forEach((zone, index) => {
      if (!zone.name?.trim()) {
        errors[`storeSettings.freeShippingRegions.${index}.name`] = 'La zona debe tener nombre'
      }
      if (zone.threshold !== undefined && zone.threshold < 0) {
        errors[`storeSettings.freeShippingRegions.${index}.threshold`] = 'El monto de envio gratis debe ser positivo'
      }
      if (zone.shippingCost !== undefined && zone.shippingCost < 0) {
        errors[`storeSettings.freeShippingRegions.${index}.shippingCost`] = 'El costo de envio debe ser positivo'
      }
    })
  }

  // System settings validation
  if (cfg.systemSettings) {
    const sys = cfg.systemSettings
    if (sys.maxUsers < 1) errors['systemSettings.maxUsers'] = 'Debe haber al menos 1 usuario'
    if (sys.sessionTimeout < 1) errors['systemSettings.sessionTimeout'] = 'Timeout debe ser al menos 1 minuto'

    if (sys.security) {
      if (sys.security.maxLoginAttempts < 1) errors['systemSettings.security.maxLoginAttempts'] = 'Intentos deben ser > 0'
      if (sys.security.lockoutDuration < 1) errors['systemSettings.security.lockoutDuration'] = 'Duración de bloqueo debe ser > 0'
    }
  }

  // Branding validation (logo, favicon, colors)
  if (cfg.branding?.logo && !isValidImageUrl(cfg.branding.logo)) {
    errors['branding.logo'] = 'Logo debe ser una URL válida de imagen'
  }
  if (cfg.branding?.favicon && !isValidFaviconUrl(cfg.branding.favicon)) {
    errors['branding.favicon'] = 'Favicon debe ser una URL .ico o .png'
  }
  if (cfg.branding?.primaryColor && !isValidHexColor(cfg.branding.primaryColor)) {
    errors['branding.primaryColor'] = 'Color primario debe ser hexadecimal (#RRGGBB)'
  }
  if (cfg.branding?.secondaryColor && !isValidHexColor(cfg.branding.secondaryColor)) {
    errors['branding.secondaryColor'] = 'Color secundario debe ser hexadecimal (#RRGGBB)'
  }
  if (cfg.branding?.accentColor && !isValidHexColor(cfg.branding.accentColor)) {
    errors['branding.accentColor'] = 'Color de acento debe ser hexadecimal (#RRGGBB)'
  }
  if (cfg.branding?.backgroundColor && !isValidHexColor(cfg.branding.backgroundColor)) {
    errors['branding.backgroundColor'] = 'Color de fondo debe ser hexadecimal (#RRGGBB)'
  }
  if (cfg.branding?.textColor && !isValidHexColor(cfg.branding.textColor)) {
    errors['branding.textColor'] = 'Color de texto debe ser hexadecimal (#RRGGBB)'
  }
  if (cfg.branding?.gradientStart && !isValidHexColor(cfg.branding.gradientStart)) {
    errors['branding.gradientStart'] = 'Inicio de gradiente debe ser hexadecimal (#RRGGBB)'
  }
  if (cfg.branding?.gradientEnd && !isValidHexColor(cfg.branding.gradientEnd)) {
    errors['branding.gradientEnd'] = 'Fin de gradiente debe ser hexadecimal (#RRGGBB)'
  }

  // Legal documents validation (PDFs)
  if (cfg.legalDocuments?.termsUrl && !isValidPdfUrl(cfg.legalDocuments.termsUrl)) {
    errors['legalDocuments.termsUrl'] = 'Términos debe apuntar a un PDF válido'
  }
  if (cfg.legalDocuments?.privacyUrl && !isValidPdfUrl(cfg.legalDocuments.privacyUrl)) {
    errors['legalDocuments.privacyUrl'] = 'Privacidad debe apuntar a un PDF válido'
  }

  // Carousel validation
  if (cfg.carousel) {
    const t = cfg.carousel.transitionSeconds
    if (typeof t !== 'number' || t < VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MIN || t > VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MAX) {
      errors['carousel.transitionSeconds'] = `El tiempo de transición debe estar entre ${VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MIN} y ${VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MAX} segundos`
    }
    const ratio = cfg.carousel.ratio
    if (ratio !== undefined && !isValidCarouselRatio(ratio)) {
      errors['carousel.ratio'] = `La proporción debe estar entre ${VALIDATION_CONSTRAINTS.CAROUSEL_RATIO_MIN} y ${VALIDATION_CONSTRAINTS.CAROUSEL_RATIO_MAX}`
    }
    const autoplay = cfg.carousel.autoplay
    if (autoplay !== undefined && typeof autoplay !== 'boolean') {
      errors['carousel.autoplay'] = 'Autoplay debe ser booleano'
    }
    const tms = cfg.carousel.transitionMs
    if (tms !== undefined) {
      if (typeof tms !== 'number' || tms < VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MIN || tms > VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MAX) {
        errors['carousel.transitionMs'] = `Duración de transición debe estar entre ${VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MIN} y ${VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MAX} ms`
      }
    }
    const imgs = Array.isArray(cfg.carousel.images) ? cfg.carousel.images : []
    if (imgs.length > VALIDATION_CONSTRAINTS.CAROUSEL_MAX_IMAGES) {
      errors['carousel.images'] = `Máximo ${VALIDATION_CONSTRAINTS.CAROUSEL_MAX_IMAGES} imágenes en el carrusel`
    }
    imgs.forEach((img, idx) => {
      if (!img || typeof img !== 'object') {
        errors[`carousel.images.${idx}`] = 'Imagen inválida'
        return
      }
      if (!img.url || typeof img.url !== 'string') {
        errors[`carousel.images.${idx}.url`] = 'URL de imagen requerida'
      }
      if (!img.id || typeof img.id !== 'string') {
        errors[`carousel.images.${idx}.id`] = 'ID de imagen requerido'
      }
    })
  }

  // Home offers carousel validation
  if (cfg.homeOffersCarousel) {
    const hoc = cfg.homeOffersCarousel
    if (typeof hoc.enabled !== 'boolean') {
      errors['homeOffersCarousel.enabled'] = 'enabled debe ser booleano'
    }
    if (typeof hoc.autoplay !== 'boolean') {
      errors['homeOffersCarousel.autoplay'] = 'autoplay debe ser booleano'
    }
    if (typeof hoc.intervalSeconds !== 'number' || hoc.intervalSeconds < VALIDATION_CONSTRAINTS.OFFERS_CAROUSEL_INTERVAL_MIN || hoc.intervalSeconds > VALIDATION_CONSTRAINTS.OFFERS_CAROUSEL_INTERVAL_MAX) {
      errors['homeOffersCarousel.intervalSeconds'] = `Intervalo debe estar entre ${VALIDATION_CONSTRAINTS.OFFERS_CAROUSEL_INTERVAL_MIN} y ${VALIDATION_CONSTRAINTS.OFFERS_CAROUSEL_INTERVAL_MAX} segundos`
    }
    if (typeof hoc.transitionMs !== 'number' || hoc.transitionMs < VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MIN || hoc.transitionMs > VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MAX) {
      errors['homeOffersCarousel.transitionMs'] = `Transición debe estar entre ${VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MIN} y ${VALIDATION_CONSTRAINTS.CAROUSEL_TRANSITION_MS_MAX} ms`
    }
    if (hoc.ratio !== undefined && !isValidCarouselRatio(hoc.ratio)) {
      errors['homeOffersCarousel.ratio'] = `La proporción debe estar entre ${VALIDATION_CONSTRAINTS.CAROUSEL_RATIO_MIN} y ${VALIDATION_CONSTRAINTS.CAROUSEL_RATIO_MAX}`
    }
  }

  // Address/map validation
  if (cfg.address) {
    if (cfg.address.mapUrl && !isValidMapUrl(cfg.address.mapUrl)) {
      errors['address.mapUrl'] = 'Mapa debe ser una URL válida (http/https)'
    }
    if (cfg.address.mapEmbedEnabled) {
      if (!cfg.address.mapEmbedUrl || !isValidMapUrl(cfg.address.mapEmbedUrl)) {
        errors['address.mapEmbedUrl'] = 'URL embebible requerida y debe ser http/https'
      }
    }
    const lat = cfg.address.latitude
    if (lat !== undefined) {
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        errors['address.latitude'] = 'Latitud debe estar entre -90 y 90'
      }
    }
    const lon = cfg.address.longitude
    if (lon !== undefined) {
      if (typeof lon !== 'number' || lon < -180 || lon > 180) {
        errors['address.longitude'] = 'Longitud debe estar entre -180 y 180'
      }
    }
  }

  // Social media validation
  if (cfg.socialMedia) {
    if (cfg.socialMedia.facebook && !isValidSocialMediaUrl(cfg.socialMedia.facebook)) {
      errors['socialMedia.facebook'] = 'Facebook debe ser una URL HTTPS válida'
    }
    if (cfg.socialMedia.instagram && !isValidSocialMediaUrl(cfg.socialMedia.instagram)) {
      errors['socialMedia.instagram'] = 'Instagram debe ser una URL HTTPS válida'
    }
    if (cfg.socialMedia.twitter && !isValidSocialMediaUrl(cfg.socialMedia.twitter)) {
      errors['socialMedia.twitter'] = 'Twitter debe ser una URL HTTPS válida'
    }
    if (cfg.socialMedia.tiktok && !isValidSocialMediaUrl(cfg.socialMedia.tiktok)) {
      errors['socialMedia.tiktok'] = 'TikTok debe ser una URL HTTPS válida'
    }
    if (cfg.socialMedia.linkedin && !isValidSocialMediaUrl(cfg.socialMedia.linkedin)) {
      errors['socialMedia.linkedin'] = 'LinkedIn debe ser una URL HTTPS válida'
    }
  }

  // Contact website validation
  if (cfg.contact?.website && !isValidSocialMediaUrl(cfg.contact.website)) {
    errors['contact.website'] = 'Sitio web debe ser una URL HTTPS válida'
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true }
}
