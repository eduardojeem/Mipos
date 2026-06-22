// Helpers compartidos de turnos (vertical BARBERSHOP).
// Compartidos entre /api/appointments/route.ts, /[id]/route.ts y /availability/route.ts.
import { generateCustomerCode } from '@/lib/utils'

export const APPT_COLUMNS =
  'id,staff_profile_id,service_id,customer_id,customer_name,customer_phone,start_at,end_at,status,price,notes,sale_id,created_at,updated_at'

export const ACTIVE_STATUSES = ['BOOKED', 'CONFIRMED', 'COMPLETED']
export const VALID_STATUSES = ['BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

// Solapamiento: existe otro turno activo del mismo profesional que se cruza con [start,end).
export async function hasOverlap(
  admin: any,
  orgId: string,
  staffProfileId: string,
  startAt: string,
  endAt: string,
  excludeId?: string,
): Promise<boolean> {
  let query = admin
    .from('appointments')
    .select('id')
    .eq('organization_id', orgId)
    .eq('staff_profile_id', staffProfileId)
    .in('status', ACTIVE_STATUSES)
    .lt('start_at', endAt)
    .gt('end_at', startAt)
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query.limit(1)
  return Array.isArray(data) && data.length > 0
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export async function ensureAppointmentCustomer(
  admin: any,
  input: {
    orgId: string
    customerId?: string | null
    customerName?: string | null
    customerPhone?: string | null
    customerEmail?: string | null
  },
): Promise<string | null> {
  const existingCustomerId = normalizeNullableText(input.customerId)
  if (existingCustomerId) return existingCustomerId

  const customerName = normalizeNullableText(input.customerName)
  const customerPhone = normalizeNullableText(input.customerPhone)
  const customerEmail = normalizeNullableText(input.customerEmail)?.toLowerCase() || null

  if (!customerName || (!customerPhone && !customerEmail)) {
    return null
  }

  if (customerPhone) {
    const { data: customerByPhone } = await admin
      .from('customers')
      .select('id')
      .eq('organization_id', input.orgId)
      .eq('phone', customerPhone)
      .is('deleted_at', null)
      .maybeSingle()

    if (customerByPhone?.id) {
      return customerByPhone.id
    }
  }

  if (customerEmail) {
    const { data: customerByEmail } = await admin
      .from('customers')
      .select('id')
      .eq('organization_id', input.orgId)
      .eq('email', customerEmail)
      .is('deleted_at', null)
      .maybeSingle()

    if (customerByEmail?.id) {
      return customerByEmail.id
    }
  }

  const { data: createdCustomer, error } = await admin
    .from('customers')
    .insert([
      {
        organization_id: input.orgId,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        customer_code: generateCustomerCode(customerName),
        customer_type: 'REGULAR',
        status: 'active',
        is_active: true,
        total_purchases: 0,
        total_orders: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select('id')
    .single()

  if (error) {
    console.error('Error ensuring appointment customer:', error)
    return null
  }

  return createdCustomer?.id || null
}
