# 🔍 Auditoría SaaS - Módulo POS (Point of Sale)

**Fecha:** 6 de febrero de 2026  
**Estado:** ⚠️ **PARCIALMENTE COMPATIBLE - REQUIERE MEJORAS**

---

## 📋 Resumen Ejecutivo

El módulo POS (`/dashboard/pos`) tiene **compatibilidad parcial con SaaS multitenancy**. Las API routes del frontend están correctamente implementadas con filtrado por `organization_id`, pero el backend de sales tiene **problemas críticos** que pueden causar fugas de datos entre organizaciones.

### Nivel de Compatibilidad

| Componente | Estado | Nivel |
|------------|--------|-------|
| Frontend API Routes | ✅ Compatible | 95% |
| Backend Sales Routes | ⚠️ Parcial | 40% |
| Componentes UI | ✅ Compatible | 100% |
| Seguridad | ❌ Crítico | 30% |

---

## ✅ Lo Que Está Bien

### 1. Frontend API Routes (apps/frontend/src/app/api/pos/)

#### ✅ GET /api/pos/products
```typescript
const organizationId = headerOrgId || (auth.userId ? await getUserOrganizationId(auth.userId) : null)
query = query.eq('organization_id', organizationId)
```
**Estado:** ✅ Filtra correctamente por organización

#### ✅ POST /api/pos/sales
```typescript
const organizationId = headerOrgId || (auth.userId ? await getUserOrganizationId(auth.userId) : null);
headers: {
  'x-organization-id': organizationId,
}
```
**Estado:** ✅ Envía organizationId al backend

#### ✅ GET /api/pos/sales
```typescript
.eq('organization_id', organizationId)
```
**Estado:** ✅ Filtra correctamente por organización

#### ✅ GET /api/pos/customers
```typescript
query = query.eq('organization_id', organizationId)
```
**Estado:** ✅ Filtra correctamente por organización

#### ✅ POST /api/pos/customers
```typescript
...(organizationId ? { organization_id: organizationId } : {})
```
**Estado:** ✅ Crea clientes con organizationId

#### ✅ GET /api/pos/stats
```typescript
.eq('organization_id', organizationId || '')
```
**Estado:** ✅ Filtra estadísticas por organización

---

## ❌ Problemas Críticos

### 1. Backend Sales Routes (apps/backend/src/routes/sales.ts)

#### ❌ GET /recent - Sin filtrado por organización
```typescript
router.get('/recent', requirePermission('sales', 'read'), asyncHandler(async (req, res) => {
  const recentSales = await prisma.sale.findMany({
    take: limit,
    orderBy: { date: 'desc' },
    // ❌ NO FILTRA POR ORGANIZATION_ID
  });
}));
```

**Problema:** Devuelve ventas de TODAS las organizaciones.

**Riesgo:** Alto - Exposición de datos financieros sensibles.

---

#### ❌ GET / - Sin filtrado por organización
```typescript
router.get('/', requirePermission('sales', 'read'), asyncHandler(async (req, res) => {
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      // ❌ NO FILTRA POR ORGANIZATION_ID
    }),
    prisma.sale.count({ where })
  ]);
}));
```

**Problema:** Lista ventas de todas las organizaciones.

**Riesgo:** Crítico - Violación de privacidad.

---

#### ❌ GET /:id - Sin verificación de ownership
```typescript
router.get('/:id', requirePermission('sales', 'read'), asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    // ❌ NO VERIFICA QUE LA VENTA PERTENEZCA A LA ORGANIZACIÓN
  });
}));
```

**Problema:** Cualquier usuario puede ver cualquier venta si conoce el ID.

**Riesgo:** Crítico - Acceso no autorizado a datos.

---

#### ⚠️ POST / - Validación parcial de organización
```typescript
router.post('/', requirePermission('sales', 'create'), asyncHandler(async (req, res) => {
  const organizationId = String(req.headers['x-organization-id'] || '').trim();

  // ✅ Valida sesión de caja por organización
  if (paymentMethod === 'CASH') {
    const existingOpen = await prisma.cashSession.findFirst({
      where: { organizationId, status: 'OPEN' }
    });
  }

  // ❌ NO VALIDA QUE LOS PRODUCTOS PERTENEZCAN A LA ORGANIZACIÓN
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds }
      // ❌ FALTA: organizationId
    }
  });

  // ❌ NO VALIDA QUE EL CLIENTE PERTENEZCA A LA ORGANIZACIÓN
  if (customerId) {
    await tx.customer.update({
      where: { id: customerId },
      // ❌ NO VERIFICA OWNERSHIP
    });
  }

  // ❌ NO GUARDA organizationId EN LA VENTA
  const newSale = await tx.sale.create({
    data: {
      userId,
      customerId,
      // ❌ FALTA: organizationId
    }
  });
}));
```

**Problemas:**
1. No valida que los productos pertenezcan a la organización
2. No valida que el cliente pertenezca a la organización
3. No guarda `organizationId` en la venta
4. Permite crear ventas con productos/clientes de otras organizaciones

**Riesgo:** Crítico - Permite mezclar datos entre organizaciones.

---

#### ❌ GET /summary/today - Sin filtrado por organización
```typescript
router.get('/summary/today', requirePermission('sales', 'read'), asyncHandler(async (req, res) => {
  const [salesCount, totalRevenue, salesByPaymentMethod] = await Promise.all([
    prisma.sale.count({
      where: {
        date: { gte: today, lt: tomorrow }
        // ❌ NO FILTRA POR ORGANIZATION_ID
      }
    }),
    // ... más queries sin filtrado
  ]);
}));
```

**Problema:** Resumen incluye ventas de todas las organizaciones.

**Riesgo:** Alto - Información financiera incorrecta.

---

#### ❌ GET /analytics/dashboard - Sin filtrado por organización
```typescript
router.get('/analytics/dashboard', asyncHandler(async (req, res) => {
  const [todaySales, weekSales, monthSales, topProducts] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        date: { gte: new Date(today.setHours(0, 0, 0, 0)) }
        // ❌ NO FILTRA POR ORGANIZATION_ID
      }
    }),
    // ... más queries sin filtrado
  ]);
}));
```

**Problema:** Analytics mezclan datos de todas las organizaciones.

**Riesgo:** Crítico - Decisiones de negocio basadas en datos incorrectos.

---

### 2. Schema de Base de Datos

#### ⚠️ Tabla `sales` - Falta organization_id

Necesito verificar si la tabla sales tiene organization_id:

```prisma
model Sale {
  id            String    @id @default(cuid())
  userId        String    @map("user_id")
  customerId    String?   @map("customer_id")
  // ❌ FALTA: organizationId String @map("organization_id")
  subtotal      Float
  discount      Float     @default(0)
  discountType  String    @default("PERCENTAGE") @map("discount_type")
  tax           Float     @default(0)
  total         Float
  paymentMethod String    @map("payment_method")
  notes         String?
  date          DateTime  @default(now())
  // ...
}
```

**Problema:** Si la tabla no tiene `organization_id`, todas las ventas se mezclan.

---

## 🚨 Escenarios de Riesgo

### Escenario 1: Exposición de Ventas
1. Usuario de Organización A hace una venta
2. Usuario de Organización B llama a `GET /api/sales/recent`
3. **Resultado:** Ve las ventas de Organización A
4. **Impacto:** Violación de privacidad, exposición de datos financieros

### Escenario 2: Venta con Productos de Otra Organización
1. Usuario de Organización A obtiene ID de producto de Organización B
2. Crea venta con ese producto
3. **Resultado:** Venta se crea, stock de Org B se reduce
4. **Impacto:** Corrupción de datos, inventario incorrecto

### Escenario 3: Analytics Incorrectos
1. Usuario de Organización A consulta analytics
2. Backend devuelve datos de todas las organizaciones
3. **Resultado:** Métricas incorrectas
4. **Impacto:** Decisiones de negocio basadas en datos erróneos

### Escenario 4: Acceso a Venta por ID
1. Usuario de Organización A conoce ID de venta de Organización B
2. Llama a `GET /api/sales/:id`
3. **Resultado:** Obtiene detalles completos de la venta
4. **Impacto:** Acceso no autorizado a información sensible

---

## ✅ Plan de Corrección

### Fase 1: Verificar Schema de Base de Datos

#### 1.1 Verificar si `sales` tiene `organization_id`

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'organization_id';
```

#### 1.2 Si NO existe, agregar columna

```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_sales_org ON sales(organization_id);
ALTER TABLE sales ADD CONSTRAINT fk_sales_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
```

#### 1.3 Migrar datos existentes

```sql
-- Asignar organization_id basado en el usuario que creó la venta
UPDATE sales s
SET organization_id = u.organization_id
FROM users u
WHERE s.user_id = u.id AND s.organization_id IS NULL;
```

#### 1.4 Hacer columna NOT NULL

```sql
ALTER TABLE sales ALTER COLUMN organization_id SET NOT NULL;
```

---

### Fase 2: Actualizar Backend

#### 2.1 GET /recent
```typescript
router.get('/recent', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const organizationId = req.user!.organizationId;
  
  const recentSales = await prisma.sale.findMany({
    where: {
      organizationId  // ✅ Filtrar por organización
    },
    take: limit,
    orderBy: { date: 'desc' },
    include: {
      // ... includes
    }
  });

  res.json({
    success: true,
    data: recentSales
  });
}));
```

#### 2.2 GET /
```typescript
router.get('/', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { page, limit, startDate, endDate, customerId, paymentMethod } = querySchema.parse(req.query);
  const organizationId = req.user!.organizationId;
  const skip = (page - 1) * limit;

  const where: any = {
    organizationId  // ✅ Filtrar por organización
  };

  // ... resto de filtros

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({ where, /* ... */ }),
    prisma.sale.count({ where })
  ]);

  res.json({ sales, pagination });
}));
```

#### 2.3 GET /:id
```typescript
router.get('/:id', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  const sale = await prisma.sale.findFirst({
    where: { 
      id,
      organizationId  // ✅ Verificar ownership
    },
    include: {
      // ... includes
    }
  });

  if (!sale) {
    throw createError('Sale not found', 404);
  }

  res.json({ sale });
}));
```

#### 2.4 POST /
```typescript
router.post('/', requirePermission('sales', 'create'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { customerId, items, paymentMethod, discount, discountType, tax, notes } = createSaleSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  // ✅ Validar sesión de caja por organización
  if (paymentMethod === 'CASH') {
    const existingOpen = await prisma.cashSession.findFirst({
      where: { organizationId, status: 'OPEN' }
    });
    if (!existingOpen) {
      throw createError('La sesión de caja está cerrada en tu organización', 400);
    }
  }

  // ✅ Validar productos pertenecen a la organización
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      organizationId  // ✅ Verificar ownership
    }
  });

  if (products.length !== productIds.length) {
    throw createError('One or more products not found or do not belong to your organization', 404);
  }

  // ✅ Validar cliente pertenece a la organización (si se proporciona)
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { 
        id: customerId,
        organizationId  // ✅ Verificar ownership
      }
    });
    if (!customer) {
      throw createError('Customer not found or does not belong to your organization', 404);
    }
  }

  // ... validaciones de stock

  const sale = await prisma.$transaction(async (tx) => {
    // ... lock products

    // ✅ Crear venta con organizationId
    const newSale = await tx.sale.create({
      data: {
        organizationId,  // ✅ Incluir organizationId
        userId,
        customerId: customerId || null,
        subtotal,
        discount: discountAmount,
        discountType: discountType as any,
        tax: taxAmount,
        total,
        paymentMethod: paymentMethod as any,
        notes: notes || null,
        date: new Date()
      }
    });

    // ... resto de la transacción
  });

  res.status(201).json({ sale: completeSale, summary });
}));
```

#### 2.5 GET /summary/today
```typescript
router.get('/summary/today', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [salesCount, totalRevenue, salesByPaymentMethod] = await Promise.all([
    prisma.sale.count({
      where: {
        organizationId,  // ✅ Filtrar por organización
        date: { gte: today, lt: tomorrow }
      }
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,  // ✅ Filtrar por organización
        date: { gte: today, lt: tomorrow }
      },
      _sum: { total: true }
    }),
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        organizationId,  // ✅ Filtrar por organización
        date: { gte: today, lt: tomorrow }
      },
      _count: { id: true },
      _sum: { total: true }
    })
  ]);

  res.json({
    date: today.toISOString().split('T')[0],
    salesCount,
    totalRevenue: totalRevenue._sum.total || 0,
    salesByPaymentMethod
  });
}));
```

#### 2.6 GET /analytics/dashboard
```typescript
router.get('/analytics/dashboard', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todaySales, weekSales, monthSales, topProducts] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        organizationId,  // ✅ Filtrar por organización
        date: { gte: new Date(today.setHours(0, 0, 0, 0)) }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,  // ✅ Filtrar por organización
        date: { gte: startOfWeek }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,  // ✅ Filtrar por organización
        date: { gte: startOfMonth }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          organizationId,  // ✅ Filtrar por organización
          date: { gte: startOfMonth }
        }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    })
  ]);

  // ... resto del código

  res.json({
    today: { revenue: todaySales._sum.total || 0, transactions: todaySales._count || 0 },
    week: { revenue: weekSales._sum.total || 0, transactions: weekSales._count || 0 },
    month: { revenue: monthSales._sum.total || 0, transactions: monthSales._count || 0 },
    topProducts: topProductsWithDetails
  });
}));
```

---

### Fase 3: Actualizar Schema de Prisma

```prisma
model Sale {
  id             String    @id @default(cuid())
  organizationId String    @map("organization_id")  // ✅ AGREGAR
  userId         String    @map("user_id")
  customerId     String?   @map("customer_id")
  subtotal       Float
  discount       Float     @default(0)
  discountType   String    @default("PERCENTAGE") @map("discount_type")
  tax            Float     @default(0)
  total          Float
  paymentMethod  String    @map("payment_method")
  notes          String?
  date           DateTime  @default(now())
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  
  user           User      @relation(fields: [userId], references: [id])
  customer       Customer? @relation(fields: [customerId], references: [id])
  saleItems      SaleItem[]
  
  @@index([organizationId, date])  // ✅ AGREGAR
  @@index([userId])
  @@index([customerId])
  @@index([date])
  @@map("sales")
}
```

---

## 📊 Checklist de Implementación

### Base de Datos
- [ ] Verificar si `sales` tiene `organization_id`
- [ ] Agregar columna `organization_id` si no existe
- [ ] Crear índice `idx_sales_org`
- [ ] Agregar foreign key a `organizations`
- [ ] Migrar datos existentes
- [ ] Hacer columna NOT NULL
- [ ] Actualizar `schema.prisma`
- [ ] Ejecutar `npx prisma generate`

### Backend
- [ ] Actualizar `GET /recent`
- [ ] Actualizar `GET /`
- [ ] Actualizar `GET /:id`
- [ ] Actualizar `POST /`
- [ ] Actualizar `GET /summary/today`
- [ ] Actualizar `GET /analytics/dashboard`
- [ ] Agregar tests de aislamiento

### Testing
- [ ] Test: Usuario de Org A no ve ventas de Org B
- [ ] Test: Usuario no puede crear venta con productos de otra org
- [ ] Test: Usuario no puede crear venta con cliente de otra org
- [ ] Test: Analytics solo muestran datos de la organización
- [ ] Test: Summary solo incluye ventas de la organización
- [ ] Test: Usuario no puede acceder a venta de otra org por ID

---

## 🎯 Prioridad

**CRÍTICA** - El módulo POS maneja transacciones financieras y debe ser corregido inmediatamente para evitar:
- Exposición de datos financieros sensibles
- Corrupción de inventario entre organizaciones
- Métricas incorrectas que afectan decisiones de negocio
- Violaciones de privacidad y compliance

---

## 📝 Conclusión

El módulo POS tiene **compatibilidad parcial con SaaS**. El frontend está bien implementado, pero el backend tiene **problemas críticos de seguridad** que permiten:
- Ver ventas de otras organizaciones
- Crear ventas con productos/clientes de otras organizaciones
- Obtener analytics mezclados de múltiples organizaciones

**Acción requerida:** Implementar correcciones inmediatamente antes de usar en producción con múltiples organizaciones.
