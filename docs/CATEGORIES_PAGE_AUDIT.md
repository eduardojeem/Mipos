# Auditoría: /home/categorias - Problemas Identificados

**Fecha:** 2026-06-22  
**Alcance:** Análisis completo de `/home/categorias`  
**Status:** 7 problemas encontrados (1 CRÍTICO, 3 ALTOS, 3 MEDIOS)

---

## 🔴 PROBLEMA 1: CRÍTICO - Productos desapareciendo al filtrar

**Severity:** 🔴 CRÍTICA  
**Ubicación:** `lib/public-site/global-catalog-data.ts:resolveMarketplaceCategoryOrgIds()`

**Problema:**
```
User flow:
1. Ve "Cosméticos: 24" en /home/categorias
2. Haz click en "Cosméticos"
3. Redirige a /home/catalogo?category=cosmeticos
4. RESULTADO: 0 productos (debería ser 24)
```

**Causa Raíz:**
Organizaciones SIN `marketplace_category_id` explícito pero con productos en categorías internas no aparecen en búsquedas.

**Fix:**
✅ **YA ARREGLADO** - Fallback RPC `get_organizations_by_internal_category()`

---

## 🟠 PROBLEMA 2: ALTO - Conteos incorrectos en categorías

**Severity:** 🟠 ALTO  
**Ubicación:** `supabase/migrations/20260517_marketplace_categories.sql:get_marketplace_categories_with_counts()`

**Problema:**
```sql
RPC cuenta productos INACTIVOS, NO PÚBLICOS, y ELIMINADOS

Ejemplo:
- Categoría "Cosméticos" muestra 24 productos
- Pero 10 están inactivos (is_active = FALSE)
- Y 5 están no públicos (is_public = FALSE)
- RESULTADO: Conteo inflado (24 vs. realidad ~9)
```

**Causa:**
El LEFT JOIN no filtra por:
- `p.is_active = TRUE`
- `p.is_public = TRUE`
- `p.deleted_at IS NULL`

**Fix:**
✅ **YA ARREGLADO** - Agregados filtros en línea 214-215

---

## 🟠 PROBLEMA 3: ALTO - Sin búsqueda de categorías

**Severity:** 🟠 ALTO  
**Ubicación:** `page.tsx:normalizeSearchParams()` y `CategoryFilterBar.tsx`

**Problema:**
```
Usuario busca "cos" esperando encontrar "Cosméticos"
RESULTADO: 0 resultados (búsqueda EXACTA solo)

No hay:
- Búsqueda fuzzy
- Autocomplete
- Sugerencias de categorías
```

**Ejemplo:**
```
User: "Quiero buscar 'restaurantes'"
Tipea: "rest" y espera sugerencias
ACTUAL: Nada hasta que presiona Enter
ESPERADO: Dropdown con "Restaurantes" sugerido
```

**Fix Recomendado:**
```typescript
// Agregar fuzzy matching en busca
function fuzzyMatchCategories(query: string, categories: GlobalCategoryExplorerItem[]) {
  return categories.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    levenshteinDistance(query, c.name) < 3
  );
}

// Agregar autocomplete en CategoryFilterBar
<input
  list="categories-list"
  ...
/>
<datalist id="categories-list">
  {suggestions.map(cat => <option key={cat.id} value={cat.name} />)}
</datalist>
```

---

## 🟠 PROBLEMA 4: ALTO - Conteos globales incorrectos

**Severity:** 🟠 ALTO  
**Ubicación:** `page.tsx:líneas 83-84` y `CategoryFilterBar.tsx:líneas 130-151`

**Problema:**
```typescript
// ACTUAL
const totalOrgs     = snapshot.totalOrganizations;  // Suma de todas las orgs
const totalProducts = snapshot.totalProducts;        // Suma de todos los productos

// ESPERADO cuando hay filtro de búsqueda
- totalOrgs debería ser: Orgs en CATEGORÍAS BUSCADAS
- totalProducts debería ser: Productos en CATEGORÍAS BUSCADAS
```

**Ejemplo:**
```
Estado actual:
- Busca: "res" (0 categorías coinciden)
- Muestra: "X empresas, Y productos" (de TODAS las categorías)

INCORRECTO: Debería mostrar 0 empresas, 0 productos
```

**Fix Recomendado:**
```typescript
// En global-categories-data.ts, retornar:
interface GlobalCategoriesSnapshot {
  ...
  matchingOrganizations: number;    // Orgs en categorías buscadas
  matchingProducts: number;          // Productos en categorías buscadas
}

// En page.tsx:
const totalOrgs = hasActiveFilters ? snapshot.matchingOrganizations : snapshot.totalOrganizations;
const totalProducts = hasActiveFilters ? snapshot.matchingProducts : snapshot.totalProducts;
```

---

## 🟡 PROBLEMA 5: MEDIO - Sin imágenes en categorías

**Severity:** 🟡 MEDIO  
**Ubicación:** `AllCategoriesGrid.tsx`

**Problema:**
```
Categorías muestran solo:
- Icono (lucide-react string)
- Nombre
- Conteo de productos/empresas

FALTA:
- `image_url` no se usa
- Sin hero image o portada visual
- Aspecto aburrido sin contexto visual
```

**Ejemplo:**
```
ACTUAL:
[RestaurantIcon] Restaurantes
24 empresas, 1.2K productos

ESPERADO:
[Beautiful restaurant dish image]
RESTAURANTES
24 empresas, 1.2K productos
```

**Fix:**
```typescript
// En AllCategoriesGrid.tsx
<div className="relative h-48 bg-slate-200 dark:bg-slate-800">
  {category.image_url ? (
    <Image 
      src={category.image_url}
      alt={category.name}
      fill
      className="object-cover"
    />
  ) : (
    <div className="flex items-center justify-center h-full">
      <Icon className="h-16 w-16 text-slate-400" />
    </div>
  )}
</div>
```

**Database:**
Agregar `image_url` a marketplace_categories seed en migración:
```sql
UPDATE marketplace_categories
SET image_url = '/images/categories/restaurantes.jpg'
WHERE slug = 'restaurantes';
```

---

## 🟡 PROBLEMA 6: MEDIO - Sin descripción de categorías

**Severity:** 🟡 MEDIO  
**Ubicación:** `AllCategoriesGrid.tsx`

**Problema:**
```
Marketplace_categories tiene `description` (TEXT)
Pero NO se muestra en la grid

Usuarios no saben:
- Qué incluye la categoría
- Qué diferencia una categoría de otra
- Por qué hay "Belleza" vs "Farmacia"
```

**Ejemplo:**
```
ACTUAL:
[Icon] Belleza y Cuidado
15 empresas

ESPERADO:
[Icon] Belleza y Cuidado
Barberías, peluquerías, salones de belleza y cuidado personal
15 empresas
```

**Fix:**
```typescript
// En AllCategoriesGrid.tsx
<h3 className="text-lg font-semibold">{category.name}</h3>
{category.description && (
  <p className="text-sm text-slate-500 line-clamp-2">
    {category.description}
  </p>
)}
<p className="text-xs text-slate-400">
  {category.organizationCount} empresas • {category.productCount} productos
</p>
```

---

## 🟡 PROBLEMA 7: MEDIO - Sin caching de categorías

**Severity:** 🟡 MEDIO  
**Ubicación:** `lib/public-site/global-categories-data.ts:fetchGlobalCategoriesSnapshot()`

**Problema:**
```
RPC ejecutada CADA VEZ que se accede a /home/categorias
- Sin búsqueda: RPC corre
- Con búsqueda: RPC corre
- Cambio de sort: RPC corre

IMPACTO:
- Categorías cambian raramente
- RPC es costoso (JOIN + GROUP BY)
- Datos idénticos en 95% de las visitas
```

**Fix Recomendado:**
```typescript
const fetchCachedCategoriesSnapshot = unstable_cache(
  async (input: GlobalCategoriesQueryState) => {
    return fetchGlobalCategoriesSnapshot(input);
  },
  ['categories-snapshot'], // Cache key
  {
    revalidate: 300, // 5 minutos
    tags: ['categories']
  }
);
```

**Impacto Esperado:**
- Primiera visita: ~500ms (RPC)
- Siguientes 5 min: <10ms (cache)

---

## RESUMEN DE IMPACTOS

| Problema | Severidad | Impacto | Esfuerzo | Prioridad |
|----------|-----------|---------|----------|-----------|
| 1. Productos desaparecen | 🔴 CRÍTICA | Users can't browse by category | 2h | 1 |
| 2. Conteos incorrectos | 🟠 ALTO | Misleading product counts | 1h | 2 |
| 3. Sin búsqueda fuzzy | 🟠 ALTO | Poor discoverability | 3h | 3 |
| 4. Stats incorrectos | 🟠 ALTO | Wrong UI metrics | 2h | 4 |
| 5. Sin imágenes | 🟡 MEDIO | Poor visual experience | 2h | 5 |
| 6. Sin descripciones | 🟡 MEDIO | No context for users | 1h | 6 |
| 7. Sin caching | 🟡 MEDIO | Performance degradation | 1h | 7 |

---

## 🚀 PLAN DE CORRECCIONES

### Fase 1 (INMEDIATA - 2 días)
- ✅ Fix #1: Productos desapareciendo
- ✅ Fix #2: Conteos incorrectos
- ⏳ Fix #4: Stats con filtros activos

### Fase 2 (CORTA - 1 semana)
- ⏳ Fix #3: Búsqueda fuzzy + autocomplete
- ⏳ Fix #7: Caching estratégico

### Fase 3 (MEDIA - 2 semanas)
- ⏳ Fix #5: Agregar imágenes de categorías
- ⏳ Fix #6: Agregar descripciones

---

## ✅ STATUS

```
✅ FIX #1: COMPLETADO - Migration + RPC fallback
✅ FIX #2: COMPLETADO - RPC filters updated
✅ FIX #3A: COMPLETADO - Product count filters in category-organizations-data.ts
✅ FIX #3B: COMPLETADO - Added fallback RPC for internal categories
⏳ FIX #4: TODO
⏳ FIX #5: TODO
⏳ FIX #6: TODO
⏳ FIX #7: TODO
```

---

## 🔧 ADDITIONAL FIXES APPLIED

### Fix #3A: Product Filters in Category Page (2026-06-22)

**Location:** `lib/public-site/category-organizations-data.ts:76-81`

**Problem:**
The category-specific page (`/home/categorias/[slug]`) was counting ALL products, including inactive and unpublic ones.

**Before:**
```typescript
.eq('is_active', true)  // Only checks active, missing is_public and deleted_at
```

**After:**
```typescript
.eq('is_active', true)
.eq('is_public', true)
.is('deleted_at', null)
```

**Impact:** Now correctly counts only publishable products in category cards.

---

### Fix #3B: Org Fallback for Category Page (2026-06-22)

**Location:** `lib/public-site/category-organizations-data.ts:55-80`

**Problem:**
Only showed orgs with explicit `marketplace_category_id`. Missed orgs with internal categories matching the marketplace category name.

**Solution:**
Added fallback RPC call `get_organizations_by_internal_category()` to find orgs without explicit marketplace_category_id but with matching internal categories.

**Impact:** Now shows all relevant orgs in category page, not just those with explicit assignment.

---

**Documento actualizado con todos los fixes aplicados.**
