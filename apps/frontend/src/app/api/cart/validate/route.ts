import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveTenantContextFromHeaders } from '@/lib/domain/request-tenant';
import {
  fetchOrderProductsForOrganization,
  getEffectiveOrderProductPrice,
  isSchemaMissingError,
} from '@/lib/public-site/order-products';

interface CartItemToValidate {
  id: string;
  quantity: number;
  price: number;
}

interface ValidationResult {
  valid: boolean;
  items: Array<{
    id: string;
    name: string;
    validatedPrice: number;
    requestedPrice: number;
    quantity: number;
    maxQuantity: number;
    isValid: boolean;
    error?: string;
  }>;
  total: number;
  errors: string[];
}

const MAX_QTY_PER_PRODUCT = 10;
const MAX_TOTAL_ITEMS = 50;

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await resolveTenantContextFromHeaders(request.headers);

    if (tenantContext.kind !== 'tenant') {
      return NextResponse.json(
        { error: 'Tenant publico no resuelto para esta request.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items } = body as { items: CartItemToValidate[] };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items invalidos' },
        { status: 400 }
      );
    }

    const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (totalItems > MAX_TOTAL_ITEMS) {
      return NextResponse.json(
        {
          error: `Cantidad maxima de items excedida. Maximo ${MAX_TOTAL_ITEMS} items por pedido.`,
          maxTotalItems: MAX_TOTAL_ITEMS,
        },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();
    const productIds = items.map((item) => item.id);
    const organizationId = tenantContext.organization.id;

    let products;
    try {
      products = await fetchOrderProductsForOrganization(supabase, organizationId, productIds);
    } catch (error) {
      if (isSchemaMissingError(error)) {
        return NextResponse.json(
          { error: 'La configuracion del catalogo publico todavia no esta lista.' },
          { status: 503 }
        );
      }

      console.error('Error fetching products for cart validation:', error);
      return NextResponse.json(
        { error: 'Error al validar productos' },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos publicados para este tenant' },
        { status: 404 }
      );
    }

    const validationResults: ValidationResult = {
      valid: true,
      items: [],
      total: 0,
      errors: [],
    };

    for (const item of items) {
      const product = products.find((current) => current.id === item.id);

      if (!product) {
        validationResults.valid = false;
        validationResults.errors.push(`Producto ${item.id} no encontrado`);
        validationResults.items.push({
          id: item.id,
          name: 'Producto no encontrado',
          validatedPrice: 0,
          requestedPrice: Number(item.price || 0),
          quantity: Number(item.quantity || 0),
          maxQuantity: 0,
          isValid: false,
          error: 'Producto no encontrado',
        });
        continue;
      }

      if (!product.is_active) {
        validationResults.valid = false;
        validationResults.errors.push(`${product.name} no esta disponible`);
        validationResults.items.push({
          id: product.id,
          name: product.name,
          validatedPrice: 0,
          requestedPrice: Number(item.price || 0),
          quantity: Number(item.quantity || 0),
          maxQuantity: 0,
          isValid: false,
          error: 'Producto no disponible',
        });
        continue;
      }

      const validatedPrice = getEffectiveOrderProductPrice(product);
      const stockQuantity = Number(product.stock_quantity || 0);
      const requestedPrice = Number(item.price || 0);
      const requestedQuantity = Number(item.quantity || 0);
      const priceValid = Math.abs(validatedPrice - requestedPrice) < 0.01;
      const stockValid = requestedQuantity <= stockQuantity;
      const quantityValid = requestedQuantity <= MAX_QTY_PER_PRODUCT;
      const itemValid = stockValid && quantityValid;

      if (!itemValid) {
        validationResults.valid = false;
      }

      const itemErrors: string[] = [];
      if (!priceValid) {
        itemErrors.push(`Precio actualizado. Precio actual: ${validatedPrice}`);
      }
      if (!stockValid) {
        itemErrors.push(`Stock insuficiente. Disponible: ${stockQuantity}`);
      }
      if (!quantityValid) {
        itemErrors.push(`Cantidad maxima por producto: ${MAX_QTY_PER_PRODUCT}`);
      }

      validationResults.items.push({
        id: product.id,
        name: product.name,
        validatedPrice,
        requestedPrice,
        quantity: Math.min(requestedQuantity, stockQuantity, MAX_QTY_PER_PRODUCT),
        maxQuantity: Math.min(stockQuantity, MAX_QTY_PER_PRODUCT),
        isValid: itemValid,
        error: itemErrors.length > 0 ? itemErrors.join('. ') : undefined,
      });

      if (itemValid) {
        validationResults.total += validatedPrice * requestedQuantity;
      }
    }

    validationResults.total = Math.round(validationResults.total * 100) / 100;

    return NextResponse.json(validationResults, {
      status: validationResults.valid ? 200 : 400,
    });
  } catch (error) {
    console.error('Error in cart validation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
