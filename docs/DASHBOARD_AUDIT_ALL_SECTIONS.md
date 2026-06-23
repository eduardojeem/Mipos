# Inventario de endpoints del dashboard

**Fecha:** 2026-06-22

> Nota de honestidad: la versión previa clasificaba secciones como "críticas"
> con estimaciones de costo ($/mes) y de riesgo que **no fueron medidas**. Se
> eliminaron. Esto es solo un inventario verificable más observaciones.

## Dato verificable

- Total de archivos `route.ts` bajo `apps/frontend/src/app/api/`: **305**
  (medido con `find`). No todos son del dashboard; incluye auth, superadmin,
  webhooks, etc.
- Ya existe rate limiting en el repo: `src/lib/rate-limit.ts` (usado por
  `orders/route.ts`) y `auth/register/` (con variante Redis). El resto de
  endpoints no tiene rate limiting a nivel de aplicación.

## Observaciones (sin medir)

Estas son hipótesis de revisión, no hechos medidos:

- Varios endpoints `*/summary` y `*/analytics` cargan filas y agregan en JS.
  Candidatos a moverse a RPC de Postgres (como se hizo con productos), **si**
  un perfilado muestra que el volumen lo justifica.
- `/api/reports/export` es el candidato más claro para limitar por abuso —
  mejor vía Vercel WAF (rate limit por IP en esa ruta).

## Recomendación honesta

Antes de "optimizar" más endpoints, **medir**: revisar el uso real en Supabase
(Reports → API/Database) para saber qué endpoints transfieren más datos. No
optimizar a ciegas con números inventados.
