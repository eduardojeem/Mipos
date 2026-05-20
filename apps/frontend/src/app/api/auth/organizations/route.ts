import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { normalizeRole } from "@/lib/roles";

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

type UserRoleRow = {
  role?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

function getRoleName(row: UserRoleRow): string {
  const role = Array.isArray(row.role) ? row.role[0] : row.role;
  return typeof role?.name === "string" ? role.name : "";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = await createAdminClient();
    let organizationIds: string[] = [];

    const [profileResult, rolesResult] = await Promise.allSettled([
      admin.from("users").select("role, organization_id").eq("id", user.id).maybeSingle(),
      admin
        .from("user_roles")
        .select("role:roles(name)")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    const profile =
      profileResult.status === "fulfilled"
        ? ((profileResult.value as { data?: { role?: string | null; organization_id?: string | null } | null }).data || null)
        : null;
    const roleRows =
      rolesResult.status === "fulfilled"
        ? (((rolesResult.value as { data?: UserRoleRow[] | null }).data || []) as UserRoleRow[])
        : [];
    const appRole =
      typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "";
    const isSuperAdmin =
      normalizeRole(appRole) === "SUPER_ADMIN" ||
      normalizeRole(profile?.role) === "SUPER_ADMIN" ||
      roleRows.some((row) => normalizeRole(getRoleName(row)) === "SUPER_ADMIN");

    if (isSuperAdmin) {
      const { data: organizations, error: orgsError } = await admin
        .from("organizations")
        .select(
          "id, name, slug, subscription_plan, subscription_status, created_at, settings, branding",
        )
        .neq("subscription_status", "SUSPENDED")
        .order("name", { ascending: true });

      if (orgsError) {
        return NextResponse.json({ error: orgsError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        organizations: organizations || [],
      });
    }

    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);

    organizationIds = Array.from(
      new Set(
        (memberships || [])
          .map(
            (row: { organization_id?: string | null }) => row.organization_id,
          )
          .filter(
            (value: string | null | undefined): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    );

    if (!organizationIds.length) {
      // Legacy fallback: some users predate the organization_members table and
      // only have users.organization_id set. Surface that org so they can sign
      // in, but DO NOT auto-create a membership row — silently restoring a
      // membership that an admin removed would defeat any deliberate revoke.
      // If this codepath fires, the data inconsistency should be fixed in the
      // DB (either by creating the membership with a proper role, or by
      // clearing users.organization_id).
      if (profile?.organization_id) {
        organizationIds = [profile.organization_id];
        console.warn(
          `[auth/organizations] User ${user.id} has users.organization_id=${profile.organization_id} but no organization_members row. Surfacing as legacy fallback; admin should reconcile.`,
        );
      }
    }

    if (!organizationIds.length) {
      return NextResponse.json({ success: true, organizations: [] });
    }

    const { data: organizations, error: orgsError } = await admin
      .from("organizations")
      .select(
        "id, name, slug, subscription_plan, subscription_status, created_at, settings, branding",
      )
      .in("id", organizationIds)
      .order("name", { ascending: true });

    if (orgsError) {
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    const activeOrganizations = (
      (organizations || []) as OrganizationRow[]
    ).filter((org) => org.subscription_status !== "SUSPENDED");

    return NextResponse.json({
      success: true,
      organizations: activeOrganizations,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
