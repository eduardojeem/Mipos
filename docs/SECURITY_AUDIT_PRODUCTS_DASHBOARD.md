# Revisión de seguridad — Dashboard de productos

**Fecha:** 2026-06-22
**Alcance revisado:** `/dashboard/products` y endpoints `/api/products/*`, más una pasada a otros endpoints del dashboard.

> Nota de honestidad: una versión previa de este documento incluía cifras de
> ahorro ($/mes), porcentajes de reducción y "scores" de seguridad que **no
> fueron medidos** — eran estimaciones presentadas como hechos. Se eliminaron.
> Este documento solo contiene lo verificable.

---

## Lo que se verificó

- **Aislamiento por organización:** los endpoints de productos filtran por
  `organization_id` (ej. `api/products/list/route.ts`). Correcto.
- **Queries parametrizadas:** se usa el cliente de Supabase (no concatenación
  SQL). No se observó inyección SQL.
- **Búsqueda saneada:** `sanitizeSearch()` se aplica en el filtro de búsqueda.
- **`cost_price`** no se expone en el endpoint público de productos.
- **Catálogo público:** `lib/public-site/global-catalog-data.ts` filtra
  `is_public = true` a nivel de query (línea ~454), además de un filtro
  defensivo en JS. Los productos privados no se exponen.

## Hallazgos reales

1. **`/api/products/summary` devolvía ceros en un caso.** Tras mi refactor, una
   variable (`normalizedIsActive`) quedó referenciada pero sin declarar en el
   camino de fallback → `ReferenceError` → `catch` → respuesta en ceros cuando
   el RPC no estaba aplicado. **Corregido** y verificado con `tsc`.

2. **El build ignora errores de tipo.** `next.config.js` tiene
   `typescript.ignoreBuildErrors: true` y `eslint.ignoreDuringBuilds: true`.
   Implica que errores de TypeScript **no** rompen el deploy; hay que correr
   `npx tsc --noEmit` manualmente para detectarlos.

3. **Rate limiting en memoria no sirve en este deploy.** El proyecto corre en
   **Vercel (serverless)**. Un limitador basado en `Map` en memoria de módulo
   es por-instancia y efímero, así que no protege de forma fiable. Se decidió
   usar **Vercel WAF** en su lugar (ver abajo). El limitador en memoria que se
   había agregado fue **removido** para no dar falsa sensación de seguridad.

4. **Ya existía rate limiting previo** en `src/lib/rate-limit.ts`
   (usado por `orders/route.ts`) y en `auth/register/` (con variante Redis).
   No se modificaron.

## Optimización aplicada (RPC)

Se creó `get_product_statistics(org_id)` para que `/api/products/summary`
agregue en Postgres en lugar de traer todas las filas y sumar en JS.

- Migración: `supabase/migrations/20260622_optimize_product_stats_rpc.sql`
- **Estado:** ✅ validada en Supabase dev (2026-06-22). La primera versión
  falló por desajuste de tipos (UUID vs text); se corrigió con casts
  explícitos. Verificada contra una org con 19 productos: los conteos del RPC
  (total/stock bajo/sin stock/valor) coinciden exactamente con un conteo
  manual.
- El endpoint usa el RPC si existe y mantiene un fallback en JS si no.

También se crearon (pero **no validadas en Supabase**):
- `20260622_optimize_orders_stats_rpc.sql` (`get_orders_statistics`)
- `20260622_optimize_customers_analytics_rpc.sql` (`get_customers_analytics`)

> Estas dos no están conectadas todavía a sus endpoints. Son borradores hasta
> validarlas.

## Decisión sobre rate limiting: Vercel WAF

Configurar en el dashboard de Vercel (Project → Firewall) o vía reglas:
- Límite por IP en rutas sensibles (ej. `/api/reports/export`, búsquedas).
- No requiere código de aplicación ni dependencias nuevas.
- Funciona a nivel de edge, antes de invocar la función.

Documentación: https://vercel.com/docs/security/vercel-waf

## Pendiente / no hecho

- Validar las 3 migraciones RPC en Supabase dev.
- Conectar `get_orders_statistics` y `get_customers_analytics` a sus endpoints
  (hoy siguen con el cálculo en JS).
- Configurar las reglas de Vercel WAF (acción del usuario en el dashboard).
- `products-export.ts`: 2 advertencias de tipo de `jspdf-autotable` (colores y
  margen) — funcionan en runtime, no se forzaron con `as any`.
