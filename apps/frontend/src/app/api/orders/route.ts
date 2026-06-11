import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit-log";
import { resolveTenantContextFromHeaders } from "@/lib/domain/request-tenant";
import { getValidatedOrganizationId } from "@/lib/organization";
import {
  fetchOrderProductsForOrganization,
  getEffectiveOrderProductPrice,
  isSchemaMissingError,
} from "@/lib/public-site/order-products";
import { enrichPublicCatalogProductsWithOffers } from "@/lib/public-site/catalog-data";
import { getConfiguredShippingCost } from "@/lib/pos/calculations";
import { notifyOrderConfirmation } from "@/lib/email/order-notifications";
import { getOrderBusinessConfig } from "@/lib/orders/order-business-config";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NOTES_LENGTH = 500;
const MAX_SHIPPING_REGION_LENGTH = 80;
const FULFILLMENT_TYPES = ["DELIVERY", "PICKUP"] as const;
type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

const MAX_QTY_PER_PRODUCT = 10;
const MAX_TOTAL_ITEMS = 50;
const ORDER_LIST_SORT_FIELDS = new Set([
  "created_at",
  "total",
  "status",
] as const);
const ORDER_FILTER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;
type OrderFilterStatus = (typeof ORDER_FILTER_STATUSES)[number];
const ORDER_FILTER_STATUS_SET = new Set<OrderFilterStatus>(
  ORDER_FILTER_STATUSES,
);
const ORDER_LIST_SELECT = `
  id,
  order_number,
  customer_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  subtotal,
  shipping_cost,
  total,
  payment_method,
  payment_status,
  status,
  notes,
  order_source,
  created_at,
  updated_at,
  organization_id,
  order_items:sale_items (
    id,
    product_id,
    quantity,
    unit_price,
    products (
      name,
      image_url
    )
  )
`;
const ORDER_LIST_SELECT_LEGACY = ORDER_LIST_SELECT.replace(/\s+payment_status,\n/, "\n");

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName?: string;
}

interface CreateOrderRequest {
  items: OrderItem[];
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  paymentMethod: "CASH" | "CARD" | "TRANSFER";
  notes?: string;
  shippingCost?: number;
  shippingRegion?: string;
  fulfillmentType?: FulfillmentType;
  buyerContext?: {
    buyerType?: "guest" | "customer" | "business";
    buyerUserId?: string | null;
    buyerOrganizationId?: string | null;
    buyerOrganizationName?: string | null;
  };
}

function isMissingBuyerColumnsError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || "");
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("buyer_") ||
    message.includes("schema cache")
  );
}

function isMissingFulfillmentColumnError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || "");
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("fulfillment_type") ||
    message.includes("schema cache")
  );
}

function isMissingPaymentStatusColumnError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || "");
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("payment_status") ||
    message.includes("schema cache")
  );
}

async function rollbackCreatedOrder(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  orderId: string,
) {
  await supabase.from("sale_items").delete().eq("sale_id", orderId);
  await supabase.from("sales").delete().eq("id", orderId);
}

async function restoreReservedStock(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  reservations: Array<{ productId: string; quantity: number }>,
) {
  for (const reservation of reservations) {
    const { data: product, error: readError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", reservation.productId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (readError || !product) {
      console.error("[orders] failed to read product while restoring stock", {
        productId: reservation.productId,
        error: readError,
      });
      continue;
    }

    const nextStock =
      Number((product as { stock_quantity?: number | null }).stock_quantity || 0) +
      reservation.quantity;
    const { error: restoreError } = await supabase
      .from("products")
      .update({ stock_quantity: nextStock })
      .eq("id", reservation.productId)
      .eq("organization_id", organizationId);

    if (restoreError) {
      console.error("[orders] failed to restore stock", {
        productId: reservation.productId,
        error: restoreError,
      });
    }
  }
}

async function resolveSellerUserId(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
): Promise<string | null> {
  const { data: ownerMember, error: ownerError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("is_owner", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ownerError && ownerMember?.user_id) {
    return String(ownerMember.user_id);
  }

  const { data: memberRows, error: memberError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!memberError && memberRows?.[0]?.user_id) {
    return String(memberRows[0].user_id);
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!userError && userRow?.id) {
    return String(userRow.id);
  }

  console.error("[orders] no seller user found for organization", {
    organizationId,
    ownerError,
    memberError,
    userError,
  });
  return null;
}

function getOrderStartDate(dateRange: string | null): string | null {
  if (!dateRange || dateRange === "all") {
    return null;
  }

  const now = new Date();
  switch (dateRange) {
    case "today":
      now.setHours(0, 0, 0, 0);
      break;
    case "week":
      now.setDate(now.getDate() - 7);
      break;
    case "month":
      now.setMonth(now.getMonth() - 1);
      break;
    case "year":
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return null;
  }

  return now.toISOString();
}

function sanitizeOrderSearchTerm(value: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s@._\-#]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// GET - Obtener pedidos (para admin)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await limiter(request);
    if (rateLimitResult) return rateLimitResult;

    const authClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = await getValidatedOrganizationId(request);
    if (!orgId) {
      return NextResponse.json(
        { error: "No se encontro una organizacion valida" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20),
    );
    const statusParam = (url.searchParams.get("status") || "").trim();
    const status = ORDER_FILTER_STATUS_SET.has(statusParam as OrderFilterStatus)
      ? (statusParam as OrderFilterStatus)
      : "";
    const paymentMethod = (url.searchParams.get("paymentMethod") || "").trim().toUpperCase();
    const paymentStatus = (url.searchParams.get("paymentStatus") || "").trim().toUpperCase();
    const customerEmail = (url.searchParams.get("customerEmail") || "").trim();
    const search = sanitizeOrderSearchTerm(url.searchParams.get("search"));
    const dateRange = url.searchParams.get("dateRange");
    const sortByParam = (url.searchParams.get("sortBy") || "created_at").trim();
    const sortOrder =
      url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const sortBy = ORDER_LIST_SORT_FIELDS.has(
      sortByParam as "created_at" | "total" | "status",
    )
      ? sortByParam
      : "created_at";
    const startDate = getOrderStartDate(dateRange);

    const offset = (page - 1) * limit;
    const supabase = await createAdminClient();

    const buildOrdersQuery = (selectClause: string, includePaymentStatusFilter: boolean) => {
      let ordersQuery = supabase
        .from("sales")
        .select(selectClause, { count: "exact" })
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);

      if (status) {
        ordersQuery = ordersQuery.eq("status", status);
      }

      const allowedPaymentMethods = ["CASH", "CARD", "TRANSFER", "DIGITAL_WALLET"] as const;
      const paymentMethodFilter = allowedPaymentMethods.find((method) => method === paymentMethod);
      if (paymentMethod === "MANUAL") {
        ordersQuery = ordersQuery.in("payment_method", ["CASH", "TRANSFER"]);
      } else if (paymentMethodFilter) {
        ordersQuery = ordersQuery.eq("payment_method", paymentMethodFilter);
      }

      if (includePaymentStatusFilter) {
        if (paymentStatus === "PENDING") {
          ordersQuery = ordersQuery.or("payment_status.eq.PENDING,payment_status.is.null");
        } else if (["PAID", "FAILED", "REFUNDED"].includes(paymentStatus)) {
          ordersQuery = ordersQuery.eq("payment_status", paymentStatus);
        }
      }

      if (customerEmail) {
        ordersQuery = ordersQuery.eq("customer_email", customerEmail);
      }

      if (startDate) {
        ordersQuery = ordersQuery.gte("created_at", startDate);
      }

      if (search) {
        ordersQuery = ordersQuery.or(
          `customer_name.ilike.%${search}%,order_number.ilike.%${search}%,customer_email.ilike.%${search}%,notes.ilike.%${search}%`,
        );
      }

      return ordersQuery;
    };

    let { data: orders, count, error } = await buildOrdersQuery(ORDER_LIST_SELECT, true);

    if (error && isMissingPaymentStatusColumnError(error)) {
      console.warn("[orders] payment_status column missing; loading orders with legacy payment defaults");
      const legacyResult = await buildOrdersQuery(ORDER_LIST_SELECT_LEGACY, false);
      orders = legacyResult.data;
      count = legacyResult.count;
      error = legacyResult.error;
    }

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Error al obtener pedidos" },
        { status: 500 },
      );
    }

    const orderRows = (Array.isArray(orders) ? orders : []) as unknown as Array<Record<string, unknown>>;
    const normalizedOrders = orderRows.map(
      (order: Record<string, unknown>) => ({
        ...order,
        payment_status:
          (order as { payment_status?: string | null }).payment_status ||
          "PENDING",
        order_items: (
          (order as { order_items?: Array<Record<string, unknown>> })
            .order_items || []
        ).map((item) => {
          const unitPrice = Number(item.unit_price || 0);
          const quantity = Number(item.quantity || 0);
          const productRef = item.products as
            | { name?: string; image_url?: string }
            | null
            | undefined;

          return {
            ...item,
            product_name: String(
              item.product_name || productRef?.name || "Producto",
            ),
            subtotal: Number(item.subtotal || unitPrice * quantity),
            products: productRef
              ? {
                  name: productRef.name || "Producto",
                  image_url: productRef.image_url,
                }
              : undefined,
          };
        }),
      }),
    );

    // 'count' viene directo de la query principal (select con { count: 'exact' }).
    // No se necesita una segunda query de conteo.
    const countResult = count ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        orders: normalizedOrders,
        pagination: {
          page,
          limit,
          total: countResult || 0,
          totalPages: Math.ceil((countResult || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/orders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al obtener pedidos",
      },
      { status: 500 },
    );
  }
}

// POST - Crear nuevo pedido publico
export async function POST(request: NextRequest) {
  try {
    const strictLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 20,
    });
    const rateLimitResult = await strictLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const body: CreateOrderRequest = await request.json();
    const {
      items,
      customerInfo,
      paymentMethod,
      notes,
      shippingCost = 0,
      shippingRegion = "General",
      fulfillmentType = "DELIVERY",
      buyerContext,
    } = body;
    const safeFulfillmentType: FulfillmentType = FULFILLMENT_TYPES.includes(
      fulfillmentType as FulfillmentType,
    )
      ? (fulfillmentType as FulfillmentType)
      : "DELIVERY";

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items requeridos" }, { status: 400 });
    }

    if (
      !customerInfo?.name?.trim() ||
      !customerInfo?.email?.trim() ||
      !customerInfo?.phone?.trim() ||
      (safeFulfillmentType === "DELIVERY" && !customerInfo?.address?.trim())
    ) {
      return NextResponse.json(
        {
          error:
            safeFulfillmentType === "DELIVERY"
              ? "Nombre, email, telefono y direccion de entrega son requeridos"
              : "Nombre, email y telefono son requeridos",
        },
        { status: 400 },
      );
    }

    // Validación de formato de email server-side. Antes solo se chequeaba
    // presencia y el cliente podía mandar "hola" como email.
    if (!EMAIL_REGEX.test(String(customerInfo.email).trim())) {
      return NextResponse.json(
        { error: "Email invalido" },
        { status: 400 },
      );
    }

    if (!["CASH", "CARD", "TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Metodo de pago invalido" },
        { status: 400 },
      );
    }

    const normalizedShippingCost = Number(shippingCost ?? 0);
    if (
      !Number.isFinite(normalizedShippingCost) ||
      normalizedShippingCost < 0
    ) {
      return NextResponse.json(
        { error: "Costo de envio invalido" },
        { status: 400 },
      );
    }

    // Truncate notes y shippingRegion para evitar payload bombing
    const safeNotes =
      typeof notes === "string" ? notes.trim().slice(0, MAX_NOTES_LENGTH) : "";
    const safeShippingRegion =
      safeFulfillmentType === "PICKUP"
        ? "Retiro en local"
        : typeof shippingRegion === "string"
          ? shippingRegion.trim().slice(0, MAX_SHIPPING_REGION_LENGTH) || "General"
          : "General";

    const normalizedItems = items.map((item) => ({
      productId: String(item.productId || "").trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }));

    const invalidItem = normalizedItems.find(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > MAX_QTY_PER_PRODUCT ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0,
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          error: `Cada producto debe tener una cantidad valida entre 1 y ${MAX_QTY_PER_PRODUCT}.`,
        },
        { status: 400 },
      );
    }

    const totalRequestedItems = normalizedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    if (totalRequestedItems > MAX_TOTAL_ITEMS) {
      return NextResponse.json(
        {
          error: `Cantidad maxima de items excedida. Maximo ${MAX_TOTAL_ITEMS} items por pedido.`,
        },
        { status: 400 },
      );
    }

    const tenantContext = await resolveTenantContextFromHeaders(
      request.headers,
    );
    if (tenantContext.kind === "tenant-not-found") {
      return NextResponse.json(
        { error: "Tenant publico no encontrado" },
        { status: 404 },
      );
    }

    const headerOrgId = (request.headers.get("x-organization-id") || "").trim();
    const orgId =
      tenantContext.kind === "tenant"
        ? tenantContext.organization.id
        : headerOrgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Cabecera de organizacion no encontrada" },
        { status: 400 },
      );
    }

    if (
      tenantContext.kind === "tenant" &&
      headerOrgId &&
      headerOrgId !== orgId
    ) {
      return NextResponse.json(
        { error: "Conflicto en la cabecera de organizacion" },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();
    const businessConfig = await getOrderBusinessConfig(supabase, orgId);
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    const requestedBuyerType = buyerContext?.buyerType === "business"
      ? "business"
      : user?.id
        ? "customer"
        : "guest";
    let resolvedBuyerUserId: string | null = null;
    let resolvedBuyerOrganizationId: string | null = null;
    let resolvedBuyerOrganizationName: string | null = null;

    if (user?.id) {
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      resolvedBuyerUserId = (userRow as { id?: string } | null)?.id || null;
    }

    if (requestedBuyerType === "business" && resolvedBuyerUserId && buyerContext?.buyerOrganizationId) {
      const requestedBuyerOrgId = String(buyerContext.buyerOrganizationId).trim();
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", resolvedBuyerUserId)
        .eq("organization_id", requestedBuyerOrgId)
        .maybeSingle();

      if (membership) {
        const { data: buyerOrg } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", requestedBuyerOrgId)
          .maybeSingle();

        resolvedBuyerOrganizationId = requestedBuyerOrgId;
        resolvedBuyerOrganizationName =
          typeof (buyerOrg as { name?: string } | null)?.name === "string"
            ? (buyerOrg as { name: string }).name
            : typeof buyerContext.buyerOrganizationName === "string"
              ? buyerContext.buyerOrganizationName.trim().slice(0, 160)
              : null;
      }
    }

    const resolvedBuyerType: "guest" | "customer" | "business" =
      resolvedBuyerOrganizationId ? "business" : resolvedBuyerUserId ? "customer" : "guest";
    const sellerUserId = await resolveSellerUserId(supabase, orgId);

    if (!sellerUserId) {
      return NextResponse.json(
        {
          error:
            "La empresa no tiene un usuario vendedor configurado para recibir pedidos.",
        },
        { status: 409 },
      );
    }

    let products;
    try {
      const rawProducts = await fetchOrderProductsForOrganization(
        supabase,
        orgId,
        normalizedItems.map((item) => item.productId),
      );
      products = await enrichPublicCatalogProductsWithOffers(orgId, rawProducts as any[]) as unknown as typeof rawProducts;
    } catch (error) {
      if (isSchemaMissingError(error)) {
        return NextResponse.json(
          {
            error:
              "La configuracion del catalogo publico todavia no esta lista.",
          },
          { status: 503 },
        );
      }

      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Error al validar productos" },
        { status: 500 },
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos publicados para este tenant" },
        { status: 404 },
      );
    }

    let subtotal = 0;
    const validatedItems: Array<
      OrderItem & { productName: string; validatedPrice: number }
    > = [];

    for (const item of normalizedItems) {
      const product = products.find((current) => current.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Producto ${item.productId} no encontrado` },
          { status: 400 },
        );
      }

      if (!product.is_active) {
        return NextResponse.json(
          { error: `${product.name} no esta disponible` },
          { status: 400 },
        );
      }

      if (product.stock_quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock_quantity}`,
          },
          { status: 400 },
        );
      }

      const validatedPrice = getEffectiveOrderProductPrice(product);
      if (!Number.isFinite(validatedPrice) || validatedPrice < 0) {
        return NextResponse.json(
          { error: `Precio invalido para ${product.name}` },
          { status: 400 },
        );
      }

      if (Math.abs(validatedPrice - item.unitPrice) > 0.01) {
        // Antes solo se warn-eaba y se aceptaba con validatedPrice.
        // Ahora rechazamos: el cliente debe re-validar el carrito y
        // confirmar el nuevo precio antes de crear el pedido. Evita
        // que un atacante itere price-tampering sin consecuencias y
        // protege al usuario honesto de un cobro distinto al esperado.
        console.warn("Price tampering rejected:", {
          productId: item.productId,
          clientPrice: item.unitPrice,
          serverPrice: validatedPrice,
        });
        return NextResponse.json(
          {
            error: `El precio de ${product.name} cambió. Por favor refrescá el carrito.`,
            code: "PRICE_MISMATCH",
            productId: item.productId,
            serverPrice: validatedPrice,
          },
          { status: 409 },
        );
      }

      validatedItems.push({
        ...item,
        productName: product.name,
        validatedPrice,
        unitPrice: validatedPrice,
      });

      subtotal += validatedPrice * item.quantity;
    }

    const serverShippingCost =
      safeFulfillmentType === "PICKUP"
        ? 0
        : getConfiguredShippingCost(
            businessConfig,
            subtotal,
            safeShippingRegion,
          );
    if (Math.abs(serverShippingCost - normalizedShippingCost) > 0.01) {
      console.warn("[orders] client shipping cost adjusted from business config", {
        clientShippingCost: normalizedShippingCost,
        serverShippingCost,
        orgId,
        shippingRegion: safeShippingRegion,
      });
    }
    const total = subtotal + serverShippingCost;
    // Date.now().slice(-6) + random*1000 podía colisionar bajo carga.
    // UUID v4 da 8 hex de unicidad criptográfica.
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomUUID()
      .slice(0, 4)
      .toUpperCase()}`;

    // Buscar customer existente por email para vincularlo al pedido.
    // Antes customer_id quedaba siempre null — todos eran "guest".
    let resolvedCustomerId: string | null = null;
    try {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", orgId)
        .eq("email", String(customerInfo.email).trim().toLowerCase())
        .maybeSingle();
      resolvedCustomerId = (existingCustomer as { id?: string } | null)?.id || null;
    } catch (customerLookupError) {
      // No bloquear: si la tabla customers no existe o falla la query,
      // el pedido se crea como guest (comportamiento anterior).
      console.warn("Customer lookup failed:", customerLookupError);
    }

    const baseOrderPayload = {
      order_number: orderNumber,
      customer_id: resolvedCustomerId,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone,
      customer_address: customerInfo.address?.trim() || null,
      payment_method: paymentMethod,
      payment_status: "PENDING",
      subtotal,
      shipping_cost: serverShippingCost,
      shipping_region: safeShippingRegion,
      fulfillment_type: safeFulfillmentType,
      total,
      notes: safeNotes || null,
      status: "PENDING" as const,
      order_source: "WEB",
      organization_id: orgId,
      user_id: sellerUserId,
      date: new Date().toISOString(),
    };
    const buyerOrderPayload = {
      ...baseOrderPayload,
      buyer_type: resolvedBuyerType,
      buyer_user_id: resolvedBuyerUserId,
      buyer_organization_id: resolvedBuyerOrganizationId,
      buyer_organization_name: resolvedBuyerOrganizationName,
    };
    const { fulfillment_type: _fulfillmentType, ...baseOrderPayloadWithoutFulfillment } =
      baseOrderPayload;
    const { payment_status: _paymentStatus, ...baseOrderPayloadWithoutPayment } =
      baseOrderPayload;
    const {
      fulfillment_type: _baseNoFulfillment,
      payment_status: _baseNoPayment,
      ...baseOrderPayloadLegacy
    } = baseOrderPayload;
    const {
      fulfillment_type: _buyerFulfillmentType,
      ...buyerOrderPayloadWithoutFulfillment
    } = buyerOrderPayload;
    const {
      payment_status: _buyerPaymentStatus,
      ...buyerOrderPayloadWithoutPayment
    } = buyerOrderPayload;
    const {
      fulfillment_type: _buyerNoFulfillment,
      payment_status: _buyerNoPayment,
      ...buyerOrderPayloadLegacy
    } = buyerOrderPayload;

    let { data: order, error: orderError } = await supabase
      .from("sales")
      .insert(buyerOrderPayload as any)
      .select()
      .single();

    if (orderError && isMissingPaymentStatusColumnError(orderError)) {
      console.warn("[orders] payment_status column missing; creating order without payment metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(buyerOrderPayloadWithoutPayment as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError && isMissingFulfillmentColumnError(orderError)) {
      console.warn("[orders] fulfillment_type column missing; creating order without fulfillment metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(buyerOrderPayloadWithoutFulfillment as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError && isMissingPaymentStatusColumnError(orderError)) {
      console.warn("[orders] payment_status and fulfillment fallback required; creating order without optional payment metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(buyerOrderPayloadLegacy as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError && isMissingBuyerColumnsError(orderError)) {
      console.warn("[orders] buyer columns missing; creating order without buyer metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(baseOrderPayload as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError && isMissingPaymentStatusColumnError(orderError)) {
      console.warn("[orders] buyer and payment fallback required; creating order without optional payment metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(baseOrderPayloadWithoutPayment as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError && isMissingFulfillmentColumnError(orderError)) {
      console.warn("[orders] buyer and fulfillment fallback required; creating order without optional metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(baseOrderPayloadWithoutFulfillment as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError && (isMissingPaymentStatusColumnError(orderError) || isMissingFulfillmentColumnError(orderError))) {
      console.warn("[orders] final legacy fallback required; creating order without optional payment/fulfillment metadata");
      const fallbackResult = await supabase
        .from("sales")
        .insert(baseOrderPayloadLegacy as any)
        .select()
        .single();
      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: "Error al crear pedido" },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "El pedido no devolvio datos al crearse" },
        { status: 500 },
      );
    }

    const orderItems = validatedItems.map((item) => ({
      sale_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(orderItems);
    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      await rollbackCreatedOrder(supabase, order.id);
      return NextResponse.json(
        { error: "Error al crear items del pedido" },
        { status: 500 },
      );
    }

    const stockReservations = new Map<
      string,
      { productId: string; productName: string; quantity: number; stockQuantity: number }
    >();

    for (const item of validatedItems) {
      const existing = stockReservations.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        continue;
      }

      const product = products.find((current) => current.id === item.productId);
      if (!product) {
        continue;
      }

      stockReservations.set(item.productId, {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        stockQuantity: Number(product.stock_quantity || 0),
      });
    }

    const reservedStock: Array<{ productId: string; quantity: number }> = [];
    for (const reservation of stockReservations.values()) {
      const nextStock = Math.max(
        0,
        reservation.stockQuantity - reservation.quantity,
      );
      const { data: updatedRows, error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: nextStock })
        .eq("id", reservation.productId)
        .eq("organization_id", orgId)
        .gte("stock_quantity", reservation.quantity)
        .select("id");

      if (updateError || !updatedRows || updatedRows.length === 0) {
        console.error("Error updating stock:", {
          productId: reservation.productId,
          updateError,
          updatedRows,
        });
        await restoreReservedStock(supabase, orgId, reservedStock);
        await rollbackCreatedOrder(supabase, order.id);
        return NextResponse.json(
          {
            error: `No se pudo reservar stock para ${reservation.productName}. Revisa el carrito e intenta de nuevo.`,
          },
          { status: 409 },
        );
      }

      reservedStock.push({
        productId: reservation.productId,
        quantity: reservation.quantity,
      });
    }

    console.log("Order created successfully:", order.id);

    try {
      await notifyOrderConfirmation(
        {
          id: String(order.id),
          order_number: String(order.order_number || orderNumber),
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address?.trim() || undefined,
          subtotal,
          shipping_cost: serverShippingCost,
          total,
          payment_method: paymentMethod,
          status: "PENDING",
          notes: safeNotes || undefined,
          created_at: order.created_at,
          order_items: validatedItems.map((item) => ({
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.unitPrice * item.quantity,
          })),
        },
        businessConfig,
      );
    } catch (emailError) {
      console.warn("Email notification failed:", emailError);
    }

    try {
      await logAudit(
        {
          user_id: user?.id,
          action: "CREATE",
          table_name: "sales",
          record_id: order.id,
          new_data: {
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            total,
            status: "PENDING",
            items_count: normalizedItems.length,
            buyer_type: resolvedBuyerType,
            buyer_user_id: resolvedBuyerUserId,
            buyer_organization_id: resolvedBuyerOrganizationId,
          },
          organization_id: orgId,
        },
        request,
      );
    } catch (auditError) {
      console.error("Error writing order audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          total: order.total,
          createdAt: order.created_at,
          buyerType: resolvedBuyerType,
          buyerOrganizationId: resolvedBuyerOrganizationId,
          buyerOrganizationName: resolvedBuyerOrganizationName,
        },
      },
    });
  } catch (error) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
