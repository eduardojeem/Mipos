import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  created_at?: string | null;
  settings?: Record<string, unknown> | null;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  } | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const admin = await createAdminClient();
    let organizationIds: string[] = [];

    const { data: memberships } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);

    organizationIds = Array.from(
      new Set(
        (memberships || [])
          .map((row: { organization_id?: string | null }) => row.organization_id)
          .filter((value: string | null | undefined): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    if (!organizationIds.length) {
      const { data: userRow } = await admin
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userRow?.organization_id) {
        organizationIds = [userRow.organization_id];

        // Auto-repair: create missing organization_members entry
        await admin
          .from('organization_members')
          .upsert(
            { user_id: user.id, organization_id: userRow.organization_id },
            { onConflict: 'user_id,organization_id', ignoreDuplicates: true }
          )
          .then(() => {
            console.log(`Auto-repair: created organization_members for user ${user.id} → org ${userRow.organization_id}`);
          })
          .catch((err: unknown) => {
            console.warn('Auto-repair organization_members failed:', err);
          });
      }
    }

    if (!organizationIds.length) {
      return NextResponse.json({ success: true, organizations: [] });
    }

    const { data: organizations, error: orgsError } = await admin
      .from('organizations')
      .select('id, name, slug, subscription_plan, subscription_status, created_at, settings, branding')
      .in('id', organizationIds)
      .order('name', { ascending: true });

    if (orgsError) {
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    const activeOrganizations = ((organizations || []) as OrganizationRow[]).filter(
      (org) => org.subscription_status !== 'SUSPENDED',
    );

    return NextResponse.json({
      success: true,
      organizations: activeOrganizations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
