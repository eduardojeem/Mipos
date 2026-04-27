import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import { isSupabaseActive } from '@/lib/env';
import {
  canTransitionReturnStatus,
  fetchMappedReturnById,
  getReturnOperationalContext,
  normalizeReturnStatusToDb,
  processReturnLocally,
  resolveReturnsOrganizationId,
  sanitizeReturnNotes,
  validateReturnAgainstOriginalSale,
} from '../_lib';

const updateReturnSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().max(1000).optional().nullable(),
});

function backendBase() {
  const base = process.env.BACKEND_URL || '';
  return base.replace(/\/$/, '');
}

function forwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  const org = req.headers.get('x-organization-id');
  const branchId = req.headers.get('x-branch-id');
  const posId = req.headers.get('x-pos-id');
  const registerId = req.headers.get('x-register-id');

  if (auth) headers.authorization = auth;
  if (org) headers['x-organization-id'] = org;
  if (branchId) headers['x-branch-id'] = branchId;
  if (posId) headers['x-pos-id'] = posId;
  if (registerId) headers['x-register-id'] = registerId;

  return headers;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const base = backendBase();
    const useBackend = !!base && !isSupabaseActive();
    if (!useBackend) {
      const auth = await validateRole(request, {
        roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER'],
      });
      if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

      const organizationId = await resolveReturnsOrganizationId(request, {
        userId: auth.userId,
        userRole: auth.userRole,
      });
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
      }

      const supabase = await createClient();
      const mappedReturn = await fetchMappedReturnById(supabase, id, organizationId);
      if (!mappedReturn) {
        return NextResponse.json({ error: 'Return not found' }, { status: 404 });
      }

      return NextResponse.json(mappedReturn);
    }

    const response = await fetch(`${base}/returns/${id}`, {
      headers: forwardHeaders(request),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch return' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    });
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const body = updateReturnSchema.parse(await request.json());
    const normalizedStatus = normalizeReturnStatusToDb(body.status);
    if (!normalizedStatus) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    const sanitizedNotes = sanitizeReturnNotes(body.notes);
    const payload = {
      status: normalizedStatus,
      notes: sanitizedNotes,
    };

    const base = backendBase();
    const useBackend = !!base && !isSupabaseActive();
    if (useBackend) {
      const response = await fetch(`${base}/returns/${id}/status`, {
        method: 'PATCH',
        headers: forwardHeaders(request),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
      });
    }

    const organizationId = await resolveReturnsOrganizationId(request, {
      userId: auth.userId,
      userRole: auth.userRole,
    });
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: currentReturn, error: currentReturnError } = await supabase
      .from('returns')
      .select(`
        id,
        original_sale_id,
        status,
        notes,
        items:return_items(
          original_sale_item_id,
          product_id,
          quantity,
          unit_price,
          reason
        )
      `)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle();

    if (currentReturnError) {
      return NextResponse.json({ error: currentReturnError.message }, { status: 500 });
    }

    if (!currentReturn) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    const currentStatus = normalizeReturnStatusToDb(currentReturn.status);
    if (!currentStatus) {
      return NextResponse.json({ error: 'Current return has an invalid status' }, { status: 400 });
    }

    const notesProvided = Object.prototype.hasOwnProperty.call(body, 'notes');
    const statusChanged = currentStatus !== normalizedStatus;

    if (statusChanged && !canTransitionReturnStatus(currentStatus, normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    if (normalizedStatus === 'APPROVED' && statusChanged) {
      const saleValidation = await validateReturnAgainstOriginalSale(supabase, {
        organizationId,
        originalSaleId: String(currentReturn.original_sale_id || ''),
        items: (Array.isArray(currentReturn.items) ? currentReturn.items : []).map((item) => ({
          originalSaleItemId: String(item.original_sale_item_id || ''),
          productId: String(item.product_id || ''),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unit_price || 0),
          reason: typeof item.reason === 'string' ? item.reason : null,
        })),
        excludeReturnId: id,
      });

      if (!saleValidation.ok) {
        return NextResponse.json({ error: saleValidation.error }, { status: saleValidation.status });
      }
    }

    if (normalizedStatus === 'COMPLETED' && statusChanged) {
      const processResult = await processReturnLocally(supabase, {
        returnId: id,
        organizationId,
        userId: auth.userId || null,
        context: getReturnOperationalContext(request),
      });

      if (processResult.status !== 200) {
        return NextResponse.json({ error: processResult.error }, { status: processResult.status });
      }

      if (notesProvided) {
        const { error: noteError } = await supabase
          .from('returns')
          .update({
            notes: sanitizedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .eq('id', id);

        if (noteError) {
          return NextResponse.json({ error: noteError.message }, { status: 500 });
        }
      }

      const mappedReturn = await fetchMappedReturnById(supabase, id, organizationId);
      return NextResponse.json({ return: mappedReturn });
    }

    if (!statusChanged && !notesProvided) {
      const mappedReturn = await fetchMappedReturnById(supabase, id, organizationId);
      return NextResponse.json({ return: mappedReturn });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (statusChanged) {
      updatePayload.status = normalizedStatus;
    }
    if (notesProvided) {
      updatePayload.notes = sanitizedNotes;
    }

    const { error: updateError } = await supabase
      .from('returns')
      .update(updatePayload)
      .eq('organization_id', organizationId)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const mappedReturn = await fetchMappedReturnById(supabase, id, organizationId);
    return NextResponse.json({ return: mappedReturn });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update return' },
      { status: 500 }
    );
  }
}
