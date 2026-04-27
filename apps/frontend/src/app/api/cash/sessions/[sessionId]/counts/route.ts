import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { enrichCashSessions, fetchCashSessionById } from "@/app/api/cash/_lib/session-summary";
import { validateRole } from "@/app/api/_utils/role-validation";
import { validateOrganizationAccess } from "@/app/api/_utils/organization";

type CashCountInput = {
  denomination: number;
  quantity: number;
  total: number;
};

function resolveBackendBase() {
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").trim();
}

function sanitizeCounts(rawCounts: unknown): CashCountInput[] {
  if (!Array.isArray(rawCounts)) {
    return [];
  }

  return rawCounts
    .map((count) => {
      const denomination = Number((count as { denomination?: unknown })?.denomination ?? 0);
      const quantity = Number((count as { quantity?: unknown })?.quantity ?? 0);
      const providedTotal = Number((count as { total?: unknown })?.total ?? Number.NaN);
      const total = Number.isFinite(providedTotal) ? providedTotal : denomination * quantity;

      return {
        denomination,
        quantity,
        total,
      };
    })
    .filter(
      (count) =>
        Number.isFinite(count.denomination) &&
        count.denomination >= 0 &&
        Number.isInteger(count.quantity) &&
        count.quantity >= 0 &&
        Number.isFinite(count.total) &&
        count.total >= 0,
    );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const counts = sanitizeCounts(body?.counts);
    const organizationId = (request.headers.get("x-organization-id") || "").trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Session id is required" }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "Organization header missing" }, { status: 400 });
    }

    const roleValidation = await validateRole(request, {
      roles: ["ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER"],
      permissions: ["cash.close"],
      requireAllPermissions: true,
    });

    if (!roleValidation.ok) {
      return NextResponse.json(roleValidation.body, { status: roleValidation.status });
    }

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (roleValidation.userId && roleValidation.userRole !== "SUPER_ADMIN") {
      const hasOrganizationAccess = await validateOrganizationAccess(
        roleValidation.userId,
        organizationId,
      );
      if (!hasOrganizationAccess) {
        return NextResponse.json(
          { error: "Access denied to selected organization" },
          { status: 403 },
        );
      }
    }

    const backendBase = resolveBackendBase();
    if (backendBase && session?.access_token) {
      try {
        const backendResponse = await fetch(
          `${backendBase}/cash/sessions/${encodeURIComponent(sessionId)}/counts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              "x-organization-id": organizationId,
            },
            body: JSON.stringify({
              counts: counts.map((count) => ({
                denomination: count.denomination,
                quantity: count.quantity,
              })),
            }),
          },
        );

        const contentType = backendResponse.headers.get("content-type") || "";
        if (backendResponse.ok && contentType.includes("application/json")) {
          const payload = await backendResponse.json();
          return NextResponse.json(payload, { status: backendResponse.status });
        }

        if ([400, 401, 403, 404].includes(backendResponse.status)) {
          const payload = contentType.includes("application/json")
            ? await backendResponse.json()
            : { error: await backendResponse.text() };
          return NextResponse.json(payload, { status: backendResponse.status });
        }
      } catch {
        // Fall back to direct Supabase mutation below.
      }
    }

    let writer: any = null;
    try {
      writer = createAdminClient();
    } catch {
      writer = null;
    }

    if (!writer) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        writer = createServiceClient(supabaseUrl, serviceRoleKey);
      }
    }

    if (!writer) {
      writer = supabase;
    }

    const existingSession = await fetchCashSessionById(writer, organizationId, sessionId);
    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { error: deleteError } = await writer
      .from("cash_counts")
      .delete()
      .eq("session_id", sessionId)
      .eq("organization_id", organizationId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to replace counts", details: deleteError.message },
        { status: 500 },
      );
    }

    const rowsToInsert = counts
      .filter((count) => count.quantity > 0)
      .map((count) => ({
        session_id: sessionId,
        organization_id: organizationId,
        denomination: count.denomination,
        quantity: count.quantity,
        total: count.total,
      }));

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await writer.from("cash_counts").insert(rowsToInsert);
      if (insertError) {
        return NextResponse.json(
          { error: "Failed to save cash counts", details: insertError.message },
          { status: 500 },
        );
      }
    }

    const updatedSession = await fetchCashSessionById(writer, organizationId, sessionId);
    if (!updatedSession) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    const [enrichedSession] = await enrichCashSessions(writer, organizationId, [updatedSession], {
      recentMovementsLimit: 6,
    });

    return NextResponse.json({ session: enrichedSession ?? null }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to save cash counts", message: error?.message || String(error) },
      { status: 500 },
    );
  }
}
