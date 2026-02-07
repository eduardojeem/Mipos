# 🛠️ RECOMENDACIONES TÉCNICAS - MÓDULO POS

**Fecha**: 7 de febrero de 2026  
**Prioridad**: ALTA  
**Tiempo estimado total**: 3 sprints (5 semanas)

---

## 🔴 PRIORIDAD ALTA - Sprint 1 (2 semanas)

### 1. Refactorizar ProcessSaleModal

**Problema**: Componente de 1344 líneas, demasiado complejo para mantener y testear.

**Solución**: Dividir en componentes por paso del proceso de venta.

#### Estructura Propuesta

```typescript
// apps/frontend/src/components/pos/ProcessSaleModal.tsx (coordinador - 150 líneas)
'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StepIndicator } from './StepIndicator';
import { ProductsStep } from './sale-steps/ProductsStep';
import { DiscountsStep } from './sale-steps/DiscountsStep';
import { PaymentStep } from './sale-steps/PaymentStep';
import { ConfirmationStep } from './sale-steps/ConfirmationStep';
import { useSaleWizard } from './hooks/useSaleWizard';

interface ProcessSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  onConfirm: (data: SaleData) => Promise<void>;
}

export default function ProcessSaleModal({
  isOpen,
  onClose,
  cart,
  products,
  onConfirm
}: ProcessSaleModalProps) {
  const {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    saleData,
    updateSaleData,
    canProceed,
    errors
  } = useSaleWizard({ cart, products });

  const steps = [
    { id: 1, title: 'Productos', component: ProductsStep },
    { id: 2, title: 'Descuentos', component: DiscountsStep },
    { id: 3, title: 'Pago', component: PaymentStep },
    { id: 4, title: 'Confirmar', component: ConfirmationStep }
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <StepIndicator steps={steps} currentStep={currentStep} />

        <CurrentStepComponent
          data={saleData}
          onUpdate={updateSaleData}
          errors={errors}
          onNext={goToNextStep}
          onPrevious={goToPreviousStep}
          onConfirm={onConfirm}
          canProceed={canProceed}
        />
      </DialogContent>
    </Dialog>
  );
}
```

#### Hook useSaleWizard

```typescript
// apps/frontend/src/components/pos/hooks/useSaleWizard.ts
import { useState, useCallback, useMemo } from "react";
import { validateSaleData } from "../validation/saleValidation";

interface UseSaleWizardOptions {
  cart: CartItem[];
  products: Product[];
}

export function useSaleWizard({ cart, products }: UseSaleWizardOptions) {
  const [currentStep, setCurrentStep] = useState(1);
  const [saleData, setSaleData] = useState<SaleData>({
    discount: 0,
    discountType: "PERCENTAGE",
    paymentMethod: "CASH",
    cashReceived: 0,
    notes: "",
  });

  const errors = useMemo(() => {
    return validateSaleData(saleData, cart, products, currentStep);
  }, [saleData, cart, products, currentStep]);

  const canProceed = useMemo(() => {
    return errors.length === 0;
  }, [errors]);

  const updateSaleData = useCallback((updates: Partial<SaleData>) => {
    setSaleData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (canProceed && currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [canProceed, currentStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  return {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    saleData,
    updateSaleData,
    canProceed,
    errors,
  };
}
```

#### ProductsStep Component

```typescript
// apps/frontend/src/components/pos/sale-steps/ProductsStep.tsx (200 líneas)
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface ProductsStepProps {
  data: SaleData;
  onUpdate: (updates: Partial<SaleData>) => void;
  errors: string[];
  onNext: () => void;
  canProceed: boolean;
}

export function ProductsStep({
  data,
  onUpdate,
  errors,
  onNext,
  canProceed
}: ProductsStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Productos en el Carrito
          </h3>

          {/* Lista de productos del carrito */}
          {/* ... */}
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Siguiente: Descuentos
        </Button>
      </div>
    </div>
  );
}
```

---

### 2. Implementar Tests Unitarios

**Problema**: Solo 15% de cobertura de tests, riesgo alto de regresiones.

**Solución**: Implementar tests para hooks y utilidades críticas.

#### Tests para useCart

```typescript
// apps/frontend/src/hooks/__tests__/useCart.test.ts
import { renderHook, act } from "@testing-library/react";
import { useCart } from "../useCart";
import { toast } from "@/lib/toast";

jest.mock("@/lib/toast");

describe("useCart", () => {
  const mockProducts = [
    {
      id: "1",
      name: "Producto 1",
      sale_price: 100,
      wholesale_price: 80,
      stock_quantity: 10,
      min_wholesale_quantity: 5,
    },
    {
      id: "2",
      name: "Producto 2",
      sale_price: 50,
      stock_quantity: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addToCart", () => {
    it("should add product to cart with correct price", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: false,
          discount: 0,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]).toMatchObject({
        product_id: "1",
        product_name: "Producto 1",
        quantity: 2,
        price: 100,
        total: 200,
      });
    });

    it("should prevent adding product with insufficient stock", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: false,
          discount: 0,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[1], 1);
      });

      expect(result.current.cart).toHaveLength(0);
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Stock insuficiente",
          variant: "destructive",
        }),
      );
    });

    it("should apply wholesale price when in wholesale mode", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: true,
          discount: 0,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 5);
      });

      expect(result.current.cart[0].price).toBe(80);
      expect(result.current.cart[0].total).toBe(400);
    });

    it("should update quantity if product already in cart", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: false,
          discount: 0,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
      });

      act(() => {
        result.current.addToCart(mockProducts[0], 3);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(5);
      expect(result.current.cart[0].total).toBe(500);
    });
  });

  describe("updateQuantity", () => {
    it("should update item quantity", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: false,
          discount: 0,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
      });

      act(() => {
        result.current.updateQuantity("1", 5);
      });

      expect(result.current.cart[0].quantity).toBe(5);
      expect(result.current.cart[0].total).toBe(500);
    });

    it("should remove item if quantity is 0", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: false,
          discount: 0,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
      });

      act(() => {
        result.current.updateQuantity("1", 0);
      });

      expect(result.current.cart).toHaveLength(0);
    });
  });

  describe("cartTotals", () => {
    it("should calculate totals correctly", () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          isWholesaleMode: false,
          discount: 10,
        }),
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
      });

      const { cartTotals } = result.current;
      expect(cartTotals.subtotal).toBe(200);
      expect(cartTotals.discountAmount).toBe(10);
      expect(cartTotals.itemCount).toBe(2);
    });
  });
});
```

#### Tests para calculations.ts

```typescript
// apps/frontend/src/lib/pos/__tests__/calculations.test.ts
import { calculateCartWithIva } from "../calculations";
import type { CartItem } from "@/hooks/useCart";
import type { Product } from "@/types";

describe("calculateCartWithIva", () => {
  const mockCart: CartItem[] = [
    {
      product_id: "1",
      product_name: "Producto 1",
      price: 100,
      quantity: 2,
      total: 200,
    },
  ];

  const mockProducts: Product[] = [
    {
      id: "1",
      name: "Producto 1",
      sale_price: 100,
      iva_rate: 10,
      iva_included: false,
      is_taxable: true,
    } as Product,
  ];

  it("should calculate IVA correctly when not included", () => {
    const result = calculateCartWithIva(
      mockCart,
      mockProducts,
      0,
      "FIXED_AMOUNT",
    );

    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(20); // 10% de 200
    expect(result.subtotalWithIva).toBe(220);
    expect(result.total).toBe(220);
  });

  it("should calculate IVA correctly when included", () => {
    const productsWithIvaIncluded = [
      { ...mockProducts[0], iva_included: true },
    ];

    const result = calculateCartWithIva(
      mockCart,
      productsWithIvaIncluded,
      0,
      "FIXED_AMOUNT",
    );

    expect(result.subtotalWithIva).toBe(200);
    expect(result.subtotal).toBeCloseTo(181.82, 2);
    expect(result.taxAmount).toBeCloseTo(18.18, 2);
  });

  it("should apply percentage discount correctly", () => {
    const result = calculateCartWithIva(
      mockCart,
      mockProducts,
      10, // 10%
      "PERCENTAGE",
    );

    expect(result.subtotalWithIva).toBe(220);
    expect(result.discountAmount).toBe(22); // 10% de 220
    expect(result.total).toBe(198);
  });

  it("should apply fixed discount correctly", () => {
    const result = calculateCartWithIva(
      mockCart,
      mockProducts,
      50,
      "FIXED_AMOUNT",
    );

    expect(result.subtotalWithIva).toBe(220);
    expect(result.discountAmount).toBe(50);
    expect(result.total).toBe(170);
  });

  it("should not apply tax to non-taxable products", () => {
    const nonTaxableProducts = [{ ...mockProducts[0], is_taxable: false }];

    const result = calculateCartWithIva(
      mockCart,
      nonTaxableProducts,
      0,
      "FIXED_AMOUNT",
    );

    expect(result.taxAmount).toBe(0);
    expect(result.subtotalWithIva).toBe(200);
    expect(result.total).toBe(200);
  });

  it("should clamp total to 0 if discount exceeds subtotal", () => {
    const result = calculateCartWithIva(
      mockCart,
      mockProducts,
      500,
      "FIXED_AMOUNT",
    );

    expect(result.total).toBe(0);
  });
});
```

---

### 3. Validación Backend de Descuentos

**Problema**: Límites de descuento solo validados en frontend, posible bypass.

**Solución**: Agregar validación en el backend.

#### Backend Service

```typescript
// apps/backend/src/sales/sales.service.ts
import { Injectable, ForbiddenException } from "@nestjs/common";

@Injectable()
export class SalesService {
  private readonly DISCOUNT_LIMITS = {
    CASHIER: { maxAmount: 200, maxPercent: 10 },
    MANAGER: { maxAmount: 1000, maxPercent: 25 },
    ADMIN: { maxAmount: 5000, maxPercent: 50 },
    SUPER_ADMIN: { maxAmount: Infinity, maxPercent: 100 },
  };

  async createSale(userId: string, saleData: CreateSaleDto) {
    // Validar límites de descuento
    await this.validateDiscountLimits(userId, saleData);

    // Validar stock disponible
    await this.validateStockAvailability(saleData.items);

    // Crear la venta
    const sale = await this.prisma.sale.create({
      data: {
        userId,
        ...saleData,
      },
    });

    return sale;
  }

  private async validateDiscountLimits(
    userId: string,
    saleData: CreateSaleDto,
  ) {
    const userRole = await this.getUserRole(userId);
    const limits = this.DISCOUNT_LIMITS[userRole];

    if (!limits) {
      throw new ForbiddenException("Rol de usuario no válido");
    }

    // Validar descuento por monto
    if (saleData.discountType === "FIXED_AMOUNT") {
      if (saleData.discountAmount > limits.maxAmount) {
        throw new ForbiddenException(
          `Descuento de ${saleData.discountAmount} excede el límite de ${limits.maxAmount} para rol ${userRole}`,
        );
      }
    }

    // Validar descuento por porcentaje
    if (saleData.discountType === "PERCENTAGE") {
      if (saleData.discountAmount > limits.maxPercent) {
        throw new ForbiddenException(
          `Descuento de ${saleData.discountAmount}% excede el límite de ${limits.maxPercent}% para rol ${userRole}`,
        );
      }
    }
  }

  private async validateStockAvailability(items: SaleItemDto[]) {
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stockQuantity}, Solicitado: ${item.quantity}`,
        );
      }
    }
  }

  private async getUserRole(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    return user?.roles[0]?.name || "CASHIER";
  }
}
```

#### Rate Limiting

```typescript
// apps/backend/src/sales/sales.controller.ts
import { Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

@Controller("sales")
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Throttle(10, 60) // Máximo 10 ventas por minuto
  async createSale(
    @CurrentUser() user: User,
    @Body() createSaleDto: CreateSaleDto,
  ) {
    return this.salesService.createSale(user.id, createSaleDto);
  }
}
```

---

## 🟡 PRIORIDAD MEDIA - Sprint 2 (2 semanas)

### 4. Mejorar Accesibilidad

**Problema**: Faltan ARIA labels, navegación por teclado incompleta.

**Solución**: Agregar atributos ARIA y mejorar navegación.

#### Ejemplo de Mejoras

```typescript
// apps/frontend/src/components/pos/ProductCard.tsx
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div
      role="article"
      aria-labelledby={`product-${product.id}-name`}
      className="product-card"
    >
      <img
        src={product.imageUrl}
        alt={`Imagen de ${product.name}`}
        aria-describedby={`product-${product.id}-description`}
      />

      <h3 id={`product-${product.id}-name`}>
        {product.name}
      </h3>

      <p id={`product-${product.id}-description`} className="sr-only">
        {product.name}, precio {formatCurrency(product.price)},
        {product.stockQuantity > 0
          ? `${product.stockQuantity} unidades disponibles`
          : 'sin stock'}
      </p>

      <button
        onClick={() => onAddToCart(product)}
        disabled={product.stockQuantity === 0}
        aria-label={`Agregar ${product.name} al carrito`}
        aria-describedby={`product-${product.id}-stock`}
      >
        <ShoppingCart aria-hidden="true" />
        Agregar
      </button>

      <div
        id={`product-${product.id}-stock`}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {product.stockQuantity === 0
          ? 'Producto sin stock'
          : `${product.stockQuantity} unidades disponibles`}
      </div>
    </div>
  );
}
```

#### Anuncios de Screen Reader

```typescript
// apps/frontend/src/components/pos/CartAnnouncer.tsx
'use client';

import { useEffect, useRef } from 'react';

interface CartAnnouncerProps {
  cart: CartItem[];
  total: number;
}

export function CartAnnouncer({ cart, total }: CartAnnouncerProps) {
  const prevCartLength = useRef(cart.length);

  useEffect(() => {
    if (cart.length > prevCartLength.current) {
      const lastItem = cart[cart.length - 1];
      announceToScreenReader(
        `${lastItem.product_name} agregado al carrito.
         ${cart.length} productos.
         Total: ${formatCurrency(total)}`
      );
    } else if (cart.length < prevCartLength.current) {
      announceToScreenReader(
        `Producto removido.
         ${cart.length} productos en el carrito.
         Total: ${formatCurrency(total)}`
      );
    }

    prevCartLength.current = cart.length;
  }, [cart, total]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      id="cart-announcer"
    />
  );
}

function announceToScreenReader(message: string) {
  const announcer = document.getElementById('cart-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}
```

---

### 5. Code Splitting y Optimización

**Problema**: ProcessSaleModal ocupa 78KB, aumenta tiempo de carga inicial.

**Solución**: Implementar code splitting con dynamic imports.

#### Dynamic Import

```typescript
// apps/frontend/src/components/pos/OptimizedPOSLayout.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load del modal de venta
const ProcessSaleModal = dynamic(
  () => import('./ProcessSaleModal'),
  {
    loading: () => <ModalSkeleton />,
    ssr: false
  }
);

// Lazy load del modal de recibo
const ReceiptModal = dynamic(
  () => import('./ReceiptModal'),
  {
    loading: () => <ModalSkeleton />,
    ssr: false
  }
);

export default function OptimizedPOSLayout() {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  return (
    <div>
      {/* Layout principal */}

      {/* Modales cargados dinámicamente */}
      {showSaleModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <ProcessSaleModal
            isOpen={showSaleModal}
            onClose={() => setShowSaleModal(false)}
            {...props}
          />
        </Suspense>
      )}

      {showReceiptModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => setShowReceiptModal(false)}
            {...props}
          />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 🟢 PRIORIDAD BAJA - Sprint 3 (1 semana)

### 6. Modal de Ayuda con Atajos

```typescript
// apps/frontend/src/components/pos/KeyboardShortcutsModal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  { key: 'F1', description: 'Enfocar búsqueda' },
  { key: 'F2', description: 'Procesar venta' },
  { key: 'F3', description: 'Limpiar carrito' },
  { key: 'F4', description: 'Abrir modal de cliente' },
  { key: 'F9', description: 'Refrescar datos' },
  { key: 'Ctrl+K', description: 'Búsqueda rápida' },
  { key: 'Ctrl+Enter', description: 'Confirmar venta' },
  { key: 'Esc', description: 'Cerrar modal' }
];

export function KeyboardShortcutsModal({ isOpen, onClose }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atajos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Sprint 1

- [ ] Crear estructura de carpetas para sale-steps
- [ ] Implementar useSaleWizard hook
- [ ] Crear ProductsStep component
- [ ] Crear DiscountsStep component
- [ ] Crear PaymentStep component
- [ ] Crear ConfirmationStep component
- [ ] Refactorizar ProcessSaleModal como coordinador
- [ ] Migrar lógica existente a nuevos componentes
- [ ] Tests para useCart.ts
- [ ] Tests para calculations.ts
- [ ] Tests para validation.ts
- [ ] Validación backend de descuentos
- [ ] Rate limiting en APIs
- [ ] Documentar cambios

### Sprint 2

- [ ] Agregar ARIA labels a ProductCard
- [ ] Agregar ARIA labels a CartPanel
- [ ] Implementar CartAnnouncer
- [ ] Mejorar navegación por teclado en modales
- [ ] Auditoría de accesibilidad con Lighthouse
- [ ] Implementar code splitting de ProcessSaleModal
- [ ] Implementar code splitting de ReceiptModal
- [ ] Virtualización de ProductGrid
- [ ] Tests de integración para flujo de venta
- [ ] Documentar mejoras

### Sprint 3

- [ ] Crear KeyboardShortcutsModal
- [ ] Agregar indicador de sesión de caja en header
- [ ] Implementar búsqueda por código de barras
- [ ] Agregar JSDoc a todos los hooks
- [ ] Crear guía de uso del POS
- [ ] Actualizar README
- [ ] Documentación final

---

**Documento creado**: 7 de febrero de 2026  
**Última actualización**: 7 de febrero de 2026  
**Próxima revisión**: Al completar Sprint 1
