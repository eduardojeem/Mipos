import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

// GET /api/reports/export -> proxy to backend POST `/api/reports/:type/export/:format`
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sales'
    const format = searchParams.get('format') || 'pdf'

    // Require authenticated user unless mock auth is enabled
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } catch {
      if (!isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // Validate type and format to avoid path injection
    const allowedTypes = new Set(['sales', 'inventory', 'customers', 'financial', 'compare'])
    const allowedFormats = new Set(['pdf', 'excel', 'csv', 'json'])
    if (!allowedTypes.has(String(type))) {
      return NextResponse.json({ error: 'Tipo de reporte inválido' }, { status: 400 })
    }
    if (!allowedFormats.has(String(format))) {
      return NextResponse.json({ error: 'Formato de exportación inválido' }, { status: 400 })
    }

    // Map query params to backend filter body
    const start_date = searchParams.get('start_date') || searchParams.get('startDate')
    const end_date = searchParams.get('end_date') || searchParams.get('endDate')
    const since = searchParams.get('since')
    const productId = searchParams.get('productId')
    const categoryId = searchParams.get('categoryId')
    const customerId = searchParams.get('customerId')
    const supplierId = searchParams.get('supplierId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    // Compare-specific params
    const start_date_a = searchParams.get('start_date_a')
    const end_date_a = searchParams.get('end_date_a')
    const start_date_b = searchParams.get('start_date_b')
    const end_date_b = searchParams.get('end_date_b')
    const dimension = searchParams.get('dimension') || 'overall'
    const groupBy = searchParams.get('groupBy') || 'day'
    const details = searchParams.get('details')

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (start_date && !dateRegex.test(String(start_date))) {
      return NextResponse.json({ error: 'Formato de fecha inválido en "start_date" (YYYY-MM-DD)' }, { status: 400 })
    }
    if (end_date && !dateRegex.test(String(end_date))) {
      return NextResponse.json({ error: 'Formato de fecha inválido en "end_date" (YYYY-MM-DD)' }, { status: 400 })
    }
    if (since && !dateRegex.test(String(since))) {
      return NextResponse.json({ error: 'Formato de fecha inválido en "since" (YYYY-MM-DD)' }, { status: 400 })
    }

    // Validate compare dates if type=compare
    if (type === 'compare') {
      if (start_date_a && !dateRegex.test(String(start_date_a))) {
        return NextResponse.json({ error: 'Formato inválido en "start_date_a" (YYYY-MM-DD)' }, { status: 400 })
      }
      if (end_date_a && !dateRegex.test(String(end_date_a))) {
        return NextResponse.json({ error: 'Formato inválido en "end_date_a" (YYYY-MM-DD)' }, { status: 400 })
      }
      if (start_date_b && !dateRegex.test(String(start_date_b))) {
        return NextResponse.json({ error: 'Formato inválido en "start_date_b" (YYYY-MM-DD)' }, { status: 400 })
      }
      if (end_date_b && !dateRegex.test(String(end_date_b))) {
        return NextResponse.json({ error: 'Formato inválido en "end_date_b" (YYYY-MM-DD)' }, { status: 400 })
      }
      const allowedDimensions = new Set(['overall','product','category'])
      const allowedGroupBy = new Set(['day','month'])
      if (dimension && !allowedDimensions.has(String(dimension))) {
        return NextResponse.json({ error: 'Parámetro "dimension" inválido' }, { status: 400 })
      }
      if (groupBy && !allowedGroupBy.has(String(groupBy))) {
        return NextResponse.json({ error: 'Parámetro "groupBy" inválido' }, { status: 400 })
      }
      if (details && !['true','false','1','0'].includes(String(details))) {
        return NextResponse.json({ error: 'Parámetro "details" inválido (true/false)' }, { status: 400 })
      }
    }

    const body: Record<string, any> = {}
    if (type !== 'compare') {
      if (start_date) body.startDate = start_date
      if (end_date) body.endDate = end_date
      if (since) body.since = since
      if (productId) body.productId = productId
      if (categoryId) body.categoryId = categoryId
      if (customerId) body.customerId = customerId
      if (supplierId) body.supplierId = supplierId
      if (userId) body.userId = userId
      if (status) body.status = status
    } else {
      if (start_date_a) body.start_date_a = start_date_a
      if (end_date_a) body.end_date_a = end_date_a
      if (start_date_b) body.start_date_b = start_date_b
      if (end_date_b) body.end_date_b = end_date_b
      if (dimension) body.dimension = dimension
      if (groupBy) body.groupBy = groupBy
      if (details !== null) body.details = details
      if (productId) body.productId = productId
      if (categoryId) body.categoryId = categoryId
      if (customerId) body.customerId = customerId
      if (supplierId) body.supplierId = supplierId
      if (userId) body.userId = userId
    }

    const response = await api.post(`/reports/${type}/export/${format}`, body, {
      responseType: 'arraybuffer'
    })

    const contentType = response.headers['content-type'] || 'application/octet-stream'
    const fallbackExt = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : format
    const contentDisposition = response.headers['content-disposition'] || `attachment; filename="${type}-report.${fallbackExt}"`

    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition
      }
    })
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data || error?.message || 'Unknown error'
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details }, { status })
  }
}
