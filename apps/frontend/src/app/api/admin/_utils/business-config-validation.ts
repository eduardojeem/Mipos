/**
 * Business Configuration Validation Utility
 * 
 * This file contains validation logic for business configuration.
 * Extracted from the deprecated business-config.ts utility.
 */

import type { BusinessConfig } from '@/types/business-config'

export function validateBusinessConfig(cfg: BusinessConfig): { ok: true } | { ok: false, errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  // Basic business info validation
  if (!cfg.businessName || cfg.businessName.trim().length < 2) {
    errors['businessName'] = 'El nombre del negocio es requerido'
  }
  
  // Contact validation
  if (cfg.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.contact.email)) {
    errors['contact.email'] = 'Email inválido'
  }
  if (cfg.contact.phone && cfg.contact.phone.replace(/\D/g, '').length < 6) {
    errors['contact.phone'] = 'Teléfono inválido'
  }

  // Store settings validation
  if (cfg.storeSettings) {
    if (typeof cfg.storeSettings.taxRate !== 'number' || cfg.storeSettings.taxRate < 0 || cfg.storeSettings.taxRate > 1) {
      errors['storeSettings.taxRate'] = 'IVA debe estar entre 0 y 1 (ej. 0.10)'
    }
    if (cfg.storeSettings.lowStockThreshold !== undefined && cfg.storeSettings.lowStockThreshold < 0) {
      errors['storeSettings.lowStockThreshold'] = 'El umbral de stock bajo debe ser positivo'
    }
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

  // Branding validation (logo and favicon)
  const imageUrlRegex = /^https?:\/\/.+\.(png|jpg|jpeg|svg|ico|webp)(\?.*)?$/i
  const pdfUrlRegex = /^https?:\/\/.+\.(pdf)(\?.*)?$/i
  
  if (cfg.branding?.logo) {
    if (typeof cfg.branding.logo !== 'string' || !imageUrlRegex.test(cfg.branding.logo)) {
      errors['branding.logo'] = 'Logo debe ser una URL válida de imagen'
    }
  }
  if (cfg.branding?.favicon) {
    if (typeof cfg.branding.favicon !== 'string' || !/^https?:\/\/.+\.(ico|png)(\?.*)?$/i.test(cfg.branding.favicon)) {
      errors['branding.favicon'] = 'Favicon debe ser una URL .ico o .png'
    }
  }

  // Legal documents validation (PDFs)
  if (cfg.legalDocuments?.termsUrl) {
    if (typeof cfg.legalDocuments.termsUrl !== 'string' || !pdfUrlRegex.test(cfg.legalDocuments.termsUrl)) {
      errors['legalDocuments.termsUrl'] = 'Términos debe apuntar a un PDF válido'
    }
  }
  if (cfg.legalDocuments?.privacyUrl) {
    if (typeof cfg.legalDocuments.privacyUrl !== 'string' || !pdfUrlRegex.test(cfg.legalDocuments.privacyUrl)) {
      errors['legalDocuments.privacyUrl'] = 'Privacidad debe apuntar a un PDF válido'
    }
  }

  // Carousel validation
  if (cfg.carousel) {
    const t = cfg.carousel.transitionSeconds
    if (typeof t !== 'number' || t < 3 || t > 10) {
      errors['carousel.transitionSeconds'] = 'El tiempo de transición debe estar entre 3 y 10 segundos'
    }
    const ratio = cfg.carousel.ratio
    if (ratio !== undefined) {
      if (typeof ratio !== 'number' || !isFinite(ratio) || ratio <= 0) {
        errors['carousel.ratio'] = 'La proporción debe ser un número positivo (> 0)'
      }
    }
    const autoplay = cfg.carousel.autoplay
    if (autoplay !== undefined && typeof autoplay !== 'boolean') {
      errors['carousel.autoplay'] = 'Autoplay debe ser booleano'
    }
    const tms = cfg.carousel.transitionMs
    if (tms !== undefined) {
      if (typeof tms !== 'number' || tms < 0 || tms > 5000) {
        errors['carousel.transitionMs'] = 'Duración de transición debe estar entre 0 y 5000 ms'
      }
    }
    const imgs = Array.isArray(cfg.carousel.images) ? cfg.carousel.images : []
    if (imgs.length > 10) {
      errors['carousel.images'] = 'Máximo 10 imágenes en el carrusel'
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
    if (typeof hoc.intervalSeconds !== 'number' || hoc.intervalSeconds < 3 || hoc.intervalSeconds > 10) {
      errors['homeOffersCarousel.intervalSeconds'] = 'Intervalo debe estar entre 3 y 10 segundos'
    }
    if (typeof hoc.transitionMs !== 'number' || hoc.transitionMs < 0 || hoc.transitionMs > 5000) {
      errors['homeOffersCarousel.transitionMs'] = 'Transición debe estar entre 0 y 5000 ms'
    }
    if (hoc.ratio !== undefined && (typeof hoc.ratio !== 'number' || !isFinite(hoc.ratio) || hoc.ratio <= 0)) {
      errors['homeOffersCarousel.ratio'] = 'La proporción debe ser un número positivo (> 0)'
    }
  }

  // Address/map validation
  if (cfg.address) {
    const url = cfg.address.mapUrl
    if (url) {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        errors['address.mapUrl'] = 'Mapa debe ser una URL válida (http/https)'
      }
    }
    if (cfg.address.mapEmbedEnabled) {
      const eurl = cfg.address.mapEmbedUrl
      if (!eurl || typeof eurl !== 'string' || !/^https?:\/\//i.test(eurl)) {
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
  
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true }
}
