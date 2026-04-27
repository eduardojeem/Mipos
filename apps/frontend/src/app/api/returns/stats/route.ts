import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import { isSupabaseActive } from '@/lib/env';
import {
  calculateReturnsStats,
  fetchReturnRowsCompat,
  hydrateReturnCustomers,
  isMissingColumnError,
  isReturnReadCompatibilityError,
  matchesReturnSearchTerm,
  normalizeReturnFilterEndDate,
  normalizeReturnFilterStartDate,
  normalizeReturnStatusToDb,
  parseReturnRefundMethod,
  resolveReturnsOrganizationId,
} from '../_lib';

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

async function countSalesCompat(
  supabase: any,
  organizationId: string,
  startDate: string | null,
  endDate: string | null
) {
  let scopedQuery = supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (startDate) scopedQuery = scopedQuery.gte('created_at', startDate);
  if (endDate) scopedQuery = scopedQuery.lte('created_at', endDate);

  const scopedResult = await scopedQuery;
  if (!scopedResult.error) {
    return Number(scopedResult.count || 0);
  }

  if (!isMissingColumnError(scopedResult.error)) {
    throw new Error(scopedResult.error.message);
  }

  let legacyQuery = supabase.from('sales').select('id');
  if (startDate) legacyQuery = legacyQuery.gte('created_at', startDate);
  if (endDate) legacyQuery = legacyQuery.lte('created_at', endDate);

  const legacyResult = await legacyQuery;
  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return Array.isArray(legacyResult.data) ? legacyResult.data.length : 0;
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

      let query = supabase
        .from('returns')
        .select(`
          id,
          original_sale_id,
          customer_id,
          status,
          reason,
          refund_method,
          total_amount,
          processed_at,
          created_at,
          updated_at,
          customer:customers(name)
        `)
        .eq('organization_id', organizationId);

      if (status) query = query.eq('status', status);
      if (customerId) query = query.eq('customer_id', customerId);
      if (originalSaleId) query = query.eq('original_sale_id', originalSaleId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      if (normalizedRefundMethod) query = query.eq('refund_method', normalizedRefundMethod);

      const { data, error } = await query;
      let filteredRows = Array.isArray(data) ? data : [];

      if (error) {
        if (!isReturnReadCompatibilityError(error)) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const compatRows = await fetchReturnRowsCompat(supabase, {
          organizationId,
          filters: {
            status,
            customerId: customerId || null,
            originalSaleId: originalSaleId || null,
            startDate,
            endDate,
            refundMethod: normalizedRefundMethod,
          },
        });

        filteredRows = search
          ? (await hydrateReturnCustomers(supabase, compatRows)).filter((row: any) =>
              matchesReturnSearchTerm(row, search)
            )
          : compatRows;
      } else if (search) {
        filteredRows = filteredRows.filter((row: any) => matchesReturnSearchTerm(row, search));
      }

      const salesCount = await countSalesCompat(supabase, organizationId, startDate, endDate);
      return NextResponse.json(calculateReturnsStats(filteredRows, salesCount));
    }

    const url = new URL(request.url);
    const response = await fetch(`${base}/returns/stats${url.search}`, {
      headers: forwardHeaders(request),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute returns stats' },
      { status: 500 }
    );
  }
}
