# Auditoría SaaS: Páginas Públicas

**Fecha:** 2026-02-05  
**Objetivo:** Auditar y proponer integración SaaS multitenancy para páginas públicas

---

## 📋 RESUMEN EJECUTIVO

### Páginas Auditadas
1. `/home` - Página principal pública
2. `/offers` - Ofertas y promociones
3. `/catalog` - Catálogo de productos
4. `/orders/track` - Seguimiento de pedidos

### Estado Actual: ⚠️ NO COMPATIBLE CON SAAS

**Problema Principal:** Las páginas públicas actualmente **NO tienen contexto de organización**, lo que significa que:
- Todos los clientes ven los mismos productos
- No hay aislamiento de datos por organización
- No hay forma de identificar a qué "tienda" pertenece cada visita

---

## 🎯 DESAFÍO PRINCIPAL: IDENTIFICACIÓN DE ORGANIZACIÓN

### El Problema

En un sistema SaaS multitenancy, cada organización tiene su propia "tienda" con:
- Sus propios productos
- Sus propias ofertas
- Su propia configuración (colores, logo, etc.)
- Sus propios pedidos

**¿Cómo sabe el sistema qué organización mostrar cuando un cliente visita `/home`?**

---

## 💡 SOLUCIONES PROPUESTAS

### Opción 1: Subdominios (RECOMENDADA) ⭐

**Concepto:**
```
empresa-a.tudominio.com  → Muestra productos de Empresa A
empresa-b.tudominio.com  → Muestra productos de Empresa B
empresa-c.tudominio.com  → Muestra productos de Empresa C
```

**Ventajas:**
- ✅ Aislamiento perfecto
- ✅ SEO independiente por organización
- ✅ Branding personalizado por dominio
- ✅ Fácil de entender para clientes
- ✅ Escalable

**Desventajas:**
- ⚠️ Requiere configuración de DNS
- ⚠️ Requiere certificados SSL wildcard
- ⚠️ Más complejo de implementar

**Implementación:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Buscar organización por subdomain/slug
  const organization = await getOrganizationBySlug(subdomain);
  
  // Agregar a headers para uso en páginas
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-organization-id', organization.id);
  requestHeaders.set('x-organization-slug', organization.slug);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

---

### Opción 2: Path-based (ALTERNATIVA)

**Concepto:**
```
tudominio.com/empresa-a/home     → Empresa A
tudominio.com/empresa-b/home     → Empresa B
tudominio.com/empresa-c/catalog  → Empresa C
```

**Ventajas:**
- ✅ Más fácil de implementar
- ✅ No requiere DNS especial
- ✅ Un solo certificado SSL

**Desventajas:**
- ❌ URLs más largas
- ❌ SEO compartido
- ❌ Menos profesional
- ❌ Confuso para clientes

**Implementación:**
```typescript
// app/[orgSlug]/home/page.tsx
export default async function HomePage({ 
  params 
}: { 
  params: { orgSlug: string } 
}) {
  const organization = await getOrganizationBySlug(params.orgSlug);
  // ...
}
```

---

### Opción 3: Dominios Personalizados (PREMIUM) 🌟

**Concepto:**
```
www.empresa-a.com  → Empresa A (dominio propio)
www.empresa-b.com  → Empresa B (dominio propio)
shop.empresa-c.com → Empresa C (subdominio propio)
```

**Ventajas:**
- ✅ Máximo branding
- ✅ SEO independiente
- ✅ Profesional
- ✅ Confianza del cliente

**Desventajas:**
- ⚠️ Requiere que cada org tenga dominio
- ⚠️ Configuración DNS por cliente
- ⚠️ Gestión de certificados SSL
- ⚠️ Más complejo

**Implementación:**
```typescript
// Tabla: organization_domains
CREATE TABLE organization_domains (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  domain TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  ssl_certificate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Buscar organización por dominio personalizado
  const organization = await getOrganizationByDomain(hostname);
  
  // ...
}
```

---

## 🏗️ ARQUITECTURA RECOMENDADA

### Enfoque Híbrido (Mejor de ambos mundos)

**Combinación de Subdominios + Dominios Personalizados:**

```
┌─────────────────────────────────────────────────────────┐
│                    DNS Resolution                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  empresa-a.tudominio.com  ──┐                          │
│  www.empresa-a.com          ─┼──→ Organización A        │
│  shop.empresa-a.com         ─┘                          │
│                                                          │
│  empresa-b.tudominio.com  ──┐                          │
│  www.empresa-b.com          ─┼──→ Organización B        │
│                              ─┘                          │
│                                                          │
│  empresa-c.tudominio.com  ────→ Organización C          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Middleware                            │
│  1. Detectar hostname                                    │
│  2. Buscar organización (subdomain o custom domain)     │
│  3. Inyectar organization_id en headers                 │
│  4. Aplicar branding de la organización                 │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Páginas Públicas                        │
│  /home, /offers, /catalog, /orders/track               │
│  - Reciben organization_id de headers                   │
│  - Filtran datos por organización                       │
│  - Aplican branding personalizado                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 ANÁLISIS POR PÁGINA

### 1. `/home` - Página Principal

#### Estado Actual
```typescript
// ❌ PROBLEMA: No filtra por organización
const { data } = await supabase
  .from('business_config')
  .select('*')
  .single();  // ← Obtiene cualquier config, no específica de org
```

#### Solución Propuesta
```typescript
// ✅ SOLUCIÓN: Filtrar por organización
const organizationId = request.headers.get('x-organization-id');

const { data } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'business_config')
  .eq('organization_id', organizationId)
  .single();
```

#### Cambios Necesarios

**1. Obtener organización del hostname**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Buscar organización
  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug, name')
    .eq('slug', subdomain)
    .single();
  
  if (!org) {
    return NextResponse.redirect(new URL('/404', request.url));
  }
  
  // Inyectar en headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-organization-id', org.id);
  requestHeaders.set('x-organization-name', org.name);
  
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
```

**2. Actualizar página para usar organización**
```typescript
// app/home/page.tsx
export default async function HomePage() {
  const headersList = headers();
  const organizationId = headersList.get('x-organization-id');
  
  if (!organizationId) {
    return <div>Organización no encontrada</div>;
  }
  
  // Obtener config de la organización
  const supabase = await createClient();
  const { data: config } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .single();
  
  // Obtener productos de la organización
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(8);
  
  return <HomeClient config={config?.value} products={products} />;
}
```

**3. Actualizar queries de productos**
```typescript
// Antes (❌ sin filtro de org)
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true);

// Después (✅ con filtro de org)
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('is_active', true);
```

---

### 2. `/offers` - Ofertas y Promociones

#### Estado Actual
```typescript
// ❌ PROBLEMA: Obtiene todas las promociones sin filtro
const { data: promotions } = await supabase
  .from('promotions')
  .select('*')
  .eq('is_active', true);
```

#### Solución Propuesta
```typescript
// ✅ SOLUCIÓN: Filtrar por organización
const organizationId = headers().get('x-organization-id');

const { data: promotions } = await supabase
  .from('promotions')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('is_active', true);
```

#### Cambios Necesarios

**1. Actualizar query de promociones**
```typescript
// app/offers/page.tsx
export default async function OffersPage() {
  const headersList = headers();
  const organizationId = headersList.get('x-organization-id');
  
  const supabase = await createClient();
  const now = new Date().toISOString();

  // ✅ Filtrar por organización
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('organization_id', organizationId)  // ← NUEVO
    .eq('is_active', true)
    .lte('start_date', now)
    .or(`end_date.gte.${now},end_date.is.null`)
    .order('created_at', { ascending: false })
    .limit(50);
  
  // ...
}
```

**2. Actualizar query de productos en promociones**
```typescript
// ✅ Asegurar que productos también sean de la org
const { data: promoProducts } = await supabase
  .from('promotions_products')
  .select(`
    product_id,
    promotion_id,
    products!inner(
      id, name, sale_price, stock_quantity, 
      image_url, images, category_id, is_active,
      organization_id
    )
  `)
  .in('promotion_id', promotions.map((p: any) => p.id))
  .eq('products.is_active', true)
  .eq('products.organization_id', organizationId)  // ← NUEVO
  .limit(100);
```

---

### 3. `/catalog` - Catálogo de Productos

#### Estado Actual
```typescript
// ❌ PROBLEMA: Muestra todos los productos
let query = supabase
  .from('products')
  .select('*')
  .eq('is_active', true);
```

#### Solución Propuesta
```typescript
// ✅ SOLUCIÓN: Filtrar por organización
const organizationId = headers().get('x-organization-id');

let query = supabase
  .from('products')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('is_active', true);
```

#### Cambios Necesarios

**1. Actualizar query base**
```typescript
// app/catalog/page.tsx
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const headersList = headers();
  const organizationId = headersList.get('x-organization-id');
  
  const supabase = await createClient();

  // ✅ Query con filtro de organización
  let query = supabase
    .from('products')
    .select('id, name, sku, sale_price, offer_price, stock_quantity, image_url, images, category_id, is_active')
    .eq('organization_id', organizationId)  // ← NUEVO
    .eq('is_active', true);
  
  // Aplicar filtros adicionales...
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
  }
  
  // ...
}
```

**2. Actualizar query de categorías**
```typescript
// ✅ Categorías también filtradas por org
const { data: categories } = await supabase
  .from('categories')
  .select('id, name')
  .eq('organization_id', organizationId)  // ← NUEVO
  .order('name');
```

---

### 4. `/orders/track` - Seguimiento de Pedidos

#### Estado Actual
```typescript
// ❌ PROBLEMA: Busca pedidos sin filtro de org
const response = await fetch(`/api/orders/public/track?${params}`);
```

#### Solución Propuesta
```typescript
// ✅ SOLUCIÓN: API debe filtrar por organización
// El organizationId viene del middleware en headers
```

#### Cambios Necesarios

**1. Crear API endpoint público**
```typescript
// app/api/orders/public/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organización del header
    const organizationId = request.headers.get('x-organization-id');
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organización no identificada' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const customerEmail = searchParams.get('customerEmail');
    
    if (!orderNumber && !customerEmail) {
      return NextResponse.json(
        { error: 'Se requiere número de pedido o email' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // ✅ Query con filtro de organización
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .eq('organization_id', organizationId);  // ← NUEVO
    
    if (orderNumber) {
      query = query.eq('order_number', orderNumber);
    } else if (customerEmail) {
      query = query.eq('customer_email', customerEmail);
    }
    
    const { data: order, error } = await query.single();
    
    if (error || !order) {
      return NextResponse.json(
        { success: false, message: 'Pedido no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { order }
    });
    
  } catch (error: any) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

**2. Actualizar página para usar API**
```typescript
// app/orders/track/page.tsx
const searchOrder = async () => {
  // ... validaciones
  
  // ✅ El organizationId ya está en headers del request
  // El middleware lo inyectó automáticamente
  const response = await fetch(`/api/orders/public/track?${params}`);
  
  // ...
};
```

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Tablas que Necesitan `organization_id`

#### ✅ Ya tienen (verificar):
- `products`
- `categories`
- `promotions`
- `orders`
- `settings`

#### ⚠️ Verificar y agregar si falta:

```sql
-- Verificar columna organization_id
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'organization_id'
AND table_name IN (
  'products',
  'categories',
  'promotions',
  'promotions_products',
  'orders',
  'order_items',
  'settings'
);

-- Agregar si falta (ejemplo para promotions_products)
ALTER TABLE promotions_products
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_promotions_products_org_id 
ON promotions_products(organization_id);
```

### Tabla de Organizaciones

```sql
-- Verificar que existe y tiene campos necesarios
SELECT * FROM organizations LIMIT 1;

-- Agregar campos si faltan
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain);
```

### Tabla de Dominios Personalizados (Opcional)

```sql
CREATE TABLE IF NOT EXISTS organization_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  ssl_certificate TEXT,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_domains_org_id ON organization_domains(organization_id);
CREATE INDEX idx_org_domains_domain ON organization_domains(domain);
CREATE INDEX idx_org_domains_verified ON organization_domains(is_verified);
```

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### Fase 1: Preparación (2-3 horas)

**1.1 Actualizar tabla organizations**
```sql
-- Agregar campos necesarios
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Generar slugs para orgs existentes
UPDATE organizations
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g'))
WHERE slug IS NULL;

-- Generar subdomains
UPDATE organizations
SET subdomain = slug
WHERE subdomain IS NULL;
```

**1.2 Verificar organization_id en tablas**
```bash
npx tsx scripts/verify-organization-columns.ts
```

---

### Fase 2: Middleware (3-4 horas)

**2.1 Crear middleware de detección**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Solo aplicar a páginas públicas
  const publicPages = ['/home', '/offers', '/catalog', '/orders/track'];
  const isPublicPage = publicPages.some(page => pathname.startsWith(page));
  
  if (!isPublicPage) {
    return NextResponse.next();
  }
  
  // Detectar organización
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Buscar organización
  const supabase = await createClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug, name, subscription_status')
    .or(`subdomain.eq.${subdomain},custom_domain.eq.${hostname}`)
    .single();
  
  if (!org) {
    return NextResponse.redirect(new URL('/404', request.url));
  }
  
  // Verificar suscripción activa
  if (org.subscription_status !== 'ACTIVE') {
    return NextResponse.redirect(new URL('/suspended', request.url));
  }
  
  // Inyectar en headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-organization-id', org.id);
  requestHeaders.set('x-organization-name', org.name);
  requestHeaders.set('x-organization-slug', org.slug);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/home/:path*',
    '/offers/:path*',
    '/catalog/:path*',
    '/orders/:path*',
  ],
};
```

**2.2 Crear helper para obtener organización**
```typescript
// lib/organization/get-current-organization.ts
import { headers } from 'next/headers';

export async function getCurrentOrganization() {
  const headersList = headers();
  
  const id = headersList.get('x-organization-id');
  const name = headersList.get('x-organization-name');
  const slug = headersList.get('x-organization-slug');
  
  if (!id) {
    throw new Error('No organization context found');
  }
  
  return { id, name, slug };
}
```

---

### Fase 3: Actualizar Páginas (4-6 horas)

**3.1 Actualizar /home**
```typescript
// app/home/page.tsx
import { getCurrentOrganization } from '@/lib/organization/get-current-organization';

export default async function HomePage() {
  const organization = await getCurrentOrganization();
  
  // Obtener config de la organización
  const supabase = await createClient();
  const { data: configData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organization.id)
    .single();
  
  const config = configData?.value || defaultBusinessConfig;
  
  // Obtener productos de la organización
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_active', true)
    .limit(8);
  
  return <HomeClient config={config} products={products} />;
}
```

**3.2 Actualizar /offers**
```typescript
// Similar pattern para offers
```

**3.3 Actualizar /catalog**
```typescript
// Similar pattern para catalog
```

**3.4 Actualizar /orders/track**
```typescript
// Crear API endpoint público
```

---

### Fase 4: Testing (2-3 horas)

**4.1 Tests E2E**
```typescript
// tests/public-pages-saas.spec.ts
test('Org A ve solo sus productos', async ({ page }) => {
  await page.goto('http://org-a.localhost:3001/home');
  // Verificar productos de Org A
});

test('Org B ve solo sus productos', async ({ page }) => {
  await page.goto('http://org-b.localhost:3001/home');
  // Verificar productos de Org B
});
```

---

## 📊 COMPARACIÓN DE OPCIONES

| Aspecto | Subdominios | Path-based | Dominios Custom |
|---------|-------------|------------|-----------------|
| **SEO** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Branding** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Facilidad** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Costo** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **UX Cliente** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 RECOMENDACIÓN FINAL

### Enfoque Recomendado: **Subdominios + Dominios Custom (Híbrido)**

**Fase 1 (MVP):** Implementar subdominios
- `empresa-a.tudominio.com`
- `empresa-b.tudominio.com`
- Rápido de implementar
- Funcional para la mayoría

**Fase 2 (Premium):** Agregar dominios personalizados
- `www.empresa-a.com`
- `shop.empresa-b.com`
- Feature premium
- Mayor valor percibido

---

## ⏱️ ESTIMACIÓN DE TIEMPO

| Fase | Tiempo | Prioridad |
|------|--------|-----------|
| Preparación DB | 2-3 horas | Alta |
| Middleware | 3-4 horas | Alta |
| Actualizar /home | 2 horas | Alta |
| Actualizar /offers | 2 horas | Alta |
| Actualizar /catalog | 2 horas | Alta |
| Actualizar /orders/track | 2 horas | Media |
| API endpoints | 3 horas | Alta |
| Testing | 2-3 horas | Alta |
| Documentación | 2 horas | Media |
| **TOTAL** | **20-25 horas** | |

---

## 📝 PRÓXIMOS PASOS

1. **Revisar esta auditoría** con el equipo
2. **Decidir enfoque:** Subdominios, Path-based, o Híbrido
3. **Preparar base de datos:** Agregar campos necesarios
4. **Implementar middleware:** Detección de organización
5. **Actualizar páginas:** Una por una con testing
6. **Tests E2E:** Validar aislamiento
7. **Documentación:** Guías para clientes
8. **Deploy:** Staging primero, luego producción

---

**Auditoría realizada por:** Kiro AI Assistant  
**Fecha:** 2026-02-05  
**Versión:** 1.0

---

**¿Listo para implementar?** Revisa el plan detallado y decide qué enfoque usar.
