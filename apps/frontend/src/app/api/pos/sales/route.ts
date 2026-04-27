import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import {
  buildInternalTicketMetadata,
  normalizePosSaleDocument,
} from '@/lib/pos/internal-ticket';

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return trimmed;
}

// POST /api/pos/sales - Process a new sale
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access']);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const body = await request.json();
    const operationalContext = getRequestOperationalContext(request, body);
    const {
      items: rawItems,
      customer_id,
      discount_amount = 0,
      discount_type = 'FIXED_AMOUNT',
      discount_reason,
      coupon_code,
      payment_method = 'CASH',
      mixedPayments,
      payment_details,
      notes = '',
      transfer_reference,
      cashReceived,
      change,
      total_amount // Agregar para validación cruzada
    } = body;

    // Normalizar items y validar productId antes de llamar al backend
    const items = Array.isArray(rawItems) ? rawItems.map((it: any, idx: number) => {
      const pid = String(it?.product_id ?? it?.productId ?? it?.id ?? '').trim();
      const qty = Number(it?.quantity ?? it?.qty ?? 0);
      if (!pid) {
        throw new Error(`Invalid item at index ${idx}: missing product_id`);
      }
      // Validar formato UUID v4 básico
      const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidV4.test(pid)) {
        throw new Error(`Invalid product_id at index ${idx}: not a valid UUID`);
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Invalid quantity at index ${idx}`);
      }
      return { productId: pid, quantity: qty };
    }) : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // REMOVED: total_amount validation - backend will calculate the total

    const supabase = await createClient();
    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    );
    const organizationId = headerOrgId || (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'Backend session is required' }, { status: 401 });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001/api';
    const customerId = normalizeString(customer_id);

    // SECURITY FIX: Only send product IDs and quantities, NOT prices
    const backendPayload: any = {
      customerId: customerId || undefined,
      // REMOVED: unitPrice from items - backend will get from DB
      items,
      paymentMethod: payment_method,
      mixedPayments: Array.isArray(mixedPayments) ? mixedPayments : undefined,
      paymentDetails: payment_details,
      notes,
      cashReceived: cashReceived ? Number(cashReceived) : undefined,
      change: change ? Number(change) : undefined,
      transferReference: transfer_reference,
      branchId: operationalContext.branchId ?? undefined,
      posId: operationalContext.posId ?? undefined,
    };

    // Handle coupons
    if (coupon_code) {
      backendPayload.couponCode = coupon_code;
    }

    // Handle manual discounts
    if (discount_amount && Number(discount_amount) > 0) {
      backendPayload.manualDiscount = {
        type: discount_type,
        value: Number(discount_amount),
        reason: discount_reason || 'Manual discount'
      };
    }

    const backendResponse = await fetch(`${backendUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        'x-organization-id': organizationId,
        ...(operationalContext.branchId ? { 'x-branch-id': operationalContext.branchId } : {}),
        ...(operationalContext.posId ? { 'x-pos-id': operationalContext.posId, 'x-register-id': operationalContext.posId } : {}),
      },
      body: JSON.stringify(backendPayload),
    });

    // Verificar si la respuesta es HTML (error del servidor)
    const contentType = backendResponse.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Backend returned HTML instead of JSON:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        url: `${backendUrl}/sales`
      });
      
      return NextResponse.json({
        error: 'Backend service unavailable',
        details: {
          message: 'El servidor backend no está disponible o devolvió una respuesta inválida',
          status: backendResponse.status,
          hint: 'Verifica que el backend esté corriendo en ' + backendUrl
        }
      }, { status: 503 });
    }

    if (!backendResponse.ok) {
      const errorBody = await backendResponse.json().catch(() => ({}));
      return NextResponse.json({
        error: 'Failed to process sale in backend',
        details: errorBody,
      }, { status: backendResponse.status });
    }

    const backendSale = await backendResponse.json();

    // Validación cruzada: verificar que los totales coincidan
    const backendTotal = Number(backendSale?.sale?.total || backendSale?.total || 0);
    const frontendTotal = Number(body.total_amount || 0);
    
    if (frontendTotal > 0) {
      const difference = Math.abs(backendTotal - frontendTotal);
      const tolerance = 0.02; // Tolerancia de 2 centavos para redondeo
      
      if (difference > tolerance) {
        console.warn('⚠️ Total mismatch detected:', {
          frontend: frontendTotal,
          backend: backendTotal,
          difference,
          organizationId,
          items: items.length
        });
        
        // Opcional: rechazar transacción si la diferencia es muy grande
        if (difference > 1.00) {
          return NextResponse.json({
            error: 'Total calculation mismatch',
            details: {
              frontendTotal,
              backendTotal,
              difference,
              message: 'Los totales calculados no coinciden. Por favor, intenta nuevamente.'
            }
          }, { status: 400 });
        }
      }
    }

    const normalizedSale = normalizePosSaleDocument(
      backendSale?.sale || backendSale,
      backendSale?.summary,
    );

    return NextResponse.json({
      success: true,
      sale: normalizedSale,
      summary: backendSale?.summary || null,
      document: buildInternalTicketMetadata(normalizedSale.id),
      message: 'Internal ticket sale processed successfully',
    });

  } catch (error) {
    console.error('Process sale error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process sale',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/pos/sales - Get recent sales for POS
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access']);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status') || 'completed';

    const supabase = await createClient();
    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    );
    const organizationId = headerOrgId || (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        payment_method,
        created_at,
        status,
        customers (
          name
        )
      `)
      .eq('status', status)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const transformedSales = (sales || []).map((sale: any) => ({
      id: sale.id,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      created_at: sale.created_at,
      status: sale.status,
      customer_name: sale.customers?.name || 'Cliente General',
      saleNumber: `POS-${sale.id.slice(-8).toUpperCase()}`,
      ...buildInternalTicketMetadata(sale.id),
    }));

    return NextResponse.json({
      sales: transformedSales,
      total: transformedSales.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get POS sales error:', error);

    return NextResponse.json({
      sales: [],
      total: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch sales'
    });
  }
}
