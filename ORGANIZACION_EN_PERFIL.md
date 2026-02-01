# Información de Organización en Perfil

## Vista Previa

La sección "Información de Cuenta" ahora muestra detalles completos sobre la organización del usuario y su rol dentro de ella.

## Estructura Visual

```
┌─────────────────────────────────────────────────────┐
│  Información de Cuenta                              │
│  Detalles de tu cuenta en el sistema               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Rol del Sistema                                    │
│  Usuario                                            │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Organización                                       │
│  Mi Empresa S.A.                                    │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Rol en la Organización                             │
│  [Admin] Administrador con acceso completo          │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Permisos Principales                               │
│  [Gestión completa] [Usuarios] [Configuración]      │
│  [Reportes] [Ventas] [Inventario] [+2 más]         │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Fecha de registro                                  │
│  15 de enero de 2024                                │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ID de usuario                                      │
│  abc123-def456-ghi789                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Roles y Descripciones

### Admin (Administrador)
- **Descripción:** Administrador con acceso completo
- **Permisos:** Gestión completa, Usuarios, Configuración, Reportes, Ventas, Inventario, Finanzas, Clientes
- **Color Badge:** Azul (bg-blue-600)

### Manager (Gerente)
- **Descripción:** Gerente con permisos de gestión
- **Permisos:** Gestión de ventas, Reportes, Inventario, Clientes, Empleados
- **Color Badge:** Azul (bg-blue-600)

### Seller (Vendedor)
- **Descripción:** Vendedor con acceso al POS
- **Permisos:** Punto de venta, Ventas, Clientes, Productos
- **Color Badge:** Azul (bg-blue-600)

### Cashier (Cajero)
- **Descripción:** Cajero con acceso limitado
- **Permisos:** Punto de venta, Caja, Ventas básicas
- **Color Badge:** Azul (bg-blue-600)

### Viewer (Visualizador)
- **Descripción:** Visualizador con acceso de solo lectura
- **Permisos:** Ver reportes, Ver productos, Ver ventas
- **Color Badge:** Azul (bg-blue-600)

### Inventory Manager (Gestor de Inventario)
- **Descripción:** Gestor de inventario
- **Permisos:** Gestión de inventario, Productos, Proveedores, Movimientos
- **Color Badge:** Azul (bg-blue-600)

### Accountant (Contador)
- **Descripción:** Contador con acceso financiero
- **Permisos:** Reportes financieros, Caja, Ventas, Gastos
- **Color Badge:** Azul (bg-blue-600)

## Casos de Uso

### Usuario con Organización (Admin)
```
Rol del Sistema: Usuario
Organización: TechStore S.A.
Rol en la Organización: [Admin] Administrador con acceso completo
Permisos: [Gestión completa] [Usuarios] [Configuración] [Reportes] [Ventas] [Inventario] [+2 más]
```

### Usuario con Organización (Vendedor)
```
Rol del Sistema: Usuario
Organización: SuperMercado Central
Rol en la Organización: [Seller] Vendedor con acceso al POS
Permisos: [Punto de venta] [Ventas] [Clientes] [Productos]
```

### Usuario sin Organización
```
Rol del Sistema: Usuario
⚠️ No perteneces a ninguna organización actualmente
Fecha de registro: 20 de febrero de 2024
```

## Flujo de Datos

1. **Usuario carga perfil** → `/dashboard/profile`
2. **Frontend solicita info** → `GET /api/auth/organization/info`
3. **API verifica autenticación** → Supabase Auth
4. **API obtiene organización** → Tabla `users.organization_id`
5. **API obtiene detalles** → Tabla `organizations`
6. **API determina rol** → Tabla `organization_members` o `users.role`
7. **API mapea permisos** → Según rol predefinido
8. **Frontend muestra datos** → Cards con badges y separadores

## Beneficios

✅ **Claridad:** Usuario sabe exactamente qué rol tiene
✅ **Transparencia:** Permisos visibles de forma clara
✅ **Profesional:** Diseño limpio y organizado
✅ **Informativo:** Descripciones de roles comprensibles
✅ **Visual:** Badges y colores para mejor UX
✅ **Escalable:** Fácil agregar nuevos roles

## Integración con Tablas

### Tabla: users
```sql
- id (uuid)
- organization_id (uuid) → organizations.id
- role (text) → Rol del sistema
```

### Tabla: organizations
```sql
- id (uuid)
- name (text) → Nombre mostrado
- slug (text)
- subscription_plan (text)
```

### Tabla: organization_members (opcional)
```sql
- user_id (uuid) → users.id
- organization_id (uuid) → organizations.id
- role (text) → Rol en la organización
- permissions (jsonb) → Permisos personalizados
```

## Personalización

Para agregar nuevos roles, editar en:
`apps/frontend/src/app/api/auth/organization/info/route.ts`

```typescript
const ROLE_DESCRIPTIONS: Record<string, string> = {
  'nuevo_rol': 'Descripción del nuevo rol',
  // ...
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'nuevo_rol': ['Permiso 1', 'Permiso 2', 'Permiso 3'],
  // ...
};
```

## Notas Técnicas

- Fallback automático si `organization_members` no existe
- Usa rol de tabla `users` como respaldo
- Manejo elegante de usuarios sin organización
- No muestra errores, solo mensajes informativos
- Compatible con estructura actual de base de datos
