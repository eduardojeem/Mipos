import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { createAdminClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

type InvoiceRow = {
  id: string
  invoice_number: string
  amount: number | string
  currency: string | null
  status: string
  due_date: string
  paid_at: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

function safeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function numberFromNumeric(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function GET(request: NextRequest) {
  const requestedCompanyId =
    request.headers.get('x-organization-id') ||
    new URL(request.url).searchParams.get('organizationId') ||
    undefined

  const access = await requireCompanyAccess(request, {
    companyId: requestedCompanyId,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'No hay empresa seleccionada' }, { status: 400 })
  }

  const organizationId = access.context.companyId

  try {
    if (isMockAuthEnabled()) {
      return NextResponse.json({
        success: true,
        invoices: [
          {
            id: 'mock-invoice-1',
            invoice_number: 'INV-0001',
            amount: 0,
            currency: 'PYG',
            status: 'paid',
            due_date: new Date().toISOString(),
            paid_at: new Date().toISOString(),
            receipt_url: undefined,
            pdf_url: undefined,
          },
        ],
      })
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('invoices')
      .select('id,invoice_number,amount,currency,status,due_date,paid_at,created_at,metadata')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const invoices = (data || []).map((row: any) => {
      const typed = row as InvoiceRow
      const meta = typed.metadata || {}
      const receiptUrl = safeString((meta as any).receipt_url)
      const pdfUrl = safeString((meta as any).pdf_url)

      return {
        id: typed.id,
        invoice_number: typed.invoice_number,
        amount: numberFromNumeric(typed.amount),
        currency: typed.currency || 'USD',
        status: typed.status,
        due_date: typed.due_date,
        paid_at: typed.paid_at,
        receipt_url: receiptUrl,
        pdf_url: pdfUrl,
      }
    })

    return NextResponse.json({ success: true, invoices })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
