# Tabla de Fallos de Sincronización (sync_failures)

## Propósito

Esta tabla registra todos los fallos de sincronización con sistemas externos para permitir reintentos posteriores y auditoría de problemas de integración.

## Estructura

```sql
CREATE TABLE sync_failures (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,      -- Tipo de entidad (RETURN, SALE, etc.)
    entity_id TEXT NOT NULL,        -- ID de la entidad
    action TEXT NOT NULL,           -- Acción (CREATE, UPDATE, DELETE, etc.)
    error TEXT NOT NULL,            -- Mensaje de error
    payload TEXT,                   -- Payload JSON enviado
    retry_count INTEGER DEFAULT 0,  -- Número de reintentos
    last_retry_at TIMESTAMP,        -- Fecha del último reintento
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Instalación

### Opción 1: Ejecutar script SQL directamente

```bash
psql -U your_user -d your_database -f apps/backend/scripts/add-sync-failures-table.sql
```

### Opción 2: Agregar al schema de Prisma

Agregar al archivo `prisma/schema.prisma`:

```prisma
model SyncFailure {
  id           String    @id @default(cuid())
  entityType   String    @map("entity_type")
  entityId     String    @map("entity_id")
  action       String
  error        String
  payload      String?
  retryCount   Int       @default(0) @map("retry_count")
  lastRetryAt  DateTime? @map("last_retry_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@index([entityType, entityId])
  @@index([retryCount, createdAt])
  @@map("sync_failures")
}
```

Luego ejecutar:

```bash
npx prisma migrate dev --name add_sync_failures_table
```

## Uso

### Registrar un fallo de sincronización

```typescript
await prisma.syncFailure.create({
  data: {
    entityType: 'RETURN',
    entityId: returnId,
    action: 'CREATE',
    error: 'HTTP 500: Internal Server Error',
    payload: JSON.stringify(payload),
    retryCount: 0
  }
});
```

### Consultar fallos pendientes de retry

```typescript
const pendingRetries = await prisma.syncFailure.findMany({
  where: {
    retryCount: { lt: 3 }, // Menos de 3 reintentos
    OR: [
      { lastRetryAt: null },
      { lastRetryAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } } // Más de 5 minutos
    ]
  },
  orderBy: { createdAt: 'asc' },
  take: 10
});
```

### Actualizar después de un reintento

```typescript
await prisma.syncFailure.update({
  where: { id: failureId },
  data: {
    retryCount: { increment: 1 },
    lastRetryAt: new Date()
  }
});
```

### Eliminar después de éxito

```typescript
await prisma.syncFailure.delete({
  where: { id: failureId }
});
```

## Job de Retry Automático

Se recomienda crear un job que ejecute reintentos periódicamente:

```typescript
// apps/backend/src/jobs/retry-sync-failures.ts
import { prisma } from '../index';
import { syncReturnToExternalSystem } from '../routes/helpers/external-sync';

export async function retrySyncFailures() {
  const failures = await prisma.syncFailure.findMany({
    where: {
      retryCount: { lt: 3 },
      OR: [
        { lastRetryAt: null },
        { lastRetryAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }
      ]
    },
    take: 10
  });

  for (const failure of failures) {
    try {
      const payload = JSON.parse(failure.payload || '{}');
      
      if (failure.entityType === 'RETURN') {
        const returnData = await prisma.return.findUnique({
          where: { id: failure.entityId },
          include: { returnItems: { include: { product: true } } }
        });

        if (returnData) {
          await syncReturnToExternalSystem(returnData, failure.action as any);
          
          // Éxito - eliminar registro
          await prisma.syncFailure.delete({ where: { id: failure.id } });
          console.log(`Retry successful for ${failure.entityType} ${failure.entityId}`);
        }
      }
    } catch (error) {
      // Actualizar contador de reintentos
      await prisma.syncFailure.update({
        where: { id: failure.id },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      console.error(`Retry failed for ${failure.entityType} ${failure.entityId}:`, error);
    }
  }
}

// Ejecutar cada 5 minutos
setInterval(retrySyncFailures, 5 * 60 * 1000);
```

## Monitoreo

### Consultar estadísticas de fallos

```sql
SELECT 
    entity_type,
    action,
    COUNT(*) as total_failures,
    AVG(retry_count) as avg_retries,
    MAX(retry_count) as max_retries
FROM sync_failures
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity_type, action
ORDER BY total_failures DESC;
```

### Fallos críticos (más de 3 reintentos)

```sql
SELECT *
FROM sync_failures
WHERE retry_count >= 3
ORDER BY created_at DESC
LIMIT 20;
```

## Limpieza

Eliminar registros antiguos exitosos o con demasiados reintentos:

```sql
-- Eliminar registros con más de 5 reintentos (considerados fallidos permanentemente)
DELETE FROM sync_failures
WHERE retry_count > 5
AND created_at < NOW() - INTERVAL '7 days';

-- Eliminar registros antiguos (más de 30 días)
DELETE FROM sync_failures
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Alertas

Se recomienda configurar alertas cuando:
- Hay más de 10 fallos en la última hora
- Un mismo entity_id falla más de 3 veces
- El retry_count promedio supera 2

## Notas

- Los reintentos usan backoff exponencial (5 min, 15 min, 30 min)
- Después de 3 reintentos fallidos, se requiere intervención manual
- Los payloads se almacenan para debugging y auditoría
- La tabla debe limpiarse periódicamente para evitar crecimiento excesivo
