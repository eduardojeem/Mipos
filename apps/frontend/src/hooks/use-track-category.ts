'use client'

const SESSION_PREFIX = 'mkt_cat_tracked_'

/**
 * Dispara un evento de tracking hacia /api/marketplace/categories/track.
 * Usa sendBeacon para no bloquear la navegación.
 * Deduplica por sessionStorage: un evento por sesión de navegador por categoría.
 */
export function trackCategoryEvent(slug: string, event: 'view' | 'click') {
  if (typeof window === 'undefined') return

  const key = `${SESSION_PREFIX}${event}_${slug}`
  if (sessionStorage.getItem(key)) return   // ya registrado en esta sesión

  sessionStorage.setItem(key, '1')

  const payload = JSON.stringify({ slug, event })

  // sendBeacon: fire-and-forget, no bloquea navegación ni genera errores visibles
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/marketplace/categories/track', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/marketplace/categories/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}
