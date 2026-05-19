import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { assertSuperAdmin } from "@/app/api/_utils/auth";

// Whitelist de campos editables — evita modificación de campos sensibles
// como id, created_at, organization_id, etc.
// is_active requiere la migración 20260519_add_is_active_to_users.sql.
const ALLOWED_UPDATE_FIELDS = new Set([
  "full_name",
  "role",
  "phone",
  "is_active",
]);

function pickAllowedFields(body: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await assertSuperAdmin(request);
  if (!("ok" in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const { id } = await context.params;

    const rawBody = (await request.json()) as Record<string, unknown>;
    const updates = pickAllowedFields(rawBody);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Ningún campo válido para actualizar" },
        { status: 400 },
      );
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = supabase;
    }

    // Si se está degradando el rol o desactivando un super admin,
    // verificar que quede al menos uno activo.
    if ("role" in updates || "is_active" in updates) {
      const { data: target } = await adminClient
        .from("users")
        .select("id, role")
        .eq("id", id)
        .single();

      const targetIsSuperAdmin = String(target?.role || "").toUpperCase() === "SUPER_ADMIN";
      const removingSuperRole = "role" in updates && String(updates.role || "").toUpperCase() !== "SUPER_ADMIN";
      const deactivating = "is_active" in updates && updates.is_active === false;

      if (targetIsSuperAdmin && (removingSuperRole || deactivating)) {
        const { count } = await adminClient
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "SUPER_ADMIN");
        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            { error: "No se puede dejar el sistema sin super administradores activos" },
            { status: 400 },
          );
        }
      }

      // Auto-degradación / auto-desactivación
      if (id === auth.userId && (removingSuperRole || deactivating)) {
        return NextResponse.json(
          { error: "No puedes degradar o desactivar tu propia cuenta" },
          { status: 400 },
        );
      }
    }

    const { error } = await adminClient.from("users").update(updates).eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar usuario", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await assertSuperAdmin(request);
  if (!("ok" in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const { id } = await context.params;

    // Protección 1: no permitir auto-eliminación
    if (id === auth.userId) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 },
      );
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = supabase;
    }

    // Protección 2: no permitir borrar el último super admin
    const { data: target } = await adminClient
      .from("users")
      .select("role")
      .eq("id", id)
      .single();

    if (String(target?.role || "").toUpperCase() === "SUPER_ADMIN") {
      const { count } = await adminClient
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "SUPER_ADMIN");
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "No se puede eliminar el último super administrador" },
          { status: 400 },
        );
      }
    }

    const { error } = await adminClient.from("users").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar usuario", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
