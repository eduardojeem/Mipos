// Helpers para confirmar/contactar turnos por WhatsApp.

/** Normaliza un teléfono a dígitos para wa.me. Antepone el código de Paraguay
 *  (595) si el número parece local (sin código de país). */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = String(phone).replace(/\D/g, '')
  if (!digits) return null
  // 0981xxxxxx (local PY) → 595981xxxxxx
  if (digits.startsWith('0')) digits = '595' + digits.slice(1)
  // 981xxxxxx (sin 0 ni país) → 595981xxxxxx
  else if (digits.length <= 9) digits = '595' + digits
  return digits
}

/** Construye el link wa.me con un mensaje pre-cargado. */
export function buildWhatsappLink(phone: string | null | undefined, message: string): string | null {
  const number = toWhatsappNumber(phone)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

/** Mensaje de confirmación de turno. */
export function buildConfirmationMessage(params: {
  businessName?: string
  customerName?: string | null
  serviceName?: string | null
  dateLabel: string
  timeLabel: string
}): string {
  const { businessName, customerName, serviceName, dateLabel, timeLabel } = params
  const hi = customerName ? `Hola ${customerName}!` : 'Hola!'
  const svc = serviceName ? ` para *${serviceName}*` : ''
  const from = businessName ? ` — ${businessName}` : ''
  return `${hi} Te confirmamos tu turno${svc} el ${dateLabel} a las ${timeLabel}. ¡Te esperamos!${from}`
}
