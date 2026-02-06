# 🔍 Auditoría SaaS - Módulo de Caja (Cash)

**Fecha:** 6 de febrero de 2026  
**Estado:** ⚠️ **NO COMPATIBLE CON SAAS MULTITENANCY**

---

## 📋 Resumen Ejecutivo

El módulo de Caja (`/dashboard/cash`) **NO está preparado para SaaS multitenancy**. Las tablas de base de datos no tienen `organization_id`, lo que significa que todas las organizaciones comparten las mismas sesiones de caja y movimientos. Esto es un **problema crítico de seguridad y funcionalidad**.

### Problemas Críticos Identificados

1. ❌ **Sin aislamiento de datos por organización**
2. ❌ **Sesiones de caja compartidas entre organizaciones**
3. ❌ **Movimientos de efectivo sin filtrado por tenant**
4. ❌ **Reportes mezclando datos de múltiples organizaciones**
5. ❌ **Riesgo de exposición de información financiera sensible**

---

## 🔍 Análisis Detallado

### 1. Esquema de Base de Datos

#### ❌ Tabla `cash_sessions`
```prisma
model CashSession {
  id                 String    @id @default(cuid())
  openedBy           String    @map("opened_by")
  closedBy           String?   @map("closed_by")
  openingAmount      Float     @map("opening_amount")
  closingAmount      Float?    @map("closing_amount")
  systemExpected     Float?    @map("system_expected")
  discrepancyAmount  Float?    @map("discrepancy_amount")
  status             String    @default("OPEN")
  notes              String?
  openedAt           DateTime  @default(now()) @map("opened_at")
  closedAt           DateTime? @map("closed_at")
  // ❌ FALTA: organizationId
}
```

**Problema:** No hay campo `organizationId`, todas las organizaciones ven las mismas sesiones.

#### ❌ Tabla `cash_movements`
```prisma
model CashMovement {
  id            String     @id @default(cuid())
  sessionId     String     @map("session_id")
  type          String
  amount        Float
  reason        String?
  referenceType String?    @map("reference_type")
  referenceId   String?    @map("reference_id")
  createdBy     String     @map("created_by")
  // ❌ FALTA: organizationId
}
```

**Problema:** Los movimientos no están aislados por organización.

#### ❌ Tabla `cash_counts`
```prisma
model CashCount {
  id          String      @id @default(cuid())
  sessionId   String      @map("session_id")
  denomination Float
  quantity    Int         @default(0)
  total       Float       @default(0)
  // ❌ FALTA: organizationId
}
```

#### ❌ Tabla `cash_discrepancies`
```prisma
model CashDiscrepancy {
  id           String      @id @default(cuid())
  sessionId    String      @map("session_id")
  type         String
  amount       Float
  explained    Boolean     @default(false)
  explanation  String?
  reportedBy   String?     @map("reported_by")
  // ❌ FALTA: organizationId
}
```

---

### 2. Backend - Rutas y Controladores

**Archivo:** `apps/backend/src/routes/cash.ts`

#### ❌ GET `/cash/session/current`
```typescript
router.get('/session/current', requirePermission('cash', 'read'), asyncHandler(async (req, res) => {
  const session = await prisma.cashSession.findFirst({
    where: { status: 'OPEN' }, // ❌ No filtra por organizationId
    orderBy: { openedAt: 'desc' }
  });
  res.json({ session });
}));
```

**Problema:** Devuelve la primera sesión abierta de CUALQUIER organización.

#### ❌ POST `/cash/session/open`
```typescript
router.post('/session/open', requirePermission('cash', 'open'), asyncHandler(async (req, res) => {
  const existingOpen = await prisma.cashSession.findFirst({ 
    where: { status: 'OPEN' } // ❌ No filtra por organizationId
  });
  
  const session = await prisma.cashSession.create({
    data: {
      openedBy: userId,
      openingAmount,
      status: 'OPEN',
      // ❌ FALTA: organizationId
    }
  });
}));
```

**Problema:** Puede detectar sesiones abiertas de otras organizaciones y bloquear incorrectamente.

#### ❌ GET `/cash/movements`
```typescript
router.get('/movements', requirePermission('cash', 'read'), asyncHandler(async (req, res) => {
  const where: any = {};
  if (sessionId) where.sessionId = sessionId;
  // ❌ No filtra por organizationId
  
  const movements = await prisma.cashMovement.findMany({ where });
}));
```

**Problema:** Puede devolver movimientos de otras organizaciones si se conoce el sessionId.

---

### 3. Frontend - Componentes y Hooks

**Archivos revisados:**
- `apps/frontend/src/app/dashboard/cash/page.tsx`
- `apps/frontend/src/app/dashboard/cash/hooks/useCashDashboard.ts`
- `apps/frontend/src/app/dashboard/cash/hooks/useCashSession.ts`

#### ❌ Hook `useCashSession`
```typescript
const {
  data: sessionRes,
  isLoading,
  error: queryError,
  refetch,
} = useQuery({
  queryKey: ['cashSession'], // ❌ No incluye organizationId en la key
  queryFn: async () => {
    const res = await api.get('/cash/session/current'); // ❌ No envía organizationId
    return res.data;
  },
});
```

**Problema:** No hay contexto de organización en las queries.

#### ❌ Hook `useCashDashboard`
```typescript
const movementsHook = useMovements({
  sessionId: session?.id,
  enabled: !!session?.id,
  includeUser: true,
  createdByMe, // ❌ Filtra por usuario pero no por organización
});
```

**Problema:** Los filtros no consideran la organización actual.

---

## 🚨 Escenarios de Riesgo

### Escenario 1: Sesión Compartida
1. Usuario de Organización A abre una sesión de caja
2. Usuario de Organización B intenta abrir su sesión
3. **Resultado:** El sistema le dice que ya hay una sesión abierta (de otra organización)
4. **Impacto:** Bloqueo operativo entre organizaciones

### Escenario 2: Exposición de Datos Financieros
1. Usuario de Organización A consulta movimientos
2. Si conoce el `sessionId` de Organización B, puede ver sus movimientos
3. **Resultado:** Violación de privacidad y seguridad
4. **Impacto:** Exposición de información financiera sensible

### Escenario 3: Reportes Incorrectos
1. Usuario genera reporte de caja
2. El reporte incluye datos de todas las organizaciones
3. **Resultado:** Información financiera incorrecta
4. **Impacto:** Decisiones de negocio basadas en datos erróneos

---

## ✅ Plan de Corrección

### Fase 1: Migración de Base de Datos

#### 1.1 Agregar `organization_id` a todas las tablas

```sql
-- Agregar columna organization_id a cash_sessions
ALTER TABLE cash_sessions 
ADD COLUMN organization_id VARCHAR(255);

-- Agregar columna organization_id a cash_movements
ALTER TABLE cash_movements 
ADD COLUMN organization_id VARCHAR(255);

-- Agregar columna organization_id a cash_counts
ALTER TABLE cash_counts 
ADD COLUMN organization_id VARCHAR(255);

-- Agregar columna organization_id a cash_discrepancies
ALTER TABLE cash_discrepancies 
ADD COLUMN organization_id VARCHAR(255);
```

#### 1.2 Crear índices para performance

```sql
CREATE INDEX idx_cash_sessions_org_status ON cash_sessions(organization_id, status);
CREATE INDEX idx_cash_movements_org_session ON cash_movements(organization_id, session_id);
CREATE INDEX idx_cash_counts_org_session ON cash_counts(organization_id, session_id);
CREATE INDEX idx_cash_discrepancies_org_session ON cash_discrepancies(organization_id, session_id);
```

#### 1.3 Agregar foreign keys

```sql
ALTER TABLE cash_sessions 
ADD CONSTRAINT fk_cash_sessions_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cash_movements 
ADD CONSTRAINT fk_cash_movements_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cash_counts 
ADD CONSTRAINT fk_cash_counts_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cash_discrepancies 
ADD CONSTRAINT fk_cash_discrepancies_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
```

#### 1.4 Actualizar schema de Prisma

```prisma
model CashSession {
  id                 String       @id @default(cuid())
  organizationId     String       @map("organization_id")
  openedBy           String       @map("opened_by")
  closedBy           String?      @map("closed_by")
  openingAmount      Float        @map("opening_amount")
  closingAmount      Float?       @map("closing_amount")
  systemExpected     Float?       @map("system_expected")
  discrepancyAmount  Float?       @map("discrepancy_amount")
  status             String       @default("OPEN")
  notes              String?
  openedAt           DateTime     @default(now()) @map("opened_at")
  closedAt           DateTime?    @map("closed_at")
  createdAt          DateTime     @default(now()) @map("created_at")
  updatedAt          DateTime     @updatedAt @map("updated_at")
  
  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  openedByUser       User         @relation("CashSessionOpenedByUser", fields: [openedBy], references: [id])
  closedByUser       User?        @relation("CashSessionClosedByUser", fields: [closedBy], references: [id])
  movements          CashMovement[]
  counts             CashCount[]
  discrepancies      CashDiscrepancy[]

  @@index([organizationId, status])
  @@index([status])
  @@index([openedAt])
  @@index([closedAt])
  @@map("cash_sessions")
}

model CashMovement {
  id            String       @id @default(cuid())
  organizationId String      @map("organization_id")
  sessionId     String       @map("session_id")
  type          String
  amount        Float
  reason        String?
  referenceType String?      @map("reference_type")
  referenceId   String?      @map("reference_id")
  createdBy     String       @map("created_by")
  createdAt     DateTime     @default(now()) @map("created_at")
  
  organization  Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  session       CashSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  createdByUser User         @relation(fields: [createdBy], references: [id])

  @@index([organizationId, sessionId])
  @@index([sessionId])
  @@index([type])
  @@index([createdAt])
  @@index([referenceType, referenceId])
  @@map("cash_movements")
}

model CashCount {
  id            String       @id @default(cuid())
  organizationId String      @map("organization_id")
  sessionId     String       @map("session_id")
  denomination  Float
  quantity      Int          @default(0)
  total         Float        @default(0)
  createdAt     DateTime     @default(now()) @map("created_at")
  
  organization  Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  session       CashSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([organizationId, sessionId])
  @@index([sessionId])
  @@index([denomination])
  @@map("cash_counts")
}

model CashDiscrepancy {
  id             String       @id @default(cuid())
  organizationId String       @map("organization_id")
  sessionId      String       @map("session_id")
  type           String
  amount         Float
  explained      Boolean      @default(false)
  explanation    String?
  reportedBy     String?      @map("reported_by")
  createdAt      DateTime     @default(now()) @map("created_at")
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  session        CashSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  reportedByUser User?        @relation(fields: [reportedBy], references: [id])

  @@index([organizationId, sessionId])
  @@index([sessionId])
  @@index([type])
  @@index([createdAt])
  @@map("cash_discrepancies")
}
```

---

### Fase 2: Actualizar Backend

#### 2.1 Middleware de organización

Asegurar que `enhanced-auth.ts` inyecta `organizationId` en todas las requests.

#### 2.2 Actualizar rutas de cash

**GET `/cash/session/current`**
```typescript
router.get('/session/current', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  const session = await prisma.cashSession.findFirst({
    where: { 
      organizationId,
      status: 'OPEN' 
    },
    orderBy: { openedAt: 'desc' },
    include: {
      openedByUser: { select: { id: true, fullName: true, email: true } },
      closedByUser: { select: { id: true, fullName: true, email: true } }
    }
  });
  
  res.json({ session });
}));
```

**POST `/cash/session/open`**
```typescript
router.post('/session/open', requirePermission('cash', 'open'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { openingAmount, notes } = openSessionSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const existingOpen = await prisma.cashSession.findFirst({ 
    where: { 
      organizationId,
      status: 'OPEN' 
    } 
  });
  
  if (existingOpen) {
    throw createError('Ya existe una sesión de caja abierta en tu organización', 400);
  }

  const session = await prisma.cashSession.create({
    data: {
      organizationId,
      openedBy: userId,
      openingAmount,
      status: 'OPEN',
      notes
    }
  });

  res.status(201).json({ session });
}));
```

**POST `/cash/session/close`**
```typescript
router.post('/session/close', requirePermission('cash', 'close'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { closingAmount, systemExpected, notes, counts } = closeSessionSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const session = await prisma.cashSession.findFirst({ 
    where: { 
      organizationId,
      status: 'OPEN' 
    } 
  });
  
  if (!session) throw createError('No hay sesión de caja abierta en tu organización', 400);

  // Save counts if provided
  if (counts && counts.length > 0) {
    await prisma.cashCount.createMany({
      data: counts.map(c => ({
        organizationId,
        sessionId: session.id,
        denomination: c.denomination,
        quantity: c.quantity,
        total: c.denomination * c.quantity
      }))
    });
  }

  const expected = systemExpected ?? null;
  const discrepancy = expected != null ? (closingAmount - expected) : null;

  const closed = await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      closingAmount,
      closedBy: userId,
      closedAt: new Date(),
      status: 'CLOSED',
      systemExpected: expected ?? undefined,
      discrepancyAmount: discrepancy ?? undefined,
      notes
    }
  });

  res.json({ session: closed });
}));
```

**POST `/cash/movements`**
```typescript
router.post('/movements', requirePermission('cash', 'move'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId, type, amount, reason, referenceType, referenceId } = movementSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const session = await prisma.cashSession.findUnique({ 
    where: { 
      id: sessionId,
      organizationId // Verificar que la sesión pertenece a la organización
    } 
  });
  
  if (!session || session.status !== 'OPEN') {
    throw createError('Sesión inválida o cerrada', 400);
  }

  const movement = await prisma.cashMovement.create({
    data: {
      organizationId,
      sessionId,
      type,
      amount,
      reason,
      referenceType,
      referenceId,
      createdBy: userId
    }
  });

  res.status(201).json({ movement });
}));
```

**GET `/cash/movements`**
```typescript
router.get('/movements', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  // ... parse query params ...

  const where: any = {
    organizationId // Filtrar por organización
  };
  
  if (sessionId) {
    // Verificar que la sesión pertenece a la organización
    const session = await prisma.cashSession.findFirst({
      where: { id: sessionId, organizationId }
    });
    if (!session) throw createError('Sesión no encontrada', 404);
    where.sessionId = sessionId;
  }
  
  // ... resto de filtros ...

  const [movements, total] = await Promise.all([
    prisma.cashMovement.findMany({ where, include: includeObj, orderBy, skip, take }),
    prisma.cashMovement.count({ where })
  ]);

  res.json({ movements, pagination });
}));
```

**GET `/cash/sessions`**
```typescript
router.get('/sessions', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  // ... parse query params ...

  const where: any = {
    organizationId // Filtrar por organización
  };

  // ... resto de filtros ...

  const [sessions, total] = await Promise.all([
    prisma.cashSession.findMany({ where, include, orderBy, skip, take }),
    prisma.cashSession.count({ where })
  ]);

  res.json({ sessions, pagination });
}));
```

---

### Fase 3: Actualizar Frontend

#### 3.1 Actualizar hooks

**`useCashSession.ts`**
```typescript
export function useCashSession(): UseCashSessionReturn {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization(); // Obtener organizationId del contexto
  
  const {
    data: sessionRes,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['cashSession', organizationId], // Incluir organizationId en la key
    queryFn: async () => {
      const res = await api.get('/cash/session/current');
      return res.data;
    },
    enabled: !!organizationId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // ... resto del código ...
}
```

#### 3.2 Actualizar componentes

Asegurar que todos los componentes usan el contexto de organización correctamente.

---

## 📊 Checklist de Implementación

### Base de Datos
- [ ] Crear migración para agregar `organization_id` a `cash_sessions`
- [ ] Crear migración para agregar `organization_id` a `cash_movements`
- [ ] Crear migración para agregar `organization_id` a `cash_counts`
- [ ] Crear migración para agregar `organization_id` a `cash_discrepancies`
- [ ] Crear índices compuestos con `organization_id`
- [ ] Agregar foreign keys a `organizations`
- [ ] Actualizar `schema.prisma`
- [ ] Ejecutar `npx prisma generate`
- [ ] Ejecutar `npx prisma db push` o migración

### Backend
- [ ] Actualizar `GET /cash/session/current`
- [ ] Actualizar `POST /cash/session/open`
- [ ] Actualizar `POST /cash/session/close`
- [ ] Actualizar `POST /cash/movements`
- [ ] Actualizar `GET /cash/movements`
- [ ] Actualizar `GET /cash/movements/export`
- [ ] Actualizar `POST /cash/discrepancies`
- [ ] Actualizar `GET /cash/sessions`
- [ ] Actualizar `POST /cash/sessions/:sessionId/counts`
- [ ] Agregar tests de aislamiento por organización

### Frontend
- [ ] Actualizar `useCashSession` para incluir `organizationId`
- [ ] Actualizar `useCashDashboard` para incluir `organizationId`
- [ ] Actualizar `useMovements` para incluir `organizationId`
- [ ] Actualizar `useCashMutations` para incluir `organizationId`
- [ ] Actualizar query keys en React Query
- [ ] Verificar que todos los componentes usan el contexto correcto
- [ ] Agregar tests de integración

### Testing
- [ ] Test: Usuario de Org A no ve sesiones de Org B
- [ ] Test: Usuario de Org A no puede cerrar sesión de Org B
- [ ] Test: Movimientos filtrados correctamente por organización
- [ ] Test: Reportes solo muestran datos de la organización actual
- [ ] Test: Export CSV solo incluye datos de la organización
- [ ] Test: Discrepancias aisladas por organización

---

## 🎯 Prioridad

**CRÍTICA** - Este módulo maneja información financiera sensible y debe ser corregido antes de cualquier despliegue en producción con múltiples organizaciones.

---

## 📝 Notas Adicionales

1. **Migración de datos existentes:** Si ya hay datos en producción, será necesario asignar un `organization_id` a los registros existentes.

2. **Sesiones abiertas:** Considerar qué hacer con sesiones abiertas durante la migración.

3. **Auditoría:** Agregar logs de auditoría para todas las operaciones de caja.

4. **Permisos:** Verificar que los permisos de cash están correctamente configurados en el sistema de roles.

5. **RLS en Supabase:** Si se usa Supabase, agregar políticas RLS para las tablas de cash.

---

## ✅ Conclusión

El módulo de Caja requiere una refactorización completa para ser compatible con SaaS multitenancy. La implementación actual es un riesgo de seguridad crítico que debe ser abordado inmediatamente.
