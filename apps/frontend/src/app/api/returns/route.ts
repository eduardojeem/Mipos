import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import { isSupabaseActive } from '@/lib/env';
import {
  applyReturnReadFiltersToQuery,
  fetchAllPagedRows,
  fetchMappedReturnById,
  fetchReturnRowsCompat,
  hydrateReturnCustomers,
  isReturnReadCompatibilityError,
  mapReturnRecord,
  matchesReturnSearchTerm,
  normalizeReturnFilterEndDate,
  normalizeReturnFilterStartDate,
  normalizeReturnStatusToDb,
  parseBoundedInteger,
  parseReturnRefundMethod,
  resolveReturnsOrganizationId,
  sanitizeReturnNotes,
  validateReturnAgainstOriginalSale,
} from './_lib';

const MAX_RETURN_DAYS = 30;
const MAX_ITEMS_PER_RETURN = 50;
const MAX_REASON_LENGTH = 1000;

const createReturnSchema = z.object({
  originalSaleId: z.string().uuid('Invalid original sale ID'),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  reason: z.string().trim().min(1, 'Return reason is required').max(MAX_REASON_LENGTH),
  notes: z.string().max(MAX_REASON_LENGTH).optional().or(z.literal('')),
  refundMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']).optional(),
  items: z
    .array(
      z.object({
        originalSaleItemId: z.string().uuid('Invalid sale item ID'),
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().min(1).max(10000),
        unitPrice: z.number().min(0).max(999999.99),
        reason: z.string().max(MAX_REASON_LENGTH).optional(),
      })
    )
    .min(1, 'At least one item is required')
    .max(MAX_ITEMS_PER_RETURN),
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

function sanitizeReason(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_REASON_LENGTH);
}

function buildReturnsListQuery(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  organizationId: string,
  options?: { includeCount?: boolean }
) {
  return supabase
    .from('returns')
    .select(
      `
      id,
      original_sale_id,
      customer_id,
      status,
      reason,
      refund_method,
      total_amount,
      notes,
      processed_at,
      created_at,
      updated_at,
      customer:customers(name, email, phone)
    `,
      options?.includeCount ? { count: 'exact' } : undefined
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
}

export async function GET(request: NextRequest) {
  try {
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
      const { searchParams } = new URL(request.url);
      const page = parseBoundedInteger(searchParams.get('page'), 1, 1, 100000);
      const limit = parseBoundedInteger(searchParams.get('limit'), 25, 1, 100);
      const search = (searchParams.get('search') || '').trim();
      const status = normalizeReturnStatusToDb(searchParams.get('status'));
      const customerId = (searchParams.get('customerId') || '').trim();
      const originalSaleId = (searchParams.get('originalSaleId') || '').trim();
      const startDate = normalizeReturnFilterStartDate(searchParams.get('startDate'));
      const endDate = normalizeReturnFilterEndDate(searchParams.get('endDate'));
      const refundMethod = (searchParams.get('refundMethod') || '').trim();
      const normalizedRefundMethod = refundMethod ? parseReturnRefundMethod(refundMethod) : null;

      if (refundMethod && !normalizedRefundMethod) {
        return NextResponse.json({ error: 'Invalid refund method filter' }, { status: 400 });
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const compatFilters = {
        status,
        customerId: customerId || null,
        originalSaleId: originalSaleId || null,
        startDate,
        endDate,
        refundMethod: normalizedRefundMethod,
      };

      if (search) {
        try {
          const allRows = await fetchAllPagedRows((batchFrom, batchTo) =>
            applyReturnReadFiltersToQuery(
              buildReturnsListQuery(supabase, organizationId),
              compatFilters
            ).range(batchFrom, batchTo)
          ) as Parameters<typeof mapReturnRecord>[0][];

          const filteredRows = allRows.filter((row) => matchesReturnSearchTerm(row, search));
          const total = filteredRows.length;
          const totalPages = Math.max(1, Math.ceil(total / limit));
          const pageRows = filteredRows.slice(from, from + limit).map(mapReturnRecord);

          return NextResponse.json({
            returns: pageRows,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          });
        } catch (error) {
          if (!isReturnReadCompatibilityError(error)) {
            return NextResponse.json(
              { error: error instanceof Error ? error.message : 'Failed to search returns' },
              { status: 500 }
            );
          }

          const compatRows = await hydrateReturnCustomers(
            supabase,
            await fetchReturnRowsCompat(supabase, {
              organizationId,
              filters: compatFilters,
            })
          );
          const filteredRows = compatRows.filter((row) => matchesReturnSearchTerm(row, search));
          const total = filteredRows.length;
          const totalPages = Math.max(1, Math.ceil(total / limit));
          const pageRows = filteredRows.slice(from, from + limit).map(mapReturnRecord);

          return NextResponse.json({
            returns: pageRows,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          });
        }
      }

      const query = applyReturnReadFiltersToQuery(
        buildReturnsListQuery(supabase, organizationId, { includeCount: true }),
        compatFilters
      );
      const { data, error, count } = await query.range(from, to);

      if (error) {
        if (!isReturnReadCompatibilityError(error)) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const compatRows = await fetchReturnRowsCompat(supabase, {
          organizationId,
          filters: compatFilters,
        });
        const total = compatRows.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const pageRows = (
          await hydrateReturnCustomers(supabase, compatRows.slice(from, from + limit))
        ).map(mapReturnRecord);

        return NextResponse.json({
          returns: pageRows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        });
      }

      const rows = Array.isArray(data) ? data : [];
      const total = Number(count ?? rows.length);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const pageRows = rows.map(mapReturnRecord);

      return NextResponse.json({
        returns: pageRows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    const url = new URL(request.url);
    const response = await fetch(`${base}/returns${url.search}`, {
      headers: forwardHeaders(request),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER'],
    });
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const payload = createReturnSchema.parse(await request.json());
    const normalizedPayload = {
      originalSaleId: payload.originalSaleId,
      customerId: payload.customerId,
      reason: payload.reason.trim(),
      notes: sanitizeReturnNotes(payload.notes),
      refundMethod: parseReturnRefundMethod(payload.refundMethod),
      items: payload.items.map((item) => ({
        originalSaleItemId: item.originalSaleItemId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reason: sanitizeReason(item.reason),
      })),
    };

    const base = backendBase();
    const useBackend = !!base && !isSupabaseActive();
    if (useBackend) {
      const response = await fetch(`${base}/returns`, {
        method: 'POST',
        headers: forwardHeaders(request),
        body: JSON.stringify(normalizedPayload),
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
    const saleValidation = await validateReturnAgainstOriginalSale(supabase, {
      organizationId,
      originalSaleId: normalizedPayload.originalSaleId,
      items: normalizedPayload.items,
      maxReturnDays: MAX_RETURN_DAYS,
    });

    if (!saleValidation.ok) {
      return NextResponse.json({ error: saleValidation.error }, { status: saleValidation.status });
    }

    const now = new Date().toISOString();
    const totalAmount = saleValidation.normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const insertReturnPayload: Record<string, unknown> = {
      organization_id: organizationId,
      original_sale_id: normalizedPayload.originalSaleId,
      customer_id: normalizedPayload.customerId || saleValidation.sale.customerId || null,
      user_id: auth.userId || null,
      status: 'PENDING',
      refund_method: normalizedPayload.refundMethod,
      total_amount: totalAmount,
      reason: normalizedPayload.reason,
      notes: normalizedPayload.notes,
      created_at: now,
      updated_at: now,
    };

    const { data: createdReturn, error: createReturnError } = await supabase
      .from('returns')
      .insert(insertReturnPayload)
      .select('id')
      .single();

    if (createReturnError || !createdReturn?.id) {
      return NextResponse.json(
        { error: createReturnError?.message || 'Failed to create return' },
        { status: 500 }
      );
    }

    const { error: createItemsError } = await supabase.from('return_items').insert(
      saleValidation.normalizedItems.map((item) => ({
        return_id: createdReturn.id,
        product_id: item.productId,
        original_sale_item_id: item.originalSaleItemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        reason: item.reason,
      }))
    );

    if (createItemsError) {
      await supabase
        .from('returns')
        .delete()
        .eq('id', createdReturn.id)
        .eq('organization_id', organizationId);
      return NextResponse.json({ error: createItemsError.message }, { status: 500 });
    }

    const mappedReturn = await fetchMappedReturnById(supabase, createdReturn.id, organizationId);

    return NextResponse.json(
      {
        return: mappedReturn,
        summary: {
          totalItems: saleValidation.normalizedItems.length,
          totalQuantity: saleValidation.normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
          total: totalAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create return' },
      { status: 500 }
    );
  }
}
