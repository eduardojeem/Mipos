# 🔄 Plan de Unificación de Settings

**Fecha:** 5 de febrero de 2026  
**Objetivo:** Unificar `/admin/settings` y `/dashboard/settings` en una sola interfaz

---

## 🎯 Estrategia de Unificación

### Concepto
- **Una sola ruta:** `/dashboard/settings`
- **Tabs dinámicos:** Mostrar tabs según el rol del usuario
- **Una sola fuente de datos:** `business_config` + `user_settings`
- **Control de acceso:** RBAC para cada tab

### Estructura Propuesta

```
/dashboard/settings
├── Preferencias (todos los usuarios)
│   ├── Tema, idioma, layout
│   └── Tooltips, animaciones
│
├── Sistema (solo ADMIN/SUPER_ADMIN)
│   ├── Información de la empresa
│   ├── Configuración regional
│   └── Respaldos y mantenimiento
│
├── Seguridad (solo ADMIN/SUPER_ADMIN)
│   ├── Políticas de contraseñas
│   ├── 2FA
│   └── Intentos de login
│
├── Notificaciones (todos los usuarios)
│   ├── Email
│   ├── Push
│   └── Configuración SMTP (solo ADMIN)
│
├── POS (solo ADMIN/SUPER_ADMIN)
│   ├── Impuestos
│   ├── Inventario
│   └── Hardware
│
└── Apariencia (solo ADMIN/SUPER_ADMIN)
    ├── Colores de marca
    ├── Geometría
    └── Efectos visuales
```

---

## 📊 Mapeo de Datos

### Datos de Usuario (user_settings)
```typescript
{
  // Preferencias personales
  theme: 'light' | 'dark' | 'system',
  language: 'es' | 'en',
  dashboard_layout: 'compact' | 'comfortable' | 'spacious',
  show_tooltips: boolean,
  enable_animations: boolean,
  
  // Notificaciones personales
  notifications_enabled: boolean,
  email_notifications: boolean,
  push_notifications: boolean,
}
```

### Datos del Sistema (business_config)
```typescript
{
  // Información de la empresa
  business_name: string,
  address: string,
  phone: string,
  email: string,
  ruc: string,
  
  // Regional
  timezone: string,
  language: string,
  currency: string,
  date_format: string,
  time_format: string,
  
  // Sistema
  auto_backup: boolean,
  backup_frequency: string,
  enable_logging: boolean,
  
  // Seguridad
  require_strong_passwords: boolean,
  max_login_attempts: number,
  lockout_duration: number,
  
  // Email (SMTP)
  smtp_host: string,
  smtp_port: number,
  smtp_user: string,
  smtp_password: string,
  
  // POS
  tax_rate: number,
  enable_inventory_tracking: boolean,
  low_stock_threshold: number,
  enable_barcode_scanner: boolean,
  print_receipts: boolean,
  
  // Apariencia global
  primary_color: string,
  border_radius: string,
  enable_glassmorphism: boolean,
  enable_gradients: boolean,
  enable_shadows: boolean,
}
```

---

## 🔐 Control de Acceso por Tab

| Tab | Usuario Normal | ADMIN | SUPER_ADMIN |
|-----|---------------|-------|-------------|
| **Preferencias** | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver/Editar |
| **Sistema** | ❌ No visible | ✅ Ver/Editar (su org) | ✅ Ver/Editar (todas) |
| **Seguridad** | ❌ No visible | ✅ Ver/Editar (su org) | ✅ Ver/Editar (todas) |
| **Notificaciones** | ✅ Ver/Editar (personal) | ✅ Ver/Editar (personal + SMTP) | ✅ Ver/Editar (todo) |
| **POS** | ❌ No visible | ✅ Ver/Editar (su org) | ✅ Ver/Editar (todas) |
| **Apariencia** | ❌ No visible | ✅ Ver/Editar (su org) | ✅ Ver/Editar (todas) |

---

## 📁 Estructura de Archivos

### Actual
```
apps/frontend/src/app/
├── admin/settings/
│   └── page.tsx (1,519 líneas - ELIMINAR)
│
└── dashboard/settings/
    ├── page.tsx
    ├── components/
    │   ├── SettingsPageContent.tsx
    │   ├── ProfileTab.tsx (renombrar a PreferencesTab)
    │   ├── SystemTab.tsx (expandir)
    │   ├── SecurityTab.tsx (expandir)
    │   ├── NotificationsTab.tsx (expandir)
    │   └── AppearanceTab.tsx (expandir)
    └── hooks/
        └── useOptimizedSettings.ts
```

### Propuesta
```
apps/frontend/src/app/dashboard/settings/
├── page.tsx (wrapper con lazy loading)
├── components/
│   ├── SettingsPageContent.tsx (actualizar tabs)
│   │
│   ├── PreferencesTab.tsx (ex-ProfileTab)
│   │   └── Preferencias personales de UI
│   │
│   ├── SystemTab.tsx (NUEVO - expandido)
│   │   ├── Información de la empresa
│   │   ├── Configuración regional
│   │   └── Respaldos y mantenimiento
│   │
│   ├── SecurityTab.tsx (NUEVO - expandido)
│   │   ├── Políticas de contraseñas
│   │   ├── 2FA
│   │   └── Control de acceso
│   │
│   ├── NotificationsTab.tsx (expandir)
│   │   ├── Notificaciones personales
│   │   └── Configuración SMTP (solo ADMIN)
│   │
│   ├── POSTab.tsx (NUEVO)
│   │   ├── Impuestos y moneda
│   │   ├── Inventario
│   │   └── Hardware
│   │
│   ├── AppearanceTab.tsx (NUEVO - para ADMIN)
│   │   ├── Colores de marca
│   │   ├── Geometría y espaciado
│   │   └── Efectos visuales
│   │
│   └── SettingsLoadingSkeleton.tsx
│
└── hooks/
    ├── useOptimizedSettings.ts (actualizar)
    ├── useSystemSettings.ts (ya existe)
    └── useSecuritySettings.ts (ya existe)
```

---

## 🔄 Migración de Componentes

### 1. PreferencesTab (ex-ProfileTab)
**Estado:** ✅ Ya simplificado
- Tema, idioma, layout
- Tooltips, animaciones

### 2. SystemTab (expandir)
**Origen:** `/admin/settings` - Tab "General" + "Sistema"
**Contenido:**
- Información de la empresa (nombre, dirección, RUC, etc.)
- Configuración regional (zona horaria, moneda, formatos)
- Respaldos automáticos
- Logs y monitoreo

### 3. SecurityTab (expandir)
**Origen:** `/admin/settings` - Tab "Seguridad"
**Contenido:**
- Políticas de contraseñas
- 2FA (marcado como PRO)
- Intentos de login máximos
- Duración de bloqueo
- Dashboard de salud de seguridad

### 4. NotificationsTab (expandir)
**Origen:** Nuevo + `/admin/settings` - Tab "Email"
**Contenido:**
- Notificaciones personales (todos)
- Configuración SMTP (solo ADMIN)
- Test de envío de email

### 5. POSTab (nuevo)
**Origen:** `/admin/settings` - Tab "POS"
**Contenido:**
- Tasa de impuesto (IVA)
- Control de inventario
- Aviso de stock bajo
- Impresión automática
- Hardware (lector, cajón)

### 6. AppearanceTab (expandir para ADMIN)
**Origen:** `/admin/settings` - Tab "Apariencia"
**Contenido:**
- Modo de interfaz (claro/oscuro/sistema)
- Paleta de colores de marca
- Curvatura de bordes
- Densidad visual
- Efectos (glassmorphism, gradientes, sombras)
- Vista previa en tiempo real

---

## 🛠️ Implementación Paso a Paso

### Fase 1: Preparación (1 hora)
- [x] Crear plan de unificación
- [ ] Backup de `/admin/settings/page.tsx`
- [ ] Crear nuevos componentes vacíos

### Fase 2: Migrar SystemTab (2 horas)
- [ ] Extraer lógica de "General" de admin/settings
- [ ] Extraer lógica de "Sistema" de admin/settings
- [ ] Crear SystemTab.tsx unificado
- [ ] Conectar con business_config
- [ ] Agregar control de acceso (solo ADMIN)

### Fase 3: Migrar SecurityTab (1.5 horas)
- [ ] Extraer lógica de "Seguridad" de admin/settings
- [ ] Crear SecurityTab.tsx unificado
- [ ] Conectar con business_config
- [ ] Agregar control de acceso (solo ADMIN)

### Fase 4: Migrar NotificationsTab (1 hora)
- [ ] Expandir NotificationsTab existente
- [ ] Agregar configuración SMTP (solo ADMIN)
- [ ] Conectar con business_config

### Fase 5: Migrar POSTab (1.5 horas)
- [ ] Extraer lógica de "POS" de admin/settings
- [ ] Crear POSTab.tsx
- [ ] Conectar con business_config
- [ ] Agregar control de acceso (solo ADMIN)

### Fase 6: Migrar AppearanceTab (2 horas)
- [ ] Expandir AppearanceTab existente
- [ ] Agregar configuración de marca (solo ADMIN)
- [ ] Mantener configuración personal (todos)
- [ ] Vista previa en tiempo real

### Fase 7: Actualizar SettingsPageContent (1 hora)
- [ ] Agregar tabs condicionales según rol
- [ ] Actualizar navegación
- [ ] Agregar indicadores de permisos

### Fase 8: Eliminar admin/settings (30 min)
- [ ] Eliminar `/admin/settings/page.tsx`
- [ ] Actualizar rutas de navegación
- [ ] Redirigir `/admin/settings` → `/dashboard/settings`

### Fase 9: Testing (2 horas)
- [ ] Probar como usuario normal
- [ ] Probar como ADMIN
- [ ] Probar como SUPER_ADMIN
- [ ] Verificar permisos
- [ ] Verificar guardado de datos

### Fase 10: Documentación (1 hora)
- [ ] Actualizar README
- [ ] Documentar nuevos componentes
- [ ] Guía de uso para usuarios

**Tiempo Total Estimado:** 13.5 horas

---

## 🎨 Diseño de UI

### Tabs Dinámicos

```tsx
<TabsList>
  {/* Siempre visible */}
  <TabsTrigger value="preferences">Preferencias</TabsTrigger>
  
  {/* Solo ADMIN/SUPER_ADMIN */}
  {isAdmin && (
    <>
      <TabsTrigger value="system">Sistema</TabsTrigger>
      <TabsTrigger value="security">Seguridad</TabsTrigger>
      <TabsTrigger value="pos">POS</TabsTrigger>
      <TabsTrigger value="appearance">Apariencia</TabsTrigger>
    </>
  )}
  
  {/* Todos, pero contenido diferente según rol */}
  <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
</TabsList>
```

### Indicadores de Permisos

```tsx
<TabsTrigger value="system">
  Sistema
  {isSuperAdmin && <Badge>Global</Badge>}
  {isAdmin && !isSuperAdmin && <Badge>Mi Org</Badge>}
</TabsTrigger>
```

---

## 📊 Beneficios de la Unificación

### Para Usuarios
- ✅ Una sola ubicación para configuración
- ✅ Interfaz consistente
- ✅ Menos confusión
- ✅ Mejor UX

### Para Desarrolladores
- ✅ Menos código duplicado
- ✅ Más fácil de mantener
- ✅ Arquitectura modular
- ✅ Tests más simples

### Para el Sistema
- ✅ Una sola fuente de verdad
- ✅ Mejor control de acceso
- ✅ Auditoría unificada
- ✅ Performance mejorado

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Pérdida de Funcionalidad
**Probabilidad:** Baja  
**Mitigación:** Backup completo antes de eliminar, migración incremental

### Riesgo 2: Confusión de Usuarios
**Probabilidad:** Media  
**Mitigación:** Documentación clara, notificación de cambios, redirección automática

### Riesgo 3: Problemas de Permisos
**Probabilidad:** Media  
**Mitigación:** Tests exhaustivos de RBAC, verificación por rol

---

## ✅ Criterios de Éxito

- [ ] `/admin/settings` eliminado completamente
- [ ] `/dashboard/settings` tiene todos los tabs necesarios
- [ ] Control de acceso funciona correctamente
- [ ] Todos los datos se guardan en business_config
- [ ] Tests pasan al 100%
- [ ] Documentación actualizada
- [ ] Usuarios no reportan problemas

---

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026  
**Estado:** 📋 Plan aprobado, listo para implementar
