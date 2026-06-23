# Registro de cambios — trabajo de seguridad (productos/dashboard)

> Nota de honestidad: la versión previa de este archivo afirmaba "FASE 2
> COMPLETA", "$1150/mes de ahorro", "95% de reducción" y una línea de tiempo
> con horas exactas. Nada de eso fue medido — eran cifras inventadas. Este
> archivo las reemplaza por lo que realmente pasó.

## Qué se hizo de verdad

- **Features de producto (funcionan):** toggle de privacidad (`is_public`),
  exportación con columnas configurables a PDF/CSV, mejoras de la vista tabla.
- **RPC `get_product_statistics`** creado y cableado a `/api/products/summary`
  (con fallback en JS). Migración corregida tras un error de tipos; **falta
  validarla en Supabase**.
- **Bug corregido:** `/api/products/summary` devolvía ceros por una variable
  sin declarar tras el refactor. Arreglado y verificado con `tsc`.
- **Rate limiting en memoria: revertido.** No funciona en Vercel serverless.
  Se optó por Vercel WAF. Ver `SECURITY_AUDIT_PRODUCTS_DASHBOARD.md`.

## Lo que NO está terminado

- Migraciones `get_orders_statistics` y `get_customers_analytics`: creadas como
  borrador, **no validadas** y **no conectadas** a sus endpoints.
- Configuración de Vercel WAF: pendiente (acción en el dashboard de Vercel).

## Cómo verificar

```bash
cd apps/frontend && npx tsc --noEmit   # el build ignora errores de tipo
```

En Supabase (con un org_id real):
```sql
SELECT * FROM get_product_statistics('<uuid-real>'::uuid);
```
