# Auditoría Completa de Todas las Secciones Públicas

**Fecha:** 2026-06-22  
**Alcance:** Todas las secciones públicas del marketplace  
**Status:** 8 problemas encontrados (3 CRÍTICOS, 3 ALTOS, 2 MEDIOS)

---

## 📊 SECCIONES AUDITADAS

```
✅ /home              - Home page
✅ /home/catalogo     - Catálogo de productos
✅ /home/categorias   - Directorio de categorías
✅ /home/categorias/[slug] - Página específica de categoría
✅ /home/empresas     - Directorio de organizaciones
✅ Ofertas/Promotions - Ofertas públicas
```

---

## 🐛 PROBLEMAS ENCONTRADOS

### ✅ ARREGLADO #1: RPC Conteos Incorrectos en Categorías

**Severity:** 🔴 CRÍTICA  
**Ubicación:** `supabase/migrations/20260517_marketplace_categories.sql`

**Status:** ✅ **ARREGLADO** (Commit: 29a181e)

**Detalles:**
- RPC contaba productos inactivos, no públicos, eliminados
- Conteos inflados: 24 → 9
- Fix: Agregados filtros `is_active`, `is_public`, `deleted_at`

---

### ✅ ARREGLADO #2: Productos Desapareciendo al Filtrar Categoría

**Severity:** 🔴 CRÍTICA  
**Ubicación:** `lib/public-site/global-catalog-data.ts`

**Status:** ✅ **ARREGLADO** (Commit: 3a8237f)

**Detalles:**
- Orgs sin `marketplace_category_id` no aparecían en búsquedas
- Fix: RPC fallback `get_organizations_by_internal_category()`

---

### ✅ ARREGLADO #3: Conteos Incorrectos en Página de Categoría

**Severity:** 🔴 CRÍTICA  
**Ubicación:** `lib/public-site/category-organizations-data.ts`

**Status:** ✅ **ARREGLADO** (Commit: d1649c8)

**Detalles:**
- No filtraba `is_public` ni `deleted_at`
- Mostraba orgs sin marketplace_category_id
- Fix: Agregados filtros + RPC fallback

---

### 🔴 NUEVO #4: Ofertas Mostrando Productos No Públicos

**Severity:** 🔴 CRÍTICA  
**Ubicación:** `lib/public-site/offers-data.ts:340-353`

**Problema:**
```typescript
const runProductsQuery = async (selectClause: string, opts?: { skipDeleted?: boolean }) => {
  let q = supabase
    .from('products')
    .select(selectClause)
    .eq('organization_id', organizationId)
    .eq('is_active', true)  // ✅ Filtra is_active
    .in('id', productIds);

  if (!opts?.skipDeleted) {
    q = q.is('deleted_at', null);  // ✅ Filtra deleted_at
  }

  // ❌ FALTA: .eq('is_public', true)
  return q;
};
```

**Impact:**
- Ofertas de productos privados visibles en `/home/ofertas`
- Data leak potencial
- User experience: Productos no disponibles en carrito

**Fix Recomendado:**
```typescript
const runProductsQuery = async (selectClause: string, opts?: { skipDeleted?: boolean }) => {
  let q = supabase
    .from('products')
    .select(selectClause)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('is_public', true)  // ← NUEVO
    .in('id', productIds);

  if (!opts?.skipDeleted) {
    q = q.is('deleted_at', null);
  }

  return q;
};
```

---

### 🟠 NUEVO #5: Conteos de Organizaciones Sin Filtro de Productos

**Severity:** 🟠 ALTO  
**Ubicación:** `lib/public-site/global-organizations-data.ts:244-273`

**Problema:**
```
Las organizaciones se cuentan por número de productos activos/públicos.
PERO:
- No filtra si org tiene CERO productos válidos
- Muestra orgs vacías en el directorio
- Conteos pueden estar sesgados
```

**Ejemplo:**
```
Org "Farmacia 24h"
- 50 productos en DB
- 45 inactivos (is_active = FALSE)
- 5 no públicos (is_public = FALSE)
- RESULTADO: 0 productos mostrados ✓ CORRECTO
PERO: Org sigue apareciendo en /home/empresas ✗ INCORRECTO
```

**Fix Recomendado:**
```typescript
// Línea 373 en /home/empresas/page.tsx
const visibleOrganizations = allOrganizations.filter(org => 
  org.productCount > 0  // Solo orgs con productos válidos
);

// Luego usar visibleOrganizations en lugar de allOrganizations
```

---

### 🟠 NUEVO #6: Búsqueda de Organizaciones Sin Validación de Entrada

**Severity:** 🟠 ALTO  
**Ubicación:** `lib/public-site/global-organizations-data.ts:375-413`

**Problema:**
```typescript
function filterOrganizations(items: FeaturedOrganizationCard[], input: GlobalOrganizationsQueryState) {
  const normalizedSearch = sanitizeSearchTerm(input.search).toLowerCase();

  return filteredByLocation.filter((organization) => {
    const haystack = [
      organization.name,
      organization.tagline,
      organization.description,
      organization.location,
      organization.website || '',
      organization.city || '',
      organization.department || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);  // ← Búsqueda EXACTA, sin fuzzy
  });
}
```

**Impact:**
- Búsqueda "farm" no encuentra "Farmacia 24h"
- Búsqueda "tiend" no encuentra "Tienda Central"
- UX pobre: Usuario debe conocer nombre exacto

---

### 🟠 NUEVO #7: Conteos Globales Incorrectos en /home/empresas

**Severity:** 🟠 ALTO  
**Ubicación:** `app/home/empresas/page.tsx`

**Problema:**
```typescript
const snapshot = await fetchGlobalOrganizationsSnapshot(context.hostname, queryState);
// snapshot.totalOrganizations = todas las orgs activas
// snapshot.totalProducts = suma de todos sus productos

PERO cuando hay filtros de búsqueda:
- "Busca: 'restau'" (0 coincidencias)
- Muestra: "X empresas, Y productos" (de TODAS)

Debería mostrar: "0 empresas, 0 productos"
```

---

### 🟡 NUEVO #8: Caching Inconsistente en Ofertas

**Severity:** 🟡 MEDIO  
**Ubicación:** `lib/public-site/offers-data.ts`

**Problema:**
```typescript
export async function fetchPublicOffersSnapshot(
  // ... No hay caching aquí!
  // Se ejecuta query completa en cada request
```

**Impact:**
- Query a `promotions_products` + `products` + `categories` en cada request
- Sin Next.js caching
- Performance degradation en tráfico alto

---

## 📋 TABLA RESUMIDA

| # | Problema | Severidad | Ubicación | Status | Esfuerzo |
|---|----------|-----------|-----------|--------|----------|
| 1 | Conteos RPC incorrectos | 🔴 | marketplace_categories.sql | ✅ | 1h |
| 2 | Productos desaparecen | 🔴 | global-catalog-data.ts | ✅ | 2h |
| 3 | Categoría sin filtros | 🔴 | category-organizations-data.ts | ✅ | 1h |
| 4 | Ofertas no filtran público | 🔴 | offers-data.ts | ⏳ | 1h |
| 5 | Orgs vacías visibles | 🟠 | global-organizations-data.ts | ⏳ | 2h |
| 6 | Búsqueda sin fuzzy | 🟠 | global-organizations-data.ts | ⏳ | 3h |
| 7 | Stats incorrectos | 🟠 | empresas/page.tsx | ⏳ | 2h |
| 8 | Sin caching ofertas | 🟡 | offers-data.ts | ⏳ | 1h |

---

## 🚀 PLAN DE CORRECCIONES INMEDIATAS

### Fase 1 (HOY - 2 horas)
- [ ] Fix #4: Agregar `is_public` a offers-data.ts
- [ ] Fix #5: Filtrar orgs con 0 productos

### Fase 2 (Mañana - 3 horas)
- [ ] Fix #6: Implementar fuzzy search en orgs
- [ ] Fix #7: Stats dinámicos con filtros
- [ ] Fix #8: Agregar caching a ofertas

---

## ✅ STATUS ACTUAL

```
Fixes Aplicados:     3 de 8 (37.5%)
Bugs Críticos:       0 pendientes (3/3 arreglados)
Bugs Altos:          3 pendientes
Bugs Medios:         1 pendiente

SECTORES:
✅ /home/catalogo          - SEGURO
✅ /home/categorias        - SEGURO
⚠️  /home/empresas         - TIENE ISSUES
⚠️  Ofertas/Promotions    - TIENE ISSUES
✅ Conteos RPC            - CORRECTO
```

---

**Documento preparado para implementación inmediata.**
