import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

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
    const body = await request.json();
    const { items } = body as { items: CartItemToValidate[] };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items inválidos' },
        { status: 400 }
      );
    }

    // Validar cantidad total de items
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > MAX_TOTAL_ITEMS) {
      return NextResponse.json(
        { 
          error: `Cantidad máxima de items excedida. Máximo ${MAX_TOTAL_ITEMS} items por pedido.`,
          maxTotalItems: MAX_TOTAL_ITEMS
        },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const productIds = items.map(item => item.id);

    // Obtener productos de la base de datos
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sale_price, offer_price, stock_quantity, is_active')
      .in('id', productIds);

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Error al validar productos' },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos' },
        { status: 404 }
      );
    }

    const validationResults: ValidationResult = {
      valid: true,
      items: [],
      total: 0,
      errors: []
    };

    // Validar cada item
    for (const item of items) {
      const product = products.find((p: any) => p.id === item.id);

      if (!product) {
        validationResults.valid = false;
        validationResults.errors.push(`Producto ${item.id} no encontrado`);
        validationResults.items.push({
          id: item.id,
          name: 'Producto no encontrado',
          validatedPrice: 0,
          requestedPrice: item.price,
          quantity: item.quantity,
          maxQuantity: 0,
          isValid: false,
          error: 'Producto no encontrado'
        });
        continue;
      }

      // Validar que el producto esté activo
      if (!product.is_active) {
        validationResults.valid = false;
        validationResults.errors.push(`${product.name} no está disponible`);
        validationResults.items.push({
          id: product.id,
          name: product.name,
          validatedPrice: 0,
          requestedPrice: item.price,
          quantity: item.quantity,
          maxQuantity: 0,
          isValid: false,
          error: 'Producto no disponible'
        });
        continue;
      }

      // Obtener precio correcto (offer_price o sale_price)
      const validatedPrice = product.offer_price || product.sale_price;
      const stockQuantity = product.stock_quantity || 0;

      // Validar precio
      const priceDifference = Math.abs(validatedPrice - item.price);
      const priceValid = priceDifference < 0.01; // Tolerancia de 1 centavo

      // Validar stock
      const stockValid = item.quantity <= stockQuantity;

      // Validar cantidad máxima por producto
      const quantityValid = item.quantity <= MAX_QTY_PER_PRODUCT;

      const itemValid = priceValid && stockValid && quantityValid;

      if (!itemValid) {
        validationResults.valid = false;
      }

      const errors: string[] = [];
      if (!priceValid) {
        errors.push(`Precio incorrecto. Precio actual: ${validatedPrice}`);
      }
      if (!stockValid) {
        errors.push(`Stock insuficiente. Disponible: ${stockQuantity}`);
      }
      if (!quantityValid) {
        errors.push(`Cantidad máxima por producto: ${MAX_QTY_PER_PRODUCT}`);
      }

      validationResults.items.push({
        id: product.id,
        name: product.name,
        validatedPrice,
        requestedPrice: item.price,
        quantity: Math.min(item.quantity, stockQuantity, MAX_QTY_PER_PRODUCT),
        maxQuantity: Math.min(stockQuantity, MAX_QTY_PER_PRODUCT),
        isValid: itemValid,
        error: errors.length > 0 ? errors.join('. ') : undefined
      });

      if (itemValid) {
        validationResults.total += validatedPrice * item.quantity;
      }
    }

    // Redondear total a 2 decimales
    validationResults.total = Math.round(validationResults.total * 100) / 100;

    return NextResponse.json(validationResults, { 
      status: validationResults.valid ? 200 : 400 
    });

  } catch (error) {
    console.error('Error in cart validation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
