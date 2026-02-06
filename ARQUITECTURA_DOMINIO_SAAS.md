# 🏗️ Arquitectura del Sistema de Dominios SaaS

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN GLOBAL                      │
│                                                              │
│  Super Admin → /superadmin → Tab "Configuración"           │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Dominio Base: miposparaguay.vercel.app         │      │
│  └──────────────────────────────────────────────────┘      │
│                         ↓                                    │
│              system_settings.base_domain                     │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              CONFIGURACIÓN POR ORGANIZACIÓN                  │
│                                                              │
│  Admin → /admin/business-config → Tab "Dominio y Tienda"   │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Subdomain: mi-tienda                            │      │
│  │  Preview: mi-tienda.miposparaguay.vercel.app    │      │
│  └──────────────────────────────────────────────────┘      │
│                         ↓                                    │
│              organizations.subdomain                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    ACCESO PÚBLICO                            │
│                                                              │
│  Cliente → mi-tienda.miposparaguay.vercel.app/home         │
│                         ↓                                    │
│              Middleware detecta subdomain                    │
│                         ↓                                    │
│         Busca organization_id en base de datos              │
│                         ↓                                    │
│         Inyecta organization_id en cookies                  │
│                         ↓                                    │
│         Página filtra datos por organization_id             │
└─────────────────────────────────────────────────────────────┘
```

## Capas del Sistema

### 1. Capa de Base de Datos

```
system_settings
├── key: 'base_domain'
├── value: {"domain": "miposparaguay.vercel.app"}
└── RLS: Solo Super Admins

organizations
├── id
├── name
├── subdomain ← Configurado por Admin
├── custom_domain ← Opcional
└── RLS: Por organización
```

### 2. Capa de API

```
GET  /api/superadmin/system-settings
POST /api/superadmin/system-settings
     ↓
     Validaciones:
     - Autenticación
     - Rol Super Admin
     - Formato de dominio
     - Sanitización

PATCH /api/admin/organizations/[id]
      ↓
      Validaciones:
      - Autenticación
      - Rol Admin/Owner
      - Subdomain único
      - Formato válido
```

### 3. Capa de Middleware

```
Request → middleware.ts
          ↓
          Detecta hostname
          ↓
          Extrae subdomain
          ↓
          Busca organization
          ↓
          Inyecta cookies:
          - x-organization-id
          - x-organization-name
          - x-organization-slug
          ↓
          Continue to page
```

### 4. Capa de Presentación

```
SuperAdmin UI
├── SystemSettings.tsx
│   ├── Formulario de dominio base
│   ├── Vista previa de subdominios
│   └── Guía de configuración DNS

Admin UI
├── DomainSettingsForm.tsx
│   ├── Formulario de subdomain
│   ├── Vista previa de URL
│   ├── Botón copiar
│   └── Botón abrir tienda

Public Pages
├── /home
├── /offers
├── /catalog
└── /orders/track
    ↓
    Filtran por organization_id de cookies
```

## Flujo de Datos

### Configuración (Write)

```
Super Admin Input
       ↓
SystemSettings Component
       ↓
POST /api/superadmin/system-settings
       ↓
Validaciones
       ↓
system_settings table
       ↓
Success Response
```

### Lectura (Read)

```
Component Mount
       ↓
GET /api/superadmin/system-settings
       ↓
Query system_settings table
       ↓
Return base_domain
       ↓
Update UI
```

### Acceso Público (Runtime)

```
User Request: tienda1.miposparaguay.vercel.app/home
       ↓
Middleware
       ↓
Extract subdomain: "tienda1"
       ↓
Query: SELECT * FROM organizations WHERE subdomain = 'tienda1'
       ↓
Set cookies: organization_id, organization_name, organization_slug
       ↓
Page Component
       ↓
Read organization_id from cookies
       ↓
Query data filtered by organization_id
       ↓
Render page
```

## Seguridad en Capas

```
Layer 1: Database (RLS)
├── system_settings: Solo Super Admins
└── organizations: Por organización

Layer 2: API
├── Autenticación requerida
├── Verificación de roles
└── Validación de inputs

Layer 3: Middleware
├── Cookies httpOnly
├── Verificación de subscription
└── Aislamiento de datos

Layer 4: UI
├── Validación en tiempo real
├── Mensajes de error claros
└── Confirmación de cambios
```

## Escalabilidad

```
Organizaciones: Ilimitadas
Subdominios: Uno por organización
Custom Domains: Ilimitados (opcional)
Concurrent Users: Escalable con Vercel
Database: Escalable con Supabase
```

## Performance

```
Configuración:
- Cached en memoria
- Fallback a env vars
- Query única por request

Middleware:
- Single query por request
- Cookies para evitar re-queries
- Cache de organización

Pages:
- Server-side rendering
- Datos filtrados en DB
- No queries N+1
```

---

**Arquitectura:** Multitenancy con subdominios  
**Escalabilidad:** Horizontal  
**Seguridad:** Enterprise-grade
