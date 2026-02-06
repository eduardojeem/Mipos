# ✅ Configuración de Dominio Agregada para Admins

**Fecha:** 2026-02-05  
**Ubicación:** `/admin/business-config` → Tab "Dominio y Tienda"  
**Estado:** ✅ COMPLETADO

---

## 🎯 Objetivo

Permitir que los administradores de cada organización puedan configurar su propio subdomain y dominio personalizado desde el panel de administración, con vista previa en tiempo real.

---

## ✅ Lo que se Agregó

### 1. Nuevo Tab en Business Config

**Ubicación:** `/admin/business-config`  
**Tab:** "Dominio y Tienda" (segundo tab)  
**Icono:** 🌐 Globe

### 2. Componente DomainSettingsForm

**Archivo:** `apps/frontend/src/app/admin/business-config/components/DomainSettingsForm.tsx`

**Características:**

#### Vista Previa Destacada
- ✅ **Preview en tiempo real** del dominio completo
- ✅ **Botón "Copiar"** para copiar URL al portapapeles
- ✅ **Botón "Abrir Tienda"** para ver la tienda en nueva pestaña
- ✅ **Preview visual** con mockup de navegador
- ✅ **Muestra nombre de la organización** en el preview

#### Formulario de Configuración
- ✅ **Campo Subdominio** (requerido)
  - Input con icono Globe
  - Estilo azul
  - Preview en tiempo real: `mi-tienda.tudominio.com`
  - Validación de formato
  - Alert con reglas de formato

- ✅ **Campo Dominio Personalizado** (opcional)
  - Input con icono Globe
  - Estilo púrpura (Premium)
  - Badge "Premium"
  - Alert con instrucciones DNS

#### Validaciones Frontend
- ✅ Subdomain requerido
- ✅ Solo letras minúsculas, números y guiones
- ✅ No puede empezar o terminar con guión
- ✅ Formato de dominio válido para custom_domain

#### Información Adicional
- ✅ Card "¿Cómo funciona?" con 3 pasos
- ✅ Instrucciones claras y visuales
- ✅ Feedback inmediato con toasts

### 3. API Endpoint para Admins

**Archivo:** `apps/frontend/src/app/api/admin/organizations/[id]/route.ts`

**Endpoint:** `PATCH /api/admin/organizations/[id]`

**Características:**
- ✅ **Autenticación requerida**
- ✅ **Verificación de pertenencia** a la organización
- ✅ **Solo ADMIN y OWNER** pueden modificar
- ✅ **Whitelist de campos**: solo `subdomain` y `custom_domain`
- ✅ **Validaciones backend**:
  - Formato de subdomain
  - Formato de dominio
  - Unicidad de subdomain
  - Unicidad de custom_domain
- ✅ **Logging de cambios**
- ✅ **Manejo de errores** detallado

**Request:**
```json
{
  "subdomain": "mi-tienda",
  "custom_domain": "www.mi-tienda.com"
}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "id": "uuid-123",
    "name": "Mi Tienda",
    "subdomain": "mi-tienda",
    "custom_domain": "www.mi-tienda.com",
    ...
  }
}
```

---

## 📸 Vista Previa del Componente

### Layout General

```
┌─────────────────────────────────────────────────────────┐
│ 🌐 Dominio de tu Tienda Pública    [SaaS Multitenancy] │
│ Configura cómo los clientes accederán a tu tienda      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👁️ Vista Previa de tu Tienda                        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │                                                      │ │
│ │ Tu tienda estará disponible en:                     │ │
│ │ ┌──────────────────────────────────────────────┐   │ │
│ │ │ 🌐 mi-tienda.tudominio.com    [Copiar] [Abrir]│   │ │
│ │ └──────────────────────────────────────────────┘   │ │
│ │                                                      │ │
│ │ ┌──────────────────────────────────────────────┐   │ │
│ │ │ 🔴🟡🟢 https://mi-tienda.tudominio.com/home   │   │ │
│ │ ├──────────────────────────────────────────────┤   │ │
│ │ │                                               │   │ │
│ │ │              🏪 Mi Tienda                     │   │ │
│ │ │     Así verán tus clientes tu tienda online   │   │ │
│ │ │                                               │   │ │
│ │ └──────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────┐  ┌──────────────────────────┐ │
│ │ 🌐 Subdominio        │  │ 🌐 Dominio Personalizado │ │
│ │ Tu dirección única   │  │ Usa tu propio dominio    │ │
│ ├──────────────────────┤  │ [Premium]                │ │
│ │                      │  ├──────────────────────────┤ │
│ │ Subdominio *         │  │ Dominio Personalizado    │ │
│ │ ┌──────────────────┐ │  │ ┌──────────────────────┐ │ │
│ │ │🌐 mi-tienda      │ │  │ │🌐 www.mi-tienda.com  │ │ │
│ │ └──────────────────┘ │  │ └──────────────────────┘ │ │
│ │ mi-tienda.tudominio  │  │                          │ │
│ │                      │  │ ⚠️ Requiere config DNS   │ │
│ │ ℹ️ Formato válido    │  │                          │ │
│ └──────────────────────┘  └──────────────────────────┘ │
│                                                          │
│                          [✅ Guardar Configuración]     │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ¿Cómo funciona?                                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 1️⃣ Configura tu subdominio                          │ │
│ │ 2️⃣ Guarda los cambios                               │ │
│ │ 3️⃣ Comparte tu tienda                               │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Uso

### Para Administradores de Organización

1. **Acceder a Business Config:**
   ```
   /admin/business-config
   ```

2. **Ir al tab "Dominio y Tienda":**
   - Segundo tab en la lista
   - Icono 🌐 Globe

3. **Ver vista previa actual:**
   - Si ya tiene subdomain configurado, se muestra
   - Preview visual del navegador
   - Botones para copiar y abrir

4. **Configurar subdomain:**
   - Campo "Subdominio" (requerido)
   - Ingresar: `mi-tienda`
   - Ver preview en tiempo real: `mi-tienda.tudominio.com`

5. **Configurar dominio personalizado (opcional):**
   - Campo "Dominio Personalizado"
   - Ingresar: `www.mi-tienda.com`
   - Leer instrucciones DNS

6. **Guardar:**
   - Click en "Guardar Configuración"
   - Toast de confirmación
   - Cambios aplicados inmediatamente

7. **Probar:**
   - Click en "Abrir Tienda"
   - Se abre en nueva pestaña
   - Ver la tienda pública con el nuevo dominio

---

## 🔒 Seguridad y Permisos

### Autenticación
- ✅ Usuario debe estar autenticado
- ✅ Usuario debe pertenecer a la organización
- ✅ Solo roles ADMIN y OWNER pueden modificar

### Validaciones Backend
```typescript
// Verificar pertenencia
const { data: membership } = await supabase
  .from('organization_members')
  .select('role')
  .eq('user_id', user.id)
  .eq('organization_id', id)
  .single();

// Verificar rol
if (!['ADMIN', 'OWNER'].includes(membership.role)) {
  return 403;
}

// Validar formato subdomain
const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

// Verificar unicidad
const { data: existing } = await supabase
  .from('organizations')
  .select('id')
  .eq('subdomain', subdomain)
  .neq('id', id)
  .single();
```

### Whitelist de Campos
Solo se pueden actualizar:
- `subdomain`
- `custom_domain`

Otros campos de la organización están protegidos.

---

## 🎨 Estilos y UX

### Colores

**Subdomain (Azul):**
```css
bg-blue-50 dark:bg-blue-950/20
border-blue-200 dark:border-blue-900
text-blue-600
```

**Custom Domain (Púrpura - Premium):**
```css
bg-purple-50 dark:bg-purple-950/20
border-purple-200 dark:border-purple-900
text-purple-600
```

**Vista Previa (Gradiente):**
```css
bg-gradient-to-br from-blue-50 to-purple-50
border-blue-200
```

### Animaciones
- ✅ Spinner al guardar
- ✅ Checkmark al copiar
- ✅ Toast notifications
- ✅ Smooth transitions

### Responsive
- ✅ Grid adaptativo (1 col móvil, 2 cols desktop)
- ✅ Botones apilados en móvil
- ✅ Preview optimizado para móvil

---

## 📊 Validaciones

### Frontend

**Subdomain:**
```typescript
// Requerido
if (!subdomain || subdomain.trim() === '') {
  return 'El subdominio es requerido';
}

// Formato
const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
if (!subdomainRegex.test(subdomain)) {
  return 'Formato inválido';
}
```

**Custom Domain:**
```typescript
// Opcional
if (customDomain && customDomain.trim()) {
  // Validar formato
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return 'Formato de dominio inválido';
  }
}
```

### Backend

**Adicionales:**
- ✅ Verificar unicidad de subdomain
- ✅ Verificar unicidad de custom_domain
- ✅ Convertir a minúsculas
- ✅ Trim de espacios
- ✅ Null si custom_domain está vacío

---

## 🧪 Testing

### Manual

```bash
# 1. Acceder como Admin
http://localhost:3001/admin/business-config

# 2. Ir al tab "Dominio y Tienda"

# 3. Configurar subdomain
# - Ingresar: "test-store"
# - Ver preview: "test-store.tudominio.com"
# - Click "Guardar Configuración"

# 4. Verificar en DB
SELECT id, name, subdomain, custom_domain 
FROM organizations 
WHERE subdomain = 'test-store';

# 5. Probar "Abrir Tienda"
# - Click en botón
# - Debe abrir http://localhost:3001/home
# - Verificar que muestra productos de la organización

# 6. Probar "Copiar"
# - Click en botón
# - Verificar que se copia al portapapeles
# - Toast de confirmación
```

### Casos de Prueba

| Caso | Input | Resultado Esperado |
|------|-------|-------------------|
| Subdomain válido | `mi-tienda` | ✅ Guardado exitoso |
| Subdomain con mayúsculas | `Mi-Tienda` | ✅ Convertido a `mi-tienda` |
| Subdomain con espacios | ` mi-tienda ` | ✅ Trim aplicado |
| Subdomain vacío | `` | ❌ Error: requerido |
| Subdomain con guión al inicio | `-mi-tienda` | ❌ Error: formato inválido |
| Subdomain con guión al final | `mi-tienda-` | ❌ Error: formato inválido |
| Subdomain duplicado | `existing` | ❌ Error: ya en uso |
| Custom domain válido | `www.mi-tienda.com` | ✅ Guardado exitoso |
| Custom domain inválido | `mi tienda` | ❌ Error: formato inválido |
| Custom domain vacío | `` | ✅ Guardado como null |

---

## 📝 Diferencias con SuperAdmin

| Aspecto | SuperAdmin | Admin Regular |
|---------|-----------|---------------|
| **Ubicación** | `/superadmin/organizations/[id]` | `/admin/business-config` |
| **Acceso** | Todas las organizaciones | Solo su organización |
| **Campos editables** | Todos los campos de org | Solo subdomain y custom_domain |
| **Vista previa** | No | ✅ Sí, con mockup |
| **Botón abrir tienda** | No | ✅ Sí |
| **Botón copiar** | No | ✅ Sí |
| **Instrucciones** | No | ✅ Sí, card "¿Cómo funciona?" |
| **Validación unicidad** | ✅ Sí | ✅ Sí |

---

## 🚀 Próximos Pasos (Opcionales)

### 1. Verificación de Dominio (4-6 horas)
- [ ] Generar token de verificación
- [ ] Mostrar instrucciones DNS TXT
- [ ] Endpoint para verificar dominio
- [ ] Badge "Verificado" en UI

### 2. Preview Real (2-3 horas)
- [ ] Iframe con preview de la tienda
- [ ] Actualización en tiempo real
- [ ] Responsive preview (móvil/desktop)

### 3. Historial de Cambios (2 horas)
- [ ] Log de cambios de dominio
- [ ] Mostrar en tab "Historial"
- [ ] Quién cambió y cuándo

### 4. Tests E2E (3 horas)
```typescript
test('Admin puede configurar subdomain', async ({ page }) => {
  await page.goto('/admin/business-config');
  await page.click('text=Dominio y Tienda');
  await page.fill('[id="subdomain"]', 'test-store');
  await page.click('text=Guardar Configuración');
  await expect(page.locator('text=Dominio actualizado')).toBeVisible();
});
```

---

## ✅ Checklist de Implementación

- [x] Crear componente DomainSettingsForm
- [x] Agregar vista previa con mockup
- [x] Agregar botones Copiar y Abrir
- [x] Agregar validaciones frontend
- [x] Crear API endpoint /api/admin/organizations/[id]
- [x] Agregar validaciones backend
- [x] Verificar permisos (solo ADMIN/OWNER)
- [x] Agregar tab en business-config
- [x] Importar y lazy load componente
- [x] Agregar caso en switch
- [x] Verificar no hay errores TypeScript
- [x] Estilos responsive
- [x] Card "¿Cómo funciona?"
- [ ] Tests E2E
- [ ] Verificación de dominio
- [ ] Preview real con iframe

---

## 📚 Archivos Creados/Modificados

### Nuevos
- `apps/frontend/src/app/admin/business-config/components/DomainSettingsForm.tsx`
- `apps/frontend/src/app/api/admin/organizations/[id]/route.ts`
- `DOMAIN_SETTINGS_ADMIN_ADDED.md`

### Modificados
- `apps/frontend/src/app/admin/business-config/page.tsx`
  - Agregado tab "Dominio y Tienda"
  - Importado DomainSettingsForm
  - Agregado caso en switch
  - Importado icono Globe

---

## 🎉 Resultado

Los administradores de cada organización ahora pueden:
- ✅ Configurar su propio subdomain
- ✅ Configurar dominio personalizado (opcional)
- ✅ Ver vista previa en tiempo real
- ✅ Copiar URL al portapapeles
- ✅ Abrir su tienda en nueva pestaña
- ✅ Ver mockup visual del navegador
- ✅ Recibir validaciones y feedback inmediato
- ✅ Seguir instrucciones claras paso a paso

**La interfaz está lista para que cada organización gestione su propio dominio público.**

---

**Implementado por:** Kiro AI Assistant  
**Fecha:** 2026-02-05  
**Versión:** 1.0
