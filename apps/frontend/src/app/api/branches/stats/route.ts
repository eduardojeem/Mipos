import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization';
import { createAdminClient } from '@/lib/supabase/server';

function getOrgId(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-organization-id')?.trim() ||
    request.nextUrl.searchParams.get('organizationId')?.trim() ||
    undefined
  );
}

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const orgId = access.context.companyId;
  const adminClient = await createAdminClient();
  const dayStart = startOfDay();
  const monthStart = startOfMonth();

  // Fetch branches first
  const { data: branches, error: branchError } = await adminClient
    .from('branches')
    .select('id,name,slug,is_active')
    .eq('organization_id', orgId);

  if (branchError) return NextResponse.json({ error: branchError.message }, { status: 500 });
  if (!branches?.length) return NextResponse.json({ success: true, data: [] });

  const branchIds = branches.map((b: { id: string }) => b.id);

  // Run all stat queries in parallel
  const [
    userBranchesRes,
    cashSessionsRes,
    salesTodayRes,
    salesMonthRes,
  ] = await Promise.all([
    // Users assigned per branch (from user_branches table)
    adminClient
      .from('user_branches')
      .select('branch_id')
      .in('branch_id', branchIds)
      .eq('organization_id', orgId),

    // Active cash sessions per branch
    adminClient
      .from('cash_sessions')
      .select('branch_id, status')
      .in('branch_id', branchIds)
      .eq('status', 'open'),

    // Sales today per branch
    adminClient
      .from('sales')
      .select('branch_id, total')
      .in('branch_id', branchIds)
      .gte('created_at', dayStart),

    // Sales this month per branch
    adminClient
      .from('sales')
      .select('branch_id, total')
      .in('branch_id', branchIds)
      .gte('created_at', monthStart),
  ]);

  // Aggregate per branch
  type BranchRow = { branch_id: string };
  type SaleRow = { branch_id: string; total: number | null };

  const userCount: Record<string, number> = {};
  const cashCount: Record<string, number> = {};
  const salesToday: Record<string, number> = {};
  const salesMonth: Record<string, number> = {};

  for (const row of (userBranchesRes.data ?? []) as BranchRow[]) {
    userCount[row.branch_id] = (userCount[row.branch_id] ?? 0) + 1;
  }
  for (const row of (cashSessionsRes.data ?? []) as BranchRow[]) {
    cashCount[row.branch_id] = (cashCount[row.branch_id] ?? 0) + 1;
  }
  for (const row of (salesTodayRes.data ?? []) as SaleRow[]) {
    salesToday[row.branch_id] = (salesToday[row.branch_id] ?? 0) + Number(row.total ?? 0);
  }
  for (const row of (salesMonthRes.data ?? []) as SaleRow[]) {
    salesMonth[row.branch_id] = (salesMonth[row.branch_id] ?? 0) + Number(row.total ?? 0);
  }

  const data = branches.map((b: { id: string; name: string; slug: string; is_active: boolean }) => ({
    branch_id: b.id,
    users_assigned: userCount[b.id] ?? 0,
    active_cash_sessions: cashCount[b.id] ?? 0,
    sales_today: salesToday[b.id] ?? 0,
    sales_month: salesMonth[b.id] ?? 0,
  }));

  return NextResponse.json({ success: true, data });
}
