import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import { getReturnOperationalContext, processReturnLocally, resolveReturnsOrganizationId } from '../../_lib';
import { isSupabaseActive } from '@/lib/env';

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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    });
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const base = backendBase();
    const useBackend = !!base && !isSupabaseActive();
    if (useBackend) {
      const response = await fetch(`${base}/returns/${id}/process`, {
        method: 'POST',
        headers: forwardHeaders(request),
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
    const result = await processReturnLocally(supabase, {
      returnId: id,
      organizationId,
      userId: auth.userId || null,
      context: getReturnOperationalContext(request),
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ return: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process return' },
      { status: 500 }
    );
  }
}
